export interface PublishedCommand {
  command: string
  terminalOutput: string
  csvOutput: string
  timestamp: string
  sessionId: string
}

export async function publishCommand(
  pubClient: any,
  cmd: PublishedCommand,
  channel?: string
): Promise<void> {
  const ch = channel || process.env.PRISM_COMMAND_CHANNEL || 'prism:commands'
  await pubClient.publish(ch, JSON.stringify(cmd))
}

