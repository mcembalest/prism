import { moondreamService as md } from '@/services/moondream'
import { geminiService as gm } from '@/services/gemini'

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

type Service = {
  query(imageDataUrl: string, question: string): Promise<QueryResult>
  point(imageDataUrl: string, object: string): Promise<PointResult>
  detect(imageDataUrl: string, object: string): Promise<DetectResult>
}

const PROVIDER = (import.meta.env.VITE_VISION_PROVIDER as 'moondream' | 'gemini' | undefined)
  ?? (import.meta.env.VITE_MOONDREAM_API_KEY ? 'moondream' : 'gemini')

const impl: Service = PROVIDER === 'gemini' ? gm : md

export const visionService: Service = impl

