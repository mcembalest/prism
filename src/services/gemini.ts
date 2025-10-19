const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export interface Point {
  x: number
  y: number
}

export interface QueryResult {
  answer: string
  request_id?: string
}

export interface PointResult {
  points: Point[]
  request_id?: string
}

export interface BoundingBox {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

export interface DetectResult {
  objects: BoundingBox[]
  request_id?: string
}

export interface WalkthroughResult {
  points: Point[]
  narrative: string
  request_id?: string
}

export interface WalkthroughStepResult {
  instruction: string
  points: Point[]
  boxes: BoundingBox[]
  isComplete: boolean
  request_id?: string
}

export type IntentType = 'query' | 'point' | 'detect' | 'walkthrough' | 'text-only'

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }

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

function dataUrlToInlineData(dataUrl: string): { mime_type: string; data: string } {
  // Expect formats like: data:image/png;base64,XXXXX
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
  if (!match) {
    throw new Error('Invalid data URL passed to Gemini service')
  }
  return { mime_type: match[1], data: match[2] }
}

async function callGemini(
  parts: GeminiPart[],
  opts?: {
    responseJson?: boolean
    responseSchema?: any
    responseMimeType?: string
  }
): Promise<GeminiResponse> {
  const API_KEY = getGeminiApiKey()
  if (!API_KEY) {
    throw new Error('Gemini API key not set. Open Settings to add it.')
  }
  const body: any = { contents: [{ parts }] }
  if (opts?.responseJson || opts?.responseSchema || opts?.responseMimeType) {
    body.generationConfig = {}
    if (opts.responseMimeType) {
      body.generationConfig.response_mime_type = opts.responseMimeType
    } else if (opts.responseJson) {
      body.generationConfig.response_mime_type = 'application/json'
    }
    if (opts.responseSchema) {
      body.generationConfig.response_schema = opts.responseSchema
    }
  }
  const res = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY || '' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini API error ${res.status}: ${text}`)
  }
  return (await res.json()) as GeminiResponse
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
      { inline_data: inline },
      { text: `${question}\n\nRespond in 1-2 sentences maximum. Be concise and direct.` },
    ])
    const answer = extractFirstText(resp)
    return { answer }
  }

  async point(imageDataUrl: string, object: string): Promise<PointResult> {
    const inline = dataUrlToInlineData(imageDataUrl)
    const prompt = [
      'Detect all instances of the target in the image.',
      `Target: ${object}.`,
      'Return ONLY a JSON array where each item has key "box_2d" as [y0, x0, y1, x1], normalized 0..1000.',
      'Do not include markdown fences or extra text.',
    ].join(' ')

    const resp = await callGemini([
      { inline_data: inline },
      { text: prompt },
    ], { responseJson: true })

    const jsonText = extractFirstText(resp)
    const items = safeParseJson<GeminiBoxOrMaskItem[]>(jsonText) || []

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
    const inline = dataUrlToInlineData(imageDataUrl)
    const prompt = [
      'Detect all instances of the target in the image.',
      `Target: ${object}.`,
      'Return ONLY a JSON array where each item has key "box_2d" as [y0, x0, y1, x1], normalized 0..1000.',
      'Do not include markdown fences or extra text.',
    ].join(' ')

    const resp = await callGemini([
      { inline_data: inline },
      { text: prompt },
    ], { responseJson: true })

    const jsonText = extractFirstText(resp)
    const items = safeParseJson<GeminiBoxOrMaskItem[]>(jsonText) || []

    const objects: BoundingBox[] = []
    for (const item of items) {
      const b = item.box_2d
      if (!b || b.length !== 4) continue
      const [y0, x0, y1, x1] = b
      if (!(y1 > y0) || !(x1 > x0)) continue
      const x_min = clamp01(x0 / 1000)
      const y_min = clamp01(y0 / 1000)
      const x_max = clamp01(x1 / 1000)
      const y_max = clamp01(y1 / 1000)
      objects.push({ x_min, y_min, x_max, y_max })
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
      { inline_data: inline },
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
      '1. "instruction": Clear, concise instruction for this step (e.g., "Click the File menu in the top-left corner")',
      '2. "points": array of center points to highlight, each as {x, y} normalized 0.0-1.0 (use points for clickable elements)',
      '3. "boxes": array of bounding boxes to highlight, each as {x_min, y_min, x_max, y_max} normalized 0.0-1.0 (use boxes for regions/areas)',
      '4. "isComplete": boolean - true if the goal is fully achieved, false otherwise',
      '',
      'Example for next step:',
      '{"instruction": "Click the File menu in the top-left corner", "points": [{"x": 0.05, "y": 0.03}], "boxes": [], "isComplete": false}',
      '',
      'Example for completion:',
      '{"instruction": "Walkthrough complete! The file has been saved successfully.", "points": [], "boxes": [], "isComplete": true}',
      '',
      'Do not include markdown fences or extra text.',
    ].join('\n')

    const resp = await callGemini([
      { inline_data: inline },
      { text: prompt },
    ], { responseJson: true })

    const jsonText = extractFirstText(resp)
    const parsed = safeParseJson<{
      instruction?: string
      points?: Array<{ x?: number; y?: number }>
      boxes?: Array<{ x_min?: number; y_min?: number; x_max?: number; y_max?: number }>
      isComplete?: boolean
    }>(jsonText)

    if (!parsed || !parsed.instruction) {
      return {
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
          b.x_min !== undefined &&
          b.y_min !== undefined &&
          b.x_max !== undefined &&
          b.y_max !== undefined &&
          b.x_max > b.x_min &&
          b.y_max > b.y_min
        ) {
          boxes.push({
            x_min: clamp01(b.x_min),
            y_min: clamp01(b.y_min),
            x_max: clamp01(b.x_max),
            y_max: clamp01(b.y_max)
          })
        }
      }
    }

    return {
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

function getGeminiApiKey(): string {
  try {
    return localStorage.getItem('prism_gemini_api_key') || ''
  } catch {
    return ''
  }
}
