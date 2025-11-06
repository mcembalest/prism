import { useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Point } from '@/types/walkthrough'
import type { CaptionPosition } from '@/types/guide'

export function useOverlayManager() {
    const overlayWindowExistsRef = useRef<boolean>(false)

    const openScreenOverlay = async (
        points: Point[] = [],
        walkthroughSteps?: number,
        currentStep?: number,
        instruction?: string,
        caption?: string,
        captionPosition?: CaptionPosition,
        isComplete?: boolean
    ) => {
        try {
            await invoke('open_screen_overlay', {
                points,
                walkthrough_steps: walkthroughSteps,
                current_step: currentStep,
                instruction,
                caption,
                caption_position: captionPosition,
                is_complete: isComplete
            })
            overlayWindowExistsRef.current = true
        } catch (error) {
            console.error('Failed to open screen overlay:', error)
            overlayWindowExistsRef.current = false
        }
    }

    const updateOverlay = async (
        points: Point[],
        walkthroughSteps: number,
        currentStep: number,
        instruction: string,
        caption: string,
        captionPosition?: CaptionPosition,
        isComplete: boolean = false
    ) => {
        try {
            if (overlayWindowExistsRef.current) {
                await invoke('update_screen_overlay_data', {
                    points,
                    walkthrough_steps: walkthroughSteps,
                    current_step: currentStep,
                    instruction,
                    caption,
                    caption_position: captionPosition,
                    is_complete: isComplete
                })
            } else {
                await openScreenOverlay(
                    points,
                    walkthroughSteps,
                    currentStep,
                    instruction,
                    caption,
                    captionPosition,
                    isComplete
                )
            }
        } catch (error) {
            console.error('Error updating overlay:', error)
            overlayWindowExistsRef.current = false
        }
    }

    const closeOverlay = async () => {
        try {
            if (overlayWindowExistsRef.current) {
                await invoke('close_screen_overlay')
                overlayWindowExistsRef.current = false
            }
        } catch (error) {
            console.error('Error closing overlay:', error)
        }
    }

    return {
        openScreenOverlay,
        updateOverlay,
        closeOverlay,
        overlayWindowExistsRef
    }
}

