import type { Message } from '@/types/guide'

type AssistantMessageOptions = Partial<Omit<Message, 'id' | 'role' | 'content'>>

export const createAssistantMessage = (
    content: string, 
    options: AssistantMessageOptions = {}
): Message => ({
    id: Date.now().toString(),
    role: 'assistant',
    content,
    image: options.image,
    points: options.points,
    caption: options.caption,
    variant: options.variant ?? 'assistant'
})

export const createUserMessage = (content: string): Message => ({
    id: Date.now().toString(),
    role: 'user',
    content,
    variant: 'assistant'
})

export const createSearchingMessage = (query: string): Message => ({
    id: `searching-${Date.now()}`,
    role: 'assistant',
    content: query,
    variant: 'metadata',
    metadata: {
        type: 'system',
        details: 'searching'
    }
})

