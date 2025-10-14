import { createClient, RedisClientType } from 'redis'
import { createHash } from 'crypto'

/**
 * Session State Manager
 *
 * Manages Redis database allocation and lesson state tracking
 * - Database 0: System metadata (tracks which lessons have saved state)
 * - Databases 1-15: Individual lesson sessions
 *
 * Uses stable lesson IDs (lessonId field) or generates deterministic hash
 * from lesson topic to ensure state tracking survives string changes (emojis, etc.)
 */

const METADATA_DB = 0
const LESSON_DB_START = 1
const LESSON_DB_END = 15
const STATE_KEY_PREFIX = 'prism:lesson:state:'

interface LessonStateMetadata {
  lessonId: string         // Stable identifier
  lessonTopic: string      // Human-readable topic (for display only)
  database: number
  savedAt: string
  sessionId: string
}

export class SessionStateManager {
  private metadataClient: RedisClientType
  private connected: boolean = false
  private lastAllocatedDb: number = LESSON_DB_START - 1

  constructor(
    private redisHost: string = '127.0.0.1',
    private redisPort: number = 6379
  ) {
    this.metadataClient = createClient({
      socket: { host: redisHost, port: redisPort },
      database: METADATA_DB
    })
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.metadataClient.connect()
      this.connected = true
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.metadataClient.quit()
      this.connected = false
    }
  }

  /**
   * Generate stable lesson ID from lesson identifier or topic
   * If lessonId is provided, use it directly
   * Otherwise, generate deterministic hash from topic (stripped of emojis/special chars)
   */
  private generateStableLessonId(lessonIdOrTopic: string): string {
    // If it's already a short alphanumeric ID, use it as-is
    if (/^[a-z0-9_-]{3,32}$/i.test(lessonIdOrTopic)) {
      return lessonIdOrTopic.toLowerCase()
    }

    // Strip emojis and special characters, keep only meaningful content
    const normalized = lessonIdOrTopic
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Collapse multiple dashes

    // Generate deterministic hash for consistency
    const hash = createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 12) // Use first 12 chars

    return `lesson-${hash}`
  }

  /**
   * Check if a lesson has saved state
   */
  async checkLessonHasState(lessonIdOrTopic: string): Promise<boolean> {
    await this.connect()
    const key = this.getLessonStateKey(lessonIdOrTopic)
    const exists = await this.metadataClient.exists(key)
    return exists === 1
  }

  /**
   * Get saved state metadata for a lesson
   */
  async getLessonState(lessonIdOrTopic: string): Promise<LessonStateMetadata | null> {
    await this.connect()
    const key = this.getLessonStateKey(lessonIdOrTopic)
    const data = await this.metadataClient.get(key)
    if (!data) return null
    return JSON.parse(data)
  }

  /**
   * Allocate a Redis database for a new session
   * Uses round-robin allocation from databases 1-15
   */
  allocateDatabase(): number {
    this.lastAllocatedDb++
    if (this.lastAllocatedDb > LESSON_DB_END) {
      this.lastAllocatedDb = LESSON_DB_START
    }
    return this.lastAllocatedDb
  }

  /**
   * Get database number for a lesson (existing or new)
   */
  async getDatabaseForLesson(lessonIdOrTopic: string): Promise<number> {
    const state = await this.getLessonState(lessonIdOrTopic)
    if (state) {
      return state.database
    }
    return this.allocateDatabase()
  }

  /**
   * Save lesson state metadata
   * @param lessonIdOrTopic - Stable lesson ID or topic string
   * @param lessonTopic - Human-readable topic for display
   * @param database - Redis database number
   * @param sessionId - Session identifier
   */
  async saveLessonState(
    lessonIdOrTopic: string,
    lessonTopic: string,
    database: number,
    sessionId: string
  ): Promise<void> {
    await this.connect()
    const lessonId = this.generateStableLessonId(lessonIdOrTopic)
    const key = this.getLessonStateKey(lessonIdOrTopic)
    const metadata: LessonStateMetadata = {
      lessonId,
      lessonTopic,
      database,
      savedAt: new Date().toISOString(),
      sessionId
    }
    await this.metadataClient.set(key, JSON.stringify(metadata))
  }

  /**
   * Clear lesson state (removes metadata, caller should FLUSHDB the database)
   */
  async clearLessonState(lessonIdOrTopic: string): Promise<void> {
    await this.connect()
    const key = this.getLessonStateKey(lessonIdOrTopic)
    await this.metadataClient.del(key)
  }

  /**
   * Clear a specific Redis database
   * This should be called by the caller with proper client connection
   */
  async flushDatabase(database: number): Promise<void> {
    // Create a temporary client for the target database
    const client = createClient({
      socket: { host: this.redisHost, port: this.redisPort },
      database
    })

    await client.connect()
    await client.flushDb()
    await client.quit()
  }

  /**
   * Get all lessons with saved state
   */
  async getAllSavedLessons(): Promise<LessonStateMetadata[]> {
    await this.connect()
    const pattern = STATE_KEY_PREFIX + '*'
    const keys = await this.metadataClient.keys(pattern)

    const lessons: LessonStateMetadata[] = []
    for (const key of keys) {
      const data = await this.metadataClient.get(key)
      if (data) {
        lessons.push(JSON.parse(data))
      }
    }

    return lessons
  }

  private getLessonStateKey(lessonIdOrTopic: string): string {
    // Generate stable ID (handles emojis, special chars, etc.)
    const stableId = this.generateStableLessonId(lessonIdOrTopic)
    return STATE_KEY_PREFIX + stableId
  }
}

// Singleton instance
let stateManagerInstance: SessionStateManager | null = null

export function getStateManager(): SessionStateManager {
  if (!stateManagerInstance) {
    stateManagerInstance = new SessionStateManager()
  }
  return stateManagerInstance
}
