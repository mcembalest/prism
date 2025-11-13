// Mode configuration registry
import { githubMode } from './github'
import { zoomMode } from './zoom'
import { figmaMode } from './figma'
import type { AppModeConfig, AppModeId } from '@/types/app-mode'
import { googleCalendarMode } from './googleCalendar'
import { rocketalumniMode } from './rocketalumni'

export const appModes: Record<AppModeId, AppModeConfig> = {
  github: githubMode,
  zoom: zoomMode, 
  figma: figmaMode,
  gcal: googleCalendarMode,
  rocketalumni: rocketalumniMode,
}

export const productMode: AppModeId = 'rocketalumni'

export function getModeConfig(modeId: AppModeId): AppModeConfig {
  return appModes[modeId] || appModes[productMode]
}

export function getAllModes(): AppModeConfig[] {
  return Object.values(appModes)
}

