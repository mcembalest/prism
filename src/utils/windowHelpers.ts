/**
 * Window operation helpers
 * Provides safe wrappers for Tauri window operations with browser fallbacks
 */

import { getCurrentWindow } from '@tauri-apps/api/window'

/**
 * Safely executes a window action with browser mode fallback
 * Handles cases where window operations may fail (e.g., in browser mode)
 */
export async function safeWindowAction(
  action: () => Promise<void>,
  fallbackMessage?: string
): Promise<void> {
  try {
    await action()
  } catch (error) {
    if (fallbackMessage) {
      console.log(fallbackMessage)
    } else {
      console.log('[Window] Operation not available in browser mode')
    }
  }
}

/**
 * Safely closes the current window
 */
export async function closeWindow(): Promise<void> {
  await safeWindowAction(
    () => getCurrentWindow().close(),
    'Close (browser mode)'
  )
}

/**
 * Safely minimizes the current window
 */
export async function minimizeWindow(): Promise<void> {
  await safeWindowAction(
    () => getCurrentWindow().minimize(),
    'Minimize (browser mode)'
  )
}

/**
 * Safely maximizes the current window
 */
export async function maximizeWindow(): Promise<void> {
  await safeWindowAction(
    () => getCurrentWindow().maximize(),
    'Maximize (browser mode)'
  )
}

/**
 * Safely toggles window maximize state
 */
export async function toggleMaximize(): Promise<void> {
  await safeWindowAction(
    () => getCurrentWindow().toggleMaximize(),
    'Toggle maximize (browser mode)'
  )
}

/**
 * Safely hides the current window
 */
export async function hideWindow(): Promise<void> {
  await safeWindowAction(
    () => getCurrentWindow().hide(),
    'Hide (browser mode)'
  )
}

/**
 * Safely shows the current window
 */
export async function showWindow(): Promise<void> {
  await safeWindowAction(
    () => getCurrentWindow().show(),
    'Show (browser mode)'
  )
}
