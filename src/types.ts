/**
 * Minimal types for the Prism tutoring system
 * All data is stored as markdown files - these types are just for in-memory representation
 */

export type SessionPhase =
  | 'personalize'      // Initial calibration and setup
  | 'tutoring'         // Active learning session
  | 'complete'         // Session finished

export interface SessionContext {
  userId: string
  courseId: string
  sessionId: string
  phase: SessionPhase
  startedAt: string
}

export interface UserContext {
  userId: string
  summary?: string     // Brief summary from user profile
}

export interface CourseContext {
  courseId: string
  summary?: string     // Brief summary of course materials
}

export interface Exercise {
  command: string           // The exercise command (e.g., "HSET user:1 name Alice")
  expectedPattern?: string  // Regex pattern for expected output
  feedback: string          // Feedback to show when correct
  hint?: string            // Optional hint if they struggle
}

export interface LessonPlan {
  topic: string
  level: 'beginner' | 'intermediate' | 'advanced'
  exercises: Exercise[]
  summary: string          // What they'll learn in this lesson
}
