import type { Message } from '@/types/walkthrough'

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

