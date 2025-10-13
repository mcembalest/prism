import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import open from 'open'

// --- Minimal lesson data (11 items) ---
const lessonPlan = {
  topic: 'Progress System Demo',
  level: 'beginner',
  summary: 'A short demo lesson to showcase the progress UI and tutoring flow.',
  exercises: [
    { type: 'conceptual-question', question: 'What does this demo illustrate?', options: ['Progress UI only', 'A Redis CLI', 'Database internals'], correctIndex: 0, explanation: 'This is a sidepanel-only demo.' },
    { type: 'conceptual-question', question: 'How do you answer questions?', options: ['Type a number like 1', 'Run a terminal command', 'Click the radial circle'], correctIndex: 0, explanation: 'Use the chat input and submit a number.' },
    { type: 'conceptual-question', question: 'What do the small circles represent?', options: ['Exercises', 'Users', 'Errors'], correctIndex: 0, explanation: 'Each circle is an exercise status (current/completed/skipped).' },
    { type: 'conceptual-question', question: 'What happens when you press Hint?', options: ['Progress resets', 'You get progressive hints', 'The server restarts'], correctIndex: 1, explanation: 'Hints escalate (1 → 3) for the current exercise.' },
    { type: 'conceptual-question', question: 'What does Skip do?', options: ['Marks current as skipped and moves on', 'Deletes the lesson', 'Disables chat'], correctIndex: 0, explanation: 'Skip advances to the next exercise, tracking skipped state.' },
    { type: 'conceptual-question', question: 'Where do tutor messages appear?', options: ['Right-side chat feed', 'Terminal pane', 'System log only'], correctIndex: 0, explanation: 'They appear in the Tutor panel chat.' },
    { type: 'conceptual-question', question: 'How is progress computed?', options: ['Completed/total', 'Randomly', 'By server uptime'], correctIndex: 0, explanation: 'The radial shows completed divided by total exercises.' },
    { type: 'conceptual-question', question: 'Can you ask free‑form questions?', options: ['Yes, the tutor will respond', 'No, numbers only', 'Only on Thursdays'], correctIndex: 0, explanation: 'Free‑form text gets a friendly response.' },
    { type: 'conceptual-question', question: 'What happens after the last exercise?', options: ['Lesson complete message', 'App closes', 'It loops forever'], correctIndex: 0, explanation: 'You will see a completion message.' },
    { type: 'conceptual-question', question: 'Ready to finish?', options: ['Yes', 'No', 'Maybe later'], correctIndex: 0, explanation: 'Thanks for trying the demo!' }
  ]
}

// --- Server + Bridge ---
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })
const PORT = 3301

// Simple per-connection session state
function initState() {
  return {
    lesson: lessonPlan,
    currentExerciseIndex: 0,
    exerciseStates: lessonPlan.exercises.map((_, i) => (i === 0 ? 'current' : 'untouched')), // 'untouched'|'current'|'completed'|'skipped'
    hintLevel: 1,
    awaitingAnswer: true
  }
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj))
  }
}

function sendTutor(ws, message, messageType = 'tutor') {
  send(ws, { type: 'tutor-message', message, messageType })
}

function sendProgress(ws, state) {
  const total = state.lesson.exercises.length
  const completed = state.exerciseStates.filter((s) => s === 'completed').length
  const current = state.lesson.exercises[state.currentExerciseIndex]
  const currentText = current ? `Question: ${current.question}` : 'Complete!'
  send(ws, {
    type: 'progress-update',
    topic: `${state.lesson.topic} (${state.lesson.level})`,
    exerciseIndex: state.currentExerciseIndex,
    totalExercises: total,
    currentExercise: currentText,
    exerciseStates: state.exerciseStates
  })
}

function presentCurrent(ws, state) {
  const ex = state.lesson.exercises[state.currentExerciseIndex]
  if (!ex) return
  const optionsText = ex.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')
  const msg = `📝 Question:\n\n${ex.question}\n\n${optionsText}\n\nType the number of your answer (or ask a question).`
  sendTutor(ws, msg)
}

function markComplete(state) {
  if (state.exerciseStates[state.currentExerciseIndex] !== 'completed') {
    state.exerciseStates[state.currentExerciseIndex] = 'completed'
  }
  state.hintLevel = 1
  state.awaitingAnswer = false
}

function moveNext(ws, state) {
  state.currentExerciseIndex++
  if (state.currentExerciseIndex < state.lesson.exercises.length) {
    // Mark next as current if still untouched
    if (state.exerciseStates[state.currentExerciseIndex] === 'untouched') {
      state.exerciseStates[state.currentExerciseIndex] = 'current'
    }
    state.awaitingAnswer = true
    sendProgress(ws, state)
    presentCurrent(ws, state)
  } else {
    sendProgress(ws, state)
    sendTutor(ws, `🎉 Lesson complete! You've finished ${state.lesson.topic}.`, 'success')
  }
}

function handleUserMessage(ws, state, text) {
  const trimmed = (text || '').trim()
  // If numeric answer
  if (/^\d+$/.test(trimmed) && state.awaitingAnswer) {
    const ex = state.lesson.exercises[state.currentExerciseIndex]
    const num = parseInt(trimmed, 10)
    if (num < 1 || num > ex.options.length) {
      sendTutor(ws, `Please answer with a number between 1 and ${ex.options.length}.`)
      return
    }
    if (num - 1 === ex.correctIndex) {
      markComplete(state)
      sendTutor(ws, `Excellent!\n\n${ex.explanation || ''}`, 'success')
      moveNext(ws, state)
    } else {
      sendTutor(ws, `Not quite. Try again — or ask for a hint!`)
    }
    return
  }

  // Free-form question
  if (trimmed.length > 0) {
    sendTutor(ws, `📖 Good question. For this demo, try answering with a number that matches the options. You can also press Hint or Skip. `)
  }
}

function handleHint(ws, state) {
  const ex = state.lesson.exercises[state.currentExerciseIndex]
  if (!ex) return
  let hint
  if (state.hintLevel === 1) {
    hint = '💡 Hint (Level 1): Read the question carefully and eliminate obviously wrong answers.'
    state.hintLevel = 2
  } else if (state.hintLevel === 2) {
    hint = '💡 Hint (Level 2): Focus on what this demo actually demonstrates (no terminals or databases).'
    state.hintLevel = 3
  } else {
    hint = `💡 Hint (Level 3): The best choice is: ${ex.correctIndex + 1}.`
  }
  sendTutor(ws, hint)
}

function handleSkip(ws, state) {
  if (state.currentExerciseIndex >= state.lesson.exercises.length) return
  state.exerciseStates[state.currentExerciseIndex] = 'skipped'
  sendProgress(ws, state)
  moveNext(ws, state)
}

// Serve static HTML (right-panel only)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Prism – Sidepanel Only Demo</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #1e1e1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
    #header { background: #2d2d2d; color: #e0e0e0; padding: 12px 20px; border-bottom: 2px solid #007acc; }
    #header h1 { margin: 0; font-size: 18px; font-weight: normal; font-family: 'Courier New', monospace; }
    body { height: 100vh; overflow: hidden; }
    #container { width: 420px; margin: 0 auto; height: calc(100vh - 50px); max-height: calc(100vh - 50px); background: #252526; border-left: 1px solid #3e3e42; border-right: 1px solid #3e3e42; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    #progress-section { padding: 20px; border-bottom: 1px solid #3e3e42; }
    #progress-section h2 { margin: 0 0 15px 0; font-size: 14px; color: #cccccc; text-transform: uppercase; letter-spacing: 0.5px; }
    .radial-progress-container { display: flex; align-items: center; justify-content: center; margin-bottom: 15px; }
    .radial-progress { position: relative; width: 80px; height: 80px; }
    .radial-progress svg { transform: rotate(-90deg); }
    .radial-progress-bg { fill: none; stroke: #3e3e42; stroke-width: 8; }
    .radial-progress-fill { fill: none; stroke: #ff8c42; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease, stroke 0.5s ease; }
    .radial-progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: 600; color: #e0e0e0; }
    .progress-item { margin-bottom: 12px; }
    .progress-label { font-size: 13px; color: #999; margin-bottom: 5px; }
    .progress-value { font-size: 14px; color: #e0e0e0; font-weight: 500; }
    .progress-circles { display: flex; gap: 8px; margin-top: 5px; align-items: center; flex-wrap: wrap; }
    .progress-circle { width: 12px; height: 12px; border-radius: 50%; background: #666666; transition: background 0.3s ease, box-shadow 0.3s ease; }
    .progress-circle.completed { background: #4ec9b0; }
    .progress-circle.current { background: #ff8c42; box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.3); }
    .progress-circle.skipped { background: #c586c0; }
    #action-buttons { display: flex; gap: 10px; margin-top: 15px; }
    .action-button { flex: 1; padding: 10px 15px; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
    .action-button:hover { transform: translateY(-1px); }
    .hint-button { background: #007acc; color: white; }
    .hint-button:hover { background: #006bb3; }
    .skip-button { background: #3e3e42; color: #cccccc; }
    .skip-button:hover { background: #4e4e52; }
    #chat-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    #chat-header { padding: 15px 20px; border-bottom: 1px solid #3e3e42; }
    #chat-header h2 { margin: 0; font-size: 14px; color: #cccccc; text-transform: uppercase; letter-spacing: 0.5px; }
    #chat-messages { flex: 1 1 auto; overflow-y: auto; padding: 20px; scrollbar-width: thin; scrollbar-color: #3e3e42 #252526; min-height: 0; }
    /* Scrollbar styling to match original */
    #chat-messages::-webkit-scrollbar { width: 8px; }
    #chat-messages::-webkit-scrollbar-track { background: #252526; }
    #chat-messages::-webkit-scrollbar-thumb { background: #3e3e42; border-radius: 4px; }
    #chat-messages::-webkit-scrollbar-thumb:hover { background: #4e4e52; }
    .message { margin-bottom: 20px; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .message-header { display: flex; align-items: center; margin-bottom: 8px; }
    .message-icon { font-size: 20px; margin-right: 8px; }
    .message-sender { font-size: 13px; font-weight: 600; color: #cccccc; }
    .message-content { background: #1e1e1e; border-left: 3px solid #007acc; padding: 12px 15px; border-radius: 4px; color: #d4d4d4; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .message.system .message-content { border-left-color: #4ec9b0; background: #1a2f2a; }
    .message.success .message-content { border-left-color: #4ec9b0; }
    #chat-input-container { padding: 15px 20px; border-top: 1px solid #3e3e42; background: #2d2d2d; }
    #chat-input-wrapper { display: flex; gap: 10px; align-items: center; }
    #chat-input { flex: 1; background: #1e1e1e; border: 1px solid #3e3e42; color: #d4d4d4; padding: 10px 12px; border-radius: 4px; font-size: 14px; }
    #chat-input:focus { outline: none; border-color: #007acc; }
    #chat-input::placeholder { color: #666; }
    #chat-send-button { background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s ease; }
    #chat-send-button:hover { background: #006bb3; }
  </style>
</head>
<body>
  <div id="header"><h1>🎓 Prism – Sidepanel Only Demo</h1></div>
  <div id="container">
    <div id="progress-section">
      <h2>Progress</h2>
      <div class="radial-progress-container">
        <div class="radial-progress">
          <svg width="80" height="80">
            <circle class="radial-progress-bg" cx="40" cy="40" r="32"></circle>
            <circle class="radial-progress-fill" id="radial-progress-fill" cx="40" cy="40" r="32" stroke-dasharray="201" stroke-dashoffset="201"></circle>
          </svg>
          <div class="radial-progress-text" id="radial-progress-text">0/0</div>
        </div>
      </div>
      <div class="progress-item">
        <div class="progress-label">Current Topic</div>
        <div class="progress-value" id="current-topic">Loading...</div>
      </div>
      <div class="progress-item">
        <div class="progress-label">Lesson Progress</div>
        <div class="progress-value"><span id="exercise-count">0 / 0</span> exercises completed</div>
        <div class="progress-circles" id="progress-circles"></div>
      </div>
      <div class="progress-item">
        <div class="progress-label">Current Exercise</div>
        <div class="progress-value" id="current-exercise">Preparing...</div>
      </div>
      <div id="action-buttons">
        <button class="action-button hint-button" id="hint-button">Hint</button>
        <button class="action-button skip-button" id="skip-button">Skip</button>
      </div>
    </div>
    <div id="chat-section">
      <div id="chat-header"><h2>Tutor</h2></div>
      <div id="chat-messages">
        <div class="message system">
          <div class="message-header"><span class="message-icon">🎓</span><span class="message-sender">Prism Tutor</span></div>
          <div class="message-content">Welcome! Answer with numbers like 1, 2, 3…</div>
        </div>
      </div>
      <div id="chat-input-container">
        <div id="chat-input-wrapper">
          <input type="text" id="chat-input" placeholder="Type answer or ask a question…" autocomplete="off" />
          <button id="chat-send-button">Send</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://' + window.location.host)
    const chat = document.getElementById('chat-messages')

    function addMessage(content, type='tutor') {
      const wrap = document.createElement('div')
      wrap.className = 'message ' + (type || 'tutor')
      wrap.innerHTML = 
        '<div class="message-header">' +
          '<span class="message-icon">' + (type === 'success' ? '✅' : '🎓') + '</span>' +
          '<span class="message-sender">Prism Tutor</span>' +
        '</div>' +
        '<div class="message-content">' + content.replace(/</g,'&lt;') + '</div>'
      chat.appendChild(wrap)
      chat.scrollTop = chat.scrollHeight
    }

    function updateProgress(data) {
      const total = data.totalExercises || 0
      const states = data.exerciseStates || []
      const completed = states.filter(s => s === 'completed').length
      const current = data.exerciseIndex || 0

      // Radial
      const circumference = 201
      const progress = total > 0 ? (completed / total) : 0
      const offset = circumference - progress * circumference
      document.getElementById('radial-progress-fill').setAttribute('stroke-dashoffset', String(offset))
      document.getElementById('radial-progress-text').textContent = completed + '/' + total

      // Labels
      if (data.topic) document.getElementById('current-topic').textContent = data.topic
      document.getElementById('exercise-count').textContent = completed + ' / ' + total
      if (data.currentExercise) document.getElementById('current-exercise').textContent = data.currentExercise

      // Circles
      const container = document.getElementById('progress-circles')
      container.innerHTML = ''
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('div')
        dot.className = 'progress-circle'
        if (states[i] === 'completed') dot.classList.add('completed')
        else if (i === current) dot.classList.add('current')
        else if (states[i] === 'skipped') dot.classList.add('skipped')
        container.appendChild(dot)
      }
    }

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'tutor-message') addMessage(data.message, data.messageType)
        if (data.type === 'progress-update') updateProgress(data)
      } catch { /* ignore */ }
    }

    // Buttons
    document.getElementById('hint-button').onclick = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hint-request' }))
    }
    document.getElementById('skip-button').onclick = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'skip-request' }))
    }

    // Input
    const input = document.getElementById('chat-input')
    const sendBtn = document.getElementById('chat-send-button')
    function sendMsg() {
      const text = input.value.trim()
      if (!text) return
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'user-message', text }))
      input.value = ''
    }
    sendBtn.onclick = sendMsg
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMsg() }})
  </script>
</body>
</html>`)
})

wss.on('connection', (ws) => {
  const state = initState()
  // Initial updates
  sendProgress(ws, state)
  sendTutor(ws, `📚 ${state.lesson.topic} (${state.lesson.level})\n${state.lesson.summary}\n`)
  presentCurrent(ws, state)

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    if (!msg || typeof msg !== 'object') return
    if (msg.type === 'user-message') return handleUserMessage(ws, state, msg.text)
    if (msg.type === 'hint-request') return handleHint(ws, state)
    if (msg.type === 'skip-request') return handleSkip(ws, state)
  })
})

server.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`
  console.log(`✓ Sidepanel demo running at ${url}`)
  try { await open(url) } catch { /* non-fatal */ }
})
