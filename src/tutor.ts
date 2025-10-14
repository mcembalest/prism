import { startLearningEnvironment, type LearningEnvironment } from './environment.js'
import type { SessionContext, LessonPlan, Exercise, SkillGraph, Activity, CourseManifest } from './types.js'
import * as readline from 'readline'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { createCommandStream, type CapturedCommand } from './command-stream.js'
import { findResponseForQuestion, getEncouragement, getWrongAnswerResponse } from './mock-responses.js'
import { getStateManager } from './session-state-manager.js'

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
  currentQuestionData?: any // Store current exercise data for validation
  hintLevel: number // Track progressive hint level (1, 2, 3)
  redisDb: number // Redis database number for this session
  lessonId: string // Stable lesson identifier (for state management)
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
    console.log('║' + ' '.repeat(20) + 'AVAILABLE LESSONS' + ' '.repeat(30) + '║')
    console.log('╚' + '═'.repeat(68) + '╝')
    console.log()

    // NEW: Prefer activities if available, otherwise use legacy lessons
    const displayItems = artifacts.activities || artifacts.lessons
    displayItems.forEach((item, index) => {
      const level = 'level' in item ? item.level : 'beginner'
      const levelBadge = level === 'beginner' ? '🟢' : level === 'intermediate' ? '🟡' : '🔴'
      const number = `[${index + 1}]`.padEnd(4)
      const name = 'name' in item ? item.name : ('topic' in item ? item.topic : 'Lesson')
      const summary = item.summary || ''
      console.log(`  ${number} ${levelBadge} ${name}`)
      console.log(`       ${summary}`)
      console.log()
    })

    // Add OTHER option
    const otherNumber = `[${displayItems.length + 1}]`.padEnd(4)
    console.log(`  ${otherNumber} OTHER - Make your own lesson`)
    console.log(`       Describe what you'd like to learn about`)
    console.log()
    console.log('─'.repeat(70))
    console.log('NOTE: After you select, your browser will open with the learning environment.')
    console.log('─'.repeat(70))
    console.log()

    function askForSelection() {
      rl.question(`\x1b[36m➜\x1b[0m Select a lesson (1-${displayItems.length + 1}): `, (answer) => {
        const selection = parseInt(answer.trim())

        if (isNaN(selection) || selection < 1 || selection > displayItems.length + 1) {
          console.log(`\x1b[31mERROR:\x1b[0m Please enter a number between 1 and ${displayItems.length + 1}`)
          console.log()
          askForSelection()
          return
        }

        if (selection === displayItems.length + 1) {
          // OTHER option - ask for custom input
          console.log()
          console.log('Custom Lesson')
          console.log()
          rl.question('\x1b[36m➜\x1b[0m What would you like to learn about? ', (customAnswer) => {
            rl.close()
            const goal = customAnswer.trim() || 'basics'
            console.log()
            console.log(`\x1b[32mOK:\x1b[0m Got it! Let's learn about: ${goal}`)
            resolve(goal)
          })
        } else {
          // Selected a specific lesson/activity
          const selectedItem = displayItems[selection - 1]
          const name = 'name' in selectedItem ? selectedItem.name : ('topic' in selectedItem ? selectedItem.topic : 'Lesson')
          console.log()
          console.log(`\x1b[32mOK:\x1b[0m Great choice! Starting: ${name}`)
          rl.close()
          resolve(name)
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
  diagnostics: DiagnosticDef[]  // Legacy: still loaded from markdown files
  lessons: LessonPlan[]          // Legacy: still loaded from markdown files
  skillGraph?: SkillGraph        // NEW: loaded from skills.json
  activities?: Activity[]        // NEW: loaded from activities.json
  manifest?: CourseManifest      // NEW: loaded from course.json
}

// Loaded course artifacts cache for this process
let loadedArtifacts: CourseArtifacts = { diagnostics: [], lessons: [] }

async function loadCourseArtifacts(courseId: string): Promise<CourseArtifacts> {
  const baseDir = path.resolve(process.cwd(), 'data', 'courses', courseId)
  const files = await readdir(baseDir)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const diagnostics: DiagnosticDef[] = []
  const lessons: LessonPlan[] = []

  // Legacy: Load from markdown files with embedded JSON
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

  // NEW: Load skill graph from skills.json
  let skillGraph: SkillGraph | undefined
  try {
    const skillsPath = path.join(baseDir, 'skills.json')
    const skillsContent = await readFile(skillsPath, 'utf8')
    skillGraph = JSON.parse(skillsContent) as SkillGraph
  } catch (err) {
    console.log('[TUTOR] No skills.json found, using legacy structure')
  }

  // NEW: Load activities from activities.json
  let activities: Activity[] | undefined
  try {
    const activitiesPath = path.join(baseDir, 'activities.json')
    const activitiesContent = await readFile(activitiesPath, 'utf8')
    const activitiesData = JSON.parse(activitiesContent) as { activities: Activity[] }
    activities = activitiesData.activities
  } catch (err) {
    console.log('[TUTOR] No activities.json found, using legacy structure')
  }

  // NEW: Load course manifest from course.json
  let manifest: CourseManifest | undefined
  try {
    const manifestPath = path.join(baseDir, 'course.json')
    const manifestContent = await readFile(manifestPath, 'utf8')
    manifest = JSON.parse(manifestContent) as CourseManifest
  } catch (err) {
    console.log('[TUTOR] No course.json found, using legacy structure')
  }

  return { diagnostics, lessons, skillGraph, activities, manifest }
}

function pickDiagnostic(userGoal: string, artifacts: CourseArtifacts): { def: DiagnosticDef; firstCommand: string } {
  const goal = (userGoal || '').toLowerCase()

  // NEW: Try matching activities first
  if (artifacts.activities) {
    for (const activity of artifacts.activities) {
      // Match by name or diagnostic keywords
      const nameMatch = activity.name.toLowerCase().includes(goal) || goal.includes(activity.name.toLowerCase())
      const keywordMatch = activity.diagnostic?.keywords?.some(k => goal.includes(k.toLowerCase()))

      if (nameMatch || keywordMatch) {
        // Convert Activity diagnostic to DiagnosticDef format
        const def: DiagnosticDef = {
          topic: activity.name,
          lessonTopic: activity.name,
          keywords: activity.diagnostic?.keywords || [],
          diagnostics: activity.diagnostic?.commands || []
        }
        return { def, firstCommand: def.diagnostics[0] || 'PING' }
      }
    }
  }

  // Legacy: Try keyword match from markdown diagnostics
  for (const def of artifacts.diagnostics) {
    if (def.keywords.some(k => goal.includes(k.toLowerCase()))) {
      return { def, firstCommand: def.diagnostics[0] }
    }
  }

  // Fallback: use first available activity or diagnostic
  if (artifacts.activities && artifacts.activities.length > 0) {
    const firstActivity = artifacts.activities[0]
    const def: DiagnosticDef = {
      topic: firstActivity.name,
      lessonTopic: firstActivity.name,
      keywords: firstActivity.diagnostic?.keywords || [],
      diagnostics: firstActivity.diagnostic?.commands || []
    }
    return { def, firstCommand: def.diagnostics[0] || 'PING' }
  }

  const fallback = artifacts.diagnostics[0] || { topic: 'Getting Started', keywords: [], diagnostics: [] }
  return { def: fallback as DiagnosticDef, firstCommand: fallback.diagnostics[0] }
}

function findLessonForDiagnostic(artifacts: CourseArtifacts, def: DiagnosticDef): LessonPlan | null {
  // NEW: Try activities first
  if (artifacts.activities) {
    let match: Activity | undefined
    if (def.lessonTopic) {
      match = artifacts.activities.find(a => a.name.trim().toLowerCase() === def.lessonTopic!.trim().toLowerCase())
    }
    if (!match) {
      match = artifacts.activities.find(a => a.name.toLowerCase().includes(def.topic.toLowerCase()))
    }
    if (match) {
      // Convert Activity to LessonPlan format
      return {
        lessonId: match.id,
        topic: match.name,
        level: match.level,
        exercises: match.exercises,
        summary: match.summary
      }
    }
  }

  // Fallback to legacy lessons
  if (def.lessonTopic) {
    const match = artifacts.lessons.find(l => l.topic.trim().toLowerCase() === def.lessonTopic!.trim().toLowerCase())
    if (match) return match
  }
  const byPrefix = artifacts.lessons.find(l => l.topic.toLowerCase().startsWith(def.topic.toLowerCase()))
  if (byPrefix) return byPrefix
  const byContains = artifacts.lessons.find(l => l.topic.toLowerCase().includes(def.topic.toLowerCase()))
  if (byContains) return byContains

  // Last resort: convert first activity to lesson
  if (artifacts.activities && artifacts.activities.length > 0) {
    const firstActivity = artifacts.activities[0]
    return {
      lessonId: firstActivity.id,
      topic: firstActivity.name,
      level: firstActivity.level,
      exercises: firstActivity.exercises,
      summary: firstActivity.summary
    }
  }

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

// Evaluate command locally - watch what they do in Redis CLI
function evaluateLocally(state: SessionState, cmd: CapturedCommand): string | null {
  if (!state.lessonPlan || state.currentExerciseIndex >= state.lessonPlan.exercises.length) {
    return null
  }

  const currentExercise = state.lessonPlan.exercises[state.currentExerciseIndex]
  const cleanCommand = stripAnsiCodes(cmd.command).trim().toUpperCase()

  // Handle different exercise types
  if (currentExercise.type === 'command') {
    const expectedCommand = currentExercise.command.trim().toUpperCase()
    const commandMatches = cleanCommand === expectedCommand

    if (commandMatches) {
      if (currentExercise.expectedPattern) {
        const pattern = new RegExp(currentExercise.expectedPattern, 'i')
        if (!pattern.test(cmd.terminalOutput)) {
          return `Hmm, the output doesn't look right. ${currentExercise.hint || 'Try again!'}`
        }
      }

      let successMsg = `${currentExercise.feedback}`
      if (currentExercise.teachingPoint) {
        successMsg += `\n\n💡 ${currentExercise.teachingPoint}`
      }

      markExerciseComplete(state)
      const nextMsg = moveToNextExercise(state)
      return `${successMsg}\n\n${nextMsg}`
    }
  }

  if (currentExercise.type === 'teach' && state.currentQuestionData) {
    const teachData = state.currentQuestionData as any
    const currentCmdIndex = teachData.currentCommandIndex || 0
    const expectedCommand = currentExercise.guidedCommands[currentCmdIndex].command.trim().toUpperCase()

    if (cleanCommand === expectedCommand) {
      const guidedCmd = currentExercise.guidedCommands[currentCmdIndex]
      let successMsg = `Great! ${guidedCmd.teachingPoint}`

      // Move to next command in sequence or complete
      if (currentCmdIndex + 1 < currentExercise.guidedCommands.length) {
        const nextCmd = currentExercise.guidedCommands[currentCmdIndex + 1]
        state.currentQuestionData = { ...currentExercise, currentCommandIndex: currentCmdIndex + 1 }
        successMsg += `\n\n${nextCmd.prompt}\n\nTry: ${nextCmd.command}`
        sendTutorMessage(state, successMsg)
        return successMsg
      } else {
        markExerciseComplete(state)
        const nextMsg = moveToNextExercise(state)
        return `${successMsg}\n\n${nextMsg}`
      }
    }
  }

  if (currentExercise.type === 'worked-example' && currentExercise.followUpCommand && state.currentQuestionData) {
    const expectedCommand = currentExercise.followUpCommand.command.trim().toUpperCase()
    if (cleanCommand === expectedCommand) {
      const successMsg = `Excellent! ${currentExercise.followUpCommand.teachingPoint}`
      markExerciseComplete(state)
      const nextMsg = moveToNextExercise(state)
      return `${successMsg}\n\n${nextMsg}`
    }
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
      } else if (currentEx.type === 'teach') {
        exerciseText = `Learning: ${currentEx.content?.substring(0, 40)}...`
      } else if (currentEx.type === 'worked-example') {
        exerciseText = `Example: ${currentEx.title}`
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
  state.currentExerciseStep = 'awaiting-answer'

  switch (exercise.type) {
    case 'command':
      return `${exercise.prompt}\n\nTry: ${exercise.command}`

    case 'teach':
      // Present teaching content, then guide through first command
      const firstCmd = exercise.guidedCommands[0]
      state.currentQuestionData = { ...exercise, currentCommandIndex: 0 }
      return `${exercise.content}\n\n${firstCmd.prompt}\n\nTry: ${firstCmd.command}`

    case 'worked-example':
      // Demonstrate by showing what to expect, then they can try
      let exampleText = `[EXAMPLE: ${exercise.title}]\n\n${exercise.narration}\n\n`

      exercise.steps.forEach((step: any, i: number) => {
        exampleText += `${step.explanation}\n`
        exampleText += `→ ${step.command}\n`
        if (step.expectedOutput) {
          exampleText += `  Output: ${step.expectedOutput}\n`
        }
        exampleText += '\n'
      })

      if (exercise.followUpCommand) {
        exampleText += `\nNow you try: ${exercise.followUpCommand.prompt}\n`
        exampleText += `Try: ${exercise.followUpCommand.command}`
        state.currentQuestionData = exercise.followUpCommand
      } else {
        // Auto-complete if no follow-up
        setTimeout(() => {
          markExerciseComplete(state)
          const nextMsg = moveToNextExercise(state)
          sendTutorMessage(state, nextMsg)
        }, 1000)
      }

      return exampleText

    default:
      return 'Unknown exercise type'
  }
}

// Mark current exercise as complete
function markExerciseComplete(state: SessionState) {
  if (state.lessonPlan && state.currentExerciseIndex < state.lessonPlan.exercises.length) {
    state.exerciseStates[state.currentExerciseIndex] = 'completed'
    state.currentExerciseStep = 'completed'
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

    // Lesson complete - handle state saving asynchronously
    setTimeout(async () => {
      try {
        const shouldSave = await promptSaveState()
        const stateManager = getStateManager()

        // Use stable lessonId (from lesson plan if available, else from state)
        const stableLessonId = state.lessonPlan?.lessonId || state.lessonId
        const lessonTopic = state.lessonPlan?.topic || state.currentTopic

        if (shouldSave) {
          await stateManager.saveLessonState(
            stableLessonId,
            lessonTopic,
            state.redisDb,
            state.context.sessionId
          )
          console.log('[TUTOR] Progress saved')
        } else {
          await stateManager.flushDatabase(state.redisDb)
          await stateManager.clearLessonState(stableLessonId)
          console.log('[TUTOR] Data cleared')
        }
      } catch (err) {
        console.error('[TUTOR] Error handling lesson completion:', err)
      }
    }, 2000)

    return `[COMPLETE] Lesson complete! You've finished ${state.lessonPlan.topic}.`
  }
}

// Handle student question
function handleStudentQuestion(state: SessionState, question: string): string {
  console.log('[TUTOR] Student asked:', question)

  const response = findResponseForQuestion(question)
  return `[ANSWER] ${response}`
}

// Handle command from learning environment
async function handleCommand(state: SessionState, cmd: CapturedCommand): Promise<string> {
  const trimmedCmd = cmd.command.trim()

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

      sendTutorMessage(state, '[CALIBRATING] Calibrating your lesson...')

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
        const message = `[LESSON: ${lessonPlan.topic}] (${lessonPlan.level})\n${lessonPlan.summary}\n\n${exerciseMessage}`
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
    const isSuccess = localEval.includes('[SUCCESS]')
    sendTutorMessage(state, localEval, isSuccess ? 'success' : 'tutor')
    sendProgressUpdate(state)
    return localEval
  }

  const message = '[HINT] That\'s not what I expected. Try the suggested command!'
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
    hint = '[HINT Level 1] Think about the data structure you\'re working with. What operations does it support?'
    state.hintLevel = 2
  } else if (state.hintLevel === 2) {
    hint = '[HINT Level 2] Review the command syntax carefully. Make sure you have the right order of arguments.'
    state.hintLevel = 3
  } else {
    hint = `[HINT Level 3] ${currentExercise.hint || 'Try following the exact command suggested!'}`
    // Keep at level 3
  }

  sendTutorMessage(state, hint)
}

// Prompt user about state management before starting lesson
async function promptStateManagement(lessonTopic: string, hasState: boolean): Promise<'resume' | 'clear'> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    if (!hasState) {
      // No saved state, default to clear (fresh start)
      resolve('clear')
      return
    }

    console.log()
    console.log('╔' + '═'.repeat(68) + '╗')
    console.log('║' + ' '.repeat(20) + 'SAVED PROGRESS FOUND' + ' '.repeat(27) + '║')
    console.log('╚' + '═'.repeat(68) + '╝')
    console.log()
    console.log(`  This lesson has saved Redis data from a previous session.`)
    console.log()
    console.log('  [1] Resume with saved data')
    console.log('  [2] Start fresh (clear all Redis keys)')
    console.log()

    function askForChoice() {
      rl.question('\x1b[36m➜\x1b[0m Your choice (1-2): ', (answer) => {
        const choice = parseInt(answer.trim())

        if (choice === 1) {
          console.log()
          console.log('\x1b[32mOK:\x1b[0m Resuming with saved data')
          rl.close()
          resolve('resume')
        } else if (choice === 2) {
          console.log()
          console.log('\x1b[32mOK:\x1b[0m Starting fresh - clearing Redis state')
          rl.close()
          resolve('clear')
        } else {
          console.log('\x1b[31mERROR:\x1b[0m Please enter 1 or 2')
          console.log()
          askForChoice()
        }
      })
    }

    askForChoice()
  })
}

// Prompt user about saving state after lesson
async function promptSaveState(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    console.log()
    console.log('╔' + '═'.repeat(68) + '╗')
    console.log('║' + ' '.repeat(22) + 'SAVE YOUR PROGRESS?' + ' '.repeat(26) + '║')
    console.log('╚' + '═'.repeat(68) + '╝')
    console.log()
    console.log('  [1] Save progress for later')
    console.log('  [2] Clear all data')
    console.log()

    function askForChoice() {
      rl.question('\x1b[36m➜\x1b[0m Your choice (1-2): ', (answer) => {
        const choice = parseInt(answer.trim())

        if (choice === 1) {
          console.log()
          console.log('\x1b[32mOK:\x1b[0m Progress saved!')
          rl.close()
          resolve(true)
        } else if (choice === 2) {
          console.log()
          console.log('\x1b[32mOK:\x1b[0m Data cleared')
          rl.close()
          resolve(false)
        } else {
          console.log('\x1b[31mERROR:\x1b[0m Please enter 1 or 2')
          console.log()
          askForChoice()
        }
      })
    }

    askForChoice()
  })
}

// Initialize lesson after course selection
function initializeLesson(
  state: SessionState,
  env: LearningEnvironment,
  picked: { def: DiagnosticDef; firstCommand: string },
  stateManager: any
) {
  // Store tutorBridge in state
  state.tutorBridge = env.tutorBridge

  // Register hint and skip handlers
  env.tutorBridge.onHintRequest(() => {
    handleHintRequest(state)
  })

  env.tutorBridge.onSkipRequest(() => {
    handleSkipRequest(state)
  })

  env.tutorBridge.onClearStateRequest(async () => {
    console.log('[TUTOR] Clear state requested from UI')
    try {
      await env.tutorBridge.flushDatabase()
      await stateManager.clearLessonState(state.lessonId)
      sendTutorMessage(state, '[SUCCESS] Redis state cleared! Starting fresh.')
      console.log('[TUTOR] State cleared successfully')
    } catch (err) {
      console.error('[TUTOR] Error clearing state:', err)
      sendTutorMessage(state, '[ERROR] Error clearing state. Please try again.')
    }
  })

  console.log('[TUTOR] Lesson initialized')
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
  const sessionId = state.context.sessionId
  const stream = createCommandStream(sessionId)
  stream.subscribe(async (cmd) => {
    try {
      console.log(`[TUTOR] Processing command: ${cmd.command}`)
      const feedback = await handleCommand(state, cmd)
      // Feedback is sent to browser via tutorBridge, no console output needed
    } catch (err) {
      console.error('[TUTOR] Error processing command:', err)
    }
  })

  console.log('[TUTOR] Command stream connected')
  console.log('[TUTOR] [READY] Tutor ready - watching your progress...')
  console.log()
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
  const message = `[SKIPPED] Moving to next exercise:\n\n${exerciseMessage}`
  sendTutorMessage(state, message)
  sendProgressUpdate(state)
}

// Main tutor process
async function runTutor() {
  console.log('[TUTOR] ' + '━'.repeat(60))
  console.log('[TUTOR] Prism Tutor')
  console.log('[TUTOR] ' + '━'.repeat(60))
  console.log()

  // Load course artifacts (diagnostics and lessons) from markdown FIRST
  const courseId = 'redis-fundamentals'
  console.log('[TUTOR] Loading course content...')
  loadedArtifacts = await loadCourseArtifacts(courseId)
  console.log(`[TUTOR] Loaded ${loadedArtifacts.diagnostics.length} diagnostics, ${loadedArtifacts.lessons.length} lessons`)
  console.log()

  // Course selection will happen in the browser
  let selectedCourse: string | null = null
  let picked: ReturnType<typeof pickDiagnostic> | null = null

  // Initialize state manager
  const stateManager = getStateManager()
  await stateManager.connect()

  const sessionId = `session-${Date.now()}`

  console.log('[TUTOR] Starting browser UI for course selection...')
  console.log()

  // Start learning environment with course selection UI
  const env = await startLearningEnvironment({
    port: 3000,
    sessionId,
    redisDb: 1,  // Temporary, will be updated after course selection
    courseArtifacts: loadedArtifacts,
    onCourseSelected: async (courseName: string) => {
      selectedCourse = courseName
      console.log()
      console.log(`[TUTOR] Course selected: "${courseName}"`)
      picked = pickDiagnostic(courseName, loadedArtifacts)

      // Determine stable lesson identifier
      const matchedLesson = picked.def.lessonTopic
        ? findLessonForDiagnostic(loadedArtifacts, picked.def)
        : null
      const lessonId = matchedLesson?.lessonId || picked.def.lessonTopic || picked.def.topic
      const lessonTopic = picked.def.lessonTopic || picked.def.topic

      // Check for saved state and get database using stable ID
      const hasState = await stateManager.checkLessonHasState(lessonId)
      const redisDb = await stateManager.getDatabaseForLesson(lessonId)

      console.log()
      console.log(`[TUTOR] Topic: ${lessonTopic}`)
      console.log(`[TUTOR] Using Redis database: ${redisDb}`)

      // Handle state policy
      const stateChoice = await promptStateManagement(lessonTopic, hasState)

      if (stateChoice === 'clear') {
        console.log('[TUTOR] Clearing Redis database...')
        await stateManager.flushDatabase(redisDb)
        await stateManager.clearLessonState(lessonId)
        console.log('[TUTOR] Database cleared')
      }

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
        hintLevel: 1,
        redisDb,
        lessonId
      }

      // Initialize the lesson flow after course selection
      initializeLesson(state, env, picked, stateManager)
    }
  })

  // Browser opened with course selection UI
  console.log('[TUTOR] Browser opened')
  console.log(`[TUTOR] URL: ${env.url}`)
  console.log()
  console.log('[TUTOR] Waiting for course selection in browser...')
  console.log()
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTutor().catch(console.error)
}

export { runTutor }
