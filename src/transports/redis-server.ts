import express from 'express'
import { WebSocketServer } from 'ws'
import { createClient } from 'redis'
import { createServer } from 'http'
import path from 'path'
import { spawn } from 'child_process'
export type { TutorBridge, ProgressUpdate } from '../server/tutor-bridge.js'
import { createCommandParser } from '../server/command-parser.js'
import { PtySession } from '../server/pty-session.js'
import { deriveCsvFromTerminal, isReadOnlyCommand } from '../server/result-formatter.js'
import { publishCommand, type PublishedCommand } from '../server/redis-publisher.js'
import { createTutorBridge, type TutorBridge, type ProgressUpdate } from '../server/tutor-bridge.js'

/**
 * Web server that:
 * 1. Serves minimal HTML for course selection
 * 2. Serves the main static app at /app/
 * 3. Runs redis-cli via node-pty and streams I/O over WebSocket
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
  const publicDir = path.resolve(process.cwd(), 'public')
  app.use('/app', express.static(publicDir))
  app.get('/app', (req, res) => {
    res.redirect('/app/')
  })

  // Track course selection
  let courseSelected = false

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

  // Serve course selection at root; redirect to app after selection
  app.get('/', (req, res) => {
    // Show course selection if we have artifacts and no course selected yet
    if (courseArtifacts && !courseSelected) {
      const activities = courseArtifacts.activities || courseArtifacts.lessons || []
      const activitiesHTML = activities.map((activity: any) => {
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
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background: #1e1e1e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
    }
    .container { max-width: 800px; width: 90%; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { color: #e0e0e0; font-size: 42px; margin: 0 0 10px 0; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #999; font-size: 18px; margin: 0; }
    .courses-grid { display: grid; gap: 20px; margin-bottom: 30px; }
    .course-card {
      background: #2d2d2d; border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid #3e3e42;
    }
    .course-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.5); border-color: #007acc; }
    .course-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .level-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .level-beginner { background: rgba(78, 201, 176, 0.15); color: #4ec9b0; border: 1px solid rgba(78, 201, 176, 0.3); }
    .level-intermediate { background: rgba(255, 140, 66, 0.15); color: #ff8c42; border: 1px solid rgba(255, 140, 66, 0.3); }
    .level-advanced { background: rgba(206, 76, 120, 0.15); color: #ce4c78; border: 1px solid rgba(206, 76, 120, 0.3); }
    .course-title { margin: 0; font-size: 20px; color: #e0e0e0; font-weight: 600; }
    .course-summary { margin: 0; color: #999; font-size: 15px; line-height: 1.6; }
    .custom-course-card {
      background: #2d2d2d; border-radius: 12px; padding: 24px; cursor: pointer; transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px dashed #3e3e42;
    }
    .custom-course-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.5); border-color: #007acc; }
    .custom-icon { font-size: 14px; font-weight: 600; color: #007acc; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    #custom-input-container { display: none; margin-top: 20px; }
    #custom-input-container.show { display: block; }
    #custom-input { width: 100%; padding: 12px 16px; font-size: 16px; border: 1px solid #3e3e42; border-radius: 8px; margin-bottom: 12px; font-family: inherit; background: #1e1e1e; color: #d4d4d4; }
    #custom-input:focus { outline: none; border-color: #007acc; }
    #custom-input::placeholder { color: #666; }
    .button-group { display: flex; gap: 12px; }
    .btn { flex: 1; padding: 12px 24px; font-size: 16px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
    .btn-primary { background: #007acc; color: white; }
    .btn-primary:hover { background: #006bb3; }
    .btn-secondary { background: #3e3e42; color: #e0e0e0; border: 1px solid #3e3e42; }
    .btn-secondary:hover { background: #4a4a4e; }
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
      <input type="text" id="custom-input" placeholder="What would you like to learn?" autocomplete="off" />
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
      try {
        const response = await fetch('/select-course', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseName })
        });
        if (response.ok) { window.location.href = '/app/'; }
      } catch (err) { console.error('Error selecting course:', err); }
    }
    async function submitCustomCourse() {
      const input = document.getElementById('custom-input');
      const courseName = input.value.trim();
      if (!courseName) { input.focus(); return; }
      await selectCourse(courseName);
    }
    document.getElementById('custom-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitCustomCourse(); }
    });
  </script>
</body>
</html>
      `)
      return
    }

    // If course already selected, route to the static app UI
    res.redirect('/app/')
  })

  // WebSocket handler
  wss.on('connection', (ws) => {
    console.log('[SERVER] Browser connected')
    // Attach sender for tutor bridge
    tutorBridge.setSender((payload: string) => {
      if (ws.readyState === 1) ws.send(payload)
    })

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
      onCommandCaptured: (cmd) => { console.log('[SERVER] Captured command:', cmd) },
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
        if (parsed.type === 'hint-request') { console.log('[SERVER] Hint requested'); tutorBridge.triggerHintRequest(); return }
        if (parsed.type === 'skip-request') { console.log('[SERVER] Skip requested'); tutorBridge.triggerSkipRequest(); return }
        if (parsed.type === 'clear-state') { console.log('[SERVER] Clear state requested'); tutorBridge.triggerClearStateRequest(); return }
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
    })

    ptySession.onExit(() => { ws.close() })
  })

  server.listen(port, () => {
    console.log(`[SERVER] Learning environment ready at http://localhost:${port}`)
  })

  // Create tutor bridge for sending messages to browser
  const tutorBridge: TutorBridge = createTutorBridge({
    flushDatabase: async () => {
      console.log('[SERVER] Flushing database', redisDb)
      await redisPubClient.flushDb()
      console.log('[SERVER] Database flushed')
    }
  })

  return { server, redisPubClient, tutorBridge }
}

// Parse buffer to extract output and publish to Redis
async function publishCapturedCommand(
  terminalOutput: string,
  command: string,
  pubClient: any,
  sessionId: string,
  redisHost: string,
  redisPort: number,
  redisDb: number
): Promise<void> {
  console.log('[SERVER] Extracted output:', terminalOutput.trim())

  const readOnly = isReadOnlyCommand(command)
  const csvPromise = readOnly
    ? getCSVOutput(command, { redisHost, redisPort, redisDb })
    : Promise.resolve(deriveCsvFromTerminal(terminalOutput))

  const csvOutput = await csvPromise
  const cmdData: PublishedCommand = {
    command,
    terminalOutput: terminalOutput.trim(),
    csvOutput,
    timestamp: new Date().toISOString(),
    sessionId
  }
  console.log('[SERVER] Publishing command to Redis:', cmdData)
  try {
    await publishCommand(pubClient, cmdData)
    console.log('[SERVER] Published successfully')
  } catch (err) {
    console.error('[SERVER] Redis publish error:', err)
  }
}

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
    proc.stdout.on('data', (data: Buffer) => { output += data.toString() })
    proc.on('close', () => { resolve(output.trim()) })

    setTimeout(() => { proc.kill(); resolve('') }, 1000)
  })
}

