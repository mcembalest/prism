/**
 * Theme hook
 * Manages theme state (light/dark) and persists to localStorage
 * Syncs across multiple windows via storage events
 * Following React principles: minimal state, proper cleanup, memoized callbacks
 */

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'SnowKite_theme'
const THEME_CHANGE_EVENT = 'snowkite-theme-change'

/**
 * Apply theme to document root
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * Get theme from localStorage or return default
 */
function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    return stored === 'light' || stored === 'dark' ? stored : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Hook for managing theme state
 *
 * @example
 * const { theme, setTheme, toggleTheme } = useTheme()
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  // Apply theme to document root whenever it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for storage changes from other windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as Theme
        if (newTheme === 'light' || newTheme === 'dark') {
          setThemeState(newTheme)
        }
      }
    }

    // Listen for custom theme change events (for same-origin windows)
    const handleThemeChange = (e: CustomEvent<Theme>) => {
      setThemeState(e.detail)
    }

    // Sync theme when window becomes visible (in case we missed events)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const stored = getStoredTheme()
        if (stored !== theme) {
          setThemeState(stored)
        }
      }
    }

    // Poll localStorage periodically as fallback (for Tauri windows that might not share events)
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        const stored = getStoredTheme()
        if (stored !== theme) {
          setThemeState(stored)
        }
      }
    }, 500) // Check every 500ms

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(THEME_CHANGE_EVENT as any, handleThemeChange as EventListener)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(THEME_CHANGE_EVENT as any, handleThemeChange as EventListener)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [theme])

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
      setThemeState(newTheme)
      // Apply immediately (storage event doesn't fire in same window)
      applyTheme(newTheme)
      // Dispatch custom event for other windows in same origin
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: newTheme }))
    } catch (e) {
      console.error('Failed to save theme', e)
    }
  }, [])

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}

