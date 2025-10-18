const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
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

async function callGemini(parts: GeminiPart[], opts?: { responseJson?: boolean }): Promise<GeminiResponse> {
  if (!API_KEY) {
    console.warn('Gemini API key missing. Set VITE_GEMINI_API_KEY')
  }
  const body: any = { contents: [{ parts }] }
  if (opts?.responseJson) {
    body.generationConfig = { response_mime_type: 'application/json' }
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
  async query(imageDataUrl: string, question: string): Promise<QueryResult> {
    const inline = dataUrlToInlineData(imageDataUrl)
    const resp = await callGemini([
      { inline_data: inline },
      { text: question },
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
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export const geminiService = new GeminiService()
