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
async function handleCommand(state: SessionState, cmd: CapturedCommand): Promise<string> {
  if (state.mode === 'diagnostic') {
    state.diagnosticCommands.push(cmd)

    if (state.diagnosticCommands.length >= 2) {
      console.log()
      console.log('⚡ Calibrating your lesson...')
      console.log()

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

        return `📚 ${lessonPlan.topic} (${lessonPlan.level})\n${lessonPlan.summary}\n\nLet's start: ${lessonPlan.exercises[0].command}`
      } else {
        return 'Sorry, I had trouble generating your lesson. Let\'s continue with basics.'
      }
    }

    // Suggest second diagnostic command if available
    const nextDiag = state.diagnosticDef?.diagnostics?.[1]
    if (nextDiag) {
      return `Good! One more to calibrate your level. Try: ${nextDiag}`
    }
    return 'Good! One more to calibrate your level.'
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
  // Load course artifacts (diagnostics and lessons) from markdown
  const courseId = 'redis-fundamentals'
  loadedArtifacts = await loadCourseArtifacts(courseId)
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
  }

  console.log()
  console.log(`📚 ${picked.def.topic}`)
  console.log()
  console.log('Starting your learning environment...')
  console.log()

  // Start learning environment via adapter
  const env = await startLearningEnvironment({ port: 3000, sessionId })

  // Auto-open browser
  console.log()
  console.log('Opening your learning environment...')
  // Already opened by the environment adapter, but keep URL for logs
  console.log(`URL: ${env.url}`)

  console.log()
  if (picked.firstCommand) {
    console.log(`Let's see what you know! Try: ${picked.firstCommand}`)
  } else {
    console.log(`Let's see what you know!`)
  }
  console.log()
  console.log('━'.repeat(60))
  console.log()

  // Subscribe to command stream
  const stream = createCommandStream(sessionId)
  await stream.subscribe(async (cmd) => {
    try {
      const feedback = await handleCommand(state, cmd)
      console.log()
      console.log('🎓 ' + feedback)
      console.log()
    } catch (err) {
      console.error('[TUTOR] Error processing command:', err)
    }
  })

  console.log('[TUTOR] Command stream connected')
  console.log()
  console.log('✓ Tutor ready - watching your progress...')
  console.log()
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTutor().catch(console.error)
}

export { runTutor }
