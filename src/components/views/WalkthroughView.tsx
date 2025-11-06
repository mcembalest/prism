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
    scrollRef
}: WalkthroughViewProps) {
    const isPrebuiltGuide = prebuiltGuideSession !== null
    const isComplete = isPrebuiltGuide ? prebuiltGuideSession.isComplete : walkthroughSession?.isComplete

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {isPrebuiltGuide && prebuiltGuideSession ? (
                <div className="p-6 space-y-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        {isComplete && <Check className="h-6 w-6 text-green-400" />}
                        <h1 className="text-2xl font-bold text-white">{prebuiltGuideSession.guide.title || 'Guide'}</h1>
                    </div>

                    {/* Progress dots */}
                    <div className="flex items-center justify-center">
                        {prebuiltGuideSession.guide.steps.map((_, index) => (
                            <div key={index} className="flex items-center">
                                <div
                                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                                        index <= prebuiltGuideSession.currentStepIndex
                                            ? 'bg-green-400'
                                            : 'bg-zinc-700'
                                    } ${
                                        index === prebuiltGuideSession.currentStepIndex ? 'scale-125' : ''
                                    }`}
                                />
                                {index < prebuiltGuideSession.guide.steps.length - 1 && (
                                    <div
                                        className={`h-0.5 w-4 transition-all ${
                                            index < prebuiltGuideSession.currentStepIndex
                                                ? 'bg-green-400'
                                                : 'bg-zinc-700'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-4 border-b border-zinc-800/50">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="text-center space-y-1">
                        <p className="text-sm text-zinc-400">AI-powered walkthrough</p>
                    </div>
                </div>
            )}

            {/* Messages area */}
            <ScrollArea className="flex-1 h-0">
                <div ref={scrollRef} className={isPrebuiltGuide ? "px-4 py-6 space-y-4 max-w-full" : "px-4 py-4 space-y-3 max-w-full"}>
                    {messages.length > 0 && (
                        <div className={isPrebuiltGuide ? "space-y-2 mb-6" : "space-y-2"}>
                            {messages.map((message, index) => {
                                const isLastMessage = index === messages.length - 1
                                return (
                                    <div key={message.id}>
                                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <MessageBubble
                                                content={message.content}
                                                role={message.role}
                                                variant={message.variant}
                                            />
                                        </div>

                                        {/* Proceed button - different for prebuilt vs AI chat */}
                                        {isLastMessage && !isComplete && (
                                            isPrebuiltGuide ? (
                                                <div className="flex justify-start mt-2 ml-1">
                                                    <button
                                                        onClick={onProceedPrebuilt}
                                                        className={`text-xs text-purple-400 hover:text-purple-300 transition-all bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 ${showShortcutFlash ? 'ring-2 ring-purple-400 scale-105' : ''}`}
                                                    >
                                                        Proceed
                                                        <kbd className="px-1 py-0.5 text-[10px] font-mono bg-zinc-700/50 rounded border border-zinc-600/50">⌘↵</kbd>
                                                    </button>
                                                </div>
                                            ) : walkthroughSession && (
                                                <div className="flex justify-start mt-2 ml-1">
                                                    <button
                                                        onClick={onProceedAI}
                                                        disabled={isProcessing}
                                                        className="text-sm text-purple-400 hover:text-purple-300 underline decoration-2 underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded"
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
                        <div className="flex justify-start">
                            <div className="max-w-[65%] rounded-xl p-2.5 shadow-md bg-green-900/30 border-green-700/30 text-center">
                                <Check className="h-3 w-3 text-green-400 mx-auto mb-1" />
                                <p className="text-xs text-green-300 leading-4">Guide Complete!</p>
                            </div>
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
            />
        </div>
    )
}

