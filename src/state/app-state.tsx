import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'

import type { Checkpoint, CheckpointStatus } from './checkpoint-data'
import {
  defaultCheckpointGraph,
  getTrackAndCheckpoint,
  updateCheckpointStatus,
} from './checkpoint-data'

export type SessionRole = 'assistant' | 'user' | 'system'

export type SessionEntry = {
  id: string
  role: SessionRole
  content: string
  checkpointId: string | null
  createdAt: string
}

const STATE_VERSION = 2

export type AppState = {
  version: number
  tracks: Checkpoint[]
  activeTrackId: string | null
  activeCheckpointId: string | null
  sessionLog: SessionEntry[]
}

type AppStateAction =
  | { type: 'set-active-track'; trackId: string }
  | { type: 'set-active-checkpoint'; checkpointId: string }
  | { type: 'mark-checkpoint-status'; checkpointId: string; status: CheckpointStatus }
  | { type: 'append-session-entry'; entry: SessionEntry }
  | { type: 'reset-session' }
  | { type: 'hydrate'; state: AppState }

const STORAGE_KEY = 'prism/app-state'

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined)

function getInitialState(): AppState {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppState>
        if (
          parsed &&
          parsed.version === STATE_VERSION &&
          Array.isArray(parsed.tracks) &&
          parsed.activeTrackId !== undefined &&
          parsed.activeCheckpointId !== undefined &&
          Array.isArray(parsed.sessionLog)
        ) {
          return parsed as AppState
        }
      }
    } catch (error) {
      console.warn('Failed to read app state from storage', error)
    }
  }

  const initialTrackId = defaultCheckpointGraph[0]?.id ?? null

  return {
    version: STATE_VERSION,
    tracks: defaultCheckpointGraph,
    activeTrackId: initialTrackId,
    activeCheckpointId: initialTrackId,
    sessionLog: [],
  }
}

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'set-active-track': {
      if (state.activeTrackId === action.trackId) {
        return state
      }
      const track = state.tracks.find((candidate) => candidate.id === action.trackId)
      if (!track) {
        return state
      }
      return {
        ...state,
        activeTrackId: track.id,
        activeCheckpointId: track.id,
      }
    }

    case 'set-active-checkpoint': {
      const { track } = getTrackAndCheckpoint(state.tracks, action.checkpointId)
      if (!track) {
        return state
      }
      return {
        ...state,
        activeTrackId: track.id,
        activeCheckpointId: action.checkpointId,
      }
    }

    case 'mark-checkpoint-status': {
      const { updated, changed } = updateCheckpointStatus(
        state.tracks,
        action.checkpointId,
        action.status,
      )
      if (!changed) {
        return state
      }
      return {
        ...state,
        tracks: updated,
      }
    }

    case 'append-session-entry':
      return {
        ...state,
        sessionLog: [...state.sessionLog, action.entry],
      }

    case 'reset-session':
      return {
        ...state,
        sessionLog: [],
      }

    default:
      return state
  }
}

function createEntryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `entry-${Math.random().toString(36).slice(2, 10)}`
}

type AppStateContextValue = {
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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, undefined, getInitialState)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to persist app state', error)
    }
  }, [state])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return
      }
      try {
        const parsed = JSON.parse(event.newValue) as AppState
        if (parsed.version !== STATE_VERSION) {
          return
        }
        dispatch({ type: 'hydrate', state: parsed })
      } catch (error) {
        console.warn('Failed to sync app state from storage', error)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setActiveTrack = useCallback((trackId: string) => {
    dispatch({ type: 'set-active-track', trackId })
  }, [])

  const setActiveCheckpoint = useCallback((checkpointId: string) => {
    dispatch({ type: 'set-active-checkpoint', checkpointId })
  }, [])

  const markCheckpointStatus = useCallback((checkpointId: string, status: CheckpointStatus) => {
    dispatch({ type: 'mark-checkpoint-status', checkpointId, status })
  }, [])

  const appendSessionEntry = useCallback<
    AppStateContextValue['appendSessionEntry']
  >(({ role, content, checkpointId = null }) => {
    const entry: SessionEntry = {
      id: createEntryId(),
      role,
      content,
      checkpointId,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'append-session-entry', entry })
  }, [])

  const resetSession = useCallback(() => {
    dispatch({ type: 'reset-session' })
  }, [])

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      setActiveTrack,
      setActiveCheckpoint,
      markCheckpointStatus,
      appendSessionEntry,
      resetSession,
    }),
    [state, setActiveTrack, setActiveCheckpoint, markCheckpointStatus, appendSessionEntry, resetSession],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}
