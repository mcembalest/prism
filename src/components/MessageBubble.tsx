import { memo } from 'react'

interface MessageBubbleProps {
    content: string
    role: 'user' | 'assistant'
    variant?: 'assistant' | 'instruction'
}

const TypingIndicator = () => (
    <div className="flex items-center gap-1 py-1">
        <style>{`
            @keyframes typing-dot {
                0%, 60%, 100% {
                    transform: translateY(0);
                    opacity: 0.5;
                }
                30% {
                    transform: translateY(-4px);
                    opacity: 1;
                }
            }
        `}</style>
        <span 
            className="w-1 h-1 bg-gray-400 rounded-full" 
            style={{ 
                animation: 'typing-dot 1.4s ease-in-out infinite',
                animationDelay: '0ms'
            }}
        />
        <span 
            className="w-1 h-1 bg-gray-400 rounded-full" 
            style={{ 
                animation: 'typing-dot 1.4s ease-in-out infinite',
                animationDelay: '0.2s'
            }}
        />
        <span 
            className="w-1 h-1 bg-gray-400 rounded-full" 
            style={{ 
                animation: 'typing-dot 1.4s ease-in-out infinite',
                animationDelay: '0.4s'
            }}
        />
    </div>
)

const messageVariantStyles: Record<'assistant' | 'instruction', string> = {
    assistant: 'bg-zinc-800/80 text-gray-100 border border-zinc-700/50',
    instruction: 'bg-indigo-500/15 text-indigo-100 border border-indigo-400/40'
}

/**
 * MessageBubble component - displays a single chat message
 * Memoized to prevent unnecessary re-renders when parent updates
 */
export const MessageBubble = memo(function MessageBubble({ content, role, variant = 'assistant' }: MessageBubbleProps) {
    const isUser = role === 'user'
    const isInstruction = !isUser && variant === 'instruction'
    const isTyping = content === '...'

    const bubbleClasses = isUser
        ? 'p-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white'
        : `p-3 ${messageVariantStyles[variant]}`

    return (
        <div className={`max-w-[60%] rounded-xl ${bubbleClasses}`}>
            {isInstruction && (
                <span className="block text-[7px] font-semibold uppercase tracking-wide mb-1 text-indigo-500">
                    Instruction
                </span>
            )}
            {isTyping ? (
                <TypingIndicator />
            ) : (
                <p className="text-xs leading-relaxed">{content}</p>
            )}
        </div>
    )
})

