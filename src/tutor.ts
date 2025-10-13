import { startLearningEnvironment } from './environment.js'
import type { SessionContext, LessonPlan } from './types.js'
import * as readline from 'readline'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { createCommandStream, type CapturedCommand } from './command-stream.js'

/**
 * Prism Tutor Process
 * Subscribes to command stream from learning environment
 * Provides coaching feedback in terminal
 */

interface SessionState {
  context: SessionContext
  currentTopic: string
  mode: 'diagnostic' | 'lesson'
  diagnosticCommands: CapturedCommand[]
  lessonPlan?: LessonPlan
  currentExerciseIndex: number
  diagnosticDef?: DiagnosticDef
  tutorBridge?: any // Will be set after environment starts
  exerciseStates: string[] // 'untouched', 'current', 'completed', 'skipped'
}

// Prompt user for session context
async function getUserSessionContext(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    console.log('What would you like to work on today?')
    console.log('(Press Enter to continue)')
    console.log()
    console.log('After you answer, your browser will open with the learning environment.')
    console.log()
    rl.question('> ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// Parsed course artifacts
interface DiagnosticDef {
  topic: string
  lessonTopic?: string
  keywords: string[]
  diagnostics: string[]
}

interface CourseArtifacts {
  diagnostics: DiagnosticDef[]
  lessons: LessonPlan[]
}

// Loaded course artifacts cache for this process
let loadedArtifacts: CourseArtifacts = { diagnostics: [], lessons: [] }

async function loadCourseArtifacts(courseId: string): Promise<CourseArtifacts> {
  const baseDir = path.resolve(process.cwd(), 'data', 'courses', courseId)
  const files = await readdir(baseDir)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const diagnostics: DiagnosticDef[] = []
  const lessons: LessonPlan[] = []

  for (const f of mdFiles) {
    const fullPath = path.join(baseDir, f)
    const content = await readFile(fullPath, 'utf8')

    // Extract prism-diagnostic blocks (JSON)
    const diagRegex = /```\s*prism-diagnostic\s*\n([\s\S]*?)```/g
    let m: RegExpExecArray | null
    while ((m = diagRegex.exec(content)) !== null) {
      try {
        const obj = JSON.parse(m[1]) as DiagnosticDef
        if (obj && obj.topic && Array.isArray(obj.keywords) && Array.isArray(obj.diagnostics)) {
          diagnostics.push(obj)
        }
      } catch {}
    }

    // Extract prism-lesson blocks (JSON)
    const lessonRegex = /```\s*prism-lesson\s*\n([\s\S]*?)```/g
    let lm: RegExpExecArray | null
    while ((lm = lessonRegex.exec(content)) !== null) {
      try {
        const obj = JSON.parse(lm[1]) as LessonPlan
        if (obj && obj.topic && obj.level && Array.isArray(obj.exercises)) {
          lessons.push(obj)
        }
      } catch {}
    }
  }

  return { diagnostics, lessons }
}

function pickDiagnostic(userGoal: string, artifacts: CourseArtifacts): { def: DiagnosticDef; firstCommand: string } {
  const goal = (userGoal || '').toLowerCase()
  // Try keyword match
  for (const def of artifacts.diagnostics) {
    if (def.keywords.some(k => goal.includes(k.toLowerCase()))) {
      return { def, firstCommand: def.diagnostics[0] }
    }
  }
  // Fallback: first available
  const fallback = artifacts.diagnostics[0] || { topic: 'Getting Started', keywords: [], diagnostics: [] }
  return { def: fallback as DiagnosticDef, firstCommand: fallback.diagnostics[0] }
}

function findLessonForDiagnostic(artifacts: CourseArtifacts, def: DiagnosticDef): LessonPlan | null {
  if (def.lessonTopic) {
    const match = artifacts.lessons.find(l => l.topic.trim().toLowerCase() === def.lessonTopic!.trim().toLowerCase())
    if (match) return match
  }
  // Try startsWith/contains topic
  const byPrefix = artifacts.lessons.find(l => l.topic.toLowerCase().startsWith(def.topic.toLowerCase()))
  if (byPrefix) return byPrefix
  const byContains = artifacts.lessons.find(l => l.topic.toLowerCase().includes(def.topic.toLowerCase()))
  if (byContains) return byContains
  return artifacts.lessons[0] || null
}

// Generate personalized lesson plan (simplified for MVP)
async function generatePersonalizedLesson(
  context: SessionContext,
  topic: string,
  diagnosticCommands: CapturedCommand[],
  artifacts: CourseArtifacts,
  diagnosticDef?: DiagnosticDef
): Promise<LessonPlan | null> {
  // For MVP: choose lesson from course artifacts matching diagnostic topic
  const lesson = diagnosticDef ? findLessonForDiagnostic(artifacts, diagnosticDef) : (artifacts.lessons[0] || null)
  return lesson || null
}

// Strip ANSI escape codes from command
function stripAnsiCodes(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
}

// Evaluate command locally
function evaluateLocally(state: SessionState, cmd: CapturedCommand): string | null {
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

    // Mark current exercise as completed
    state.exerciseStates[state.currentExerciseIndex] = 'completed'
    state.currentExerciseIndex++

    // Mark next exercise as current if there is one
    if (state.currentExerciseIndex < state.lessonPlan.exercises.length) {
      state.exerciseStates[state.currentExerciseIndex] = 'current'
    }

    if (state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
      return `🎉 ${currentExercise.feedback}\n\nYou've completed this lesson! Great work on ${state.lessonPlan.topic}.`
    }

    const nextExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
    return `✓ ${currentExercise.feedback}\n\nNext: ${nextExercise.command}`
  }

  return null
}

// Send tutor message to browser
function sendTutorMessage(state: SessionState, message: string, type: string = 'tutor') {
  if (state.tutorBridge) {
    state.tutorBridge.sendMessage(message, type)
  }
}

// Send progress update to browser
function sendProgressUpdate(state: SessionState) {
  if (state.tutorBridge && state.lessonPlan) {
    state.tutorBridge.sendProgress({
      topic: `${state.lessonPlan.topic} (${state.lessonPlan.level})`,
      exerciseIndex: state.currentExerciseIndex,
      totalExercises: state.lessonPlan.exercises.length,
      currentExercise: state.currentExerciseIndex < state.lessonPlan.exercises.length
        ? state.lessonPlan.exercises[state.currentExerciseIndex].command
        : 'Complete!',
      exerciseStates: state.exerciseStates
    })
  }
}

// Handle command from learning environment
async function handleCommand(state: SessionState, cmd: CapturedCommand): Promise<string> {
  if (state.mode === 'diagnostic') {
    state.diagnosticCommands.push(cmd)

    if (state.diagnosticCommands.length >= 2) {
      console.log('[TUTOR] Calibrating lesson...')

      sendTutorMessage(state, '⚡ Calibrating your lesson...')

      const lessonPlan = await generatePersonalizedLesson(
        state.context,
        state.currentTopic,
        state.diagnosticCommands,
        loadedArtifacts,
        state.diagnosticDef
      )

      if (lessonPlan) {
        state.lessonPlan = lessonPlan
        state.mode = 'lesson'
        state.currentExerciseIndex = 0

        // Initialize exercise states: first is current, rest are untouched
        state.exerciseStates = lessonPlan.exercises.map((_, i) => i === 0 ? 'current' : 'untouched')

        sendProgressUpdate(state)

        const message = `📚 ${lessonPlan.topic} (${lessonPlan.level})\n${lessonPlan.summary}\n\nLet's start: ${lessonPlan.exercises[0].command}`
        sendTutorMessage(state, message)
        return message
      } else {
        const message = 'Sorry, I had trouble generating your lesson. Let\'s continue with basics.'
        sendTutorMessage(state, message)
        return message
      }
    }

    // Suggest second diagnostic command if available
    const nextDiag = state.diagnosticDef?.diagnostics?.[1]
    let message: string
    if (nextDiag) {
      message = `Good! One more to calibrate your level. Try: ${nextDiag}`
    } else {
      message = 'Good! One more to calibrate your level.'
    }
    sendTutorMessage(state, message)
    return message
  }

  const localEval = evaluateLocally(state, cmd)
  if (localEval) {
    const isSuccess = localEval.includes('✓')
    sendTutorMessage(state, localEval, isSuccess ? 'success' : 'tutor')
    sendProgressUpdate(state)
    return localEval
  }

  const message = '🤔 That\'s not what I expected. Try the suggested command!'
  sendTutorMessage(state, message)
  return message
}

// Handle hint request from user
function handleHintRequest(state: SessionState) {
  console.log('[TUTOR] Hint requested')

  if (state.mode !== 'lesson' || !state.lessonPlan) {
    sendTutorMessage(state, 'No hints available during diagnostic phase.')
    return
  }

  if (state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    sendTutorMessage(state, 'You\'ve completed all exercises!')
    return
  }

  const currentExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
  const hint = currentExercise.hint || 'No hint available for this exercise. Try the suggested command!'

  sendTutorMessage(state, `💡 Hint: ${hint}`)
}

// Handle skip request from user
function handleSkipRequest(state: SessionState) {
  console.log('[TUTOR] Skip requested')

  if (state.mode !== 'lesson' || !state.lessonPlan) {
    sendTutorMessage(state, 'Nothing to skip during diagnostic phase.')
    return
  }

  if (state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    sendTutorMessage(state, 'You\'ve completed all exercises!')
    return
  }

  // Mark current exercise as skipped
  state.exerciseStates[state.currentExerciseIndex] = 'skipped'

  // Move to next exercise
  state.currentExerciseIndex++

  // Mark next exercise as current if there is one
  if (state.currentExerciseIndex < state.lessonPlan.exercises.length) {
    state.exerciseStates[state.currentExerciseIndex] = 'current'
  }

  if (state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    const message = `You've reached the end of the lesson. You skipped some exercises - consider reviewing them later!`
    sendTutorMessage(state, message)
    sendProgressUpdate(state)
    return
  }

  const nextExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
  const message = `⏭️ Skipped! Moving to next exercise: ${nextExercise.command}`
  sendTutorMessage(state, message)
  sendProgressUpdate(state)
}

// Main tutor process
async function runTutor() {
  console.log('[TUTOR] ' + '━'.repeat(60))
  console.log('[TUTOR] 🎓 Prism Tutor')
  console.log('[TUTOR] ' + '━'.repeat(60))
  console.log()

  // Get session context
  const userGoal = await getUserSessionContext()
  console.log(`[TUTOR] User goal: "${userGoal}"`)

  // Load course artifacts (diagnostics and lessons) from markdown
  const courseId = 'redis-fundamentals'
  loadedArtifacts = await loadCourseArtifacts(courseId)
  console.log(`[TUTOR] Loaded ${loadedArtifacts.diagnostics.length} diagnostics, ${loadedArtifacts.lessons.length} lessons`)

  const picked = pickDiagnostic(userGoal, loadedArtifacts)

  const sessionId = `session-${Date.now()}`
  const context: SessionContext = {
    userId: 'demo-user',
    courseId,
    sessionId,
    phase: 'tutoring',
    startedAt: new Date().toISOString(),
  }

  const state: SessionState = {
    context,
    currentTopic: picked.def.topic,
    mode: 'diagnostic',
    diagnosticCommands: [],
    currentExerciseIndex: 0,
    diagnosticDef: picked.def,
    exerciseStates: []
  }

  console.log()
  console.log(`[TUTOR] Topic: ${picked.def.topic}`)
  console.log('[TUTOR] Starting learning environment...')
  console.log()

  // Start learning environment via adapter
  const env = await startLearningEnvironment({ port: 3000, sessionId })

  // Store tutorBridge in state
  state.tutorBridge = env.tutorBridge

  // Register hint and skip handlers
  env.tutorBridge.onHintRequest(() => {
    handleHintRequest(state)
  })

  env.tutorBridge.onSkipRequest(() => {
    handleSkipRequest(state)
  })

  // Auto-open browser
  console.log('[TUTOR] Browser opened')
  console.log(`[TUTOR] URL: ${env.url}`)
  console.log()

  // Send initial message to browser
  let initialMessage: string
  if (picked.firstCommand) {
    initialMessage = `Let's see what you know! Try: ${picked.firstCommand}`
  } else {
    initialMessage = `Let's see what you know!`
  }
  sendTutorMessage(state, initialMessage)

  // Also send initial progress update
  if (state.tutorBridge) {
    state.tutorBridge.sendProgress({
      topic: picked.def.topic,
      exerciseIndex: 0,
      totalExercises: 0,
      currentExercise: 'Diagnostic phase...'
    })
  }

  console.log('[TUTOR] ━'.repeat(30))
  console.log()

  // Subscribe to command stream
  const stream = createCommandStream(sessionId)
  await stream.subscribe(async (cmd) => {
    try {
      console.log(`[TUTOR] Processing command: ${cmd.command}`)
      const feedback = await handleCommand(state, cmd)
      // Feedback is sent to browser via tutorBridge, no console output needed
    } catch (err) {
      console.error('[TUTOR] Error processing command:', err)
    }
  })

  console.log('[TUTOR] Command stream connected')
  console.log('[TUTOR] ✓ Tutor ready - watching your progress...')
  console.log()
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTutor().catch(console.error)
}

export { runTutor }
