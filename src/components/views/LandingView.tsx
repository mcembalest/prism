import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatInput } from '@/components/ChatInput'
import { MessageList } from '@/components/MessageList'
import type { Message, GuideDefinition } from '@/types/guide'
import type { Topic } from '@/types/app-mode'

interface LandingViewProps {
    topics: Topic[]
    guides: GuideDefinition[]
    messages: Message[]
    input: string
    isProcessing: boolean
    statusMessage: string
    searchQuery: string
    onTopicSelect: (topicId: string) => void
    onGuideStart: (guideId: string) => void
    onSearchChange: (query: string) => void
    onInputChange: (value: string) => void
    onSend: () => void
    onResetChat?: () => void
    scrollRef: React.RefObject<HTMLDivElement>
}

export function LandingView({
    topics,
    messages,
    input,
    isProcessing,
    statusMessage,
    onTopicSelect,
    onInputChange,
    onSend,
    onResetChat,
    scrollRef
}: LandingViewProps) {
    
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6">
                <h1 className="text-3xl font-bold text-white text-center mb-2">How can I help?</h1>
                <p className="text-sm text-zinc-400 text-center">Ask a question or choose a guide</p>
            </div>

            <ScrollArea className="flex-1 h-0">
                <div ref={scrollRef} className="px-4 py-6 space-y-6 max-w-full overflow-x-hidden">
                    <div>
                        <div className="grid grid-cols-2 gap-2">
                            {topics.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => onTopicSelect(topic.id)}
                                    className="flex items-center gap-2 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all text-left"
                                >
                                    <span className="text-zinc-400">{topic.icon}</span>
                                    <span className="text-xs text-zinc-200">{topic.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <MessageList messages={messages} />
                </div>
            </ScrollArea>

            <ChatInput
                value={input}
                onChange={onInputChange}
                onSend={onSend}
                isProcessing={isProcessing}
                statusMessage={statusMessage}
                onResetChat={onResetChat}
                showResetButton={messages.length > 0}
            />
        </div>
    )
}

