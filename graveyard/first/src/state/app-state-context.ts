import { createContext, useContext } from 'react'

import type { Checkpoint, CheckpointStatus } from './checkpoint-data'

export type SessionRole = 'tutor' | 'user' | 'system'

export type SessionEntry = {
  id: string
  role: SessionRole
  content: string
  checkpointId: string | null
  createdAt: string
}

export type AppState = {
  version: number
  tracks: Checkpoint[]
  activeTrackId: string | null
  activeCheckpointId: string | null
  sessionLog: SessionEntry[]
}

export type AppStateContextValue = {
  state: AppState
  setActiveTrack: (trackId: string) => void
  setActiveCheckpoint: (checkpointId: string) => void
  markCheckpointStatus: (checkpointId: string, status: CheckpointStatus) => void
  appendSessionEntry: (payload: {
    role: SessionRole
    content: string
    checkpointId?: string | null
  }) => void
  resetSession: () => void
}

export const AppStateContext = createContext<AppStateContextValue | undefined>(undefined)

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}
