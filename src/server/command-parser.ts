/**
 * Streaming parser for redis-cli PTY output.
 * Detects submitted commands and their completed outputs using the prompt.
 */

export interface CommandParserHandlers {
  onCommandCaptured?: (command: string) => void
  onCommandCompleted?: (command: string, output: string) => void
}

export interface CommandParser {
  addData(chunk: string): void
  reset(): void
}

export function createCommandParser(prompt: string, handlers: CommandParserHandlers = {}): CommandParser {
  const promptRegex = new RegExp(prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  let buffer = ''
  let lastCommandLine = ''

  function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '')
  }

  function extractOutput(buf: string): string {
    const stripped = stripAnsi(buf)
    const lines = stripped.split('\n')
    const out: string[] = []
    const promptLineRegex = /127\.0\.0\.1:6379(\[\d+\])?>/
    for (const line of lines) {
      if (!promptLineRegex.test(line) && line.trim().length > 0) {
        out.push(line)
      }
    }
    return out.join('\n')
  }

  function addData(data: string) {
    buffer += data

    // Detect when user presses Enter (command submitted)
    if (data.includes('\r\n') && !promptRegex.test(data)) {
      const lines = buffer.split('\r\n')
      for (const line of lines) {
        if (promptRegex.test(line)) {
          const stripped = stripAnsi(line)
          const lastPromptIndex = stripped.lastIndexOf(prompt)
          if (lastPromptIndex !== -1) {
            const cmd = stripped.substring(lastPromptIndex + prompt.length).trim()
            if (cmd && cmd !== lastCommandLine) {
              lastCommandLine = cmd
              handlers.onCommandCaptured?.(cmd)
              // Reset buffer to capture only this command's output
              buffer = ''
            }
          }
        }
      }
    }

    // Detect when we're back at the prompt (command completed)
    if (lastCommandLine && promptRegex.test(data)) {
      const output = extractOutput(buffer)
      handlers.onCommandCompleted?.(lastCommandLine, output)
      lastCommandLine = ''
      buffer = ''
    }
  }

  function reset() {
    buffer = ''
    lastCommandLine = ''
  }

  return { addData, reset }
}

