import express from 'express'
import { WebSocketServer } from 'ws'
import * as pty from 'node-pty'
import { createClient } from 'redis'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

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
  sessionId: string
}

export interface TutorBridge {
  sendMessage: (message: string, messageType?: string) => void
  sendProgress: (progress: ProgressUpdate) => void
  onHintRequest: (handler: () => void) => void
  onSkipRequest: (handler: () => void) => void
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
  const sessionId = options.sessionId

  // Create Redis pub/sub client
  const redisPubClient = createClient({
    socket: { host: redisHost, port: redisPort }
  })
  await redisPubClient.connect()

  // Express app
  const app = express()
  const server = createServer(app)
  const wss = new WebSocketServer({ server })

  // Track WebSocket connection for tutor bridge
  let browserWs: any = null
  const messageQueue: any[] = []

  // Handlers for tutor actions
  let hintRequestHandler: (() => void) | null = null
  let skipRequestHandler: (() => void) | null = null

  // Serve static HTML
  app.get('/', (req, res) => {
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
    }
    #terminal-panel {
      flex: 1;
      padding: 20px;
      background: #1e1e1e;
    }
    #terminal {
      width: 100%;
      height: 100%;
    }
    #right-panel {
      width: 400px;
      background: #252526;
      border-left: 1px solid #3e3e42;
      display: flex;
      flex-direction: column;
    }
    #progress-section {
      padding: 20px;
      border-bottom: 1px solid #3e3e42;
    }
    #progress-section h2 {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #cccccc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .progress-item {
      margin-bottom: 12px;
    }
    .progress-label {
      font-size: 13px;
      color: #999;
      margin-bottom: 5px;
    }
    .progress-value {
      font-size: 14px;
      color: #e0e0e0;
      font-weight: 500;
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
    .radial-progress-container {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 15px;
    }
    .radial-progress {
      position: relative;
      width: 80px;
      height: 80px;
    }
    .radial-progress svg {
      transform: rotate(-90deg);
    }
    .radial-progress-bg {
      fill: none;
      stroke: #3e3e42;
      stroke-width: 8;
    }
    .radial-progress-fill {
      fill: none;
      stroke: #ff8c42;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease, stroke 0.5s ease;
    }
    .radial-progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
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
  </style>
</head>
<body>
  <div id="header">
    <h1>🎓 Prism - Redis Learning Environment</h1>
  </div>
  <div id="main-container">
    <div id="terminal-panel">
      <div id="terminal"></div>
    </div>
    <div id="right-panel">
      <div id="progress-section">
        <h2>Progress</h2>
        <div class="radial-progress-container">
          <div class="radial-progress">
            <svg width="80" height="80">
              <circle class="radial-progress-bg" cx="40" cy="40" r="32"></circle>
              <circle class="radial-progress-fill" id="radial-progress-fill" cx="40" cy="40" r="32"
                      stroke-dasharray="201" stroke-dashoffset="201"></circle>
            </svg>
            <div class="radial-progress-text" id="radial-progress-text">0/0</div>
          </div>
        </div>
        <div class="progress-item">
          <div class="progress-label">Current Topic</div>
          <div class="progress-value" id="current-topic">Starting...</div>
        </div>
        <div class="progress-item">
          <div class="progress-label">Lesson Progress</div>
          <div class="progress-value">
            <span id="exercise-count">0 / 0</span> exercises completed
          </div>
          <div class="progress-circles" id="progress-circles">
            <!-- Circles will be generated dynamically -->
          </div>
        </div>
        <div class="progress-item">
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
              <span class="message-icon">🎓</span>
              <span class="message-sender">Prism Tutor</span>
            </div>
            <div class="message-content">Welcome! Your tutor will guide you through the lesson.</div>
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
      }
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    const ws = new WebSocket('ws://' + window.location.host);
    const chatMessages = document.getElementById('chat-messages');

    // Send terminal size updates to backend
    function sendResize() {
      if (ws.readyState === WebSocket.OPEN) {
        const size = { cols: term.cols, rows: term.rows };
        console.log('Sending resize:', size);
        ws.send(JSON.stringify({ type: 'resize', ...size }));
      }
    }

    // Add message to chat
    function addMessage(content, type = 'tutor') {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + (type === 'success' ? 'success' : '');

      const icon = type === 'success' ? '✓' : '🎓';

      messageDiv.innerHTML = \`
        <div class="message-header">
          <span class="message-icon">\${icon}</span>
          <span class="message-sender">Prism Tutor</span>
        </div>
        <div class="message-content">\${content}</div>
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

        document.getElementById('exercise-count').textContent = \`\${completed} / \${total}\`;

        // Update radial progress
        const radius = 32;
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

        // Update circles
        const circlesContainer = document.getElementById('progress-circles');

        // Create circles if they don't exist or if the count changed
        if (circlesContainer.children.length !== total) {
          circlesContainer.innerHTML = '';
          for (let i = 0; i < total; i++) {
            const circle = document.createElement('div');
            circle.className = 'progress-circle';
            circlesContainer.appendChild(circle);
          }
        }

        // Update circle states based on exerciseStates array
        const circles = circlesContainer.children;
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
      }
      if (data.currentExercise) {
        document.getElementById('current-exercise').textContent = data.currentExercise;
      }
    }

    ws.onopen = () => {
      console.log('Connected to terminal');
      sendResize();
    };

    ws.onmessage = (event) => {
      // Try to parse as JSON for tutor messages
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'tutor-message') {
          addMessage(data.message, data.messageType || 'tutor');
        } else if (data.type === 'progress-update') {
          updateProgress(data);
        }
      } catch (e) {
        // Not JSON, treat as terminal data
        term.write(event.data);
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

    // Spawn redis-cli with large initial size (will be resized by client)
    const ptyProcess = pty.spawn('redis-cli', [
      '-h', redisHost,
      '-p', redisPort.toString()
    ], {
      name: 'xterm-color',
      cols: 160,
      rows: 40,
      cwd: process.cwd(),
      env: process.env as any
    })

    let buffer = ''
    let lastCommandLine = ''

    // Forward pty output to WebSocket
    ptyProcess.onData((data) => {
      ws.send(data)

      // Buffer for command detection
      buffer += data

      // Detect when user presses Enter (command submitted)
      if (data.includes('\r\n') && !data.includes('127.0.0.1:6379>')) {
        // User just submitted a command, extract it from buffer
        const lines = buffer.split('\r\n')
        for (const line of lines) {
          // Find line with prompt and command (without the output)
          if (line.includes('127.0.0.1:6379>')) {
            // Strip ALL ANSI escape codes (not just color codes)
            const stripped = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\r/g, '')
            const lastPromptIndex = stripped.lastIndexOf('127.0.0.1:6379>')
            if (lastPromptIndex !== -1) {
              const cmd = stripped.substring(lastPromptIndex + 15).trim()
              if (cmd && cmd !== lastCommandLine) {
                lastCommandLine = cmd
                console.log('[SERVER] Captured command:', cmd)
                // Clear buffer to start fresh for output capture
                buffer = ''
              }
            }
          }
        }
      }

      // Detect when we're back at prompt after output (command completed)
      if (lastCommandLine && data.includes('127.0.0.1:6379>')) {
        console.log('[SERVER] Command completed, processing...')
        processBuffer(buffer, lastCommandLine, redisPubClient, sessionId)
        lastCommandLine = ''
        buffer = ''
      }
    })

    // Forward WebSocket input to pty
    ws.on('message', (data) => {
      const message = data.toString()

      // Check if this is a JSON message (resize, hint, skip, etc.)
      try {
        const parsed = JSON.parse(message)
        if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
          console.log(`[SERVER] Resizing PTY to ${parsed.cols}x${parsed.rows}`)
          ptyProcess.resize(parsed.cols, parsed.rows)
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
      } catch {
        // Not JSON, treat as regular terminal input
      }

      ptyProcess.write(message)
    })

    // Handle disconnection
    ws.on('close', () => {
      console.log('[SERVER] Browser disconnected')
      ptyProcess.kill()
      if (browserWs === ws) {
        browserWs = null
      }
    })

    ptyProcess.onExit(() => {
      ws.close()
    })
  })

  server.listen(port, () => {
    console.log(`[SERVER] ✓ Learning environment ready at http://localhost:${port}`)
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
    }
  }

  return { server, redisPubClient, tutorBridge }
}

// Parse buffer to extract output and publish to Redis
function processBuffer(
  buffer: string,
  command: string,
  pubClient: any,
  sessionId: string
) {
  console.log('[SERVER] processBuffer called with command:', command)

  // Extract output by finding text between command and final prompt
  // Strip ALL ANSI escape codes (not just color codes)
  const stripped = buffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\r/g, '')
  const lines = stripped.split('\n')

  let output = ''
  let captureOutput = false

  for (const line of lines) {
    if (captureOutput && !line.includes('127.0.0.1:6379>')) {
      output += line + '\n'
    }
    // Start capturing after we see the command being executed
    if (line.includes(command)) {
      captureOutput = true
    }
  }

  console.log('[SERVER] Extracted output:', output.trim())

  // Get CSV output
  getCSVOutput(command).then(csvOutput => {
    const cmdData: RedisCommand = {
      command,
      terminalOutput: output.trim(),
      csvOutput,
      timestamp: new Date().toISOString(),
      sessionId
    }

    console.log('[SERVER] Publishing command to Redis:', cmdData)

    // Publish to Redis pub/sub channel
    const channel = process.env.PRISM_COMMAND_CHANNEL || 'prism:commands'
    pubClient.publish(channel, JSON.stringify(cmdData))
      .then(() => console.log('[SERVER] Published successfully'))
      .catch((err: Error) => console.error('[SERVER] Redis publish error:', err))
  })
}

async function getCSVOutput(command: string): Promise<string> {
  return new Promise((resolve) => {
    const args = ['--csv', ...command.split(' ')]
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
