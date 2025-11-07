/**
 * Application-wide constants
 * Consolidates magic numbers and strings for maintainability
 */

// ============================================================================
// Timing Constants (in milliseconds)
// ============================================================================

export const TIMING = {
  /** Duration to flash the keyboard shortcut hint */
  SHORTCUT_FLASH: 800,

  /** Delay before closing overlay after step completion */
  OVERLAY_CLOSE_DELAY: 100,

  /** Delay for typing animation effect */
  TYPING_DELAY: 300,

  /** Delay before showing status messages (thinking, searching) */
  STATUS_DELAY: 250,

  /** Delay before showing ellipsis in AI response */
  ELLIPSIS_DELAY: 1000,

  /** Duration to show "saved" notification */
  SAVE_NOTIFICATION: 2000,
} as const

// ============================================================================
// Event Names (for Tauri event system)
// ============================================================================

export const EVENTS = {
  /** Overlay data update event */
  OVERLAY_DATA: 'overlay-data',

  /** Overlay ready event */
  OVERLAY_READY: 'overlay-ready',

  /** Proceed keyboard shortcut triggered */
  PROCEED_SHORTCUT: 'proceed-shortcut-triggered',

  /** Selection mode changed */
  SELECTION_MODE_CHANGED: 'selection-mode-changed',
} as const

// ============================================================================
// Tauri Commands (for invoke calls)
// ============================================================================

export const TAURI_COMMANDS = {
  /** Open the screen overlay window */
  OPEN_OVERLAY: 'open_screen_overlay',

  /** Update overlay with new data */
  UPDATE_OVERLAY: 'update_screen_overlay_data',

  /** Close the overlay window */
  CLOSE_OVERLAY: 'close_screen_overlay',

  /** Take a screenshot */
  TAKE_SCREENSHOT: 'take_screenshot',

  /** Get clipboard text */
  GET_CLIPBOARD_TEXT: 'get_clipboard_text',

  /** Get focus selection mode status */
  GET_FOCUS_SELECTION_MODE: 'get_focus_selection_mode',
} as const

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  /** Gemini API key storage key */
  GEMINI_API_KEY: 'SnowKite_gemini_api_key',
} as const

// ============================================================================
// View Names
// ============================================================================

export const VIEWS = {
  LANDING: 'landing',
  TOPIC: 'topic',
  ACTIVE_GUIDE: 'activeGuide',
  AI_CHAT: 'aiChat',
} as const

export type ViewName = typeof VIEWS[keyof typeof VIEWS]
