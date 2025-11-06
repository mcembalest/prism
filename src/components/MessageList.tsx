import { memo } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/types/guide'

interface MessageListProps {
    messages: Message[]
}

/**
 * MessageList component - displays a list of chat messages
 * Memoized to prevent unnecessary re-renders when parent updates
 */
export const MessageList = memo(function MessageList({ messages }: MessageListProps) {
    if (messages.length === 0) {
        return null
    }

    return (
        <div className="space-y-2">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <MessageBubble
                        content={message.content}
                        role={message.role}
                        variant={message.variant}
                    />
                </div>
            ))}
        </div>
    )
})

