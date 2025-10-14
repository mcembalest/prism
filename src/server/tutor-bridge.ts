export interface ProgressUpdate {
  topic?: string
  exerciseIndex?: number
  totalExercises?: number
  currentExercise?: string
  exerciseStates?: string[]
}

export interface TutorBridge {
  sendMessage: (message: string, messageType?: string) => void
  sendProgress: (progress: ProgressUpdate) => void
  onHintRequest: (handler: () => void) => void
  onSkipRequest: (handler: () => void) => void
  onClearStateRequest: (handler: () => void) => void
  triggerHintRequest: () => void
  triggerSkipRequest: () => void
  triggerClearStateRequest: () => void
  setSender: (sender: (payload: string) => void) => void
  flushDatabase: () => Promise<void>
}

export function createTutorBridge(options: { flushDatabase: () => Promise<void> }): TutorBridge {
  let hintHandler: (() => void) | null = null
  let skipHandler: (() => void) | null = null
  let clearStateHandler: (() => void) | null = null

  let sender: ((payload: string) => void) | null = null
  const queue: string[] = []

  function sendOrQueue(payload: string) {
    if (sender) {
      try {
        sender(payload)
        return
      } catch {
        // fallback to queue
      }
    }
    queue.push(payload)
  }

  function flushQueue() {
    while (queue.length > 0 && sender) {
      const p = queue.shift()!
      try {
        sender(p)
      } catch {
        // stop flushing on error
        queue.unshift(p)
        break
      }
    }
  }

  return {
    sendMessage(message: string, messageType: string = 'tutor') {
      const payload = JSON.stringify({ type: 'tutor-message', message, messageType })
      sendOrQueue(payload)
    },
    sendProgress(progress: ProgressUpdate) {
      const payload = JSON.stringify({ type: 'progress-update', ...progress })
      sendOrQueue(payload)
    },
    onHintRequest(handler: () => void) {
      hintHandler = handler
    },
    onSkipRequest(handler: () => void) {
      skipHandler = handler
    },
    onClearStateRequest(handler: () => void) {
      clearStateHandler = handler
    },
    triggerHintRequest() {
      hintHandler && hintHandler()
    },
    triggerSkipRequest() {
      skipHandler && skipHandler()
    },
    triggerClearStateRequest() {
      clearStateHandler && clearStateHandler()
    },
    setSender(fn: (payload: string) => void) {
      sender = fn
      flushQueue()
    },
    async flushDatabase() {
      await options.flushDatabase()
    }
  }
}

