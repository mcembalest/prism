import { GoogleGenAI } from '@google/genai'
import type { Point, BoundingBox } from '@/types/coordinates'
import type {
  QueryResult,
  PointResult,
  DetectResult,
  WalkthroughResult,
  WalkthroughStepResult,
  IntentType
} from '@/types/walkthrough'

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

interface GeminiResponseCandidatePart {
  text?: string
}
interface GeminiResponseCandidateContent {
  parts?: GeminiResponseCandidatePart[]
}
interface GeminiResponseCandidate {
  content?: GeminiResponseCandidateContent
}
interface GeminiResponse {
  candidates?: GeminiResponseCandidate[]
  promptFeedback?: unknown
}

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } {
  // Expect formats like: data:image/png;base64,XXXXX
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
  if (!match) {
    throw new Error('Invalid data URL passed to Gemini service')
  }
  return { mimeType: match[1], data: match[2] }
}

function getGeminiApiKey(): string {
  try {
    return localStorage.getItem('helplayer_gemini_api_key') || ''
  } catch {
    return ''
  }
}

function getGeminiClient(): GoogleGenAI {
  const API_KEY = getGeminiApiKey()
  if (!API_KEY) {
    throw new Error('Gemini API key not set. Open Settings to add it.')
  }
  return new GoogleGenAI({ apiKey: API_KEY })
}

async function callGemini(
  parts: GeminiPart[],
  opts?: {
    responseJson?: boolean
    responseSchema?: any
    responseMimeType?: string
    thinkingBudget?: number
  }
): Promise<GeminiResponse> {
  const client = getGeminiClient()

  const config: any = {}

  if (opts?.responseJson || opts?.responseSchema || opts?.responseMimeType) {
    config.generationConfig = {}
    if (opts.responseMimeType) {
      config.generationConfig.responseMimeType = opts.responseMimeType
    } else if (opts.responseJson) {
      config.generationConfig.responseMimeType = 'application/json'
    }
    if (opts.responseSchema) {
      config.generationConfig.responseSchema = opts.responseSchema
    }
  }

  // Add thinking budget configuration for detection tasks
  if (opts?.thinkingBudget !== undefined) {
    config.thinkingConfig = {
      thinkingBudget: opts.thinkingBudget
    }
  }

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: parts,
    ...config
  })

  return response as unknown as GeminiResponse
}

function extractFirstText(resp: GeminiResponse): string {
  const txt = resp.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') ?? ''
  return txt.trim()
}

function safeParseJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    // Some models wrap in markdown fences; try to strip them
    const stripped = s.replace(/^```json\n?|\n?```$/g, '').trim()
    try { return JSON.parse(stripped) as T } catch { return null }
  }
}

// Common structure for detection/segmentation output
interface GeminiBoxOrMaskItem {
  box_2d?: [number, number, number, number] // [y0, x0, y1, x1] in 0..1000
  label?: string
  mask?: string // base64 png, may include data URL prefix
}

class GeminiService {
  async classifyIntent(query: string): Promise<IntentType> {
    const prompt = [
      'Classify the user intent into one of five categories:',
      '- "text-only": Questions that can be answered without seeing the screen (e.g., "what is 2+2", "tell me a joke", "explain quantum physics", "what\'s the weather")',
      '- "walkthrough": Step-by-step guides or tutorials about what\'s on screen (e.g., "how do I...", "show me how to...", "guide me through...", "walk me through...")',
      '- "query": Questions about what\'s currently visible on screen (e.g., "what is on my screen", "what color is this button", "read this text", "what app is this")',
      '- "point": Requests to locate/find/identify a specific UI element or object on screen (e.g., "where is...", "find the...", "click on...", "locate...")',
      '- "detect": Requests to detect/bound/highlight multiple instances of objects on screen (e.g., "find all...", "detect...", "show all...", "highlight all...")',
      '',
      `User query: "${query}"`,
      '',
      'Respond with only one of: text-only, walkthrough, query, point, or detect'
    ].join('\n')

    const resp = await callGemini(
      [{ text: prompt }],
      {
        responseMimeType: 'text/x.enum',
        responseSchema: {
          type: 'STRING',
          enum: ['text-only', 'walkthrough', 'query', 'point', 'detect']
        }
      }
    )

    const result = extractFirstText(resp) as IntentType
    // Fallback to 'text-only' if the response is not one of the expected values
    if (!['text-only', 'walkthrough', 'query', 'point', 'detect'].includes(result)) {
      return 'text-only'
    }
    return result
  }

  async answerTextOnly(question: string): Promise<QueryResult> {
    const resp = await callGemini([
      { text: `${question}\n\nRespond in 1-2 sentences maximum. Be concise and direct.` },
    ])
    const answer = extractFirstText(resp)
    return { answer }
  }

  async query(imageDataUrl: string, question: string): Promise<QueryResult> {
    const inline = dataUrlToInlineData(imageDataUrl)
    const resp = await callGemini([
      { inlineData: inline },
      { text: `${question}\n\nRespond in 1-2 sentences maximum. Be concise and direct.` },
    ])
    const answer = extractFirstText(resp)
    return { answer }
  }

  // Shared helper to detect bounding boxes from image
  private async detectBoundingBoxes(imageDataUrl: string, object: string): Promise<GeminiBoxOrMaskItem[]> {
    const inline = dataUrlToInlineData(imageDataUrl)
    const prompt = [
      'Detect all instances of the target in the image.',
      `Target: ${object}.`,
      'Return ONLY a JSON array where each item has key "box_2d" as [y0, x0, y1, x1], normalized 0..1000.',
      'Do not include markdown fences or extra text.',
    ].join(' ')

    const resp = await callGemini([
      { inlineData: inline },
      { text: prompt },
    ], {
      responseJson: true,
      thinkingBudget: 0  // Set thinking budget to 0 for better detection results
    })

    const jsonText = extractFirstText(resp)
    return safeParseJson<GeminiBoxOrMaskItem[]>(jsonText) || []
  }

  async point(imageDataUrl: string, object: string): Promise<PointResult> {
    const items = await this.detectBoundingBoxes(imageDataUrl, object)

    const points: Point[] = []
    for (const item of items) {
      const b = item.box_2d
      if (!b || b.length !== 4) continue
      const [y0, x0, y1, x1] = b
      if (!(y1 > y0) || !(x1 > x0)) continue
      const cx = ((x0 + x1) / 2) / 1000
      const cy = ((y0 + y1) / 2) / 1000
      if (isFinite(cx) && isFinite(cy)) points.push({ x: clamp01(cx), y: clamp01(cy) })
    }

    return { points }
  }

  async detect(imageDataUrl: string, object: string): Promise<DetectResult> {
    const items = await this.detectBoundingBoxes(imageDataUrl, object)

    const objects: BoundingBox[] = []
    for (const item of items) {
      const b = item.box_2d
      if (!b || b.length !== 4) continue
      const [y0, x0, y1, x1] = b
      if (!(y1 > y0) || !(x1 > x0)) continue
      const xMin = clamp01(x0 / 1000)
      const yMin = clamp01(y0 / 1000)
      const xMax = clamp01(x1 / 1000)
      const yMax = clamp01(y1 / 1000)
      objects.push({ xMin, yMin, xMax, yMax })
    }

    return { objects }
  }

  async walkthrough(imageDataUrl: string, question: string): Promise<WalkthroughResult> {
    const inline = dataUrlToInlineData(imageDataUrl)
    const prompt = [
      'Analyze the screen and create a step-by-step walkthrough for the user\'s question.',
      `Question: ${question}`,
      '',
      'Identify the UI elements the user needs to interact with IN ORDER (e.g., first click File, then click New, then click Document).',
      'For each step, provide the center coordinates of the UI element.',
      '',
      'Return JSON with two fields:',
      '1. "steps": array of objects with "box_2d" as [y0, x0, y1, x1], normalized 0..1000',
      '2. "narrative": a concise walkthrough explanation (2-4 sentences) that describes the steps naturally',
      '',
      'Example format:',
      '{"steps": [{"box_2d": [100, 50, 150, 200]}, {"box_2d": [200, 100, 250, 300]}], "narrative": "First, click the File menu in the top left. Then select New from the dropdown to create a new document."}',
      '',
      'Do not include markdown fences or extra text.'
    ].join('\n')

    const resp = await callGemini([
      { inlineData: inline },
      { text: prompt },
    ], { responseJson: true })

    const jsonText = extractFirstText(resp)
    const parsed = safeParseJson<{ steps?: GeminiBoxOrMaskItem[], narrative?: string }>(jsonText)

    if (!parsed || !parsed.steps || !parsed.narrative) {
      return { points: [], narrative: 'Unable to generate walkthrough for this screen.' }
    }

    const points: Point[] = []
    for (const item of parsed.steps) {
      const b = item.box_2d
      if (!b || b.length !== 4) continue
      const [y0, x0, y1, x1] = b
      if (!(y1 > y0) || !(x1 > x0)) continue
      const cx = ((x0 + x1) / 2) / 1000
      const cy = ((y0 + y1) / 2) / 1000
      if (isFinite(cx) && isFinite(cy)) points.push({ x: clamp01(cx), y: clamp01(cy) })
    }

    return { points, narrative: parsed.narrative }
  }

  async walkthroughNextStep(
    imageDataUrl: string,
    goal: string,
    previousSteps: string[]
  ): Promise<WalkthroughStepResult> {
    const inline = dataUrlToInlineData(imageDataUrl)

    // Build context about previous steps
    const contextText = previousSteps.length > 0
      ? `Previous steps completed:\n${previousSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n`
      : ''

    const prompt = [
      'You are helping a user achieve a goal through a step-by-step walkthrough.',
      `User\'s goal: ${goal}`,
      '',
      contextText,
      'Analyze the current screen and determine the NEXT action the user should take.',
      '',
      'If the goal has been achieved, set "isComplete" to true and provide a completion message.',
      'If more steps are needed, identify the UI element to interact with and provide clear instruction.',
      '',
      'Return JSON with these fields:',
      '1. "caption": Short 1-3 word label for the UI element (e.g., "File Menu", "Save Button", "Search Field")',
      '2. "instruction": Clear, concise instruction for this step (e.g., "Click the File menu in the top-left corner")',
      '3. Choose EITHER "points" OR "boxes" for each step (NEVER both):',
      '   - Use "points" ONLY for single clickable UI elements (buttons, menu items, icons)',
      '   - Use "boxes" ONLY for regions/areas to highlight (text fields, panels, sections)',
      '4. "points": array of center points {x, y} normalized 0.0-1.0 OR empty array []',
      '5. "boxes": array of bounding boxes {xMin, yMin, xMax, yMax} normalized 0.0-1.0 OR empty array []',
      '6. "isComplete": boolean - true if the goal is fully achieved, false otherwise',
      '',
      'Example for clickable element:',
      '{"caption": "File Menu", "instruction": "Click the File menu in the top-left corner", "points": [{"x": 0.05, "y": 0.03}], "boxes": [], "isComplete": false}',
      '',
      'Example for region/area:',
      '{"caption": "Search Field", "instruction": "Type your query in the search field", "points": [], "boxes": [{"xMin": 0.3, "yMin": 0.1, "xMax": 0.7, "yMax": 0.15}], "isComplete": false}',
      '',
      'Example for completion:',
      '{"caption": "Complete", "instruction": "Walkthrough complete! The file has been saved successfully.", "points": [], "boxes": [], "isComplete": true}',
      '',
      'Do not include markdown fences or extra text.',
    ].join('\n')

    const resp = await callGemini([
      { inlineData: inline },
      { text: prompt },
    ], { responseJson: true })

    const jsonText = extractFirstText(resp)
    const parsed = safeParseJson<{
      caption?: string
      instruction?: string
      points?: Array<{ x?: number; y?: number }>
      boxes?: Array<{ xMin?: number; yMin?: number; xMax?: number; yMax?: number }>
      isComplete?: boolean
    }>(jsonText)

    if (!parsed || !parsed.instruction) {
      return {
        caption: 'Error',
        instruction: 'Unable to determine the next step.',
        points: [],
        boxes: [],
        isComplete: false
      }
    }

    // Process points
    const points: Point[] = []
    if (parsed.points && Array.isArray(parsed.points)) {
      for (const p of parsed.points) {
        if (p.x !== undefined && p.y !== undefined && isFinite(p.x) && isFinite(p.y)) {
          points.push({ x: clamp01(p.x), y: clamp01(p.y) })
        }
      }
    }

    // Process boxes
    const boxes: BoundingBox[] = []
    if (parsed.boxes && Array.isArray(parsed.boxes)) {
      for (const b of parsed.boxes) {
        if (
          b.xMin !== undefined &&
          b.yMin !== undefined &&
          b.xMax !== undefined &&
          b.yMax !== undefined &&
          b.xMax > b.xMin &&
          b.yMax > b.yMin
        ) {
          boxes.push({
            xMin: clamp01(b.xMin),
            yMin: clamp01(b.yMin),
            xMax: clamp01(b.xMax),
            yMax: clamp01(b.yMax)
          })
        }
      }
    }

    return {
      caption: parsed.caption || 'Step',
      instruction: parsed.instruction,
      points,
      boxes,
      isComplete: parsed.isComplete ?? false
    }
  }
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export const geminiService = new GeminiService()
