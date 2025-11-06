// Shared type definitions for walkthrough functionality
import type { Point, BoundingBox } from './coordinates'

// Re-export coordinate types for convenience
export type { Point, BoundingBox }

export interface QueryResult {
  answer: string
  request_id?: string
}

export interface PointResult {
  points: Point[]
  request_id?: string
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
  caption: string
  instruction: string
  points: Point[]
  isComplete: boolean
  request_id?: string
}

export interface WalkthroughStep {
  stepNumber: number
  screenshot: string
  caption: string
  instruction: string
  points: Point[]
}

export interface WalkthroughSession {
  goal: string
  steps: WalkthroughStep[]
  currentStepIndex: number
  isActive: boolean
  isComplete: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  points?: Point[]
  caption?: string
  variant?: 'assistant' | 'instruction'
}

export type IntentType = 'query' | 'point' | 'detect' | 'walkthrough' | 'text-only'

// Pre-built guide types
export interface PrebuiltStep {
  instruction: string
  caption?: string
  points?: Point[]
}

export interface PrebuiltGuide {
  id: string
  title: string
  topic: string
  description?: string
  steps: PrebuiltStep[]
  isRecent?: boolean
  isCompleted?: boolean
  inProgress?: boolean
}

export interface PrebuiltGuideSession {
  guide: PrebuiltGuide
  currentStepIndex: number
  completedSteps: Set<number>
  skippedSteps: Set<number>
  isComplete: boolean
}
