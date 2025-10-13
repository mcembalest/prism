import * as pty from 'node-pty'
import { spawn } from 'child_process'

/**
 * Simplified Redis CLI Wrapper
 * Just captures completed commands, doesn't try to be too clever
 */

export interface RedisCommand {
  command: string
  terminalOutput: string
  csvOutput: string
  timestamp: string
}

export interface RedisWrapperOptions {
  onCommand: (cmd: RedisCommand) => void
  redisHost?: string
  redisPort?: number
}

export class RedisWrapperSimple {
  private ptyProcess: any
  private buffer = ''
  private onCommand: (cmd: RedisCommand) => void
  private redisHost: string
  private redisPort: number

  constructor(options: RedisWrapperOptions) {
    this.onCommand = options.onCommand
    this.redisHost = options.redisHost || '127.0.0.1'
    this.redisPort = options.redisPort || 6379
  }

  start() {
    // Spawn redis-cli in a pseudo-terminal
    this.ptyProcess = pty.spawn('redis-cli', [
      '-h', this.redisHost,
      '-p', this.redisPort.toString()
    ], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env as any
    })

    // Forward all I/O directly
    this.ptyProcess.on('data', (data: string) => {
      process.stdout.write(data)

      // Add to buffer
      this.buffer += data

      // Check if we see a complete command-response cycle
      // Pattern: user types command, gets output, sees new prompt
      if (this.buffer.includes('127.0.0.1:') && data.includes('\n')) {
        this.processBuffer()
      }
    })

    // Forward stdin to redis-cli
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', (data: Buffer) => {
      this.ptyProcess.write(data)
    })

    // Handle exit
    this.ptyProcess.on('exit', () => {
      process.stdin.setRawMode(false)
      process.exit(0)
    })

    process.on('SIGINT', () => {
      this.ptyProcess.kill()
      process.exit(0)
    })
  }

  private processBuffer() {
    // Look for command pattern: prompt > command > output > prompt
    const lines = this.buffer.split('\n')

    // Find last complete command
    let lastCommand = ''
    let lastOutput = ''
    let foundCommand = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Line starts with prompt and has content after it
      if (line.includes('127.0.0.1:6379>')) {
        const parts = line.split('>')
        if (parts.length > 1 && parts[1].trim()) {
          lastCommand = parts[1].trim()
          foundCommand = true
          lastOutput = ''
        }
      } else if (foundCommand && line.trim()) {
        lastOutput += line + '\n'
      }
    }

    // If we have a command and we're back at a prompt, evaluate it
    if (lastCommand && foundCommand && this.buffer.trim().endsWith('127.0.0.1:6379>')) {
      // Clear buffer
      this.buffer = ''

      // Get CSV output and evaluate (async, doesn't block)
      this.getCSVOutput(lastCommand).then(csvOutput => {
        this.onCommand({
          command: lastCommand,
          terminalOutput: lastOutput.trim(),
          csvOutput,
          timestamp: new Date().toISOString()
        })
      })
    }
  }

  private async getCSVOutput(command: string): Promise<string> {
    return new Promise((resolve) => {
      const args = ['--csv', '-h', this.redisHost, '-p', this.redisPort.toString(), ...command.split(' ')]
      const proc = spawn('redis-cli', args)

      let output = ''
      proc.stdout.on('data', (data) => {
        output += data.toString()
      })

      proc.on('close', () => {
        resolve(output.trim())
      })

      // Timeout after 1 second
      setTimeout(() => {
        proc.kill()
        resolve('')
      }, 1000)
    })
  }
}
