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
}

export const moondreamService = new MoondreamService()
