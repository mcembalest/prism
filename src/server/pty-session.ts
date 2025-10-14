import * as pty from 'node-pty'

export interface PtySessionOptions {
  redisHost: string
  redisPort: number
  redisDb: number
  cols?: number
  rows?: number
  env?: NodeJS.ProcessEnv
}

export class PtySession {
  private ptyProcess: any

  constructor(opts: PtySessionOptions) {
    const { redisHost, redisPort, redisDb, cols = 80, rows = 24, env } = opts
    this.ptyProcess = pty.spawn('redis-cli', [
      '-h', redisHost,
      '-p', redisPort.toString(),
      '-n', redisDb.toString()
    ], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.cwd(),
      env: env as any
    })
  }

  onData(handler: (data: string) => void) {
    this.ptyProcess.onData(handler)
  }

  onExit(handler: () => void) {
    this.ptyProcess.onExit(handler)
  }

  write(data: string | Buffer) {
    this.ptyProcess.write(data as any)
  }

  resize(cols: number, rows: number) {
    this.ptyProcess.resize(cols, rows)
  }

  kill() {
    this.ptyProcess.kill()
  }
}

