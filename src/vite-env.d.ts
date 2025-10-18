/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_MOONDREAM_API_KEY?: string
  readonly VITE_VISION_PROVIDER?: 'moondream' | 'gemini'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

