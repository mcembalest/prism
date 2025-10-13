// Generic command stream interface. Current implementation uses Redis transport.
import type { CommandStream as RedisCommandStream, CapturedCommand as RedisCaptured } from './transports/redis-command-stream.js'
import { createRedisCommandStream } from './transports/redis-command-stream.js'

export type CapturedCommand = RedisCaptured

export interface CommandStream {
  subscribe(handler: (cmd: CapturedCommand) => void): Promise<void>
  close(): Promise<void>
}

export function createCommandStream(sessionId: string): CommandStream {
  // For now, use Redis pub/sub channel. This indirection keeps tutor.ts transport-agnostic.
  const channel = process.env.PRISM_COMMAND_CHANNEL || 'prism:commands'
  return createRedisCommandStream(channel, sessionId) as unknown as RedisCommandStream
}

