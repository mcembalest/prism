import { startLearningEnvironment } from './environment.js'
import type { SessionContext, LessonPlan, Exercise } from './types.js'
import * as readline from 'readline'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { createCommandStream, type CapturedCommand } from './command-stream.js'
import { findResponseForQuestion, getEncouragement, getWrongAnswerResponse } from './mock-responses.js'

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
  currentExerciseStep?: 'presenting' | 'awaiting-answer' | 'completed' // For multi-step exercises
  awaitingAnswerFor?: 'question' | 'prediction' | 'explanation' | 'worked-example-check'
  currentQuestionData?: any // Store current question data for validation
  hintLevel: number // Track progressive hint level (1, 2, 3)
}

// Prompt user to select a lesson from available options
async function getUserLessonSelection(artifacts: CourseArtifacts): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    console.log()
    console.log('╔' + '═'.repeat(68) + '╗')
    console.log('║' + ' '.repeat(20) + '📚 Available Lessons' + ' '.repeat(28) + '║')
    console.log('╚' + '═'.repeat(68) + '╝')
    console.log()

    // List all available lessons with numbers
    const lessons = artifacts.lessons
    lessons.forEach((lesson, index) => {
      const levelBadge = lesson.level === 'beginner' ? '🟢' : lesson.level === 'intermediate' ? '🟡' : '🔴'
      const number = `[${index + 1}]`.padEnd(4)
      console.log(`  ${number} ${levelBadge} ${lesson.topic}`)
      console.log(`       ${lesson.summary}`)
      console.log()
    })

    // Add OTHER option
    const otherNumber = `[${lessons.length + 1}]`.padEnd(4)
    console.log(`  ${otherNumber} ✨ OTHER - Make your own lesson`)
    console.log(`       Describe what you'd like to learn about Redis`)
    console.log()
    console.log('─'.repeat(70))
    console.log('💡 After you select, your browser will open with the learning environment.')
    console.log('─'.repeat(70))
    console.log()

    function askForSelection() {
      rl.question(`\x1b[36m➜\x1b[0m Select a lesson (1-${lessons.length + 1}): `, (answer) => {
        const selection = parseInt(answer.trim())

        if (isNaN(selection) || selection < 1 || selection > lessons.length + 1) {
          console.log(`\x1b[31m✗\x1b[0m Please enter a number between 1 and ${lessons.length + 1}`)
          console.log()
          askForSelection()
          return
        }

        if (selection === lessons.length + 1) {
          // OTHER option - ask for custom input
          console.log()
          console.log('✨ Custom Lesson')
          console.log()
          rl.question('\x1b[36m➜\x1b[0m What would you like to learn about? ', (customAnswer) => {
            rl.close()
            const goal = customAnswer.trim() || 'redis basics'
            console.log()
            console.log(`\x1b[32m✓\x1b[0m Got it! Let's learn about: ${goal}`)
            resolve(goal)
          })
        } else {
          // Selected a specific lesson
          const selectedLesson = lessons[selection - 1]
          console.log()
          console.log(`\x1b[32m✓\x1b[0m Great choice! Starting: ${selectedLesson.topic}`)
          rl.close()
          resolve(selectedLesson.topic)
        }
      })
    }

    askForSelection()
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

// Evaluate command locally - only for command-type exercises
function evaluateLocally(state: SessionState, cmd: CapturedCommand): string | null {
  if (!state.lessonPlan || state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    return null
  }

  const currentExercise = state.lessonPlan.exercises[state.currentExerciseIndex]

  // Only evaluate commands for command-type exercises
  if (currentExercise.type !== 'command') {
    return null
  }

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
    markExerciseComplete(state)
    const nextMsg = moveToNextExercise(state)

    return `✓ ${currentExercise.feedback}\n\n${nextMsg}`
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
    const currentEx = state.lessonPlan.exercises[state.currentExerciseIndex]
    let exerciseText = 'Complete!'

    if (currentEx) {
      if (currentEx.type === 'command') {
        exerciseText = currentEx.command
      } else if (currentEx.type === 'conceptual-question' || currentEx.type === 'review') {
        exerciseText = `Question: ${currentEx.question?.substring(0, 40)}...`
      } else if (currentEx.type === 'prediction') {
        exerciseText = `Predict: ${currentEx.command}`
      } else if (currentEx.type === 'worked-example') {
        exerciseText = `Example: ${currentEx.title}`
      } else if (currentEx.type === 'explanation') {
        exerciseText = `Explain: ${currentEx.command}`
      }
    }

    state.tutorBridge.sendProgress({
      topic: `${state.lessonPlan.topic} (${state.lessonPlan.level})`,
      exerciseIndex: state.currentExerciseIndex,
      totalExercises: state.lessonPlan.exercises.length,
      currentExercise: exerciseText,
      exerciseStates: state.exerciseStates
    })
  }
}

// Present an exercise based on its type
function presentExercise(state: SessionState, exercise: Exercise): string {
  switch (exercise.type) {
    case 'command':
      return `Try this: ${exercise.command}`

    case 'conceptual-question':
    case 'review':
      state.awaitingAnswerFor = 'question'
      state.currentQuestionData = exercise
      state.currentExerciseStep = 'awaiting-answer'

      const questionPrefix = exercise.type === 'review'
        ? `📝 Review: ${exercise.reviewTopic}\n\n`
        : '📝 Question:\n\n'

      const optionsText = exercise.options
        .map((opt: string, i: number) => `${i + 1}. ${opt}`)
        .join('\n')

      return `${questionPrefix}${exercise.question}\n\n${optionsText}\n\nType the number of your answer (or ask a question if you're unsure!)`

    case 'prediction':
      state.awaitingAnswerFor = 'prediction'
      state.currentQuestionData = exercise
      state.currentExerciseStep = 'awaiting-answer'

      const predOptionsText = exercise.options
        .map((opt: string, i: number) => `${i + 1}. ${opt}`)
        .join('\n')

      return `🔮 Before you run this command, predict what will happen:\n\n${exercise.command}\n\n${exercise.question}\n\n${predOptionsText}\n\nType the number of your prediction:`

    case 'worked-example':
      state.currentExerciseStep = 'presenting'
      state.currentQuestionData = exercise

      let exampleText = `📚 Worked Example: ${exercise.title}\n\n`
      exampleText += 'Let me show you how this works step by step:\n\n'

      exercise.steps.forEach((step: any, i: number) => {
        exampleText += `Step ${i + 1}: ${step.narration}\n`
        exampleText += `Command: ${step.command}\n`
        if (step.output) {
          exampleText += `Output: ${step.output}\n`
        }
        exampleText += '\n'
      })

      // After presenting, ask follow-up question
      setTimeout(() => {
        state.awaitingAnswerFor = 'worked-example-check'
        state.currentExerciseStep = 'awaiting-answer'

        const followUpOptionsText = exercise.options
          .map((opt: string, i: number) => `${i + 1}. ${opt}`)
          .join('\n')

        const followUpMsg = `\n${exercise.followUpQuestion}\n\n${followUpOptionsText}\n\nType the number of your answer:`
        sendTutorMessage(state, followUpMsg)
      }, 2000)

      return exampleText

    case 'explanation':
      state.awaitingAnswerFor = 'explanation'
      state.currentQuestionData = exercise
      state.currentExerciseStep = 'awaiting-answer'

      return `💭 Explanation Task:\n\nConsider this command: ${exercise.command}\n\n${exercise.question}\n\nType your explanation (include keywords like: ${exercise.acceptedKeywords.join(', ')})`

    default:
      return 'Unknown exercise type'
  }
}

// Handle student answer to a question
function handleStudentAnswer(state: SessionState, answer: string): string {
  if (!state.currentQuestionData || !state.awaitingAnswerFor) {
    return 'No question is currently active.'
  }

  const answerNum = parseInt(answer.trim())

  switch (state.awaitingAnswerFor) {
    case 'question':
    case 'prediction':
    case 'worked-example-check': {
      const exercise = state.currentQuestionData
      const correctIndex = exercise.correctIndex

      if (isNaN(answerNum) || answerNum < 1 || answerNum > exercise.options.length) {
        return 'Please enter a valid option number (1-' + exercise.options.length + ')'
      }

      if (answerNum - 1 === correctIndex) {
        // Correct answer!
        const encouragement = getEncouragement()
        const explanation = exercise.explanation || ''

        markExerciseComplete(state)
        const nextMsg = moveToNextExercise(state)

        return `${encouragement}\n\n${explanation}\n\n${nextMsg}`
      } else {
        // Wrong answer
        const wrongResponse = getWrongAnswerResponse()
        const explanation = exercise.explanation || ''

        return `${wrongResponse}\n\n${explanation}\n\nTry again, or ask a question if you need help!`
      }
    }

    case 'explanation': {
      const exercise = state.currentQuestionData
      const answerLower = answer.toLowerCase()

      // Check if answer contains required keywords
      const hasKeywords = exercise.acceptedKeywords.some((kw: string) =>
        answerLower.includes(kw.toLowerCase())
      )

      if (hasKeywords) {
        const encouragement = getEncouragement()
        markExerciseComplete(state)
        const nextMsg = moveToNextExercise(state)

        return `${encouragement}\n\nGreat explanation! Here's a model answer:\n\n${exercise.sampleAnswer}\n\n${nextMsg}`
      } else {
        return `Good effort! Your explanation could mention: ${exercise.acceptedKeywords.join(', ')}. Try elaborating!`
      }
    }

    default:
      return 'Unknown question type'
  }
}

// Mark current exercise as complete
function markExerciseComplete(state: SessionState) {
  if (state.lessonPlan && state.currentExerciseIndex < state.lessonPlan.exercises.length) {
    state.exerciseStates[state.currentExerciseIndex] = 'completed'
    state.currentExerciseStep = 'completed'
    state.awaitingAnswerFor = undefined
    state.currentQuestionData = undefined
    state.hintLevel = 1 // Reset hint level for next exercise
  }
}

// Move to next exercise
function moveToNextExercise(state: SessionState): string {
  if (!state.lessonPlan) return ''

  state.currentExerciseIndex++

  if (state.currentExerciseIndex < state.lessonPlan.exercises.length) {
    state.exerciseStates[state.currentExerciseIndex] = 'current'
    state.hintLevel = 1
    sendProgressUpdate(state)

    const nextExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
    return presentExercise(state, nextExercise)
  } else {
    sendProgressUpdate(state)
    return `🎉 Lesson complete! You've finished ${state.lessonPlan.topic}.`
  }
}

// Handle student question
function handleStudentQuestion(state: SessionState, question: string): string {
  console.log('[TUTOR] Student asked:', question)

  const response = findResponseForQuestion(question)
  return `📖 ${response}`
}

// Handle command from learning environment
async function handleCommand(state: SessionState, cmd: CapturedCommand): Promise<string> {
  // Check if this is a text input for a question answer
  const trimmedCmd = cmd.command.trim()

  // If awaiting answer and input looks like answer (number or text), treat as answer
  if (state.awaitingAnswerFor && (trimmedCmd.match(/^\d+$/) || trimmedCmd.length > 3)) {
    const response = handleStudentAnswer(state, trimmedCmd)
    sendTutorMessage(state, response, response.includes('✓') || response.includes('Excellent') ? 'success' : 'tutor')
    sendProgressUpdate(state)
    return response
  }

  // Check if this looks like a question (starts with what, why, how, when, etc.)
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'which', 'who', 'can', 'should', 'is', 'does']
  if (questionWords.some(qw => trimmedCmd.toLowerCase().startsWith(qw))) {
    const response = handleStudentQuestion(state, trimmedCmd)
    sendTutorMessage(state, response)
    return response
  }

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
        state.hintLevel = 1

        // Initialize exercise states: first is current, rest are untouched
        state.exerciseStates = lessonPlan.exercises.map((_, i) => i === 0 ? 'current' : 'untouched')

        sendProgressUpdate(state)

        const firstExercise = lessonPlan.exercises[0]
        const exerciseMessage = presentExercise(state, firstExercise)
        const message = `📚 ${lessonPlan.topic} (${lessonPlan.level})\n${lessonPlan.summary}\n\n${exerciseMessage}`
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

  // Progressive hints: gentle -> specific -> explicit
  let hint: string
  if (state.hintLevel === 1) {
    hint = '💡 Hint (Level 1): Think about the data structure you\'re working with. What operations does it support?'
    state.hintLevel = 2
  } else if (state.hintLevel === 2) {
    hint = '💡 Hint (Level 2): Review the command syntax carefully. Make sure you have the right order of arguments.'
    state.hintLevel = 3
  } else {
    hint = `💡 Hint (Level 3): ${currentExercise.hint || 'Try following the exact command suggested!'}`
    // Keep at level 3
  }

  sendTutorMessage(state, hint)
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
  state.awaitingAnswerFor = undefined
  state.currentQuestionData = undefined

  // Move to next exercise
  state.currentExerciseIndex++

  // Mark next exercise as current if there is one
  if (state.currentExerciseIndex < state.lessonPlan.exercises.length) {
    state.exerciseStates[state.currentExerciseIndex] = 'current'
    state.hintLevel = 1
  }

  if (state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    const message = `You've reached the end of the lesson. You skipped some exercises - consider reviewing them later!`
    sendTutorMessage(state, message)
    sendProgressUpdate(state)
    return
  }

  const nextExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
  const exerciseMessage = presentExercise(state, nextExercise)
  const message = `⏭️ Skipped! Moving to next exercise:\n\n${exerciseMessage}`
  sendTutorMessage(state, message)
  sendProgressUpdate(state)
}

// Main tutor process
async function runTutor() {
  console.log('[TUTOR] ' + '━'.repeat(60))
  console.log('[TUTOR] 🎓 Prism Tutor')
  console.log('[TUTOR] ' + '━'.repeat(60))
  console.log()

  // Load course artifacts (diagnostics and lessons) from markdown FIRST
  const courseId = 'redis-fundamentals'
  console.log('[TUTOR] Loading course content...')
  loadedArtifacts = await loadCourseArtifacts(courseId)
  console.log(`[TUTOR] Loaded ${loadedArtifacts.diagnostics.length} diagnostics, ${loadedArtifacts.lessons.length} lessons`)
  console.log()

  // Show lesson selection menu
  const userGoal = await getUserLessonSelection(loadedArtifacts)
  console.log()
  console.log(`[TUTOR] Selected: "${userGoal}"`)

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
    exerciseStates: [],
    hintLevel: 1
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
