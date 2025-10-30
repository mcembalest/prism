import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadialProgress } from '@/components/ui/radial-progress'
import { ChatInput } from '@/components/ChatInput'
import { Check, ArrowLeft } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { geminiService } from '@/services/gemini'
import type { Point, BoundingBox, Message, WalkthroughStep, WalkthroughSession, PrebuiltGuideSession } from '@/types/walkthrough'
import { getModeConfig, productMode } from '@/config/modes'

export function Helper() {
    // Mode is set in code only - change productMode in config/modes/index.ts
    const modeConfig = getModeConfig(productMode)
    
    // Get guides and topics from current mode
    const PREBUILT_GUIDES = modeConfig.guides
    const TOPICS = modeConfig.topics

    // View management
    type ViewType = 'landing' | 'topic' | 'activeGuide' | 'aiChat'
    const [currentView, setCurrentView] = useState<ViewType>('landing')
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
    const [prebuiltGuideSession, setPrebuiltGuideSession] = useState<PrebuiltGuideSession | null>(null)

    // Track guide progress (session-based, not persisted)
    const [guideProgress, setGuideProgress] = useState<Map<string, { currentStep: number, totalSteps: number, hasSkipped: boolean, isComplete: boolean }>>(new Map())

    // Existing AI walkthrough states
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string>('')
    const [walkthroughSession, setWalkthroughSession] = useState<WalkthroughSession | null>(null)

    // Streaming observation states
    const [streamingObservation, setStreamingObservation] = useState<string>('')
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

    // Keyboard shortcut flash notification
    const [showShortcutFlash, setShowShortcutFlash] = useState(false)

    const overlayWindowExistsRef = useRef<boolean>(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const proceedHandlerRef = useRef<(() => Promise<void>) | null>(null)
    const isExecutingShortcut = useRef<boolean>(false)
    const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            // Find the ScrollArea viewport (Radix UI uses [data-radix-scroll-area-viewport])
            const viewport = scrollRef.current.closest('[data-radix-scroll-area-viewport]') as HTMLElement
            if (viewport) {
                // Smooth scroll to bottom
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth'
                })
            } else {
                // Fallback to scrolling the ref itself
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }
    }, [messages, streamingObservation])

    // Listen for global keyboard shortcut to proceed to next step
    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupListener = async () => {
            unlisten = await listen('proceed-shortcut-triggered', async () => {
                console.log('[Global Shortcut] Cmd+Enter pressed')

                // Prevent double execution from multiple listeners
                if (isExecutingShortcut.current) {
                    console.log('[Global Shortcut] Already executing, ignoring duplicate trigger')
                    return
                }

                // Show flash notification
                setShowShortcutFlash(true)
                setTimeout(() => setShowShortcutFlash(false), 800)

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

    // Cleanup streaming interval on unmount or view change
    useEffect(() => {
        return () => {
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current)
                streamingIntervalRef.current = null
            }
        }
    }, [])

    const openScreenOverlay = async (
        points: Point[] = [],
        _boxes: BoundingBox[] = [],
        walkthroughSteps?: number,
        currentStep?: number,
        instruction?: string,
        caption?: string,
        isComplete?: boolean
    ) => {
        try {
            await invoke('open_screen_overlay', {
                points,
                boxes: [], // Always pass empty array - bounding boxes are disabled
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

    // Pre-built guide handlers
    const startPrebuiltGuide = async (guideId: string) => {
        const guide = PREBUILT_GUIDES.find(g => g.id === guideId)
        if (!guide) return

        const session: PrebuiltGuideSession = {
            guide,
            currentStepIndex: 0,
            completedSteps: new Set(),
            skippedSteps: new Set(),
            isComplete: false,
            showHint: false
        }

        setPrebuiltGuideSession(session)
        setCurrentView('activeGuide')

        // Update guide progress
        setGuideProgress(prev => new Map(prev).set(guideId, {
            currentStep: 1,
            totalSteps: guide.steps.length,
            hasSkipped: false,
            isComplete: false
        }))

        // Add first step as an assistant message
        const firstStep = guide.steps[0]
        const stepMessage = createAssistantMessage(firstStep.instruction)
        setMessages([stepMessage])

        // Trigger observation streaming if this step has one
        if (firstStep.observation) {
            streamObservation(firstStep.observation)
        }

        // Show overlay for first step
        await openScreenOverlay(
            firstStep.points || [],
            firstStep.boxes || [],
            guide.steps.length,
            1,
            firstStep.instruction,
            firstStep.caption || guide.title,
            false
        )
        overlayWindowExistsRef.current = true
    }

    const proceedPrebuiltGuide = async () => {
        if (!prebuiltGuideSession || prebuiltGuideSession.isComplete) return

        const { guide, currentStepIndex, completedSteps, skippedSteps } = prebuiltGuideSession

        // Mark current step as completed
        const newCompletedSteps = new Set(completedSteps)
        newCompletedSteps.add(currentStepIndex)

        // Check if there are more steps
        if (currentStepIndex + 1 < guide.steps.length) {
            // Move to next step
            const nextStepIndex = currentStepIndex + 1
            const nextStep = guide.steps[nextStepIndex]

            const updatedSession: PrebuiltGuideSession = {
                ...prebuiltGuideSession,
                currentStepIndex: nextStepIndex,
                completedSteps: newCompletedSteps,
                showHint: false
            }

            setPrebuiltGuideSession(updatedSession)

            // Update guide progress
            setGuideProgress(prev => new Map(prev).set(guide.id, {
                currentStep: nextStepIndex + 1,
                totalSteps: guide.steps.length,
                hasSkipped: skippedSteps.size > 0,
                isComplete: false
            }))

            // Add next step as an assistant message
            const stepMessage = createAssistantMessage(nextStep.instruction)
            setMessages(prev => [...prev, stepMessage])

            // Trigger observation streaming if this step has one
            if (nextStep.observation) {
                streamObservation(nextStep.observation)
            }

            // Update overlay with next step
            if (overlayWindowExistsRef.current) {
                await invoke('update_screen_overlay_data', {
                    points: nextStep.points || [],
                    boxes: [], // Bounding boxes disabled - only show points
                    walkthrough_steps: guide.steps.length,
                    current_step: nextStepIndex + 1,
                    instruction: nextStep.instruction,
                    caption: nextStep.caption || guide.title,
                    is_complete: false
                })
            }
        } else {
            // Guide is complete
            const updatedSession: PrebuiltGuideSession = {
                ...prebuiltGuideSession,
                completedSteps: newCompletedSteps,
                isComplete: true
            }

            setPrebuiltGuideSession(updatedSession)

            // Update guide progress
            setGuideProgress(prev => new Map(prev).set(guide.id, {
                currentStep: guide.steps.length,
                totalSteps: guide.steps.length,
                hasSkipped: skippedSteps.size > 0,
                isComplete: true
            }))

            // Update overlay to show completion
            if (overlayWindowExistsRef.current) {
                const lastStep = guide.steps[guide.steps.length - 1]
                await invoke('update_screen_overlay_data', {
                    points: [],
                    boxes: [], // Bounding boxes disabled
                    walkthrough_steps: guide.steps.length,
                    current_step: guide.steps.length,
                    instruction: 'Guide complete!',
                    caption: lastStep.caption || guide.title,
                    is_complete: true
                })
            }
        }
    }

    const skipPrebuiltStep = async () => {
        if (!prebuiltGuideSession || prebuiltGuideSession.isComplete) return

        const { guide, currentStepIndex, skippedSteps } = prebuiltGuideSession

        // Mark current step as skipped
        const newSkippedSteps = new Set(skippedSteps)
        newSkippedSteps.add(currentStepIndex)

        // Skip without marking complete - just move to next step
        if (currentStepIndex + 1 < guide.steps.length) {
            const nextStepIndex = currentStepIndex + 1
            const nextStep = guide.steps[nextStepIndex]

            const updatedSession: PrebuiltGuideSession = {
                ...prebuiltGuideSession,
                currentStepIndex: nextStepIndex,
                skippedSteps: newSkippedSteps,
                showHint: false
            }

            setPrebuiltGuideSession(updatedSession)

            // Update guide progress - mark as skipped
            setGuideProgress(prev => new Map(prev).set(guide.id, {
                currentStep: nextStepIndex + 1,
                totalSteps: guide.steps.length,
                hasSkipped: true,
                isComplete: false
            }))

            // Add next step as an assistant message
            const stepMessage = createAssistantMessage(nextStep.instruction)
            setMessages(prev => [...prev, stepMessage])

            // Trigger observation streaming if this step has one
            if (nextStep.observation) {
                streamObservation(nextStep.observation)
            }

            // Update overlay
            if (overlayWindowExistsRef.current) {
                await invoke('update_screen_overlay_data', {
                    points: nextStep.points || [],
                    boxes: [], // Bounding boxes disabled - only show points
                    walkthrough_steps: guide.steps.length,
                    current_step: nextStepIndex + 1,
                    instruction: nextStep.instruction,
                    caption: nextStep.caption || guide.title,
                    is_complete: false
                })
            }
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
                previousSteps,
                modeConfig.aiContextPrompt
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
                boxes: [] // Bounding boxes disabled - only use cursor points
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

    // Unified proceed handler that works for both pre-built and AI walkthroughs
    const handleUnifiedProceed = async () => {
        if (prebuiltGuideSession && currentView === 'activeGuide') {
            // Use pre-built guide proceed
            await proceedPrebuiltGuide()
        } else if (walkthroughSession) {
            // Use AI walkthrough proceed
            await handleProceedToNextStep()
        }
    }

    // Keep the ref updated with the latest handler
    useEffect(() => {
        proceedHandlerRef.current = handleUnifiedProceed
        console.log('[Global Shortcut] Handler ref updated - view:', currentView, 'prebuilt:', !!prebuiltGuideSession, 'ai:', !!walkthroughSession)
    }, [walkthroughSession, prebuiltGuideSession, currentView, isProcessing])

    const updateOverlayWithSession = async (session: WalkthroughSession) => {
        const currentStep = session.steps[session.currentStepIndex]
        if (!currentStep) return

        try {
            if (overlayWindowExistsRef.current) {
                // Update existing overlay window
                await invoke('update_screen_overlay_data', {
                    points: currentStep.points,
                    boxes: [], // Bounding boxes disabled - only show points
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
        caption?: string,
        observation?: string
    ): Message => ({
        id: Date.now().toString(),
        role: 'assistant',
        content,
        image,
        points,
        boxes,
        caption,
        observation
    })

    // Helper to take screenshot with fade animation
    const takeScreenshot = async (): Promise<string> => {
        setStatusMessage('Analyzing...')
        return await invoke<string>('take_screenshot')
    }

    // Helper to add observation as separate message with streaming effect
    const streamObservation = (observation: string) => {
        // Clear any existing streaming interval
        if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current)
            streamingIntervalRef.current = null
        }

        // Wait 2.5 seconds before showing observation (longer, more natural delay)
        setTimeout(() => {
            // Create and add observation message
            const observationMessage = createAssistantMessage(observation)
            setMessages(prev => [...prev, observationMessage])

            // Reset streaming state and start streaming this message
            setStreamingObservation('')
            setStreamingMessageId(observationMessage.id)

            // Stream the content character by character
            let charIndex = 0
            const streamInterval = setInterval(() => {
                if (charIndex < observation.length) {
                    setStreamingObservation(observation.slice(0, charIndex + 1))
                    charIndex++
                } else {
                    // Streaming complete
                    clearInterval(streamInterval)
                    streamingIntervalRef.current = null
                    setStreamingMessageId(null)
                }
            }, 10)

            streamingIntervalRef.current = streamInterval
        }, 2500) // 2.5 second delay before observation appears
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

    const handleQueryIntent = async (query: string) => {
        const screenshot = await takeScreenshot()
        setStatusMessage('Answering...')
        const result = await geminiService.query(screenshot, query)

        setMessages(prev => [...prev, createAssistantMessage(result.answer, screenshot)])
    }

    const handleWalkthroughIntent = async (query: string) => {
        const screenshot = await takeScreenshot()
        setStatusMessage(`Starting walkthrough for "${query}"...`)

        const stepResult = await geminiService.walkthroughNextStep(screenshot, query, [], modeConfig.aiContextPrompt)

        const firstStep: WalkthroughStep = {
            stepNumber: 1,
            screenshot,
            caption: stepResult.caption,
            instruction: stepResult.instruction,
            points: stepResult.points,
            boxes: [] // Bounding boxes disabled - only use cursor points
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

        const userMessage = createAssistantMessage(input)
        userMessage.role = 'user'

        const query = input
        setInput('')

        // Mocked responses for landing and pre-built guide views
        // (No AI needed - these views use static content)
        if (currentView === 'landing' || currentView === 'activeGuide') {
            setMessages(prev => [...prev, userMessage])
            setIsProcessing(true)

            // Simulate thinking delay
            await new Promise(resolve => setTimeout(resolve, 800))

            let mockResponse = ''
            if (currentView === 'landing') {
                mockResponse = modeConfig.welcomeMessage || "I can help you get started! Try selecting one of the guides above, or ask me a question."
            } else if (currentView === 'activeGuide') {
                const guideName = prebuiltGuideSession?.guide.title || 'this guide'
                const currentStep = prebuiltGuideSession ? prebuiltGuideSession.currentStepIndex + 1 : 1
                mockResponse = `You're on step ${currentStep} of "${guideName}". ${query.toLowerCase().includes('help') || query.toLowerCase().includes('stuck')
                    ? 'Try following the instruction above, or use the Hint button if you need more guidance. You can also skip this step if needed.'
                    : 'What specific part would you like help with?'}`
            }

            setMessages(prev => [...prev, createAssistantMessage(mockResponse)])
            setIsProcessing(false)
            return
        }

        // Full AI logic for aiChat view
        // Only clear messages if there's no active walkthrough session
        if (!walkthroughSession || !walkthroughSession.isActive) {
            setMessages([]) // Clear previous conversation - helper is stateless
        }
        setIsProcessing(true)
        setMessages(prev => [...prev, userMessage])

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
                    // Detect intent has been disabled - only cursor points are supported
                    setMessages(prev => [...prev, createAssistantMessage(
                        'Detection functionality is currently disabled. Please use cursor pointing instead.'
                    )])
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

    // Render functions for different views
    const renderLandingView = () => (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50">
                <h1 className="text-3xl font-bold text-white text-center mb-2">How can I help?</h1>
                <p className="text-sm text-zinc-400 text-center">Ask a question or choose a guide</p>
            </div>

            <ScrollArea className="flex-1 h-0">
                <div ref={scrollRef} className="p-6 space-y-6">
                    {/* Chat messages */}
                    {messages.length > 0 && (
                        <div className="space-y-3 mb-6">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl p-3.5 shadow-lg ${
                                            message.role === 'user'
                                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                : 'bg-zinc-800/80 text-gray-100 border border-zinc-700/50'
                                        }`}
                                    >
                                        <p className="text-sm leading-relaxed">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recent Guides */}
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent Guides</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {PREBUILT_GUIDES.filter(g => g.isRecent).map(guide => {
                                const progress = guideProgress.get(guide.id)
                                const isInProgress = progress && !progress.isComplete
                                const isCompleted = progress?.isComplete || guide.isCompleted

                                return (
                                    <button
                                        key={guide.id}
                                        onClick={() => startPrebuiltGuide(guide.id)}
                                        className="flex items-center gap-2 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all text-left"
                                    >
                                        {isCompleted ? (
                                            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                                        ) : isInProgress ? (
                                            <RadialProgress
                                                progress={progress.currentStep / progress.totalSteps}
                                                hasSkipped={progress.hasSkipped}
                                                size={16}
                                            />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-zinc-600 flex-shrink-0" />
                                        )}
                                        <span className="text-xs text-zinc-200">{guide.title}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Recommended Topics */}
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recommended Topics</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {TOPICS.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => {
                                        setSelectedTopic(topic.id)
                                        setCurrentView('topic')
                                    }}
                                    className="flex items-center gap-2 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all text-left"
                                >
                                    <span className="text-zinc-400">{topic.icon}</span>
                                    <span className="text-xs text-zinc-200">{topic.name}</span>
                                </button>
                            ))}
                        </div>
                        <button className="w-full mt-3 p-2 rounded-full border border-zinc-700/50 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all">
                            Browse All Topics
                        </button>
                    </div>
                </div>
            </ScrollArea>

            <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                isProcessing={isProcessing}
                statusMessage={statusMessage}
            />
        </div>
    )

    const renderTopicView = () => {
        const topic = TOPICS.find(t => t.id === selectedTopic)
        const guidesInTopic = PREBUILT_GUIDES.filter(g => g.topic === topic?.name)

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-zinc-800/50">
                    <button
                        onClick={() => {
                            setMessages([])
                            setCurrentView('landing')
                        }}
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{topic?.icon}</span>
                        <h1 className="text-2xl font-bold text-white">{topic?.name}</h1>
                    </div>
                    {topic?.description && (
                        <p className="text-sm text-zinc-400">{topic.description}</p>
                    )}
                </div>

                <ScrollArea className="flex-1 h-0">
                    <div className="p-6">
                        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Guides</h2>
                        <div className="space-y-2">
                            {guidesInTopic.map(guide => (
                                <button
                                    key={guide.id}
                                    onClick={() => startPrebuiltGuide(guide.id)}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all text-left"
                                >
                                    <span className="h-2 w-2 rounded-full bg-zinc-600"></span>
                                    <span className="text-sm text-zinc-200">{guide.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        )
    }

    const renderWalkthroughView = () => {
        // Determine if this is a prebuilt guide or AI chat
        const isPrebuiltGuide = prebuiltGuideSession !== null
        const isComplete = isPrebuiltGuide ? prebuiltGuideSession.isComplete : walkthroughSession?.isComplete

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header - different for prebuilt vs AI chat */}
                {isPrebuiltGuide ? (
                    <div className="p-6 space-y-4">
                        <button
                            onClick={async () => {
                                setMessages([])
                                setPrebuiltGuideSession(null)
                                setCurrentView('landing')
                                if (overlayWindowExistsRef.current) {
                                    await invoke('close_screen_overlay')
                                    overlayWindowExistsRef.current = false
                                }
                            }}
                            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm">Back</span>
                        </button>
                        <div className="flex items-center gap-3">
                            {isComplete ? (
                                <Check className="h-6 w-6 text-green-400" />
                            ) : (
                                <RadialProgress
                                    progress={(prebuiltGuideSession.currentStepIndex + 1) / prebuiltGuideSession.guide.steps.length}
                                    hasSkipped={prebuiltGuideSession.skippedSteps.size > 0}
                                    size={24}
                                />
                            )}
                            <h1 className="text-2xl font-bold text-white">{prebuiltGuideSession.guide.title}</h1>
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
                            onClick={() => {
                                setMessages([])
                                setWalkthroughSession(null)
                                setCurrentView('landing')
                            }}
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
                    <div ref={scrollRef} className={isPrebuiltGuide ? "p-6 space-y-4" : "p-4 space-y-3"}>
                        {messages.length > 0 && (
                            <div className={isPrebuiltGuide ? "space-y-3 mb-6" : "space-y-3"}>
                                {messages.map((message, index) => {
                                    const isLastMessage = index === messages.length - 1
                                    return (
                                        <div key={message.id}>
                                            <div
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-lg ${
                                                        message.role === 'user'
                                                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                            : 'bg-zinc-800/80 text-gray-100 border border-zinc-700/50'
                                                    }`}
                                                >
                                                    <p className="text-sm leading-relaxed">
                                                        {streamingMessageId === message.id
                                                            ? streamingObservation
                                                            : message.content}
                                                        {streamingMessageId === message.id && (
                                                            <span className="animate-pulse ml-0.5">▊</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Proceed/Skip buttons - different for prebuilt vs AI chat */}
                                            {isLastMessage && !isComplete && (
                                                isPrebuiltGuide ? (
                                                    <div className="flex justify-start gap-2 mt-2 ml-1">
                                                        <button
                                                            onClick={proceedPrebuiltGuide}
                                                            className={`text-xs text-purple-400 hover:text-purple-300 transition-all bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 ${showShortcutFlash ? 'ring-2 ring-purple-400 scale-105' : ''}`}
                                                        >
                                                            Proceed
                                                            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-zinc-700/50 rounded border border-zinc-600/50">⌘↵</kbd>
                                                        </button>
                                                        <button
                                                            onClick={skipPrebuiltStep}
                                                            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-800/50 hover:bg-zinc-700/50 px-2.5 py-1 rounded-md"
                                                        >
                                                            Skip
                                                        </button>
                                                    </div>
                                                ) : walkthroughSession && (
                                                    <div className="flex justify-start mt-2 ml-1">
                                                        <button
                                                            onClick={handleProceedToNextStep}
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

                        {/* Completion message - only for prebuilt guides */}
                        {isComplete && isPrebuiltGuide && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] rounded-2xl p-3.5 shadow-lg bg-green-900/20 border border-green-700/50 text-center">
                                    <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                    <p className="text-sm text-green-300 font-semibold">Guide Complete!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    isProcessing={isProcessing}
                    statusMessage={statusMessage}
                />
            </div>
        )
    }

    // Conditional rendering based on current view
    return (
        <>
            {currentView === 'landing' && renderLandingView()}
            {currentView === 'topic' && renderTopicView()}
            {(currentView === 'activeGuide' || currentView === 'aiChat') && renderWalkthroughView()}
            
            {/* Keyboard shortcut flash notification */}
            {showShortcutFlash && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl px-6 py-3 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 text-sm font-mono bg-zinc-800 rounded-lg border border-zinc-600 shadow-inner">⌘</kbd>
                                <kbd className="px-2 py-1 text-sm font-mono bg-zinc-800 rounded-lg border border-zinc-600 shadow-inner">↵</kbd>
                            </div>
                            <span className="text-sm text-zinc-300 font-medium">Proceed</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
