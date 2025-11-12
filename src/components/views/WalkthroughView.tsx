import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatInput } from '@/components/ChatInput'
import { MessageBubble } from '@/components/MessageBubble'
import { Check, ArrowLeft } from 'lucide-react'
import type { Message, ActiveGuideState } from '@/types/guide'

interface WalkthroughViewProps {
    messages: Message[]
    input: string
    isProcessing: boolean
    statusMessage: string
    showShortcutFlash: boolean
    prebuiltGuideSession: ActiveGuideState | null  // Static guide
    walkthroughSession: ActiveGuideState | null    // AI guide
    onBack: () => void
    onInputChange: (value: string) => void
    onSend: () => void
    onProceedPrebuilt: () => void
    onProceedAI: () => void
    onResetChat?: () => void
    scrollRef: React.RefObject<HTMLDivElement>
}

export function WalkthroughView({
    messages,
    input,
    isProcessing,
    statusMessage,
    showShortcutFlash,
    prebuiltGuideSession,
    walkthroughSession,
    onBack,
    onInputChange,
    onSend,
    onProceedPrebuilt,
    onProceedAI,
    onResetChat,
    scrollRef
}: WalkthroughViewProps) {
    const isPrebuiltGuide = prebuiltGuideSession !== null
    const isComplete = isPrebuiltGuide ? prebuiltGuideSession.isComplete : walkthroughSession?.isComplete

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Clean header with centered title and back button */}
            <div className="relative px-6 py-4 border-b border-border">
                <button
                    onClick={onBack}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <h1 className="text-center text-base font-medium text-foreground">
                    {isPrebuiltGuide && prebuiltGuideSession
                        ? prebuiltGuideSession.guide.title || 'Assistant'
                        : 'Assistant'}
                </h1>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 h-0">
                <div ref={scrollRef} className="px-8 py-6 space-y-4">
                    {messages.length > 0 && (
                        <div className="space-y-4">
                            {messages.map((message, index) => {
                                const isLastMessage = index === messages.length - 1
                                return (
                                    <div key={message.id}>
                                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <MessageBubble
                                                content={message.content}
                                                role={message.role}
                                                variant={message.variant}
                                                filesRead={message.filesRead}
                                            />
                                        </div>

                                        {/* Proceed button - different for prebuilt vs AI chat */}
                                        {isLastMessage && !isComplete && (
                                            isPrebuiltGuide ? (
                                                <div className="flex justify-start mt-3">
                                                    <button
                                                        onClick={onProceedPrebuilt}
                                                        className={`text-xs text-muted-foreground hover:text-foreground transition-all bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 ${showShortcutFlash ? 'ring-2 ring-ring scale-105' : ''}`}
                                                    >
                                                        Proceed
                                                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted-foreground/10 rounded border border-border">⌘↵</kbd>
                                                    </button>
                                                </div>
                                            ) : walkthroughSession && (
                                                <div className="flex justify-start mt-3">
                                                    <button
                                                        onClick={onProceedAI}
                                                        disabled={isProcessing}
                                                        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full"
                                                    >
                                                        {isProcessing ? 'Processing...' : 'Proceed (⌘+Enter)'}
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {isComplete && isPrebuiltGuide && (
                        <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Done, good job!</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <ChatInput
                value={input}
                onChange={onInputChange}
                onSend={onSend}
                isProcessing={isProcessing}
                statusMessage={statusMessage}
                onResetChat={onResetChat}
                showResetButton={messages.length > 0 && !isPrebuiltGuide}
            />
        </div>
    )
}

