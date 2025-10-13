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
  | 'command'              // Execute a Redis command
  | 'conceptual-question'  // Answer a question about concepts
  | 'prediction'           // Predict what a command will output
  | 'explanation'          // Explain what a command does or why
  | 'worked-example'       // Watch a demonstration, then answer questions
  | 'review'              // Review previously learned material

export interface BaseExercise {
  type: ExerciseType
  feedback: string          // Feedback to show when correct
  hint?: string            // Optional hint if they struggle
  concept?: string         // What concept this reinforces (for review)
}

export interface CommandExercise extends BaseExercise {
  type: 'command'
  command: string           // The exercise command (e.g., "HSET user:1 name Alice")
  expectedPattern?: string  // Regex pattern for expected output
}

export interface ConceptualQuestionExercise extends BaseExercise {
  type: 'conceptual-question'
  question: string          // The question to ask
  options: string[]         // Multiple choice options
  correctIndex: number      // Index of correct option
  explanation: string       // Why this is the correct answer
}

export interface PredictionExercise extends BaseExercise {
  type: 'prediction'
  command: string           // Command they'll predict output for
  question: string          // "What will this command return?"
  options: string[]         // Possible outputs
  correctIndex: number      // Index of correct output
  explanation: string       // Explanation of the result
}

export interface ExplanationExercise extends BaseExercise {
  type: 'explanation'
  command: string           // Command to explain
  question: string          // "Why does this work?" or "What does this do?"
  acceptedKeywords: string[] // Keywords that should appear in answer
  sampleAnswer: string      // Example good answer to show after
}

export interface WorkedExampleExercise extends BaseExercise {
  type: 'worked-example'
  title: string             // Title of the example
  steps: Array<{            // Step-by-step demonstration
    command: string
    narration: string       // Explanation of this step
    output?: string         // Expected output to show
  }>
  followUpQuestion: string  // Question to check understanding
  options: string[]         // Multiple choice options
  correctIndex: number      // Index of correct answer
}

export interface ReviewExercise extends BaseExercise {
  type: 'review'
  reviewTopic: string       // What we're reviewing
  question: string          // Question about prior material
  options: string[]         // Multiple choice
  correctIndex: number      // Index of correct answer
  priorLesson?: string      // Which lesson this reviews
}

export type Exercise =
  | CommandExercise
  | ConceptualQuestionExercise
  | PredictionExercise
  | ExplanationExercise
  | WorkedExampleExercise
  | ReviewExercise

export interface LessonPlan {
  topic: string
  level: 'beginner' | 'intermediate' | 'advanced'
  exercises: Exercise[]
  summary: string          // What they'll learn in this lesson
}
