import type { Message } from '@/types/guide'
import { claudeService } from '@/services/claude'
import { createSearchingMessage } from '@/utils/messageHelpers'
import { getRelativeFilePath, convertClaudeEventToMessages } from '@/utils/claudeHelpers'
import { TIMING } from '@/utils/constants'

const DEFAULT_MAX_THINKING_TOKENS = 2048
const DEFAULT_MAX_TURNS = 10
const STREAM_PARTIAL_RESPONSES = true

export function buildClaudeSystemPrompt(context?: string): string {
    const trimmedContext = context?.trim()
    const sections = [
        trimmedContext,
        "Respond as a concise in-product assistant. Give direct answers focused on the user's request.",
        'You MUST do a grep or glob at some point at least once, since you lack context about this product.',
        "Prefer using your own knowledge and the provided context. Use grep/glob tools quickly and efficiently to answer the user's question.",
        'Scope your grep/glob tool use narrowly and stop as soon as you have the answer. Avoid unnecessary planning or multi-step reasoning. The best case scenario is you use 2 or 3 grep/glob total. But you gotta find the actual relevant information to answer the actual question of the user.',
        'You do not need to announce your actions, for example you do not need to say "I will help you restore data let me search the documentation for that" you can just skip the announcement and go straight to the action of grep/glob.',
        'NEVER MAKE UP INFORMATION. Just keep it real and concise and to the point.'
    ].filter(Boolean)

    return sections.join('\n\n')
}

export interface ClaudeQueryConfig {
    cwd: string
    aiContextPrompt?: string
    allowedTools?: string[]
    maxThinkingTokens?: number
    maxTurns?: number
    includePartialMessages?: boolean
}

export interface MessageManager {
    addMessage: (message: Message) => void
    setMessages: (updater: (prev: Message[]) => Message[]) => void
    messages: Message[]
}

/**
 * Handle a Claude query with streaming responses
 */
export async function handleClaudeQuery(
    query: string,
    config: ClaudeQueryConfig,
    messageManager: MessageManager,
    showToast: (message: string, type?: 'error' | 'info' | 'success') => void
): Promise<void> {
    try {
        // Initial delay before showing any indicators (avoid flashing for fast responses)
        await new Promise(resolve => setTimeout(resolve, TIMING.STATUS_DELAY))

        // Show ellipsis indicator while processing
        const ellipsisMessage: Message = {
            id: `ellipsis-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            content: '...',
            variant: 'assistant',
        }
        console.log('[Debug] Creating ellipsis message:', ellipsisMessage.id)
        console.log('[Debug] Current messages count before adding ellipsis:', messageManager.messages.length)
        messageManager.addMessage(ellipsisMessage)
        console.log('[Debug] Current messages count after adding ellipsis:', messageManager.messages.length)

        // Determine tool usage and prompt strategy
        const allowedTools = config.allowedTools || ["Read", "Glob", "Grep"]
        const systemPrompt = buildClaudeSystemPrompt(config.aiContextPrompt)

        // Track files read across all events in this query
        const filesReadInSession: string[] = []
        let searchingMessageShown = false
        let searchingMessage: Message | null = null
        let ellipsisRemoved = false
        let partialMessageId: string | null = null
        let partialContent = ''
        let searchToolsDetected = false

        // Stream Claude responses
        for await (const event of claudeService.queryStream({
            prompt: query,
            cwd: config.cwd,
            allowedTools,
            sessionId: claudeService.getSessionId() || undefined,
            systemPrompt,
            maxThinkingTokens: config.maxThinkingTokens ?? DEFAULT_MAX_THINKING_TOKENS,
            maxTurns: config.maxTurns ?? DEFAULT_MAX_TURNS,
            includePartialMessages: config.includePartialMessages ?? STREAM_PARTIAL_RESPONSES
        })) {
            // Handle error events with toasts instead of messages
            if (event.type === 'error') {
                showToast(event.error || 'An unknown error occurred')
                continue
            }
            if (event.type === 'result' && event.subtype === 'error' && event.error) {
                showToast(event.error)
                continue
            }

            if (event.type === 'stream_event' && (config.includePartialMessages ?? STREAM_PARTIAL_RESPONSES)) {
                const streamEvent = event.event

                if (streamEvent?.type === 'content_block_start' && streamEvent.content_block?.type === 'text') {
                    if (!ellipsisRemoved) {
                        messageManager.setMessages(prev => prev.filter(msg => msg.id !== ellipsisMessage.id))
                        ellipsisRemoved = true
                    }

                    if (!partialMessageId) {
                        partialMessageId = `assistant-partial-${event.session_id ?? 'session'}-${Date.now()}-${Math.random()}`
                        const partialMessage: Message = {
                            id: partialMessageId,
                            role: 'assistant',
                            content: '',
                            variant: 'assistant'
                        }
                        messageManager.addMessage(partialMessage)
                    }
                } else if (streamEvent?.type === 'content_block_delta' && streamEvent.delta?.type === 'text_delta') {
                    const deltaText = streamEvent.delta.text || ''
                    if (deltaText && partialMessageId) {
                        partialContent += deltaText
                        messageManager.setMessages(prev =>
                            prev.map(msg => {
                                if (msg.id === partialMessageId) {
                                    return { ...msg, content: partialContent }
                                }
                                return msg
                            })
                        )
                    }
                    if (deltaText && !ellipsisRemoved) {
                        messageManager.setMessages(prev => prev.filter(msg => msg.id !== ellipsisMessage.id))
                        ellipsisRemoved = true
                    }
                }
                continue
            }

            // Collect files from Read tools across all events
            if (event.type === 'assistant') {
                const content = event.message.content || []

                // Check if search tools are being used
                if (!searchingMessageShown && !searchToolsDetected) {
                    const hasSearchTool = content.some(
                        item => item.type === 'tool_use' && item.name && ['Grep', 'Glob'].includes(item.name)
                    )

                    // Debug logging
                    const toolsUsed = content.filter(item => item.type === 'tool_use').map(item => item.name)
                    if (toolsUsed.length > 0) {
                        console.log('[Debug] Tools used:', toolsUsed)
                        console.log('[Debug] Search tools detected:', hasSearchTool)
                    }

                    if (hasSearchTool && !searchingMessageShown) {
                        searchToolsDetected = true
                        searchingMessageShown = true  // Set flag BEFORE adding message
                        console.log('[Debug] Showing searching message')
                        // Remove ellipsis
                        if (!ellipsisRemoved) {
                            messageManager.setMessages(prev => prev.filter(msg => msg.id !== ellipsisMessage.id))
                            ellipsisRemoved = true
                        }
                        // Show searching message
                        searchingMessage = createSearchingMessage('Searching...')
                        messageManager.addMessage(searchingMessage)
                    }
                }

                // Remove ellipsis when first text content arrives (before or during search)
                const hasTextContent = content.some(item => item.type === 'text' && item.text)
                if (hasTextContent && !ellipsisRemoved) {
                    console.log('[Debug] Removing ellipsis - text content arrived')
                    messageManager.setMessages(prev => prev.filter(msg => msg.id !== ellipsisMessage.id))
                    ellipsisRemoved = true
                }

                for (const item of content) {
                    if (item.type === 'tool_use' && item.name === 'Read' && item.input) {
                        const relativePath = getRelativeFilePath(item.input)
                        if (relativePath) {
                            filesReadInSession.push(relativePath)
                        }
                    }
                }
            }

            const newMessages = convertClaudeEventToMessages(event)

            if (event.type === 'assistant' && partialMessageId && newMessages.length > 0) {
                const combinedContent = newMessages.map(msg => msg.content).join('\n\n')
                messageManager.setMessages(prev =>
                    prev.map(msg => {
                        if (msg.id === partialMessageId) {
                            const updated: Message = {
                                ...msg,
                                content: combinedContent || msg.content,
                                filesRead: filesReadInSession.length > 0 ? [...filesReadInSession] : msg.filesRead
                            }
                            return updated
                        }
                        return msg
                    })
                )
                partialMessageId = null
                partialContent = ''
                continue
            }

            newMessages.forEach(msg => {
                messageManager.addMessage(msg)
            })
        }

        // Clean up any remaining indicators
        console.log('[Debug] Final cleanup - ellipsisRemoved:', ellipsisRemoved, 'filesReadInSession:', filesReadInSession.length)
        if (!ellipsisRemoved) {
            console.log('[Debug] Cleaning up remaining ellipsis in final cleanup')
            messageManager.setMessages(prev => prev.filter(msg => msg.id !== ellipsisMessage.id))
        }

    } catch (error) {
        console.error('Claude query error:', error)
        showToast(error instanceof Error ? error.message : String(error))
        throw error
    }
}

