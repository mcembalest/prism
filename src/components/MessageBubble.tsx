import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SearchSummary } from './SearchSummary'

interface MessageBubbleProps {
    content: string
    role: 'user' | 'assistant'
    variant?: 'assistant' | 'instruction' | 'metadata'
    filesRead?: string[]
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

/**
 * MessageBubble component - displays a single chat message
 * Memoized to prevent unnecessary re-renders when parent updates
 *
 * Design pattern from mockups:
 * - User messages: Dark bubble pills on the right
 * - Assistant messages: Plain text with NO BUBBLE on the left
 */
export const MessageBubble = memo(function MessageBubble({ content, role, variant = 'assistant', filesRead }: MessageBubbleProps) {
    const isUser = role === 'user'
    const isTyping = content === '...'

    // User messages get dark bubble, assistant messages get NO bubble
    if (isUser) {
        return (
            <div className="max-w-[60%] rounded-full px-4 py-2 bg-primary text-primary-foreground">
                <div className="text-sm leading-relaxed">
                    {content}
                </div>
            </div>
        )
    }

    // Assistant messages - NO BUBBLE, just plain text with fade-in animation
    return (
        <div className="max-w-[80%] animate-in fade-in duration-300">
            {isTyping ? (
                <TypingIndicator />
            ) : (
                <>
                    {filesRead && filesRead.length > 0 && (
                        <SearchSummary files={filesRead} />
                    )}
                    <div className={variant === 'metadata' ? 'text-xs text-muted-foreground leading-relaxed' : 'text-sm leading-relaxed'}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Customize markdown elements to match our styling
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="ml-2">{children}</li>,
                                code: ({ children, className }) => {
                                    const isInline = !className
                                    return isInline ? (
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block bg-muted p-3 rounded text-xs font-mono overflow-x-auto my-2">
                                            {children}
                                        </code>
                                    )
                                },
                                pre: ({ children }) => <pre className="my-2">{children}</pre>,
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                a: ({ children, href }) => (
                                    <a href={href} className="text-blue-500 hover:text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </>
            )}
        </div>
    )
})

