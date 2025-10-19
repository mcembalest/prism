// import { moondreamService as md } from '@/services/moondream'
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

type Service = {
  query(imageDataUrl: string, question: string): Promise<QueryResult>
  point(imageDataUrl: string, object: string): Promise<PointResult>
  detect(imageDataUrl: string, object: string): Promise<DetectResult>
  walkthrough(imageDataUrl: string, question: string): Promise<WalkthroughResult>
  walkthroughNextStep(
    imageDataUrl: string,
    goal: string,
    previousSteps: string[]
  ): Promise<WalkthroughStepResult>
}

// Use Gemini by default and manage keys via Settings (localStorage).
// This avoids relying on build-time .env secrets.
const impl: Service = gm

export const visionService: Service = impl
