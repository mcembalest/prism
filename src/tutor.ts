import { createClient } from 'redis'
import { startServer } from './server.js'
import type { SessionContext, LessonPlan, Exercise } from './types.js'
import * as readline from 'readline'
import open from 'open'

/**
 * Prism Tutor Process
 * Subscribes to Redis commands from learning environment
 * Provides coaching feedback in terminal
 */

interface RedisCommand {
  command: string
  terminalOutput: string
  csvOutput: string
  timestamp: string
  sessionId: string
}

interface SessionState {
  context: SessionContext
  currentTopic: string
  mode: 'diagnostic' | 'lesson'
  diagnosticCommands: RedisCommand[]
  lessonPlan?: LessonPlan
  currentExerciseIndex: number
}

// Prompt user for session context
async function getUserSessionContext(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    console.log('What would you like to work on today?')
    console.log('(Press Enter for Redis Hashes)')
    console.log()
    console.log('After you answer, your browser will open with the Redis environment.')
    console.log()
    rl.question('> ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// Get diagnostic starting point
function getDiagnosticCommand(userGoal: string): { topic: string; diagnosticCommand: string } {
  const topicMap: Record<string, { topic: string; diagnosticCommand: string }> = {
    'hash': { topic: 'Redis Hashes', diagnosticCommand: 'HSET user:1 name Alice' },
    'list': { topic: 'Redis Lists', diagnosticCommand: 'LPUSH queue "task1"' },
    'set': { topic: 'Redis Sets', diagnosticCommand: 'SADD tags "redis"' },
    'string': { topic: 'Redis Strings', diagnosticCommand: 'SET counter 0' },
  }

  const goal = userGoal.toLowerCase()
  for (const [keyword, value] of Object.entries(topicMap)) {
    if (goal.includes(keyword)) {
      return value
    }
  }

  return {
    topic: 'Redis Hashes',
    diagnosticCommand: 'HSET user:1 name Alice'
  }
}

// Pre-defined lesson plans for MVP (fast calibration)
function getPreDefinedLesson(topic: string): LessonPlan {
  const lessons: Record<string, LessonPlan> = {
    'Redis Hashes': {
      topic: 'Redis Hashes - Basics',
      level: 'beginner',
      summary: 'Learn to store and retrieve fields in Redis hashes',
      exercises: [
        {
          command: 'HSET user:2 email alice@example.com',
          feedback: 'Perfect! You stored another field in the hash.'
        },
        {
          command: 'HGET user:2 email',
          feedback: 'Great! You retrieved the email field.'
        },
        {
          command: 'HGETALL user:2',
          feedback: 'Excellent! You retrieved all fields from the hash.'
        },
        {
          command: 'HSET product:1 name "Laptop" price 999',
          feedback: 'Nice! You can set multiple fields at once.'
        },
        {
          command: 'HINCRBY product:1 price 50',
          feedback: 'Perfect! You incremented a numeric field.'
        }
      ]
    },
    'Redis Lists': {
      topic: 'Redis Lists - Basics',
      level: 'beginner',
      summary: 'Learn to work with Redis lists',
      exercises: [
        {
          command: 'LPUSH queue "task2"',
          feedback: 'Great! Added to the left of the list.'
        },
        {
          command: 'RPUSH queue "task3"',
          feedback: 'Perfect! Added to the right of the list.'
        },
        {
          command: 'LRANGE queue 0 -1',
          feedback: 'Nice! You viewed all items in the list.'
        },
        {
          command: 'LPOP queue',
          feedback: 'Excellent! Removed from the left.'
        }
      ]
    }
  }

  return lessons[topic] || lessons['Redis Hashes']
}

// Generate personalized lesson plan (simplified for MVP)
async function generatePersonalizedLesson(
  context: SessionContext,
  topic: string,
  diagnosticCommands: RedisCommand[]
): Promise<LessonPlan | null> {
  // For MVP: Use pre-defined lessons for instant calibration
  return getPreDefinedLesson(topic)
}

// Strip ANSI escape codes from command
function stripAnsiCodes(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
}

// Evaluate command locally
function evaluateLocally(state: SessionState, cmd: RedisCommand): string | null {
  if (!state.lessonPlan || state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    return null
  }

  const currentExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
  const cleanCommand = stripAnsiCodes(cmd.command).trim().toUpperCase()
  const expectedCommand = currentExercise.command.trim().toUpperCase()
  const commandMatches = cleanCommand === expectedCommand

  if (commandMatches) {
    if (currentExercise.expectedPattern) {
      const pattern = new RegExp(currentExercise.expectedPattern, 'i')
      if (!pattern.test(cmd.terminalOutput)) {
        return `Hmm, the output doesn't look right. ${currentExercise.hint || 'Try again!'}`
      }
    }

    state.currentExerciseIndex++

    if (state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
      return `🎉 ${currentExercise.feedback}\n\nYou've completed this lesson! Great work on ${state.lessonPlan.topic}.`
    }

    const nextExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
    return `✓ ${currentExercise.feedback}\n\nNext: ${nextExercise.command}`
  }

  return null
}

// Handle command from learning environment
async function handleCommand(state: SessionState, cmd: RedisCommand): Promise<string> {
  if (state.mode === 'diagnostic') {
    state.diagnosticCommands.push(cmd)

    if (state.diagnosticCommands.length >= 2) {
      console.log()
      console.log('⚡ Calibrating your lesson...')
      console.log()

      const lessonPlan = await generatePersonalizedLesson(
        state.context,
        state.currentTopic,
        state.diagnosticCommands
      )

      if (lessonPlan) {
        state.lessonPlan = lessonPlan
        state.mode = 'lesson'
        state.currentExerciseIndex = 0

        return `📚 ${lessonPlan.topic} (${lessonPlan.level})\n${lessonPlan.summary}\n\nLet's start: ${lessonPlan.exercises[0].command}`
      } else {
        return 'Sorry, I had trouble generating your lesson. Let\'s continue with basics.'
      }
    }

    return 'Good! One more to calibrate your level. Try: HGET user:1 name'
  }

  const localEval = evaluateLocally(state, cmd)
  if (localEval) {
    return localEval
  }

  return '🤔 That\'s not what I expected. Try the suggested command!'
}

// Main tutor process
async function runTutor() {
  console.log('━'.repeat(60))
  console.log('🎓 Prism Tutor')
  console.log('━'.repeat(60))
  console.log()

  // Get session context
  const userGoal = await getUserSessionContext()
  const start = getDiagnosticCommand(userGoal)

  const sessionId = `session-${Date.now()}`
  const context: SessionContext = {
    userId: 'demo-user',
    courseId: 'redis-fundamentals',
    sessionId,
    phase: 'tutoring',
    startedAt: new Date().toISOString(),
  }

  const state: SessionState = {
    context,
    currentTopic: start.topic,
    mode: 'diagnostic',
    diagnosticCommands: [],
    currentExerciseIndex: 0,
  }

  console.log()
  console.log(`📚 ${start.topic}`)
  console.log()
  console.log('Starting your learning environment...')
  console.log()

  // Start web server
  const { server, redisPubClient } = await startServer({
    port: 3000,
    sessionId
  })

  // Auto-open browser
  console.log()
  console.log('Opening your learning environment...')
  await open('http://localhost:3000')

  console.log()
  console.log(`Let's see what you know! Try: ${start.diagnosticCommand}`)
  console.log()
  console.log('━'.repeat(60))
  console.log()

  // Subscribe to Redis commands
  const redisSubClient = createClient()
  await redisSubClient.connect()
  console.log('[TUTOR] Connected to Redis')

  await redisSubClient.subscribe('prism:commands', async (message) => {
    console.log('[TUTOR] Received message:', message)
    try {
      const cmd: RedisCommand = JSON.parse(message)
      console.log('[TUTOR] Parsed command:', cmd)

      // Only process commands for this session
      if (cmd.sessionId !== sessionId) {
        console.log('[TUTOR] Ignoring command from different session')
        return
      }

      console.log('[TUTOR] Processing command for this session')
      const feedback = await handleCommand(state, cmd)
      console.log()
      console.log('🎓 ' + feedback)
      console.log()
    } catch (err) {
      console.error('[TUTOR] Error processing command:', err)
    }
  })

  console.log('[TUTOR] Subscribed to prism:commands')
  console.log()
  console.log('✓ Tutor ready - watching your progress...')
  console.log()
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTutor().catch(console.error)
}

export { runTutor }
