// Mode configuration registry
import { githubMode } from './github'
import { zoomMode } from './zoom'
import { figmaMode } from './figma'
import type { AppModeConfig, AppModeId } from '@/types/app-mode'

export const appModes: Record<AppModeId, AppModeConfig> = {
  github: githubMode,
  zoom: zoomMode,
  figma: figmaMode,
}

export const defaultMode: AppModeId = 'zoom'

export function getModeConfig(modeId: AppModeId): AppModeConfig {
  return appModes[modeId] || appModes[defaultMode]
}

export function getAllModes(): AppModeConfig[] {
  return Object.values(appModes)
}

