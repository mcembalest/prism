import { createClient } from 'redis'

export interface CapturedCommand {
  command: string
  terminalOutput: string
  csvOutput: string
  timestamp: string
  sessionId: string
}

export interface CommandStream {
  subscribe(handler: (cmd: CapturedCommand) => void): Promise<void>
  close(): Promise<void>
}

export function createRedisCommandStream(channel: string, expectedSessionId: string): CommandStream {
  const client = createClient()
  let connected = false

  async function ensureConnected() {
    if (!connected) {
      await client.connect()
      connected = true
      await client.subscribe(channel, (message) => {
        try {
          const cmd = JSON.parse(message) as CapturedCommand
          if (!cmd || typeof cmd !== 'object') return
          if (cmd.sessionId !== expectedSessionId) return
          onMessage && onMessage(cmd)
        } catch {
          // ignore malformed messages
        }
      })
    }
  }

  let onMessage: ((cmd: CapturedCommand) => void) | null = null

  return {
    async subscribe(handler: (cmd: CapturedCommand) => void) {
      onMessage = handler
      await ensureConnected()
    },
    async close() {
      try {
        if (connected) {
          await client.quit()
        }
      } catch {
        // ignore errors on close
      }
    }
  }
}

