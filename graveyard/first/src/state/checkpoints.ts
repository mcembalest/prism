import { useMemo } from 'react'

import { useAppState } from './app-state-context'
import { flattenCheckpointTree, findCheckpointInTree } from './checkpoint-data'

export type { Checkpoint, CheckpointStatus } from './checkpoint-data'
export { defaultCheckpointGraph } from './checkpoint-data'
export { flattenCheckpointTree, findCheckpointInTree } from './checkpoint-data'

export function useCheckpointProgress() {
  const {
    state,
    setActiveTrack,
    setActiveCheckpoint,
    markCheckpointStatus,
    appendSessionEntry,
    resetSession,
  } = useAppState()

  const activeTrack = useMemo(() => {
    if (!state.activeTrackId) {
      return null
    }
    return state.tracks.find((track) => track.id === state.activeTrackId) ?? null
  }, [state.tracks, state.activeTrackId])

  const activeCheckpoint = useMemo(() => {
    if (!activeTrack) {
      return null
    }
    const targetId = state.activeCheckpointId ?? activeTrack.id
    if (targetId === activeTrack.id) {
      return activeTrack
    }
    return findCheckpointInTree(activeTrack.children ?? [], targetId)
  }, [activeTrack, state.activeCheckpointId])

  const flattenedActiveGraph = useMemo(
    () => (activeCheckpoint ? flattenCheckpointTree(activeCheckpoint) : []),
    [activeCheckpoint],
  )

  const otherTracks = useMemo(
    () => state.tracks.filter((track) => track.id !== state.activeTrackId),
    [state.tracks, state.activeTrackId],
  )

  return {
    tracks: state.tracks,
    otherTracks,
    activeTrack,
    activeTrackId: state.activeTrackId,
    activeCheckpoint,
    activeCheckpointId: state.activeCheckpointId,
    flattenedActiveGraph,
    sessionLog: state.sessionLog,
    setActiveTrack,
    setActiveCheckpoint,
    markCheckpointStatus,
    appendSessionEntry,
    resetSession,
  }
}
