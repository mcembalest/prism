import open from 'open'
import { startServer } from './transports/redis-server.js'

export interface LearningEnvironmentOptions {
  port?: number
  sessionId: string
}

export interface LearningEnvironment {
  url: string
  close: () => Promise<void>
}

// Adapter that hides the Redis-specific server. Tutor code imports only this.
export async function startLearningEnvironment(opts: LearningEnvironmentOptions): Promise<LearningEnvironment> {
  const port = opts.port ?? 3000
  const { server } = await startServer({ port, sessionId: opts.sessionId })
  const url = `http://localhost:${port}`

  // Open the environment in the default browser
  await open(url)

  return {
    url,
    close: async () => new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()))
    })
  }
}
