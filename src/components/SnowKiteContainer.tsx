import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Card } from '@/components/ui/card'
import { DraggableHeader } from './DraggableHeader'
import { SelectionBanner } from './SelectionBanner'
import { Toast } from './Toast'
import { LandingView } from './views/LandingView'
import { TopicView } from './views/TopicView'
import { WalkthroughView } from './views/WalkthroughView'
import { getModeConfig, productMode } from '@/config/modes'
import { geminiService } from '@/services/gemini'
import { claudeService } from '@/services/claude'
import { useOverlayManager } from '@/hooks/useOverlayManager'
import { useViewNavigation } from '@/hooks/useViewNavigation'
import { useMessages } from '@/hooks/useMessages'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useGuideSession } from '@/hooks/useGuideSession'
import { createAssistantMessage, createSearchingMessage } from '@/utils/messageHelpers'
import { convertClaudeEventToMessages, createUserMessage, getRelativeFilePath } from '@/utils/claudeHelpers'
import { EVENTS, TAURI_COMMANDS, TIMING, VIEWS } from '@/utils/constants'
import type { Message } from '@/types/guide'

interface ToastState {
    id: string
    message: string
    type: 'error' | 'info' | 'success'
}

export function SnowKiteContainer() {
    // Mode configuration
    const modeConfig = getModeConfig(productMode)

    // Selection mode state
    const [isSelectionMode, setIsSelectionMode] = useState(false)

    // Toast notifications state
    const [toasts, setToasts] = useState<ToastState[]>([])

    // Scroll ref for auto-scroll
    const scrollRef = useRef<HTMLDivElement>(null)

    // Custom hooks
    const overlayManager = useOverlayManager()
    const navigation = useViewNavigation()
    const messages = useMessages()
    const keyboard = useKeyboardShortcuts()
    const guide = useGuideSession({
        addMessage: messages.addMessage,
        setMessages: messages.setMessages,
        overlayManager,
        modeConfig,
    })

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.closest('[data-radix-scroll-area-viewport]') as HTMLElement
            if (viewport) {
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth',
                })
            } else {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }
    }, [messages.messages])

    // Selection mode listener
    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupListener = async () => {
            try {
                const initialMode = await invoke<boolean>(TAURI_COMMANDS.GET_FOCUS_SELECTION_MODE)
                console.log('[SnowKiteContainer] Initial selection mode:', initialMode)
                setIsSelectionMode(initialMode)
            } catch (err) {
                console.error('[SnowKiteContainer] Failed to get initial selection mode:', err)
            }

            unlisten = await listen<boolean>(EVENTS.SELECTION_MODE_CHANGED, (event) => {
                console.log('[SnowKiteContainer] Selection mode changed:', event.payload)
                setIsSelectionMode(event.payload)
            })
        }

        setupListener()

        return () => {
            if (unlisten) {
                unlisten()
            }
        }
    }, [])

    // Window blur listener - close overlay when window loses focus
    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupListener = async () => {
            const currentWindow = getCurrentWindow()
            unlisten = await currentWindow.onFocusChanged(({ payload: focused }) => {
                console.log('[SnowKiteContainer] Window focus changed:', focused)
                // Commented out: This was closing overlays immediately when window lost focus
                // if (!focused && overlayManager.overlayWindowExistsRef.current) {
                //     console.log('[SnowKiteContainer] Window lost focus, closing overlay')
                //     overlayManager.closeOverlay()
                // }
            })
        }

        setupListener()

        return () => {
            if (unlisten) {
                unlisten()
            }
        }
    }, [overlayManager])

    // Register unified proceed handler for keyboard shortcut
    const handleUnifiedProceed = useCallback(async () => {
        if (guide.activeGuide && navigation.currentView === VIEWS.ACTIVE_GUIDE) {
            await guide.proceedStep()
        }
    }, [guide, navigation.currentView])

    useEffect(() => {
        keyboard.registerProceedHandler(handleUnifiedProceed)
    }, [keyboard.registerProceedHandler, handleUnifiedProceed])

    // Toast helper
    const showToast = useCallback((message: string, type: 'error' | 'info' | 'success' = 'error') => {
        const id = `toast-${Date.now()}`
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    // AI Chat helpers
    const takeScreenshot = useCallback(async (): Promise<string> => {
        messages.setIsProcessing(true)
        return await invoke<string>(TAURI_COMMANDS.TAKE_SCREENSHOT)
    }, [messages])

    const showTypingThenMessage = useCallback(
        async (messageFactory: () => Message, minDelay = 800) => {
            await new Promise(resolve => setTimeout(resolve, TIMING.TYPING_DELAY))

            const ellipsisMessage: Message = {
                id: `ellipsis-${Date.now()}`,
                role: 'assistant',
                content: '...',
                variant: 'assistant',
            }
            messages.addMessage(ellipsisMessage)

            await new Promise(resolve => setTimeout(resolve, minDelay))

            messages.setMessages(prev => {
                const filtered = prev.filter(msg => msg.id !== ellipsisMessage.id)
                return [...filtered, messageFactory()]
            })
        },
        [messages]
    )

    // Intent handlers for AI chat
    const handleTextOnlyIntent = useCallback(
        async (query: string) => {
            const result = await geminiService.answerTextOnly(query)
            await showTypingThenMessage(() => createAssistantMessage(result.answer))
        },
        [showTypingThenMessage]
    )

    const handlePointIntent = useCallback(
        async (query: string) => {
            const screenshot = await takeScreenshot()
            const result = await geminiService.point(screenshot, query)

            await showTypingThenMessage(() =>
                createAssistantMessage(`Found ${result.points.length} instance(s) of "${query}"`, {
                    image: screenshot,
                    points: result.points,
                })
            )

            await overlayManager.openScreenOverlay(result.points, result.points.length, result.points.length)
        },
        [takeScreenshot, showTypingThenMessage, overlayManager]
    )

    const handleQueryIntent = useCallback(
        async (query: string) => {
            const screenshot = await takeScreenshot()
            const result = await geminiService.query(screenshot, query)

            await showTypingThenMessage(() => createAssistantMessage(result.answer, { image: screenshot }))
        },
        [takeScreenshot, showTypingThenMessage]
    )

    const handleWalkthroughIntent = useCallback(
        async (query: string) => {
            // Start AI guide using unified guide session hook
            await guide.startGuide(query)
            navigation.setCurrentView(VIEWS.ACTIVE_GUIDE)

            // Get first step
            await guide.proceedStep()
        },
        [guide, navigation]
    )

    const handleClaudeQuery = useCallback(
        async (query: string) => {
            try {
                // Add delay before showing searching message for professional feel
                await new Promise(resolve => setTimeout(resolve, TIMING.STATUS_DELAY))

                // Show searching message
                const searchingMessage = createSearchingMessage(query)
                messages.addMessage(searchingMessage)

                // Track files read across all events in this query
                const filesReadInSession: string[] = []
                let searchingMessageRemoved = false

                // Stream Claude responses
                for await (const event of claudeService.queryStream({
                    prompt: query,
                    cwd: "data/rocketalumni/",
                    allowedTools: ["Read", "Glob", "Grep"],
                    sessionId: claudeService.getSessionId() || undefined,
                    systemPrompt: modeConfig.aiContextPrompt
                })) {
                    // Handle error events with toasts instead of messages
                    if (event.type === 'error') {
                        showToast(event.error || 'An unknown error occurred')
                        continue
                    }
                    if (event.type === 'result' && event.subtype === 'error' && event.error) {
                        showToast(event.error)
                        continue
                    }

                    // Collect files from Read tools across all events
                    if (event.type === 'assistant') {
                        const content = event.message.content || []

                        // Remove searching message when first text content arrives
                        if (!searchingMessageRemoved) {
                            const hasTextContent = content.some(item => item.type === 'text' && item.text)
                            if (hasTextContent) {
                                messages.setMessages(prev => prev.filter(msg => msg.id !== searchingMessage.id))
                                searchingMessageRemoved = true
                            }
                        }

                        for (const item of content) {
                            if (item.type === 'tool_use' && item.name === 'Read' && item.input) {
                                const relativePath = getRelativeFilePath(item.input)
                                if (relativePath) {
                                    filesReadInSession.push(relativePath)
                                }
                            }
                        }
                    }

                    const newMessages = convertClaudeEventToMessages(event)

                    // Attach accumulated files to text messages
                    newMessages.forEach(msg => {
                        if (msg.variant === 'assistant' && msg.role === 'assistant' && msg.content !== '...') {
                            if (filesReadInSession.length > 0) {
                                msg.filesRead = [...filesReadInSession]
                            }
                        }
                        messages.addMessage(msg)
                    })
                }
            } catch (error) {
                console.error('Claude query error:', error)
                showToast(error instanceof Error ? error.message : String(error))
            }
        },
        [messages, modeConfig.aiContextPrompt, showToast]
    )

    // Main send handler
    const handleSend = useCallback(async () => {
        if (!messages.input.trim() || messages.isProcessing) return

        const userMessage = createUserMessage(messages.input)
        const query = messages.input
        messages.setInput('')

        // Use Claude for landing and active guide views
        if (navigation.currentView === VIEWS.LANDING || navigation.currentView === VIEWS.ACTIVE_GUIDE) {
            messages.addMessage(userMessage)
            messages.setIsProcessing(true)

            // Navigate to walkthrough view when sending from landing page
            if (navigation.currentView === VIEWS.LANDING) {
                navigation.navigateToGuide()
            }

            try {
                await handleClaudeQuery(query)
            } finally {
                messages.setIsProcessing(false)
            }
            return
        }

        if (!guide.activeGuide) {
            messages.clearMessages()
        }
        messages.setIsProcessing(true)
        messages.addMessage(userMessage)

        try {
            const intent = await geminiService.classifyIntent(query)

            switch (intent) {
                case 'text-only':
                    await handleTextOnlyIntent(query)
                    break
                case 'point':
                    await handlePointIntent(query)
                    break
                case 'detect':
                    messages.addMessage(
                        createAssistantMessage('Detection functionality is currently disabled. Please use cursor pointing instead.')
                    )
                    break
                case 'walkthrough':
                    await handleWalkthroughIntent(query)
                    break
                case 'query':
                    await handleQueryIntent(query)
                    break
            }
        } catch (error) {
            console.error('Error details:', error)
            showToast(error instanceof Error ? error.message : String(error))
        } finally {
            messages.setIsProcessing(false)
        }
    }, [messages, navigation, guide, modeConfig, showTypingThenMessage, handleTextOnlyIntent, handlePointIntent, handleQueryIntent, handleWalkthroughIntent, handleClaudeQuery, showToast])

    // Guide start handler
    const startGuideHandler = useCallback(
        async (guideId: string) => {
            const guideDef = modeConfig.guides.find(g => g.id === guideId)
            if (!guideDef) return

            await guide.startGuide(guideDef)
            navigation.navigateToGuide()
        },
        [guide, navigation, modeConfig.guides]
    )

    // Reset chat handler that also clears Claude session
    const handleResetChat = useCallback(() => {
        messages.resetChat()
        claudeService.resetSession()
    }, [messages])

    // Back handler
    const handleBack = useCallback(async () => {
        messages.clearMessages()
        guide.endGuide()

        if (navigation.selectedTopic) {
            navigation.setCurrentView(VIEWS.TOPIC)
        } else {
            navigation.navigateToLanding()
        }

        if (overlayManager.overlayWindowExistsRef.current) {
            await overlayManager.closeOverlay()
        }
    }, [messages, guide, navigation, overlayManager])

    return (
        <Card className="h-screen w-full max-w-full bg-background backdrop-blur-xl border-0 shadow-2xl overflow-hidden overflow-x-hidden flex flex-col rounded-2xl p-0">
            {isSelectionMode && <SelectionBanner />}
            <DraggableHeader />

            {/* Landing View */}
            {navigation.currentView === VIEWS.LANDING && (
                <LandingView
                    topics={modeConfig.topics}
                    guides={modeConfig.guides}
                    messages={messages.messages}
                    input={messages.input}
                    isProcessing={messages.isProcessing}
                    statusMessage={guide.statusMessage}
                    searchQuery={navigation.searchQuery}
                    onTopicSelect={navigation.navigateToTopic}
                    onGuideStart={startGuideHandler}
                    onSearchChange={navigation.setSearchQuery}
                    onInputChange={messages.setInput}
                    onSend={handleSend}
                    onResetChat={handleResetChat}
                    scrollRef={scrollRef}
                />
            )}

            {/* Topic View */}
            {navigation.currentView === VIEWS.TOPIC && navigation.selectedTopic && (
                <TopicView
                    topic={modeConfig.topics.find(t => t.id === navigation.selectedTopic)!}
                    guides={modeConfig.guides.filter(
                        g => g.topic === modeConfig.topics.find(t => t.id === navigation.selectedTopic)?.name
                    )}
                    onBack={() => {
                        messages.clearMessages()
                        navigation.navigateToLanding()
                    }}
                    onGuideStart={startGuideHandler}
                />
            )}

            {/* Active Guide / AI Chat View */}
            {(navigation.currentView === VIEWS.ACTIVE_GUIDE) && (
                <WalkthroughView
                    messages={messages.messages}
                    input={messages.input}
                    isProcessing={messages.isProcessing}
                    statusMessage={guide.statusMessage}
                    showShortcutFlash={keyboard.showShortcutFlash}
                    prebuiltGuideSession={guide.activeGuide && guide.activeGuide.guide.source === 'static' ? guide.activeGuide : null}
                    walkthroughSession={guide.activeGuide && guide.activeGuide.guide.source === 'ai' ? guide.activeGuide : null}
                    onBack={handleBack}
                    onInputChange={messages.setInput}
                    onSend={handleSend}
                    onProceedPrebuilt={guide.proceedStep}
                    onProceedAI={guide.proceedStep}
                    onResetChat={handleResetChat}
                    scrollRef={scrollRef}
                />
            )}

            {/* Keyboard shortcut flash notification */}
            {keyboard.showShortcutFlash && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-card backdrop-blur-xl border border-border rounded-2xl px-6 py-3 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded-lg border border-border shadow-inner">⌘</kbd>
                                <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded-lg border border-border shadow-inner">↵</kbd>
                            </div>
                            <span className="text-sm text-foreground font-medium">Proceed</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notifications */}
            {toasts.map((toast, index) => (
                <div key={toast.id} style={{ top: `${8 + index * 5}rem` }} className="absolute">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onDismiss={() => dismissToast(toast.id)}
                    />
                </div>
            ))}
        </Card>
    )
}
