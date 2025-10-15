import { useState, useEffect } from 'react'
import { getCurrentWindow, Window } from '@tauri-apps/api/window'

/**
 * Hook to check if code is running in Tauri environment
 */
export function useIsTauri(): boolean {
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    // Check if Tauri internals are available
    setIsTauri(
      typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in window
    )
  }, [])

  return isTauri
}

/**
 * Hook to safely get the current Tauri window
 * Returns null if not in Tauri environment or if window is not ready
 */
export function useTauriWindow(): Window | null {
  const [tauriWindow, setTauriWindow] = useState<Window | null>(null)
  const isTauri = useIsTauri()

  useEffect(() => {
    if (isTauri) {
      try {
        const win = getCurrentWindow()
        setTauriWindow(win)
      } catch (error) {
        console.warn('Failed to get Tauri window:', error)
        setTauriWindow(null)
      }
    }
  }, [isTauri])

  return tauriWindow
}

/**
 * Utility to safely execute Tauri window operations
 * Prevents errors when running in browser during development
 */
export function safeTauriOperation<T>(
  operation: () => T,
  fallback?: () => void
): void {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      operation()
    } catch (error) {
      console.error('Tauri operation failed:', error)
    }
  } else {
    // Running in browser - call fallback or log
    if (fallback) {
      fallback()
    } else {
      console.log('Tauri operation skipped (not in Tauri environment)')
    }
  }
}
