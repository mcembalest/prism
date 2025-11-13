// Unified type definitions for guides (both AI-generated and static)
import type { Point, BoundingBox } from './coordinates'

// Re-export coordinate types for convenience
export type { Point, BoundingBox }

// ============================================================================
// Guide Types - Unified model for both AI and static guides
// ============================================================================

/**
 * Source of a guide
 * - 'ai': Dynamically generated from user's goal using AI
 * - 'static': Predefined guides from configuration files
 */
export type GuideSource = 'ai' | 'static'

/**
 * Position of the caption relative to the cursor
 * Describes where the caption bubble appears around the cursor point
 */
export type CaptionPosition =
  | 'up'
  | 'up-right'
  | 'right'
  | 'down-right'
  | 'down'
  | 'down-left'
  | 'left'
  | 'up-left'

/**
 * A single step in a guide
 */
export interface GuideStep {
  caption?: string
  instruction: string
  points?: Point[]
  screenshot?: string  // Only populated for AI-generated guides
  captionPosition?: CaptionPosition  // Position of caption relative to cursor (default: 'down-left')
}

/**
 * Guide definition - immutable data describing a guide
 * Can be either AI-generated or statically defined
 */
export interface GuideDefinition {
  id: string
  source: GuideSource

  // Static guide metadata
  title?: string
  topic?: string
  description?: string

  // AI guide metadata
  goal?: string

  // Guide content
  steps: GuideStep[]

  // UI hints
  isRecent?: boolean
}

/**
 * Active guide state - tracks progress through a guide
 * Following React principles: minimal, non-derived state only
 */
export interface ActiveGuideState {
  guide: GuideDefinition
  currentStepIndex: number
  completedSteps: Set<number>
  skippedSteps: Set<number>
  isComplete: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an AI guide definition from a goal
 */
export function createAIGuide(goal: string, id: string = crypto.randomUUID()): GuideDefinition {
  return {
    id,
    source: 'ai',
    goal,
    steps: [],
  }
}

/**
 * Create initial active guide state from a guide definition
 */
export function createActiveGuideState(guide: GuideDefinition): ActiveGuideState {
  return {
    guide,
    currentStepIndex: 0,
    completedSteps: new Set(),
    skippedSteps: new Set(),
    isComplete: false,
  }
}

/**
 * Check if guide has been completed (all steps done or skipped)
 */
export function isGuideComplete(state: ActiveGuideState): boolean {
  const totalSteps = state.guide.steps.length
  const processedSteps = state.completedSteps.size + state.skippedSteps.size
  return totalSteps > 0 && processedSteps >= totalSteps
}

// ============================================================================
// Message Types (for chat interface)
// ============================================================================

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  points?: Point[]
  caption?: string
  variant?: 'assistant' | 'instruction' | 'metadata'
  metadata?: {
    type: 'tool_use' | 'system' | 'thinking'
    toolName?: string
    toolInput?: any
    details?: string
  }
  filesRead?: string[]
}

export type IntentType = 'query' | 'point' | 'detect' | 'walkthrough' | 'text-only'

// ============================================================================
// AI Service Result Types
// ============================================================================

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
  captionPosition?: CaptionPosition
  isComplete: boolean
  request_id?: string
}
