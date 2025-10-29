// App mode type definitions for generalizing Lighthouse to support different software products

import type { PrebuiltGuide } from './walkthrough'

export type AppModeId = 'github' | 'zoom' | 'figma'

export interface Topic {
  id: string
  name: string
  description?: string
  icon: string
}

export interface AppModeConfig {
  id: AppModeId
  name: string
  description: string
  icon?: string
  guides: PrebuiltGuide[]
  topics: Topic[]
  welcomeMessage?: string
  aiContextPrompt?: string // Optional context to add to AI prompts for this mode
}

