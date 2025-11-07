import type { Message } from '@/types/guide'
import type { ClaudeEvent } from '@/services/claude'

/**
 * Format tool name for display
 */
function formatToolName(toolName: string): string {
    // Show "Searching" for Grep and Glob
    if (toolName === 'Grep' || toolName === 'Glob') {
        return 'Searching'
    }
    return toolName
}

/**
 * Extract relative filepath from tool input
 */
export function getRelativeFilePath(toolInput: any, cwd: string = 'data/rocketalumni/'): string {
    if (!toolInput) return ''

    // For Read tool, extract the file_path
    const filePath = toolInput.file_path || toolInput.target_file || ''

    if (!filePath) return ''

    // Remove the absolute path prefix and CWD to show only relative path
    const relativePath = filePath
        .replace(/^\/Users\/[^/]+\/Desktop\/repos\/prism\//, '') // Remove absolute prefix
        .replace(new RegExp(`^${cwd}`), '') // Remove CWD prefix

    return relativePath || filePath // Fallback to original if no match
}

/**
 * Convert Claude events to chat messages
 */
export function convertClaudeEventToMessages(event: ClaudeEvent): Message[] {
    const messages: Message[] = []

    if (event.type === 'assistant') {
        const content = event.message.content || []

        for (const item of content) {
            // Text response from Claude
            if (item.type === 'text' && item.text) {
                messages.push({
                    id: `text-${event.session_id}-${Date.now()}-${Math.random()}`,
                    role: 'assistant',
                    content: item.text,
                    variant: 'assistant'
                })
            }

            // Tool use - show as metadata
            if (item.type === 'tool_use' && item.name) {
                // Skip Bash commands - they're internal operations
                if (item.name === 'Bash') {
                    continue
                }

                const toolName = formatToolName(item.name)
                let displayInput = item.input

                // For Grep/Glob, show the search pattern
                if (item.name === 'Grep' && item.input?.pattern) {
                    displayInput = { query: item.input.pattern }
                } else if (item.name === 'Glob' && item.input?.pattern) {
                    displayInput = { query: item.input.pattern }
                }
                // For Read tool, show the relative filepath
                else if (item.name === 'Read' && item.input) {
                    const relativePath = getRelativeFilePath(item.input)
                    if (relativePath) {
                        displayInput = { file: relativePath }
                    }
                }

                messages.push({
                    id: `tool-${event.session_id}-${Date.now()}-${Math.random()}`,
                    role: 'assistant',
                    content: `Using tool: ${toolName}`,
                    variant: 'metadata',
                    metadata: {
                        type: 'tool_use',
                        toolName: toolName,
                        toolInput: displayInput
                    }
                })
            }
        }
    } else if (event.type === 'result') {
        // Skip success results - they duplicate the last assistant message
        // Only show errors from result events
        if (event.subtype === 'error' && event.error) {
            messages.push({
                id: `error-${event.session_id}-${Date.now()}`,
                role: 'assistant',
                content: `Error: ${event.error}`,
                variant: 'assistant'
            })
        }
    } else if (event.type === 'error') {
        messages.push({
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${event.error}`,
            variant: 'assistant'
        })
    }

    return messages
}

/**
 * Create a user message
 */
export function createUserMessage(content: string): Message {
    return {
        id: `user-${Date.now()}`,
        role: 'user',
        content
    }
}

