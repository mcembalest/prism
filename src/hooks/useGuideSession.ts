/**
 * Guide session hook
 * Unified logic for managing both AI-generated and static guides
 * Following React principles: minimal state, proper cleanup, memoized callbacks
 */

import { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { geminiService } from '@/services/gemini'
import { createAssistantMessage } from '@/utils/messageHelpers'
import { TIMING, TAURI_COMMANDS } from '@/utils/constants'
import type {
  GuideDefinition,
  ActiveGuideState,
  GuideStep,
  Message,
} from '@/types/guide'
import { createAIGuide } from '@/types/guide'
import type { AppModeConfig } from '@/types/app-mode'

export interface UseGuideSessionOptions {
  /** Function to add a single message */
  addMessage: (message: Message) => void

  /** Function to set all messages (for starting a new guide) */
  setMessages: (messages: Message[]) => void

  /** Overlay manager from useOverlayManager hook */
  overlayManager: ReturnType<typeof import('./useOverlayManager').useOverlayManager>

  /** App mode configuration for AI context */
  modeConfig: AppModeConfig
}

export interface UseGuideSessionReturn {
  /** Currently active guide state, or null */
  activeGuide: ActiveGuideState | null

  /** Whether an AI operation is in progress */
  isProcessing: boolean

  /** Status message during processing */
  statusMessage: string

  /** Start a new guide (static or create AI guide from goal) */
  startGuide: (guideOrGoal: GuideDefinition | string) => Promise<void>

  /** Proceed to next step */
  proceedStep: () => Promise<void>

  /** Skip current step (static guides only) */
  skipStep: () => Promise<void>

  /** End the current guide */
  endGuide: () => void
}

/**
 * Hook for managing guide sessions (both AI and static)
 *
 * Unifies the logic for running pre-built guides and AI-generated walkthroughs.
 * Handles step progression, overlay updates, and AI integration.
 *
 * @example
 * const guide = useGuideSession({
 *   addMessage,
 *   setMessages,
 *   overlayManager,
 *   modeConfig
 * })
 *
 * // Start a static guide
 * await guide.startGuide(staticGuideDefinition)
 *
 * // Or start an AI guide
 * await guide.startGuide("Help me create a GitHub repo")
 */
export function useGuideSession(options: UseGuideSessionOptions): UseGuideSessionReturn {
  const { addMessage, setMessages, overlayManager, modeConfig } = options

  const [activeGuide, setActiveGuide] = useState<ActiveGuideState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  /**
   * Helper: Update overlay for a specific step
   */
  const updateOverlayForStep = useCallback(
    async (guideState: ActiveGuideState, stepIndex: number) => {
      const step = guideState.guide.steps[stepIndex]
      if (!step) return

      // DEBUG: Log captionPosition at source
      console.log('[useGuideSession] Step captionPosition:', step.captionPosition, 'Full step:', step)

      const caption =
        step.caption ||
        guideState.guide.title ||
        guideState.guide.goal ||
        ''

      if (overlayManager.overlayWindowExistsRef.current) {
        await overlayManager.updateOverlay(
          step.points || [],
          guideState.guide.steps.length,
          stepIndex + 1,
          step.instruction,
          caption,
          step.captionPosition,
          guideState.isComplete
        )
      } else {
        await overlayManager.openScreenOverlay(
          step.points || [],
          guideState.guide.steps.length,
          stepIndex + 1,
          step.instruction,
          caption,
          step.captionPosition,
          guideState.isComplete
        )
      }
    },
    [overlayManager]
  )

  /**
   * Start a new guide session
   * @param guideOrGoal - Either a GuideDefinition (static) or a string goal (AI)
   */
  const startGuide = useCallback(
    async (guideOrGoal: GuideDefinition | string) => {
      let guideDef: GuideDefinition

      if (typeof guideOrGoal === 'string') {
        // Create AI guide from goal
        guideDef = createAIGuide(guideOrGoal)
      } else {
        // Use provided guide definition
        guideDef = guideOrGoal
      }

      const newState: ActiveGuideState = {
        guide: guideDef,
        currentStepIndex: 0,
        completedSteps: new Set(),
        skippedSteps: new Set(),
        isComplete: false,
      }

      setActiveGuide(newState)

      // For static guides with steps, show first step
      if (guideDef.source === 'static' && guideDef.steps.length > 0) {
        const firstStep = guideDef.steps[0]
        const stepMessage = createAssistantMessage(`**Step 1:** ${firstStep.instruction}`, {
          variant: 'instruction',
        })
        setMessages([stepMessage])

        // Show overlay for first step
        await updateOverlayForStep(newState, 0)
      }
      // For AI guides, first step will be generated when user proceeds
    },
    [setMessages, updateOverlayForStep]
  )

  /**
   * Proceed to next step (works for both static and AI guides)
   */
  const proceedStep = useCallback(async () => {
    if (!activeGuide || activeGuide.isComplete || isProcessing) {
      console.log('[Guide Session] Cannot proceed:', {
        hasGuide: !!activeGuide,
        isComplete: activeGuide?.isComplete,
        isProcessing,
      })
      return
    }

    const { guide } = activeGuide

    // Branch logic based on guide source
    if (guide.source === 'static') {
      // === STATIC GUIDE LOGIC ===
      const newCompletedSteps = new Set(activeGuide.completedSteps)
      newCompletedSteps.add(activeGuide.currentStepIndex)

      // Check if there are more steps
      if (activeGuide.currentStepIndex + 1 < guide.steps.length) {
        // Move to next step
        const nextStepIndex = activeGuide.currentStepIndex + 1
        const nextStep = guide.steps[nextStepIndex]

        const updatedState: ActiveGuideState = {
          ...activeGuide,
          currentStepIndex: nextStepIndex,
          completedSteps: newCompletedSteps,
        }

        setActiveGuide(updatedState)

        // Add next step message
        const stepMessage = createAssistantMessage(`**Step ${nextStepIndex + 1}:** ${nextStep.instruction}`, {
          variant: 'instruction',
        })
        addMessage(stepMessage)

        // Update overlay
        await updateOverlayForStep(updatedState, nextStepIndex)
      } else {
        // Done
        const updatedState: ActiveGuideState = {
          ...activeGuide,
          completedSteps: newCompletedSteps,
          isComplete: true,
        }

        setActiveGuide(updatedState)

        // Update overlay to show completion
        if (overlayManager.overlayWindowExistsRef.current) {
          await overlayManager.updateOverlay(
            [],
            guide.steps.length,
            guide.steps.length,
            'Done',
            guide.title || '',
            undefined, // no captionPosition for completion message
            true
          )
        }
      }
    } else {
      // === AI GUIDE LOGIC ===
      try {
        setIsProcessing(true)
        setStatusMessage('Preparing for next step...')

        // Close overlay before taking screenshot
        await invoke(TAURI_COMMANDS.CLOSE_OVERLAY)
        overlayManager.overlayWindowExistsRef.current = false

        // Small delay to ensure overlay is fully closed
        await new Promise(resolve => setTimeout(resolve, TIMING.OVERLAY_CLOSE_DELAY))

        setStatusMessage('Taking screenshot for next step...')
        const screenshotDataUrl = await invoke<string>(TAURI_COMMANDS.TAKE_SCREENSHOT)

        setStatusMessage('Determining next step...')
        const previousSteps = guide.steps.map(s => s.instruction)
        const stepResult = await geminiService.walkthroughNextStep(
          screenshotDataUrl,
          guide.goal!,
          previousSteps,
          modeConfig.aiContextPrompt
        )

        console.log('[Guide Session] AI response:', {
          instruction: stepResult.instruction,
          isComplete: stepResult.isComplete,
          pointsCount: stepResult.points.length,
        })

        const newStep: GuideStep = {
          caption: stepResult.caption,
          instruction: stepResult.instruction,
          points: stepResult.points,
          captionPosition: stepResult.captionPosition,
          screenshot: screenshotDataUrl,
        }

        const updatedState: ActiveGuideState = {
          ...activeGuide,
          guide: {
            ...guide,
            steps: [...guide.steps, newStep],
          },
          currentStepIndex: guide.steps.length,
          isComplete: stepResult.isComplete,
        }

        setActiveGuide(updatedState)

        // Update overlay with new step
        await updateOverlayForStep(updatedState, guide.steps.length)

        // Add step message with screenshot
        const assistantMessage = createAssistantMessage(
          `**Step ${guide.steps.length + 1}:** ${newStep.instruction}`,
          {
            image: screenshotDataUrl,
            points: newStep.points,
            caption: newStep.caption,
            variant: 'instruction',
          }
        )
        addMessage(assistantMessage)
      } catch (error) {
        console.error('[Guide Session] Error getting next step:', error)
        setStatusMessage(`Error: ${error}`)
      } finally {
        setIsProcessing(false)
        setStatusMessage('')
      }
    }
  }, [
    activeGuide,
    isProcessing,
    addMessage,
    updateOverlayForStep,
    overlayManager,
    modeConfig,
  ])

  /**
   * Skip current step (static guides only)
   */
  const skipStep = useCallback(async () => {
    if (!activeGuide || activeGuide.isComplete || activeGuide.guide.source !== 'static') {
      return
    }

    const { guide } = activeGuide
    const newSkippedSteps = new Set(activeGuide.skippedSteps)
    newSkippedSteps.add(activeGuide.currentStepIndex)

    // Move to next step if available
    if (activeGuide.currentStepIndex + 1 < guide.steps.length) {
      const nextStepIndex = activeGuide.currentStepIndex + 1
      const nextStep = guide.steps[nextStepIndex]

      const updatedState: ActiveGuideState = {
        ...activeGuide,
        currentStepIndex: nextStepIndex,
        skippedSteps: newSkippedSteps,
      }

      setActiveGuide(updatedState)

      // Add next step message
      const stepMessage = createAssistantMessage(`**Step ${nextStepIndex + 1}:** ${nextStep.instruction}`, {
        variant: 'instruction',
      })
      addMessage(stepMessage)

      // Update overlay
      await updateOverlayForStep(updatedState, nextStepIndex)
    }
  }, [activeGuide, addMessage, updateOverlayForStep])

  /**
   * End the current guide
   */
  const endGuide = useCallback(() => {
    setActiveGuide(null)
    overlayManager.closeOverlay()
  }, [overlayManager])

  return {
    activeGuide,
    isProcessing,
    statusMessage,
    startGuide,
    proceedStep,
    skipStep,
    endGuide,
  }
}
