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
    body {
      margin: 0;
      padding: 0;
      background: #1e1e1e;
      font-family: 'Courier New', monospace;
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
    }
    #terminal-container {
      padding: 20px;
    }
    #terminal {
      width: 100%;
      height: calc(100vh - 80px);
    }
  </style>
</head>
<body>
  <div id="header">
    <h1>🎓 Prism - Redis Learning Environment</h1>
  </div>
  <div id="terminal-container">
    <div id="terminal"></div>
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

    // Send terminal size updates to backend
    function sendResize() {
      if (ws.readyState === WebSocket.OPEN) {
        const size = { cols: term.cols, rows: term.rows };
        console.log('Sending resize:', size);
        ws.send(JSON.stringify({ type: 'resize', ...size }));
      }
    }

    ws.onopen = () => {
      console.log('Connected to terminal');
      // Send initial size immediately after connection
      sendResize();
    };

    ws.onmessage = (event) => {
      term.write(event.data);
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
  </script>
</body>
</html>
    `)
  })

  // WebSocket handler
  wss.on('connection', (ws) => {
    console.log('Browser connected')

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

      // Check if this is a resize message
      try {
        const parsed = JSON.parse(message)
        if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
          console.log(`[SERVER] Resizing PTY to ${parsed.cols}x${parsed.rows}`)
          ptyProcess.resize(parsed.cols, parsed.rows)
          return
        }
      } catch {
        // Not JSON, treat as regular terminal input
      }

      ptyProcess.write(message)
    })

    // Handle disconnection
    ws.on('close', () => {
      console.log('Browser disconnected')
      ptyProcess.kill()
    })

    ptyProcess.onExit(() => {
      ws.close()
    })
  })

  server.listen(port, () => {
    console.log(`✓ Learning environment ready at http://localhost:${port}`)
  })

  return { server, redisPubClient }
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
