const API_KEY = import.meta.env.VITE_MOONDREAM_API_KEY ?? ''
const BASE_URL = 'https://api.moondream.ai/v1'

export interface Point {
  x: number;
  y: number;
}

export interface QueryResult {
  answer: string;
  request_id?: string;
}

export interface PointResult {
  points: Point[];
  request_id?: string;
}

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DetectResult {
  objects: BoundingBox[];
  request_id?: string;
}

export interface WalkthroughResult {
  points: Point[];
  narrative: string;
  request_id?: string;
}

class MoondreamService {
  private async post<T>(path: string, body: object): Promise<T> {
    if (!API_KEY) {
      console.warn('Moondream API key missing. Set VITE_MOONDREAM_API_KEY')
    }
    const res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moondream-Auth': API_KEY,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API error ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
  }

  query(imageDataUrl: string, question: string) {
    return this.post<QueryResult>('query', { image_url: imageDataUrl, question })
  }

  point(imageDataUrl: string, object: string) {
    return this.post<PointResult>('point', { image_url: imageDataUrl, object })
  }

  detect(imageDataUrl: string, object: string) {
    return this.post<DetectResult>('detect', { image_url: imageDataUrl, object })
  }

  async walkthrough(imageDataUrl: string, question: string): Promise<WalkthroughResult> {
    // Moondream doesn't have a dedicated walkthrough endpoint
    // Fall back to query and return empty points
    const result = await this.query(imageDataUrl, question)
    return {
      points: [],
      narrative: result.answer,
      request_id: result.request_id
    }
  }

  async walkthroughNextStep(
    imageDataUrl: string,
    goal: string,
    _previousSteps: string[]
  ): Promise<import('./gemini').WalkthroughStepResult> {
    // Moondream doesn't have iterative walkthrough support
    // Return a simple fallback response
    const result = await this.query(imageDataUrl, `Next step to ${goal}`)
    return {
      instruction: result.answer,
      points: [],
      boxes: [],
      isComplete: false,
      request_id: result.request_id
    }
  }
}

export const moondreamService = new MoondreamService()
