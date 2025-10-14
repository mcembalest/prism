import open from 'open'
import { startServer, TutorBridge } from './transports/redis-server.js'

export interface LearningEnvironmentOptions {
  port?: number
  sessionId: string
  redisDb?: number
  courseArtifacts?: any
  onCourseSelected?: (courseName: string) => void
}

export interface LearningEnvironment {
  url: string
  close: () => Promise<void>
  tutorBridge: TutorBridge
}

// Adapter that hides the Redis-specific server. Tutor code imports only this.
export async function startLearningEnvironment(opts: LearningEnvironmentOptions): Promise<LearningEnvironment> {
  const port = opts.port ?? 3000
  const redisDb = opts.redisDb ?? 1
  const { server, tutorBridge } = await startServer({
    port,
    sessionId: opts.sessionId,
    redisDb,
    courseArtifacts: opts.courseArtifacts,
    onCourseSelected: opts.onCourseSelected
  })
  const url = `http://localhost:${port}`

  // Open the environment in the default browser
  await open(url)

  return {
    url,
    tutorBridge,
    close: async () => new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()))
    })
  }
}
