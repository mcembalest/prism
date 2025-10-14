import express from 'express'
import { WebSocketServer } from 'ws'
import * as pty from 'node-pty'
import { createClient } from 'redis'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { createCommandParser } from '../server/command-parser.js'
import { PtySession } from '../server/pty-session.js'
import { deriveCsvFromTerminal, isReadOnlyCommand } from '../server/result-formatter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Web server that:
 * 1. Serves minimal HTML with xterm.js
 * 2. Runs redis-cli via node-pty
 * 3. Exposes WebSocket for terminal I/O
 * 4. Publishes commands to Redis pub/sub for tutor to consume
 */

interface RedisCommand {
  command: string
  terminalOutput: string
  csvOutput: string
  timestamp: string
  sessionId: string
}

export interface ServerOptions {
  port?: number
  redisHost?: string
  redisPort?: number
  redisDb?: number  // Redis database number (0-15)
  sessionId: string
  courseArtifacts?: any  // Course data for selection UI
  onCourseSelected?: (courseName: string) => void  // Callback when course is selected
}

export interface TutorBridge {
  sendMessage: (message: string, messageType?: string) => void
  sendProgress: (progress: ProgressUpdate) => void
  onHintRequest: (handler: () => void) => void
  onSkipRequest: (handler: () => void) => void
  onClearStateRequest: (handler: () => void) => void
  flushDatabase: () => Promise<void>
}

export interface ProgressUpdate {
  topic?: string
  exerciseIndex?: number
  totalExercises?: number
  currentExercise?: string
  exerciseStates?: string[]
}

export async function startServer(options: ServerOptions) {
  const port = options.port || 3000
  const redisHost = options.redisHost || '127.0.0.1'
  const redisPort = options.redisPort || 6379
  const redisDb = options.redisDb ?? 1  // Default to database 1 (0 is for metadata)
  const sessionId = options.sessionId
  const courseArtifacts = options.courseArtifacts
  const onCourseSelected = options.onCourseSelected

  // Create Redis pub/sub client
  const redisPubClient = createClient({
    socket: { host: redisHost, port: redisPort },
    database: redisDb
  })
  await redisPubClient.connect()

  // Express app
  const app = express()
  app.use(express.json())  // Add JSON body parsing for course selection
  const server = createServer(app)
  const wss = new WebSocketServer({ server })

  // Track WebSocket connection for tutor bridge
  let browserWs: any = null
  const messageQueue: any[] = []
  let courseSelected = false  // Track if course has been selected

  // Handlers for tutor actions
  let hintRequestHandler: (() => void) | null = null
  let skipRequestHandler: (() => void) | null = null
  let clearStateRequestHandler: (() => void) | null = null

  // Course selection endpoint
  app.post('/select-course', (req, res) => {
    const { courseName } = req.body
    console.log('[SERVER] Course selected:', courseName)
    courseSelected = true

    // Notify tutor of course selection
    if (onCourseSelected) {
      onCourseSelected(courseName)
    }

    res.json({ success: true })
  })

  // Serve static HTML
  app.get('/', (req, res) => {
    // Show course selection if we have artifacts and no course selected yet
    if (courseArtifacts && !courseSelected) {
      const activities = courseArtifacts.activities || courseArtifacts.lessons || []
      const activitiesHTML = activities.map((activity: any, index: number) => {
        const level = activity.level || 'beginner'
        const levelText = level.charAt(0).toUpperCase() + level.slice(1)
        const name = activity.name || activity.topic || 'Lesson'
        const summary = activity.summary || ''

        return `
          <div class="course-card" onclick="selectCourse('${name}')">
            <div class="course-header">
              <span class="level-badge level-${level}">${levelText}</span>
              <h3 class="course-title">${name}</h3>
            </div>
            <p class="course-summary">${summary}</p>
          </div>
        `
      }).join('')

      res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prism - Select a Course</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 800px;
      width: 90%;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      color: white;
      font-size: 42px;
      margin: 0 0 10px 0;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 18px;
      margin: 0;
    }
    .header .subtitle {
      color: rgba(255,255,255,0.8);
      font-size: 16px;
      margin-top: 8px;
    }
    .courses-grid {
      display: grid;
      gap: 20px;
      margin-bottom: 30px;
    }
    .course-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .course-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .course-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .level-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .level-beginner {
      background: #d4edda;
      color: #155724;
    }
    .level-intermediate {
      background: #fff3cd;
      color: #856404;
    }
    .level-advanced {
      background: #f8d7da;
      color: #721c24;
    }
    .course-title {
      margin: 0;
      font-size: 20px;
      color: #2d3748;
      font-weight: 600;
    }
    .course-summary {
      margin: 0;
      color: #718096;
      font-size: 15px;
      line-height: 1.6;
    }
    .custom-course-card {
      background: rgba(255,255,255,0.95);
      border-radius: 12px;
      padding: 24px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border: 2px dashed #cbd5e0;
    }
    .custom-course-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
      border-color: #667eea;
    }
    .custom-icon {
      font-size: 14px;
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    #custom-input-container {
      display: none;
      margin-top: 20px;
    }
    #custom-input-container.show {
      display: block;
    }
    #custom-input {
      width: 100%;
      padding: 12px 16px;
      font-size: 16px;
      border: 2px solid #cbd5e0;
      border-radius: 8px;
      margin-bottom: 12px;
      font-family: inherit;
    }
    #custom-input:focus {
      outline: none;
      border-color: #667eea;
    }
    .button-group {
      display: flex;
      gap: 12px;
    }
    .btn {
      flex: 1;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover {
      background: #5568d3;
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #2d3748;
    }
    .btn-secondary:hover {
      background: #cbd5e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Prism</h1>
      <p>Choose a course to begin</p>
    </div>

    <div class="courses-grid">
      ${activitiesHTML}

      <div class="custom-course-card" onclick="showCustomInput()">
        <div class="custom-icon">Custom</div>
        <h3 class="course-title">Create your own course</h3>
        <p class="course-summary">Describe what you'd like to learn and we'll create a custom lesson</p>
      </div>
    </div>

    <div id="custom-input-container">
      <input
        type="text"
        id="custom-input"
        placeholder="What would you like to learn?"
        autocomplete="off"
      />
      <div class="button-group">
        <button class="btn btn-primary" onclick="submitCustomCourse()">Start Learning</button>
        <button class="btn btn-secondary" onclick="hideCustomInput()">Cancel</button>
      </div>
    </div>
  </div>

  <script>
    function showCustomInput() {
      document.getElementById('custom-input-container').classList.add('show');
      document.getElementById('custom-input').focus();
    }

    function hideCustomInput() {
      document.getElementById('custom-input-container').classList.remove('show');
      document.getElementById('custom-input').value = '';
    }

    async function selectCourse(courseName) {
      console.log('Selected course:', courseName);

      try {
        const response = await fetch('/select-course', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseName })
        });

        if (response.ok) {
          // Reload page to show lesson environment
          window.location.reload();
        }
      } catch (err) {
        console.error('Error selecting course:', err);
      }
    }

    async function submitCustomCourse() {
      const input = document.getElementById('custom-input');
      const courseName = input.value.trim();

      if (!courseName) {
        input.focus();
        return;
      }

      await selectCourse(courseName);
    }

    // Allow Enter key to submit custom course
    document.getElementById('custom-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitCustomCourse();
      }
    });
  </script>
</body>
</html>
      `)
      return
    }

    // Otherwise, show lesson environment
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prism - Redis Learning Environment</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #1e1e1e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      overflow: hidden;
    }
    #header {
      background: #2d2d2d;
      color: #e0e0e0;
      padding: 12px 20px;
      border-bottom: 2px solid #007acc;
    }
    #header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: normal;
      font-family: 'Courier New', monospace;
    }
    #main-container {
      display: flex;
      height: calc(100vh - 50px);
      position: relative;
    }
    #terminal-panel {
      width: calc(100% - 404px);
      padding: 20px;
      background: #1e1e1e;
      min-width: 300px;
    }
    #terminal {
      width: 100%;
      height: 100%;
    }
    #divider {
      width: 4px;
      background: #3e3e42;
      cursor: col-resize;
      transition: background 0.2s ease;
      position: relative;
      flex-shrink: 0;
    }
    #divider:hover {
      background: #007acc;
    }
    #right-panel {
      width: 400px;
      min-width: 350px;
      background: #252526;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    #progress-mini {
      position: absolute;
      top: 15px;
      right: 15px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      background: #2d2d2d;
      border-radius: 8px;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    #progress-full {
      position: absolute;
      top: 85px;
      right: 15px;
      width: 280px;
      background: #2d2d2d;
      border: 1px solid #3e3e42;
      border-radius: 8px;
      padding: 15px;
      z-index: 99;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: none;
    }
    #progress-mini:hover + #progress-full,
    #progress-full:hover {
      display: block;
    }
    .progress-item {
      margin-bottom: 12px;
    }
    .progress-full-item {
      margin-bottom: 12px;
    }
    .progress-label {
      font-size: 12px;
      color: #999;
      margin-bottom: 4px;
    }
    .progress-value {
      font-size: 13px;
      color: #e0e0e0;
      font-weight: 500;
    }
    .progress-circles-mini {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .progress-circles {
      display: flex;
      gap: 8px;
      margin-top: 5px;
      align-items: center;
    }
    .progress-circle {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #666666;
      transition: background 0.3s ease, box-shadow 0.3s ease;
    }
    .progress-circle.completed {
      background: #4ec9b0;
    }
    .progress-circle.current {
      background: #ff8c42;
      box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.3);
    }
    .progress-circle.skipped {
      background: #ff8c42;
    }
    .radial-progress {
      position: relative;
      width: 50px;
      height: 50px;
      flex-shrink: 0;
    }
    .radial-progress svg {
      transform: rotate(-90deg);
    }
    .radial-progress-bg {
      fill: none;
      stroke: #3e3e42;
      stroke-width: 6;
    }
    .radial-progress-fill {
      fill: none;
      stroke: #ff8c42;
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease, stroke 0.5s ease;
    }
    .radial-progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: 600;
      color: #e0e0e0;
    }
    #action-buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    .action-button {
      flex: 1;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .action-button:hover {
      transform: translateY(-1px);
    }
    .action-button:active {
      transform: translateY(0);
    }
    .hint-button {
      background: #007acc;
      color: white;
    }
    .hint-button:hover {
      background: #006bb3;
    }
    .skip-button {
      background: #3e3e42;
      color: #cccccc;
    }
    .skip-button:hover {
      background: #4e4e52;
    }
    #chat-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      height: 100%;
    }
    #chat-header {
      padding: 15px 20px;
      border-bottom: 1px solid #3e3e42;
    }
    #chat-header h2 {
      margin: 0;
      font-size: 14px;
      color: #cccccc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    #chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .message {
      margin-bottom: 20px;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .message-icon {
      font-size: 20px;
      margin-right: 8px;
    }
    .message-sender {
      font-size: 13px;
      font-weight: 600;
      color: #cccccc;
    }
    .message-content {
      background: #1e1e1e;
      border-left: 3px solid #007acc;
      padding: 12px 15px;
      border-radius: 4px;
      color: #d4d4d4;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .message.system .message-content {
      border-left-color: #4ec9b0;
      background: #1a2f2a;
    }
    .message.success .message-content {
      border-left-color: #4ec9b0;
    }
    #chat-messages::-webkit-scrollbar {
      width: 8px;
    }
    #chat-messages::-webkit-scrollbar-track {
      background: #252526;
    }
    #chat-messages::-webkit-scrollbar-thumb {
      background: #3e3e42;
      border-radius: 4px;
    }
    #chat-messages::-webkit-scrollbar-thumb:hover {
      background: #4e4e52;
    }
    #chat-input-container {
      padding: 15px 20px;
      border-top: 1px solid #3e3e42;
      background: #2d2d2d;
    }
    #chat-input-wrapper {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    #chat-input {
      flex: 1;
      background: #1e1e1e;
      border: 1px solid #3e3e42;
      color: #d4d4d4;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    }
    #chat-input:focus {
      outline: none;
      border-color: #007acc;
    }
    #chat-input::placeholder {
      color: #666;
    }
    #chat-send-button {
      background: #007acc;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    #chat-send-button:hover {
      background: #006bb3;
    }
    #chat-send-button:active {
      background: #005a9e;
    }
    .question-container {
      background: #1a1a1a;
      border-left: 3px solid #ff8c42;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .question-title {
      font-weight: 600;
      color: #ff8c42;
      margin-bottom: 10px;
      font-size: 15px;
    }
    .question-options {
      margin: 15px 0;
    }
    .question-option {
      padding: 10px 15px;
      margin: 8px 0;
      background: #2d2d2d;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
    }
    .question-option:hover {
      background: #3e3e42;
      border-color: #007acc;
    }
    .option-number {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      background: #007acc;
      color: white;
      border-radius: 50%;
      margin-right: 10px;
      font-weight: 600;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="header">
    <h1>Prism - Redis Learning Environment</h1>
  </div>
  <div id="main-container">
    <div id="terminal-panel">
      <div id="terminal"></div>
    </div>
    <div id="divider"></div>
    <div id="right-panel">
      <div id="progress-mini">
        <div class="radial-progress">
          <svg width="50" height="50">
            <circle class="radial-progress-bg" cx="25" cy="25" r="20"></circle>
            <circle class="radial-progress-fill" id="radial-progress-fill" cx="25" cy="25" r="20"
                    stroke-dasharray="126" stroke-dashoffset="126"></circle>
          </svg>
          <div class="radial-progress-text" id="radial-progress-text">0/0</div>
        </div>
        <div class="progress-circles-mini" id="progress-circles-mini">
          <!-- Circles will be generated dynamically -->
        </div>
      </div>
      <div id="progress-full">
        <div class="progress-full-item">
          <div class="progress-label">Current Topic</div>
          <div class="progress-value" id="current-topic">Starting...</div>
        </div>
        <div class="progress-full-item">
          <div class="progress-circles" id="progress-circles-full">
            <!-- Circles will be generated dynamically -->
          </div>
        </div>
        <div class="progress-full-item">
          <div class="progress-label">Current Exercise</div>
          <div class="progress-value" id="current-exercise">Waiting for lesson...</div>
        </div>
        <div id="action-buttons">
          <button class="action-button hint-button" id="hint-button">Hint</button>
          <button class="action-button skip-button" id="skip-button">Skip</button>
        </div>
      </div>
      <div id="chat-section">
        <div id="chat-header">
          <h2>Tutor</h2>
        </div>
        <div id="chat-messages">
          <div class="message system">
            <div class="message-header">
              <span class="message-sender">Prism Tutor</span>
            </div>
            <div class="message-content">Welcome! Your tutor will guide you through the lesson.</div>
          </div>
        </div>
        <div id="chat-input-container">
          <div id="chat-input-wrapper">
            <input type="text" id="chat-input" placeholder="Type answer, ask a question, or use terminal..." autocomplete="off">
            <button id="chat-send-button">Send</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
  <script>
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Courier New, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4'
      },
      scrollback: 1000,
      convertEol: false,
      disableStdin: false,
      cursorStyle: 'block'
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    const ws = new WebSocket('ws://' + window.location.host);
    const chatMessages = document.getElementById('chat-messages');
    let resizeTimeout;

    // Send terminal size updates to backend with debounce
    function sendResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const size = { cols: term.cols, rows: term.rows };
          console.log('Sending resize:', size);
          // Only send if dimensions are reasonable
          if (size.cols > 10 && size.rows > 5) {
            ws.send(JSON.stringify({ type: 'resize', ...size }));
          }
        }
      }, 100);
    }

    // Enhanced message parsing and rendering
    function parseMessage(content) {
      // Check if content contains a multiple choice question
      const questionMatch = content.match(/^(\[(?:QUESTION|REVIEW).*?\])\\n\\n(.+?)\\n\\n((\\d+\\..+?\\n)+)/s);
      if (questionMatch) {
        const prefix = questionMatch[1];
        const question = questionMatch[2];
        const optionsText = questionMatch[3];
        const options = optionsText.trim().split('\\n').filter(o => o.trim());

        return \`
          <div class="question-container">
            <div class="question-title">\${prefix}</div>
            <div>\${question}</div>
            <div class="question-options">
              \${options.map(opt => {
                const match = opt.match(/^(\\d+)\\. (.+)$/);
                if (match) {
                  return \`<div class="question-option" onclick="sendAnswer('\${match[1]}')">
                    <span class="option-number">\${match[1]}</span>
                    <span>\${match[2]}</span>
                  </div>\`;
                }
                return '';
              }).join('')}
            </div>
            <div style="margin-top: 10px; color: #999; font-size: 13px;">
              Click an option or type its number in the terminal
            </div>
          </div>
        \`;
      }

      // Check if content contains a prediction question (similar format)
      const predictionMatch = content.match(/^(\[PREDICTION\])\\n\\n(.+?)\\n\\n(.+?)\\n\\n((\\d+\\..+?\\n)+)/s);
      if (predictionMatch) {
        const prefix = predictionMatch[1];
        const command = predictionMatch[2];
        const question = predictionMatch[3];
        const optionsText = predictionMatch[4];
        const options = optionsText.trim().split('\\n').filter(o => o.trim());

        return \`
          <div class="question-container">
            <div class="question-title">\${prefix}</div>
            <div style="background: #2d2d2d; padding: 8px; border-radius: 4px; margin: 10px 0; font-family: monospace;">
              \${command}
            </div>
            <div>\${question}</div>
            <div class="question-options">
              \${options.map(opt => {
                const match = opt.match(/^(\\d+)\\. (.+)$/);
                if (match) {
                  return \`<div class="question-option" onclick="sendAnswer('\${match[1]}')">
                    <span class="option-number">\${match[1]}</span>
                    <span>\${match[2]}</span>
                  </div>\`;
                }
                return '';
              }).join('')}
            </div>
            <div style="margin-top: 10px; color: #999; font-size: 13px;">
              Click an option or type its number in the terminal
            </div>
          </div>
        \`;
      }

      // Default: return as-is
      return content;
    }

    // Send answer to terminal (called when clicking multiple choice options)
    function sendAnswer(answer) {
      const chatInput = document.getElementById('chat-input');
      chatInput.value = answer;
      chatInput.focus();

      // Auto-send the answer as chat message (not to terminal)
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'chat-message', message: answer }));
        chatInput.value = '';
      }
    }

    // Add message to chat
    function addMessage(content, type = 'tutor') {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + (type === 'success' ? 'success' : '');

      const icon = type === 'success' ? '[OK]' : '[TUTOR]';

      const parsedContent = parseMessage(content);

      messageDiv.innerHTML = \`
        <div class="message-header">
          <span class="message-icon">\${icon}</span>
          <span class="message-sender">Prism Tutor</span>
        </div>
        <div class="message-content">\${parsedContent}</div>
      \`;

      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Update progress
    function updateProgress(data) {
      if (data.topic) {
        document.getElementById('current-topic').textContent = data.topic;
      }
      if (data.exerciseIndex !== undefined && data.totalExercises !== undefined) {
        const completed = data.exerciseIndex;
        const total = data.totalExercises;
        const exerciseStates = data.exerciseStates || [];

        // Update radial progress (radius = 20 for mini)
        const radius = 20;
        const circumference = 2 * Math.PI * radius;
        const percentage = total > 0 ? completed / total : 0;
        const offset = circumference - (percentage * circumference);

        const radialFill = document.getElementById('radial-progress-fill');
        const radialText = document.getElementById('radial-progress-text');

        radialFill.style.strokeDashoffset = offset.toString();
        radialText.textContent = \`\${completed}/\${total}\`;

        // Color transition from orange to green based on completion
        const orangeColor = { r: 255, g: 140, b: 66 };
        const greenColor = { r: 78, g: 201, b: 176 };

        const r = Math.round(orangeColor.r + (greenColor.r - orangeColor.r) * percentage);
        const g = Math.round(orangeColor.g + (greenColor.g - orangeColor.g) * percentage);
        const b = Math.round(orangeColor.b + (greenColor.b - orangeColor.b) * percentage);

        radialFill.style.stroke = \`rgb(\${r}, \${g}, \${b})\`;

        // Update circles in both mini and full views
        const circlesMini = document.getElementById('progress-circles-mini');
        const circlesFull = document.getElementById('progress-circles-full');

        [circlesMini, circlesFull].forEach(container => {
          // Create circles if they don't exist or if the count changed
          if (container.children.length !== total) {
            container.innerHTML = '';
            for (let i = 0; i < total; i++) {
              const circle = document.createElement('div');
              circle.className = 'progress-circle';
              container.appendChild(circle);
            }
          }

          // Update circle states based on exerciseStates array
          const circles = container.children;
          for (let i = 0; i < circles.length; i++) {
            circles[i].className = 'progress-circle';

            if (exerciseStates[i] === 'completed') {
              circles[i].classList.add('completed');
            } else if (exerciseStates[i] === 'current') {
              circles[i].classList.add('current');
            } else if (exerciseStates[i] === 'skipped') {
              circles[i].classList.add('skipped');
            }
            // else: untouched (grey - default)
          }
        });
      }
      if (data.currentExercise) {
        document.getElementById('current-exercise').textContent = data.currentExercise;
      }
    }

    ws.onopen = () => {
      console.log('Connected to terminal');
      // Wait a bit for terminal to be fully initialized
      setTimeout(() => {
        fitAddon.fit();
        setTimeout(sendResize, 50);
      }, 200);
    };

    ws.onmessage = (event) => {
      const handleText = (text) => {
        // Try to parse as JSON for tutor messages; else write to terminal
        try {
          const data = JSON.parse(text);
          if (data && typeof data === 'object' && 'type' in data) {
            if (data.type === 'tutor-message') {
              addMessage(data.message, data.messageType || 'tutor');
              return;
            }
            if (data.type === 'progress-update') {
              updateProgress(data);
              return;
            }
          }
          // If parsed but not a recognized structured message, treat as terminal output
          term.write(text);
        } catch {
          // Not JSON; treat as terminal data
          term.write(text);
        }
      };

      if (typeof event.data === 'string') {
        handleText(event.data);
      } else if (event.data instanceof Blob) {
        event.data.text().then(handleText).catch(() => {});
      } else if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(event.data);
        handleText(text);
      } else {
        // Fallback
        try {
          handleText(String(event.data));
        } catch {}
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    term.onData((data) => {
      ws.send(data);
    });

    window.addEventListener('resize', () => {
      fitAddon.fit();
      sendResize();
    });

    // Divider drag functionality
    const divider = document.getElementById('divider');
    const terminalPanel = document.getElementById('terminal-panel');
    const rightPanel = document.getElementById('right-panel');
    const mainContainer = document.getElementById('main-container');
    let isDragging = false;

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const containerRect = mainContainer.getBoundingClientRect();
      const newTerminalWidth = e.clientX - containerRect.left;
      const dividerWidth = 4;
      const newRightWidth = containerRect.width - newTerminalWidth - dividerWidth;

      // Enforce minimum widths
      const minTerminalWidth = 300;
      const minRightWidth = 350;

      if (newTerminalWidth >= minTerminalWidth && newRightWidth >= minRightWidth) {
        terminalPanel.style.width = newTerminalWidth + 'px';
        rightPanel.style.width = newRightWidth + 'px';

        // Refit terminal after resize
        setTimeout(() => {
          fitAddon.fit();
          sendResize();
        }, 0);
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
      }
    });

    // Button handlers
    document.getElementById('hint-button').addEventListener('click', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'hint-request' }));
      }
    });

    document.getElementById('skip-button').addEventListener('click', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'skip-request' }));
      }
    });

    // Chat input handlers
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');

    function sendChatMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      // Send message as chat message (not to terminal)
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'chat-message', message: message }));
      }

      // Clear input
      chatInput.value = '';
    }

    chatSendButton.addEventListener('click', sendChatMessage);

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      }
    });

    // Focus chat input by default
    chatInput.focus();
  </script>
</body>
</html>
    `)
  })

  // WebSocket handler
  wss.on('connection', (ws) => {
    console.log('[SERVER] Browser connected')
    browserWs = ws

    // Flush queued messages
    console.log(`[SERVER] Flushing ${messageQueue.length} queued messages`)
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift()
      if (ws.readyState === 1) { // OPEN
        ws.send(msg)
      }
    }

    // Spawn redis-cli via PTY session
    const ptySession = new PtySession({
      redisHost,
      redisPort,
      redisDb,
      cols: 80,
      rows: 24,
      env: process.env as any
    })

    // Build prompt pattern based on database number
    const promptPattern = redisDb === 0 ? '127.0.0.1:6379>' : `127.0.0.1:6379[${redisDb}]>`
    const parser = createCommandParser(promptPattern, {
      onCommandCaptured: (cmd) => {
        console.log('[SERVER] Captured command:', cmd)
      },
      onCommandCompleted: (cmd, output) => {
        console.log('[SERVER] Command completed, processing...')
        publishCapturedCommand(output, cmd, redisPubClient, sessionId, redisHost, redisPort, redisDb)
      }
    })

    // Forward PTY output to WebSocket and feed parser
    ptySession.onData((data) => {
      ws.send(data)
      parser.addData(data)
    })

    // Forward WebSocket input to pty
    ws.on('message', (data) => {
      const message = data.toString()

      // Check if this is a JSON message (resize, hint, skip, chat, etc.)
      try {
        const parsed = JSON.parse(message)
        if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
          // Validate dimensions before resizing
          const cols = parseInt(parsed.cols)
          const rows = parseInt(parsed.rows)
          if (cols >= 20 && cols <= 500 && rows >= 5 && rows <= 200) {
            console.log(`[SERVER] Resizing PTY to ${cols}x${rows}`)
            ptySession.resize(cols, rows)
          } else {
            console.log(`[SERVER] Ignoring invalid resize: ${cols}x${rows}`)
          }
          return
        }
        if (parsed.type === 'hint-request') {
          console.log('[SERVER] Hint requested')
          if (hintRequestHandler) {
            hintRequestHandler()
          }
          return
        }
        if (parsed.type === 'skip-request') {
          console.log('[SERVER] Skip requested')
          if (skipRequestHandler) {
            skipRequestHandler()
          }
          return
        }
        if (parsed.type === 'clear-state') {
          console.log('[SERVER] Clear state requested')
          if (clearStateRequestHandler) {
            clearStateRequestHandler()
          }
          return
        }
        if (parsed.type === 'chat-message') {
          // Handle chat message - publish directly to Redis without sending to terminal
          console.log('[SERVER] Chat message received:', parsed.message)
          const cmdData: RedisCommand = {
            command: parsed.message,
            terminalOutput: '',
            csvOutput: '',
            timestamp: new Date().toISOString(),
            sessionId
          }

          const channel = process.env.PRISM_COMMAND_CHANNEL || 'prism:commands'
          redisPubClient.publish(channel, JSON.stringify(cmdData))
            .then(() => console.log('[SERVER] Published chat message to tutor'))
            .catch((err: Error) => console.error('[SERVER] Redis publish error:', err))
          return
        }
      } catch {
        // Not JSON, treat as regular terminal input
      }

      ptySession.write(message)
    })

    // Handle disconnection
    ws.on('close', () => {
      console.log('[SERVER] Browser disconnected')
      ptySession.kill()
      if (browserWs === ws) {
        browserWs = null
      }
    })

    ptySession.onExit(() => {
      ws.close()
    })
  })

  server.listen(port, () => {
    console.log(`[SERVER] Learning environment ready at http://localhost:${port}`)
  })

  // Create tutor bridge for sending messages to browser
  const tutorBridge: TutorBridge = {
    sendMessage: (message: string, messageType: string = 'tutor') => {
      const payload = JSON.stringify({
        type: 'tutor-message',
        message,
        messageType
      })

      if (browserWs && browserWs.readyState === 1) { // 1 = OPEN
        browserWs.send(payload)
      } else {
        // Queue message for when connection is ready
        console.log('[SERVER] Queueing tutor message (connection not ready)')
        messageQueue.push(payload)
      }
    },
    sendProgress: (progress: ProgressUpdate) => {
      const payload = JSON.stringify({
        type: 'progress-update',
        ...progress
      })

      if (browserWs && browserWs.readyState === 1) {
        browserWs.send(payload)
      } else {
        // Queue message for when connection is ready
        console.log('[SERVER] Queueing progress update (connection not ready)')
        messageQueue.push(payload)
      }
    },
    onHintRequest: (handler: () => void) => {
      hintRequestHandler = handler
    },
    onSkipRequest: (handler: () => void) => {
      skipRequestHandler = handler
    },
    onClearStateRequest: (handler: () => void) => {
      clearStateRequestHandler = handler
    },
    flushDatabase: async () => {
      console.log('[SERVER] Flushing database', redisDb)
      await redisPubClient.flushDb()
      console.log('[SERVER] Database flushed')
    }
  }

  return { server, redisPubClient, tutorBridge }
}

  // Parse buffer to extract output and publish to Redis
function publishCapturedCommand(
  terminalOutput: string,
  command: string,
  pubClient: any,
  sessionId: string,
  redisHost: string,
  redisPort: number,
  redisDb: number
) {
  console.log('[SERVER] Extracted output:', terminalOutput.trim())

  const readOnly = isReadOnlyCommand(command)
  const csvPromise = readOnly
    ? getCSVOutput(command, { redisHost, redisPort, redisDb })
    : Promise.resolve(deriveCsvFromTerminal(terminalOutput))

  csvPromise.then(csvOutput => {
    const cmdData: RedisCommand = {
      command,
      terminalOutput: terminalOutput.trim(),
      csvOutput,
      timestamp: new Date().toISOString(),
      sessionId
    }

    console.log('[SERVER] Publishing command to Redis:', cmdData)

    const channel = process.env.PRISM_COMMAND_CHANNEL || 'prism:commands'
    pubClient.publish(channel, JSON.stringify(cmdData))
      .then(() => console.log('[SERVER] Published successfully'))
      .catch((err: Error) => console.error('[SERVER] Redis publish error:', err))
  })
}

// moved: isReadOnlyCommand and deriveCsvFromTerminal are in ../server/result-formatter

async function getCSVOutput(
  command: string,
  opts?: { redisHost?: string; redisPort?: number; redisDb?: number }
): Promise<string> {
  return new Promise((resolve) => {
    const host = opts?.redisHost || '127.0.0.1'
    const port = (opts?.redisPort ?? 6379).toString()
    const db = (opts?.redisDb ?? 0).toString()
    const args = ['--csv', '-h', host, '-p', port, '-n', db, ...command.split(' ')]
    const proc = spawn('redis-cli', args)

    let output = ''
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.on('close', () => {
      resolve(output.trim())
    })

    setTimeout(() => {
      proc.kill()
      resolve('')
    }, 1000)
  })
}
