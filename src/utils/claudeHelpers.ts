import type { Message } from '@/types/guide'
import type { ClaudeEvent } from '@/services/claude'


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

        // Debug: Log content items to verify type field
        console.log('[claudeHelpers] Content items:', content)

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

            // Tool use - skip creating messages, files are tracked in SnowKiteContainer
            // and attached to assistant messages via filesRead property
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

