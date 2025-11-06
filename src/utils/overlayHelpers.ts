/**
 * Screen overlay helper functions
 * Consolidates duplicate overlay management logic
 */

import { invoke } from '@tauri-apps/api/core'
import type { Point, ActiveGuideState, CaptionPosition } from '@/types/guide'
import { TAURI_COMMANDS } from './constants'

export interface OverlayData extends Record<string, unknown> {
  points: Point[]
  walkthrough_steps: number
  current_step: number
  instruction: string
  caption: string
  caption_position?: CaptionPosition
  is_complete: boolean
}

/**
 * Opens the screen overlay window
 */
export async function openOverlay(): Promise<void> {
  try {
    await invoke(TAURI_COMMANDS.OPEN_OVERLAY)
  } catch (error) {
    console.error('[Overlay] Failed to open overlay:', error)
    throw error
  }
}

/**
 * Updates the overlay with data for a specific guide step
 */
export async function updateOverlayForStep(
  guideState: ActiveGuideState,
  stepIndex: number
): Promise<void> {
  const step = guideState.guide.steps[stepIndex]

  if (!step) {
    console.error('[Overlay] Invalid step index:', stepIndex)
    return
  }

  const overlayData: OverlayData = {
    points: step.points || [],
    walkthrough_steps: guideState.guide.steps.length,
    current_step: stepIndex + 1,
    instruction: step.instruction,
    caption: step.caption || guideState.guide.title || guideState.guide.goal || '',
    caption_position: step.captionPosition,
    is_complete: guideState.isComplete,
  }

  try {
    await invoke(TAURI_COMMANDS.UPDATE_OVERLAY, overlayData)
  } catch (error) {
    console.error('[Overlay] Failed to update overlay:', error)
    throw error
  }
}

/**
 * Closes the screen overlay window with optional delay
 */
export async function closeOverlay(delayMs: number = 0): Promise<void> {
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  try {
    await invoke(TAURI_COMMANDS.CLOSE_OVERLAY)
  } catch (error) {
    console.error('[Overlay] Failed to close overlay:', error)
    // Don't throw - closing overlay failure is not critical
  }
}

/**
 * Updates overlay to show completion state
 */
export async function updateOverlayComplete(
  guideState: ActiveGuideState
): Promise<void> {
  const finalStep = guideState.guide.steps[guideState.guide.steps.length - 1]

  const overlayData: OverlayData = {
    points: [],
    walkthrough_steps: guideState.guide.steps.length,
    current_step: guideState.guide.steps.length,
    instruction: finalStep?.instruction || 'Guide complete!',
    caption: guideState.guide.title || guideState.guide.goal || '',
    is_complete: true,
  }

  try {
    await invoke(TAURI_COMMANDS.UPDATE_OVERLAY, overlayData)
  } catch (error) {
    console.error('[Overlay] Failed to update overlay for completion:', error)
    throw error
  }
}
