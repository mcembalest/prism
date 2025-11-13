/**
 * Keyboard shortcuts hook
 * Manages global keyboard shortcut listeners
 * Following React principles: proper cleanup, memoized callbacks
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import { EVENTS, TIMING } from '@/utils/constants'

export interface UseKeyboardShortcutsReturn {
  /** Whether to show the keyboard shortcut flash notification */
  showShortcutFlash: boolean

  /** Register a handler to be called when proceed shortcut is triggered */
  registerProceedHandler: (handler: (() => Promise<void>) | null) => void
}

/**
 * Hook for managing global keyboard shortcuts
 *
 * Listens for the proceed shortcut (Cmd+Enter) and executes the registered handler.
 * Prevents double execution and shows a flash notification.
 *
 * @example
 * const { showShortcutFlash, registerProceedHandler } = useKeyboardShortcuts()
 *
 * // Register handler
 * useEffect(() => {
 *   registerProceedHandler(async () => {
 *     await proceedToNextStep()
 *   })
 * }, [registerProceedHandler, proceedToNextStep])
 */
export function useKeyboardShortcuts(): UseKeyboardShortcutsReturn {
  const [showShortcutFlash, setShowShortcutFlash] = useState(false)

  // Refs to track handler and prevent double execution
  const proceedHandlerRef = useRef<(() => Promise<void>) | null>(null)
  const isExecutingShortcut = useRef<boolean>(false)

  // Register a proceed handler (memoized)
  const registerProceedHandler = useCallback((handler: (() => Promise<void>) | null) => {
    proceedHandlerRef.current = handler
    console.log('[Keyboard Shortcuts] Handler registered:', !!handler)
  }, [])

  // Listen for global keyboard shortcut to proceed to next step
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      unlisten = await listen(EVENTS.PROCEED_SHORTCUT, async () => {
        console.log('[Keyboard Shortcuts] Cmd+Enter pressed')

        // Prevent double execution from multiple listeners
        if (isExecutingShortcut.current) {
          console.log('[Keyboard Shortcuts] Already executing, ignoring duplicate trigger')
          return
        }

        // Show flash notification
        setShowShortcutFlash(true)
        setTimeout(() => setShowShortcutFlash(false), TIMING.SHORTCUT_FLASH)

        console.log('[Keyboard Shortcuts] Current state:', {
          hasHandler: !!proceedHandlerRef.current,
        })

        if (proceedHandlerRef.current) {
          isExecutingShortcut.current = true
          try {
            await proceedHandlerRef.current()
          } catch (err) {
            console.error('[Keyboard Shortcuts] Error executing proceed handler:', err)
          } finally {
            isExecutingShortcut.current = false
          }
        } else {
          console.warn('[Keyboard Shortcuts] No handler registered')
        }
      })
      console.log('[Keyboard Shortcuts] Listener registered successfully')
    }

    setupListener()

    return () => {
      if (unlisten) {
        console.log('[Keyboard Shortcuts] Unregistering listener')
        unlisten()
      }
    }
  }, [])

  return {
    showShortcutFlash,
    registerProceedHandler,
  }
}
