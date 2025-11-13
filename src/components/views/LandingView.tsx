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
            <div className="px-8 pt-48 pb-6">
                <h1 className="text-3xl font-bold text-foreground mb-2">What can I help with?</h1>
                <p className="text-sm text-muted-foreground">Type a question or choose from existing guides</p>
            </div>

            <ScrollArea className="flex-1 h-0">
                <div ref={scrollRef} className="px-8 pb-6 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Suggested for you
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {topics.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => onTopicSelect(topic.id)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
                                >
                                    <span className="text-muted-foreground text-xs" style={{ fontSize: '0.85em', lineHeight: 1 }}>
                                        {topic.icon}
                                    </span>
                                    <span className="text-foreground">{topic.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {messages.length > 0 && <MessageList messages={messages} />}
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

