import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { geminiService } from '@/services/gemini'
import type { Point, BoundingBox, Message, WalkthroughStep, WalkthroughSession } from '@/types/walkthrough'

export function Helper() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string>('')
    const [walkthroughSession, setWalkthroughSession] = useState<WalkthroughSession | null>(null)
    const overlayWindowExistsRef = useRef<boolean>(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const proceedHandlerRef = useRef<(() => Promise<void>) | null>(null)
    const isExecutingShortcut = useRef<boolean>(false)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Listen for global keyboard shortcut to proceed to next step
    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupListener = async () => {
            unlisten = await listen('proceed-shortcut-triggered', async () => {
                console.log('[Global Shortcut] Cmd+Shift+→ pressed')

                // Prevent double execution from multiple listeners
                if (isExecutingShortcut.current) {
                    console.log('[Global Shortcut] Already executing, ignoring duplicate trigger')
                    return
                }

                console.log('[Global Shortcut] Current state:', {
                    hasSession: !!walkthroughSession,
                    isComplete: walkthroughSession?.isComplete,
                    isProcessing,
                    hasHandler: !!proceedHandlerRef.current
                })

                if (proceedHandlerRef.current) {
                    isExecutingShortcut.current = true
                    try {
                        await proceedHandlerRef.current()
                    } catch (err) {
                        console.error('[Global Shortcut] Error executing proceed handler:', err)
                    } finally {
                        isExecutingShortcut.current = false
                    }
                } else {
                    console.warn('[Global Shortcut] Handler ref is null')
                }
            })
            console.log('[Global Shortcut] Listener registered successfully')
        }

        setupListener()

        return () => {
            if (unlisten) {
                console.log('[Global Shortcut] Unregistering listener')
                unlisten()
            }
        }
    }, [])

    const openScreenOverlay = async (
        points: Point[] = [],
        boxes: BoundingBox[] = [],
        walkthroughSteps?: number,
        currentStep?: number,
        instruction?: string,
        caption?: string,
        isComplete?: boolean
    ) => {
        try {
            await invoke('open_screen_overlay', {
                points,
                boxes,
                walkthrough_steps: walkthroughSteps,
                current_step: currentStep,
                instruction,
                caption,
                is_complete: isComplete
            })
        } catch (error) {
            console.error('Failed to open screen overlay:', error)
        }
    }

    const handleProceedToNextStep = async () => {
        const session = walkthroughSession
        console.log('[Proceed Handler] Called with state:', {
            hasSession: !!session,
            isComplete: session?.isComplete,
            isProcessing,
            currentStep: session?.currentStepIndex,
            totalSteps: session?.steps.length
        })

        if (!session || session.isComplete || isProcessing) {
            console.log('[Proceed Handler] Blocked - session:', !session, 'complete:', session?.isComplete, 'processing:', isProcessing)
            return
        }

        try {
            setIsProcessing(true)
            setStatusMessage('Preparing for next step...')

            // Close the overlay before taking screenshot
            await invoke('close_screen_overlay')
            overlayWindowExistsRef.current = false

            // Small delay to ensure overlay is fully closed
            await new Promise(resolve => setTimeout(resolve, 100))

            setStatusMessage('Taking screenshot for next step...')
            const screenshotDataUrl = await invoke<string>('take_screenshot')
            setStatusMessage('Determining next step...')

            const previousSteps = session.steps.map(s => s.instruction)
            const stepResult = await geminiService.walkthroughNextStep(
                screenshotDataUrl,
                session.goal,
                previousSteps
            )

            console.log('[Proceed Handler] AI response:', {
                instruction: stepResult.instruction,
                isComplete: stepResult.isComplete,
                caption: stepResult.caption,
                pointsCount: stepResult.points.length,
                boxesCount: stepResult.boxes.length
            })

            const newStep: WalkthroughStep = {
                stepNumber: session.steps.length + 1,
                screenshot: screenshotDataUrl,
                caption: stepResult.caption,
                instruction: stepResult.instruction,
                points: stepResult.points,
                boxes: stepResult.boxes
            }

            const updatedSession: WalkthroughSession = {
                ...session,
                steps: [...session.steps, newStep],
                currentStepIndex: session.steps.length,
                isComplete: stepResult.isComplete
            }

            setWalkthroughSession(updatedSession)
            await updateOverlayWithSession(updatedSession)

            const assistantMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Step ${newStep.stepNumber}: ${newStep.instruction}`,
                image: screenshotDataUrl,
                points: newStep.points,
                boxes: newStep.boxes,
                caption: newStep.caption
            }
            setMessages(prev => [...prev, assistantMessage])
            console.log('[Proceed Handler] Successfully completed step', newStep.stepNumber)
        } catch (error) {
            console.error('[Proceed Handler] Error getting next step:', error)
            setStatusMessage(`Error: ${error}`)
        } finally {
            setIsProcessing(false)
            setStatusMessage('')
            console.log('[Proceed Handler] Finished, isProcessing set to false')
        }
    }

    // Keep the ref updated with the latest handler
    useEffect(() => {
        proceedHandlerRef.current = handleProceedToNextStep
        console.log('[Global Shortcut] Handler ref updated - processing:', isProcessing, 'session:', !!walkthroughSession)
    }, [walkthroughSession, isProcessing])

    const updateOverlayWithSession = async (session: WalkthroughSession) => {
        const currentStep = session.steps[session.currentStepIndex]
        if (!currentStep) return

        try {
            if (overlayWindowExistsRef.current) {
                // Update existing overlay window
                await invoke('update_screen_overlay_data', {
                    points: currentStep.points,
                    boxes: currentStep.boxes,
                    walkthrough_steps: session.steps.length,
                    current_step: session.currentStepIndex + 1,
                    instruction: currentStep.instruction,
                    caption: currentStep.caption,
                    is_complete: session.isComplete
                })
            } else {
                // Create new overlay window for first step
                await openScreenOverlay(
                    currentStep.points,
                    currentStep.boxes,
                    session.steps.length,
                    session.currentStepIndex + 1,
                    currentStep.instruction,
                    currentStep.caption,
                    session.isComplete
                )
                overlayWindowExistsRef.current = true
            }
        } catch (error) {
            console.error('Error updating overlay:', error)
            overlayWindowExistsRef.current = false
        }
    }

    // Helper to create assistant message
    const createAssistantMessage = (
        content: string,
        image?: string,
        points?: Point[],
        boxes?: BoundingBox[],
        caption?: string
    ): Message => ({
        id: Date.now().toString(),
        role: 'assistant',
        content,
        image,
        points,
        boxes,
        caption
    })

    // Helper to take screenshot with fade animation
    const takeScreenshot = async (): Promise<string> => {
        setStatusMessage('📸')
        return await invoke<string>('take_screenshot')
    }

    // Intent Handlers
    const handleTextOnlyIntent = async (query: string) => {
        setStatusMessage('Answering...')
        const result = await geminiService.answerTextOnly(query)
        setMessages(prev => [...prev, createAssistantMessage(result.answer)])
    }

    const handlePointIntent = async (query: string) => {
        const screenshot = await takeScreenshot()
        setStatusMessage(`Finding "${query}"...`)
        const result = await geminiService.point(screenshot, query)

        setMessages(prev => [...prev, createAssistantMessage(
            `Found ${result.points.length} instance(s) of "${query}"`,
            screenshot,
            result.points
        )])

        await openScreenOverlay(result.points, [], result.points.length, result.points.length)
    }

    const handleDetectIntent = async (query: string) => {
        const screenshot = await takeScreenshot()
        setStatusMessage(`Detecting "${query}"...`)
        const result = await geminiService.detect(screenshot, query)

        setMessages(prev => [...prev, createAssistantMessage(
            `Detected ${result.objects.length} object(s) matching "${query}"`,
            screenshot,
            undefined,
            result.objects
        )])

        await openScreenOverlay([], result.objects, result.objects.length, result.objects.length)
    }

    const handleQueryIntent = async (query: string) => {
        const screenshot = await takeScreenshot()
        setStatusMessage('Answering...')
        const result = await geminiService.query(screenshot, query)

        setMessages(prev => [...prev, createAssistantMessage(result.answer, screenshot)])
    }

    const handleWalkthroughIntent = async (query: string) => {
        const screenshot = await takeScreenshot()
        setStatusMessage(`Starting walkthrough for "${query}"...`)

        const stepResult = await geminiService.walkthroughNextStep(screenshot, query, [])

        const firstStep: WalkthroughStep = {
            stepNumber: 1,
            screenshot,
            caption: stepResult.caption,
            instruction: stepResult.instruction,
            points: stepResult.points,
            boxes: stepResult.boxes
        }

        const newSession: WalkthroughSession = {
            goal: query,
            steps: [firstStep],
            currentStepIndex: 0,
            isActive: true,
            isComplete: stepResult.isComplete
        }

        setWalkthroughSession(newSession)
        setMessages(prev => [...prev, createAssistantMessage(
            `Step 1: ${firstStep.instruction}`,
            screenshot,
            firstStep.points,
            firstStep.boxes,
            firstStep.caption
        )])

        await openScreenOverlay(
            firstStep.points,
            firstStep.boxes,
            1,
            1,
            firstStep.instruction,
            firstStep.caption,
            stepResult.isComplete
        )
        overlayWindowExistsRef.current = true
    }

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return

        setMessages([]) // Clear previous conversation - helper is stateless
        setIsProcessing(true)

        const userMessage = createAssistantMessage(input)
        userMessage.role = 'user'
        setMessages(prev => [...prev, userMessage])

        const query = input
        setInput('')

        try {
            setStatusMessage('Analyzing request...')
            const intent = await geminiService.classifyIntent(query)

            // Execute intent handler
            switch (intent) {
                case 'text-only':
                    await handleTextOnlyIntent(query)
                    break
                case 'point':
                    await handlePointIntent(query)
                    break
                case 'detect':
                    await handleDetectIntent(query)
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
            setMessages(prev => [...prev, createAssistantMessage(
                `Error: ${error instanceof Error ? error.message : String(error)}`
            )])
        } finally {
            setStatusMessage('')
            setIsProcessing(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50">
                <div className="text-center space-y-1">
                    <p className="text-sm text-zinc-400">Get help with your current workflow</p>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div ref={scrollRef} className="p-4 space-y-3">
                        {messages.map((message, index) => {
                            const isLastMessage = index === messages.length - 1
                            return (
                                <div key={message.id}>
                                    <div
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl p-3.5 shadow-lg ${message.role === 'user'
                                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                    : 'bg-zinc-800/80 text-gray-100 border border-zinc-700/50'
                                                }`}
                                        >
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                </div>
                            </div>

                            {/* Proceed button for walkthrough - shown below last message */}
                            {isLastMessage && walkthroughSession && !walkthroughSession.isComplete && (
                                <div className="flex justify-start mt-2 ml-1">
                                    <button
                                        onClick={handleProceedToNextStep}
                                        disabled={isProcessing}
                                        className="text-sm text-purple-400 hover:text-purple-300 underline decoration-2 underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded"
                                    >
                                        {isProcessing ? 'Processing...' : 'Proceed →'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                        })}
                    </div>
                </ScrollArea>
            </div>

            <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur space-y-3">
                {statusMessage && (
                    <div className="text-xs text-blue-400">
                        {statusMessage}
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onPaste={(e) => {
                            const t = e.clipboardData?.getData('text')
                            if (typeof t === 'string' && t.length > 0) {
                                e.preventDefault()
                                const el = inputRef.current
                                const start = el?.selectionStart ?? input.length
                                const end = el?.selectionEnd ?? input.length
                                const newValue = input.slice(0, start) + t + input.slice(end)
                                setInput(newValue)
                                requestAnimationFrame(() => {
                                    if (el) {
                                        const pos = start + t.length
                                        el.setSelectionRange(pos, pos)
                                    }
                                })
                            }
                        }}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                                handleSend()
                                return
                            }
                            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                                try {
                                    const clip = await navigator.clipboard?.readText?.()
                                    if (clip) {
                                        e.preventDefault()
                                        const el = inputRef.current
                                        const start = el?.selectionStart ?? input.length
                                        const end = el?.selectionEnd ?? input.length
                                        const newValue = input.slice(0, start) + clip + input.slice(end)
                                        setInput(newValue)
                                        requestAnimationFrame(() => {
                                            if (el) {
                                                const pos = start + clip.length
                                                el.setSelectionRange(pos, pos)
                                            }
                                        })
                                    }
                                } catch {
                                    // ignore
                                }
                            }
                        }}
                        placeholder="Ask for help"
                        className="flex-1 bg-zinc-800/80 text-white placeholder:text-zinc-500 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessing}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 rounded-xl px-4 transition-all"
                    >
                        {isProcessing ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
