export type ObservationType = 'progress' | 'milestone' | 'attention'

export type Observation = {
  id: string
  type: ObservationType
  message: string
  checkpointId?: string | null
  payload?: Record<string, unknown>
  createdAt: string
}

type Listener = (observation: Observation) => void

function createObservationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `observation-${Math.random().toString(36).slice(2, 10)}`
}

class ScreenTracker {
  private listeners = new Set<Listener>()

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(data: Omit<Observation, 'id' | 'createdAt'>): Observation {
    const observation: Observation = {
      id: createObservationId(),
      createdAt: new Date().toISOString(),
      ...data,
    }
    for (const listener of this.listeners) {
      listener(observation)
    }
    return observation
  }
}

const screenTracker = new ScreenTracker()

export function subscribeToObservations(listener: Listener) {
  return screenTracker.subscribe(listener)
}

export function emitObservation(data: Omit<Observation, 'id' | 'createdAt'>) {
  return screenTracker.emit(data)
}

export function createManualObservation(
  message: string,
  checkpointId?: string,
  type: ObservationType = 'progress',
  payload?: Record<string, unknown>,
) {
  return emitObservation({
    message,
    checkpointId,
    type,
    payload,
  })
}
