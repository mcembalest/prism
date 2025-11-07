import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

const messageVariantStyles: Record<'assistant' | 'instruction' | 'metadata', string> = {
    assistant: 'bg-zinc-800/80 text-gray-100 border border-zinc-700/50',
    instruction: 'bg-indigo-500/15 text-indigo-100 border border-indigo-400/40',
    metadata: 'bg-zinc-900/50 text-zinc-500 border-none'
}

/**
 * MessageBubble component - displays a single chat message
 * Memoized to prevent unnecessary re-renders when parent updates
 */
export const MessageBubble = memo(function MessageBubble({ content, role, variant = 'assistant', filesRead }: MessageBubbleProps) {
    const [isFilesExpanded, setIsFilesExpanded] = useState(false)
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
                <>
                    <div className="text-xs leading-relaxed prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Customize markdown elements to match our styling
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                h1: ({ children }) => <h1 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="ml-2">{children}</li>,
                                code: ({ children, className }) => {
                                    const isInline = !className
                                    return isInline ? (
                                        <code className="bg-zinc-700/50 px-1 py-0.5 rounded text-[10px] font-mono">
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block bg-zinc-700/50 p-2 rounded text-[10px] font-mono overflow-x-auto my-2">
                                            {children}
                                        </code>
                                    )
                                },
                                pre: ({ children }) => <pre className="my-2">{children}</pre>,
                                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                a: ({ children, href }) => (
                                    <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                    {filesRead && filesRead.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-700/50">
                            <button
                                onClick={() => setIsFilesExpanded(!isFilesExpanded)}
                                className="text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
                            >
                                <span>{filesRead.length} guide{filesRead.length > 1 ? 's' : ''} found</span>
                                <span className="transition-transform" style={{ transform: isFilesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    ▼
                                </span>
                            </button>
                            {isFilesExpanded && (
                                <div className="mt-2 space-y-1">
                                    {filesRead.map((file, index) => (
                                        <a
                                            key={index}
                                            href="https://google.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-[9px] text-blue-400 hover:text-blue-300 underline font-mono"
                                        >
                                            {file}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
})

