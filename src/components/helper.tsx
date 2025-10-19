import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { visionService, Point, BoundingBox } from '@/services/vision'
import { geminiService } from '@/services/gemini'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    image?: string
    points?: Point[]
    boxes?: BoundingBox[]
}

interface WalkthroughStep {
    stepNumber: number
    screenshot: string
    instruction: string
    points: Point[]
    boxes: BoundingBox[]
}

interface WalkthroughSession {
    goal: string
    steps: WalkthroughStep[]
    currentStepIndex: number
    isActive: boolean
    isComplete: boolean
}

interface RustPoint {
    x: number
    y: number
}

interface RustBoundingBox {
    x_min: number
    y_min: number
    x_max: number
    y_max: number
}

export function Helper() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string>('')
    const [walkthroughSession, setWalkthroughSession] = useState<WalkthroughSession | null>(null)
    const walkthroughSessionRef = useRef<WalkthroughSession | null>(null)
    const overlayWindowExistsRef = useRef<boolean>(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Keep ref in sync with state
    useEffect(() => {
        walkthroughSessionRef.current = walkthroughSession
    }, [walkthroughSession])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])


    const openFullscreenViewer = async (imageUrl: string, points: Point[] = [], boxes: BoundingBox[] = []) => {
        try {
            // Convert Point[] to RustPoint[] format
            const rustPoints: RustPoint[] = points.map(p => ({ x: p.x, y: p.y }))
            // Convert BoundingBox[] to RustBoundingBox[] format
            const rustBoxes: RustBoundingBox[] = boxes.map(b => ({
                x_min: b.x_min,
                y_min: b.y_min,
                x_max: b.x_max,
                y_max: b.y_max
            }))
            await invoke('open_fullscreen_viewer', {
                image: imageUrl,
                points: rustPoints,
                boxes: rustBoxes
            })
        } catch (error) {
            console.error('Failed to open fullscreen viewer:', error)
        }
    }

    const openScreenOverlay = async (
        points: Point[] = [],
        boxes: BoundingBox[] = [],
        walkthroughSteps?: number,
        currentStep?: number,
        instruction?: string,
        isComplete?: boolean
    ) => {
        try {
            console.log('openScreenOverlay called with:', { points, boxes, walkthroughSteps, currentStep, instruction, isComplete })
            // Convert Point[] to RustPoint[] format
            const rustPoints: RustPoint[] = points.map(p => ({ x: p.x, y: p.y }))
            // Convert BoundingBox[] to RustBoundingBox[] format
            const rustBoxes: RustBoundingBox[] = boxes.map(b => ({
                x_min: b.x_min,
                y_min: b.y_min,
                x_max: b.x_max,
                y_max: b.y_max
            }))
            console.log('Invoking open_screen_overlay command')
            const result = await invoke('open_screen_overlay', {
                points: rustPoints,
                boxes: rustBoxes,
                walkthrough_steps: walkthroughSteps,
                current_step: currentStep,
                instruction: instruction,
                is_complete: isComplete
            })
            console.log('open_screen_overlay command returned:', result)
        } catch (error) {
            console.error('Failed to open screen overlay:', error)
        }
    }

    const handleProceedToNextStep = async () => {
        const session = walkthroughSession
        if (!session || session.isComplete || isProcessing) {
            console.log('Cannot proceed: no session, complete, or already processing')
            return
        }

        try {
            setIsProcessing(true)
            setStatusMessage('Preparing for next step...')

            // Close the overlay before taking screenshot so it doesn't appear in the image
            console.log('Closing overlay before screenshot')
            await invoke('close_screen_overlay')
            overlayWindowExistsRef.current = false

            // Small delay to ensure overlay is fully closed
            await new Promise(resolve => setTimeout(resolve, 100))

            setStatusMessage('Taking screenshot for next step...')
            const screenshotDataUrl = await invoke<string>('take_screenshot')
            setStatusMessage('Determining next step...')

            const previousSteps = session.steps.map(s => s.instruction)
            const stepResult = await visionService.walkthroughNextStep(
                screenshotDataUrl,
                session.goal,
                previousSteps
            )

            const newStep: WalkthroughStep = {
                stepNumber: session.steps.length + 1,
                screenshot: screenshotDataUrl,
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
                boxes: newStep.boxes
            }
            setMessages(prev => [...prev, assistantMessage])
        } catch (error) {
            console.error('Error getting next step:', error)
            setStatusMessage(`Error: ${error}`)
        } finally {
            setIsProcessing(false)
            setStatusMessage('')
        }
    }

    const updateOverlayWithSession = async (session: WalkthroughSession) => {
        const currentStep = session.steps[session.currentStepIndex]
        if (!currentStep) {
            console.log('No current step, returning')
            return
        }

        console.log('updateOverlayWithSession called', {
            currentStepIndex: session.currentStepIndex,
            totalSteps: session.steps.length,
            pointsCount: currentStep.points.length,
            boxesCount: currentStep.boxes.length,
            overlayExists: overlayWindowExistsRef.current
        })

        try {
            if (overlayWindowExistsRef.current) {
                // Update existing overlay window with only current step data
                console.log('Updating existing overlay window via update_screen_overlay_data')
                const rustPoints: RustPoint[] = currentStep.points.map(p => ({ x: p.x, y: p.y }))
                const rustBoxes: RustBoundingBox[] = currentStep.boxes.map(b => ({
                    x_min: b.x_min,
                    y_min: b.y_min,
                    x_max: b.x_max,
                    y_max: b.y_max
                }))

                console.log('Sending to overlay:', {
                    points: rustPoints,
                    boxes: rustBoxes,
                    currentStep: session.currentStepIndex + 1,
                    instruction: currentStep.instruction
                })

                await invoke('update_screen_overlay_data', {
                    points: rustPoints,
                    boxes: rustBoxes,
                    walkthrough_steps: session.steps.length,
                    current_step: session.currentStepIndex + 1,
                    instruction: currentStep.instruction,
                    is_complete: session.isComplete
                })
                console.log('✓ Overlay updated successfully')
            } else {
                // Create new overlay window for first step
                console.log('Creating new overlay window')
                await openScreenOverlay(
                    currentStep.points,
                    currentStep.boxes,
                    session.steps.length,
                    session.currentStepIndex + 1,
                    currentStep.instruction,
                    session.isComplete
                )
                overlayWindowExistsRef.current = true
            }
        } catch (error) {
            console.error('Error updating overlay:', error)
            // If update fails, the window might be closed - try recreating
            console.log('Update failed, will recreate on next step if needed')
            overlayWindowExistsRef.current = false
        }
    }

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return

        // Clear previous conversation - helper is stateless
        setMessages([])

        setIsProcessing(true)
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        }

        setMessages(prev => [...prev, userMessage])
        const query = input
        setInput('')

        try {
            // Classify intent
            setStatusMessage('Analyzing request...')
            const intent = await geminiService.classifyIntent(query)

            // Execute based on classified intent
            if (intent === 'text-only') {
                // No screenshot needed for text-only queries
                setStatusMessage('Answering...')
                const queryResult = await geminiService.answerTextOnly(query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: queryResult.answer
                }
                setMessages(prev => [...prev, assistantMessage])
            } else if (intent === 'point') {
                // Take screenshot only when needed
                setStatusMessage('📸')
                const screenshotDataUrl = await invoke<string>('take_screenshot')

                setStatusMessage(`Finding "${query}"...`)
                const pointResult = await visionService.point(screenshotDataUrl, query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Found ${pointResult.points.length} instance(s) of "${query}"`,
                    image: screenshotDataUrl,
                    points: pointResult.points
                }
                setMessages(prev => [...prev, assistantMessage])

                // Show overlay on screen
                await openScreenOverlay(
                    pointResult.points,
                    [],
                    pointResult.points.length,
                    pointResult.points.length
                )
            } else if (intent === 'detect') {
                // Take screenshot only when needed
                setStatusMessage('📸')
                const screenshotDataUrl = await invoke<string>('take_screenshot')

                setStatusMessage(`Detecting "${query}"...`)
                const detectResult = await visionService.detect(screenshotDataUrl, query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Detected ${detectResult.objects.length} object(s) matching "${query}"`,
                    image: screenshotDataUrl,
                    boxes: detectResult.objects
                }
                setMessages(prev => [...prev, assistantMessage])

                // Show overlay on screen
                await openScreenOverlay(
                    [],
                    detectResult.objects,
                    detectResult.objects.length,
                    detectResult.objects.length
                )
            } else if (intent === 'walkthrough') {
                // Initialize iterative walkthrough session
                setStatusMessage('📸')
                const screenshotDataUrl = await invoke<string>('take_screenshot')

                setStatusMessage(`Starting walkthrough for "${query}"...`)

                // Get the first step
                const stepResult = await visionService.walkthroughNextStep(
                    screenshotDataUrl,
                    query,
                    [] // No previous steps yet
                )

                // Create the first step
                const firstStep: WalkthroughStep = {
                    stepNumber: 1,
                    screenshot: screenshotDataUrl,
                    instruction: stepResult.instruction,
                    points: stepResult.points,
                    boxes: stepResult.boxes
                }

                // Initialize session
                const newSession: WalkthroughSession = {
                    goal: query,
                    steps: [firstStep],
                    currentStepIndex: 0,
                    isActive: true,
                    isComplete: stepResult.isComplete
                }

                setWalkthroughSession(newSession)

                // Add to messages
                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Step 1: ${firstStep.instruction}`,
                    image: screenshotDataUrl,
                    points: firstStep.points,
                    boxes: firstStep.boxes
                }
                setMessages(prev => [...prev, assistantMessage])

                // Show overlay on screen
                await openScreenOverlay(
                    firstStep.points,
                    firstStep.boxes,
                    1,
                    1,
                    firstStep.instruction,
                    stepResult.isComplete
                )
                overlayWindowExistsRef.current = true
            } else {
                // 'query' intent - needs screenshot to answer questions about the screen
                setStatusMessage('📸')
                const screenshotDataUrl = await invoke<string>('take_screenshot')

                setStatusMessage('Answering...')
                const queryResult = await visionService.query(screenshotDataUrl, query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: queryResult.answer,
                    image: screenshotDataUrl
                }
                setMessages(prev => [...prev, assistantMessage])
            }
        } catch (error) {
            console.error('Error details:', error)
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
            setMessages(prev => [...prev, errorMessage])
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
                            if (isLastMessage) {
                                console.log('Last message - should show button?', {
                                    hasSession: !!walkthroughSession,
                                    isComplete: walkthroughSession?.isComplete,
                                    shouldShow: !!walkthroughSession && !walkthroughSession.isComplete
                                })
                            }
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
                                    {message.image && (
                                        <div
                                            className="mt-3 cursor-pointer rounded-lg overflow-hidden border-2 border-zinc-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 group relative"
                                            onClick={() => openFullscreenViewer(message.image!, message.points, message.boxes)}
                                        >
                                            <div className="relative">
                                                <img
                                                    src={message.image}
                                                    alt="Message attachment"
                                                    className="w-full h-auto rounded"
                                                />
                                                {message.points && message.points.map((point, idx) => (
                                                    <div
                                                        key={`point-${idx}`}
                                                        className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                                                        style={{
                                                            left: `${point.x * 100}%`,
                                                            top: `${point.y * 100}%`
                                                        }}
                                                    >
                                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                                {message.boxes && message.boxes.map((box, idx) => (
                                                    <div
                                                        key={`box-${idx}`}
                                                        className="absolute border-2 border-green-500 bg-green-500/10 shadow-lg"
                                                        style={{
                                                            left: `${box.x_min * 100}%`,
                                                            top: `${box.y_min * 100}%`,
                                                            width: `${(box.x_max - box.x_min) * 100}%`,
                                                            height: `${(box.y_max - box.y_min) * 100}%`
                                                        }}
                                                    >
                                                        <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center pointer-events-none">
                                                <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">Click to fullscreen</span>
                                            </div>
                                        </div>
                                    )}
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
