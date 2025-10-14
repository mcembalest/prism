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

export type ExerciseType =
  | 'command'              // Execute a Redis command in the CLI
  | 'worked-example'       // Demonstrate a concept by executing commands
  | 'teach'                // Present teaching content, then guide to try commands

export interface BaseExercise {
  type: ExerciseType
  feedback: string          // Feedback to show when correct
  hint?: string            // Optional hint if they struggle
  concept?: string         // What concept this reinforces (for review)
}

export interface CommandExercise extends BaseExercise {
  type: 'command'
  prompt: string            // What to tell the student (e.g., "Now try setting a name field")
  command: string           // The command they should execute
  expectedPattern?: string  // Regex pattern for expected output
  teachingPoint?: string    // Concept explanation after they complete it
}

export interface TeachExercise extends BaseExercise {
  type: 'teach'
  content: string           // Teaching content to present
  guidedCommands: Array<{   // Series of commands to guide them through
    prompt: string          // What to tell them to try
    command: string         // Expected command
    teachingPoint: string   // What to explain after they do it
  }>
}

export interface WorkedExampleExercise extends BaseExercise {
  type: 'worked-example'
  title: string             // Title of the example
  narration: string         // What concept this demonstrates
  steps: Array<{            // Step-by-step demonstration
    command: string         // Command to execute in CLI
    explanation: string     // What this step shows
    expectedOutput?: string // What to expect
  }>
  followUpCommand?: {       // Optional command for them to try
    prompt: string
    command: string
    teachingPoint: string
  }
}

export type Exercise =
  | CommandExercise
  | TeachExercise
  | WorkedExampleExercise

export type StatePolicy = 'always_clear' | 'user_choice' | 'persist'

export interface LessonPlan {
  lessonId?: string        // Stable identifier (if not provided, hash of topic will be used)
  topic: string
  level: 'beginner' | 'intermediate' | 'advanced'
  exercises: Exercise[]
  summary: string          // What they'll learn in this lesson
  statePolicy?: StatePolicy // How to handle Redis state (default: 'user_choice')
}

// ============================================================================
// NEW: Skill Graph Types (generic, domain-agnostic)
// ============================================================================

export interface ValidationAction {
  actionPattern: string    // Regex pattern matching the action (e.g., "SET \\w+ .+")
  expectedOutput: string   // Natural language or pattern describing expected result
}

export interface Skill {
  id: string              // Stable identifier (e.g., "redis-set-string")
  name: string            // Human-readable name
  prerequisites: string[] // Array of skill IDs that must be mastered first
  validationActions: ValidationAction[] // Actions that demonstrate mastery
}

export interface SkillGraph {
  skills: Skill[]
}

export interface Activity {
  id: string
  name: string
  targetSkills: string[]  // Skills this activity teaches/validates
  exercises: Exercise[]   // Reuse existing exercise types
  level: 'beginner' | 'intermediate' | 'advanced'
  summary: string
  diagnostic?: {          // Optional: calibration commands before starting
    keywords: string[]    // Keywords to match this activity (for search)
    commands: string[]    // Commands to assess current skill level
  }
}

export interface CourseManifest {
  courseId: string
  name: string
  description: string
  entrySkills: string[]   // Skill IDs where students typically start
}
