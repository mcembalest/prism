import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { RadialProgress } from '@/components/ui/radial-progress'
import { Send, Play, Check, ArrowLeft, Plus, Camera, Mic, ArrowUp } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { geminiService } from '@/services/gemini'
import type { Point, BoundingBox, Message, WalkthroughStep, WalkthroughSession, PrebuiltGuide, PrebuiltGuideSession } from '@/types/walkthrough'

// Hard-coded guide data
const PREBUILT_GUIDES: PrebuiltGuide[] = [
    {
        id: 'review-pr',
        title: 'Review a pull request',
        topic: 'Git Basics',
        description: 'Learn how to review code changes in a pull request on GitHub',
        isRecent: true,
        steps: [
            {
                instruction: 'Navigate to the Pull Requests tab',
                hint: 'Look for the "Pull requests" link in the repository navigation menu near the top of the page',
                points: [{ x: 0.15, y: 0.08 }]
            },
            {
                instruction: 'Click on the PR you want to review',
                hint: 'Select the pull request from the list. You can filter by open, closed, or your review status',
                points: [{ x: 0.5, y: 0.3 }]
            },
            {
                instruction: 'Click the Files changed tab',
                hint: 'This tab shows all the code changes in a diff view. You\'ll find it next to "Conversation" and "Commits"',
                points: [{ x: 0.25, y: 0.15 }]
            },
            {
                instruction: 'Review the code changes',
                hint: 'Read through the changes. Click the + icon next to any line to leave a comment. You can suggest specific code changes',
                boxes: [{ xMin: 0.2, yMin: 0.25, xMax: 0.8, yMax: 0.7 }]
            },
            {
                instruction: 'Click the Review changes button',
                hint: 'Find the green "Review changes" button in the top right of the Files changed view',
                points: [{ x: 0.85, y: 0.12 }]
            },
            {
                instruction: 'Add your review comment and choose review type',
                hint: 'Write a summary comment, then select Comment, Approve, or Request changes',
                boxes: [{ xMin: 0.6, yMin: 0.2, xMax: 0.95, yMax: 0.5 }]
            },
            {
                instruction: 'Click Submit review',
                hint: 'Your review will be posted and the PR author will be notified',
                points: [{ x: 0.85, y: 0.52 }]
            }
        ]
    },
    {
        id: 'init-repo',
        title: 'Initialize a new repository',
        topic: 'Git Basics',
        description: 'Create a new Git repository from scratch',
        isRecent: true,
        isCompleted: false,
        steps: [
            {
                instruction: 'Open Terminal and navigate to your project directory using cd < folder >',
                hint: 'Use the cd command to change directories. For example: cd ~/Documents/my-project',
                boxes: [{ xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.2 }]
            },
            {
                instruction: 'Run git init to initialize an empty repository',
                hint: 'This creates a new .git subdirectory in your project with all necessary repository files',
                boxes: [{ xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.4 }]
            },
            {
                instruction: 'Add files to staging with git add .',
                hint: 'The dot (.) adds all files. You can also specify individual files',
                boxes: [{ xMin: 0.1, yMin: 0.5, xMax: 0.9, yMax: 0.6 }]
            },
            {
                instruction: 'Create your first commit with git commit -m "Initial commit"',
                hint: 'The -m flag lets you add a commit message inline',
                boxes: [{ xMin: 0.1, yMin: 0.7, xMax: 0.9, yMax: 0.8 }]
            }
        ]
    },
    {
        id: 'clone-repo',
        title: 'Clone an existing repository',
        topic: 'Git Basics',
        steps: [
            {
                instruction: 'Find the repository URL on GitHub',
                hint: 'Click the green "Code" button and copy the HTTPS or SSH URL',
                points: [{ x: 0.85, y: 0.2 }]
            },
            {
                instruction: 'Open Terminal and navigate to where you want the repo',
                hint: 'Use cd to navigate to your desired parent directory',
                boxes: [{ xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.2 }]
            },
            {
                instruction: 'Run git clone <url>',
                hint: 'Paste the URL you copied. This creates a new directory with the repo name',
                boxes: [{ xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.4 }]
            }
        ]
    },
    {
        id: 'make-commit',
        title: 'Make a commit',
        topic: 'Git Basics',
        steps: [
            {
                instruction: 'Make changes to your files',
                hint: 'Edit, add, or delete files in your project',
                boxes: [{ xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6 }]
            },
            {
                instruction: 'Stage your changes with git add',
                hint: 'Use git add . for all changes or git add <filename> for specific files',
                boxes: [{ xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.4 }]
            },
            {
                instruction: 'Commit with git commit -m "Your message"',
                hint: 'Write a clear, concise commit message describing what changed',
                boxes: [{ xMin: 0.1, yMin: 0.5, xMax: 0.9, yMax: 0.6 }]
            }
        ]
    },
    {
        id: 'push-commits',
        title: 'Push Commits to GitHub',
        topic: 'Git Basics',
        steps: [
            {
                instruction: 'Ensure you have commits to push',
                hint: 'Run git status to see if you have commits that aren\'t on the remote',
                boxes: [{ xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.3 }]
            },
            {
                instruction: 'Run git push origin main',
                hint: 'Replace "main" with your branch name if different. You may need to authenticate',
                boxes: [{ xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.5 }]
            }
        ]
    },
    {
        id: 'onboarding',
        title: 'Onboarding',
        topic: 'Getting Started',
        isRecent: true,
        isCompleted: true,
        steps: [
            {
                instruction: 'Welcome to the platform!',
                hint: 'This is a sample completed guide'
            }
        ]
    }
]

const TOPICS = [
    {
        id: 'git-basics',
        name: 'Git Basics',
        description: 'Learn the basics of using GitHub to collaborate on code repositories.',
        icon: '▷'
    },
    {
        id: 'conflict-resolution',
        name: 'Conflict Resolution',
        icon: '▷'
    },
    {
        id: 'branching-merging',
        name: 'Branching and merging',
        icon: '▷'
    },
    {
        id: 'github-cli',
        name: 'GitHub CLI',
        icon: '▷'
    },
    {
        id: 'issues-templates',
        name: 'Issues and Templates',
        icon: '▷'
    }
]

export function Helper() {
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
                console.log('[Global Shortcut] Cmd+Enter pressed')

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

        // Show overlay for first step
        const firstStep = guide.steps[0]
        await openScreenOverlay(
            firstStep.points || [],
            firstStep.boxes || [],
            guide.steps.length,
            1,
            firstStep.instruction,
            guide.title,
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

            // Update overlay with next step
            if (overlayWindowExistsRef.current) {
                await invoke('update_screen_overlay_data', {
                    points: nextStep.points || [],
                    boxes: nextStep.boxes || [],
                    walkthrough_steps: guide.steps.length,
                    current_step: nextStepIndex + 1,
                    instruction: nextStep.instruction,
                    caption: guide.title,
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
                await invoke('update_screen_overlay_data', {
                    points: [],
                    boxes: [],
                    walkthrough_steps: guide.steps.length,
                    current_step: guide.steps.length,
                    instruction: 'Guide complete!',
                    caption: guide.title,
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

            // Update overlay
            if (overlayWindowExistsRef.current) {
                await invoke('update_screen_overlay_data', {
                    points: nextStep.points || [],
                    boxes: nextStep.boxes || [],
                    walkthrough_steps: guide.steps.length,
                    current_step: nextStepIndex + 1,
                    instruction: nextStep.instruction,
                    caption: guide.title,
                    is_complete: false
                })
            }
        }
    }

    const toggleHint = () => {
        if (!prebuiltGuideSession) return
        setPrebuiltGuideSession({
            ...prebuiltGuideSession,
            showHint: !prebuiltGuideSession.showHint
        })
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
        setStatusMessage('Analyzing...')
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

    // Render functions for different views
    const renderLandingView = () => (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50">
                <h1 className="text-3xl font-bold text-white text-center mb-2">Learn GitHub</h1>
                <p className="text-sm text-zinc-400 text-center">Type a question or choose from existing guides</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
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
        </div>
    )

    const renderTopicView = () => {
        const topic = TOPICS.find(t => t.id === selectedTopic)
        const guidesInTopic = PREBUILT_GUIDES.filter(g => g.topic === topic?.name)

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-zinc-800/50">
                    <button
                        onClick={() => setCurrentView('landing')}
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

                <ScrollArea className="flex-1">
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

    const renderActiveGuideView = () => {
        if (!prebuiltGuideSession) return null

        const { guide, currentStepIndex, completedSteps, isComplete, showHint } = prebuiltGuideSession
        const currentStep = guide.steps[currentStepIndex]
        const nextStep = currentStepIndex + 1 < guide.steps.length ? guide.steps[currentStepIndex + 1] : null
        const isCurrentStepComplete = completedSteps.has(currentStepIndex)

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with title and progress */}
                <div className="p-6 space-y-4">
                    <button
                        onClick={async () => {
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
                                progress={(currentStepIndex + 1) / guide.steps.length}
                                hasSkipped={prebuiltGuideSession.skippedSteps.size > 0}
                                size={24}
                            />
                        )}
                        <h1 className="text-2xl font-bold text-white">{guide.title}</h1>
                    </div>

                    {/* Progress dots */}
                    <div className="flex items-center justify-center">
                        {guide.steps.map((_, index) => (
                            <div key={index} className="flex items-center">
                                <div
                                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                                        index <= currentStepIndex
                                            ? 'bg-green-400'
                                            : 'bg-zinc-700'
                                    } ${
                                        index === currentStepIndex ? 'scale-125' : ''
                                    }`}
                                />
                                {/* Line connecting to next dot */}
                                {index < guide.steps.length - 1 && (
                                    <div
                                        className={`h-0.5 w-4 transition-all ${
                                            index < currentStepIndex
                                                ? 'bg-green-400'
                                                : 'bg-zinc-700'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-4">
                        {/* Current Step */}
                        <div className={`p-5 rounded-2xl border ${
                            isCurrentStepComplete
                                ? 'bg-green-900/20 border-green-700/50'
                                : 'bg-zinc-800/80 border-zinc-700/50'
                        }`}>
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-zinc-100 leading-relaxed flex-1">
                                    {currentStep.instruction}
                                </p>
                                {isCurrentStepComplete && (
                                    <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                                )}
                            </div>

                            {/* Hint section */}
                            {currentStep.hint && showHint && (
                                <div className="mt-3 pt-3 border-t border-zinc-700/50">
                                    <p className="text-xs text-zinc-400">{currentStep.hint}</p>
                                </div>
                            )}
                        </div>

                        {/* Next Step Preview */}
                        {nextStep && !isComplete && (
                            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                                <p className="text-sm text-zinc-400 leading-relaxed">{nextStep.instruction}</p>
                            </div>
                        )}

                        {/* Completion message */}
                        {isComplete && (
                            <div className="p-5 rounded-2xl bg-green-900/20 border border-green-700/50 text-center">
                                <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                <p className="text-sm text-green-300 font-semibold">Guide Complete!</p>
                                <button
                                    onClick={() => {
                                        setPrebuiltGuideSession(null)
                                        setCurrentView('landing')
                                    }}
                                    className="mt-3 text-xs text-zinc-400 hover:text-zinc-200"
                                >
                                    Return to guides
                                </button>
                            </div>
                        )}

                        {/* Hint and Skip buttons */}
                        {!isComplete && (
                            <div className="flex gap-3">
                                {currentStep.hint && (
                                    <button
                                        onClick={toggleHint}
                                        className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
                                    >
                                        {showHint ? 'Hide Hint' : 'Hint'}
                                    </button>
                                )}
                                <button
                                    onClick={skipPrebuiltStep}
                                    className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
                                >
                                    Skip
                                </button>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Proceed instruction */}
                {!isComplete && (
                    <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50">
                        <p className="text-xs text-center text-zinc-500">
                            Press <span className="text-zinc-400 font-mono">⌘+Enter</span> to proceed to next step
                        </p>
                    </div>
                )}
            </div>
        )
    }

    const renderAIChatView = () => (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50">
                <button
                    onClick={() => setCurrentView('landing')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Back</span>
                </button>
                <div className="text-center space-y-1">
                    <p className="text-sm text-zinc-400">AI-powered walkthrough</p>
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
                                                {isProcessing ? 'Processing...' : 'Proceed (⌘+Enter)'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>

            <div className="px-6 py-4 bg-zinc-900/50 backdrop-blur">
                {statusMessage && (
                    <div className="text-xs text-blue-400 mb-3">
                        {statusMessage}
                    </div>
                )}
                <div className="flex items-center gap-2 bg-zinc-800/90 rounded-full px-4 py-2.5 border border-zinc-700/50 max-w-full">
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
                        placeholder="Ask a question"
                        className="flex-1 bg-transparent text-white placeholder:text-zinc-500 border-none focus:outline-none text-sm min-w-0"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300"
                            aria-label="Add attachment"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300"
                            aria-label="Add image"
                        >
                            <Camera className="h-4 w-4" />
                        </button>
                        <button
                            className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300"
                            aria-label="Voice input"
                        >
                            <Mic className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isProcessing}
                            className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send message"
                        >
                            {isProcessing ? (
                                <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ArrowUp className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    // Conditional rendering based on current view
    return (
        <>
            {currentView === 'landing' && renderLandingView()}
            {currentView === 'topic' && renderTopicView()}
            {currentView === 'activeGuide' && renderActiveGuideView()}
            {currentView === 'aiChat' && renderAIChatView()}

            {/* Input box shown on landing view */}
            {currentView === 'landing' && (
                <div className="px-6 py-4 bg-zinc-900/50 backdrop-blur">
                    <div className="flex items-center gap-2 bg-zinc-800/90 rounded-full px-4 py-2.5 border border-zinc-700/50 max-w-full">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && input.trim()) {
                                    setCurrentView('aiChat')
                                    handleSend()
                                }
                            }}
                            placeholder="Ask a question"
                            className="flex-1 bg-transparent text-white placeholder:text-zinc-500 border-none focus:outline-none text-sm min-w-0"
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300"
                                aria-label="Add attachment"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                            <button
                                className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300"
                                aria-label="Add image"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <button
                                className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300"
                                aria-label="Voice input"
                            >
                                <Mic className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => {
                                    if (input.trim()) {
                                        setCurrentView('aiChat')
                                        handleSend()
                                    }
                                }}
                                disabled={!input.trim()}
                                className="p-1 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Send message"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
