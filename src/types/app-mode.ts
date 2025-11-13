// App mode type definitions for generalizing SnowKite to support different software products

import type { GuideDefinition } from './guide'

export type AppModeId = 'github' | 'zoom' | 'figma' | 'gcal' | 'rocketalumni'

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
  guides: GuideDefinition[]
  topics: Topic[]
  welcomeMessage?: string
  aiContextPrompt?: string // Optional context to add to AI prompts for this mode
}

