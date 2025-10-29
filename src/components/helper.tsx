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
                caption: 'Open PR tab',
                instruction: 'Navigate to the Pull Requests (PR) tab',
                points: [{ x: 0.20, y: 0.20 }]
            },
            {
                caption: 'Pick a PR',
                instruction: 'Click on the PR you want to review.',
                observation: 'Looks like you have two open PRs here.',
                points: [{ x: 0.25, y: 0.5 }]
            },
            {
                caption: 'Open Files tab',
                instruction: 'Click the Files changed tab',
                points: [{ x: 0.42, y: 0.35 }]
            },
            {
                caption: 'Read code',
                instruction: 'At this point in a PR review, you read the code diffs (changes in the code).',
                observation: 'Looks like this is a simple change to the README file.',
                points: [{ x: 0.35, y: 0.6 }]
            },
            {
                caption: 'Review changes',
                instruction: 'Click the Review changes button',
                points: [{ x: 0.88, y: 0.39 }]
            },
            {
                caption: 'Add comment',
                instruction: 'Add your review comment and choose review type',
                points: [{ x: 0.88, y: 0.55 }]
            },
            {
                caption: 'Submit',
                instruction: 'Click Submit review',
                points: [{ x: 0.89, y: 0.83 }]
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

    // Streaming observation states
    const [streamingObservation, setStreamingObservation] = useState<string>('')
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

    // Keyboard shortcut flash notification
    const [showShortcutFlash, setShowShortcutFlash] = useState(false)

    const overlayWindowExistsRef = useRef<boolean>(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
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
        boxes: BoundingBox[] = [], // Kept for backward compatibility but always ignored
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

    // Detect intent has been disabled - only cursor points are supported
    // const handleDetectIntent = async (query: string) => {
    //     const screenshot = await takeScreenshot()
    //     setStatusMessage(`Detecting "${query}"...`)
    //     const result = await geminiService.detect(screenshot, query)

    //     setMessages(prev => [...prev, createAssistantMessage(
    //         `Detected ${result.objects.length} object(s) matching "${query}"`,
    //         screenshot,
    //         undefined,
    //         result.objects
    //     )])

    //     await openScreenOverlay([], result.objects, result.objects.length, result.objects.length)
    // }

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

        // Mocked responses for landing and guide views
        if (currentView === 'landing' || currentView === 'activeGuide') {
            setMessages(prev => [...prev, userMessage])
            setIsProcessing(true)

            // Simulate thinking delay
            await new Promise(resolve => setTimeout(resolve, 800))

            let mockResponse = ''
            if (currentView === 'landing') {
                mockResponse = "I can help you get started! Try selecting one of the guides above, or ask me a specific question about GitHub workflows."
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
                            {messages.map((message, index) => (
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

            {/* Chat input at bottom - identical to guide view */}
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

    const renderActiveGuideView = () => {
        if (!prebuiltGuideSession) return null

        const { guide, currentStepIndex, isComplete } = prebuiltGuideSession

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with title and progress */}
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

                <ScrollArea className="flex-1 h-0">
                    <div ref={scrollRef} className="p-6 space-y-4">
                        {/* Chat messages */}
                        {messages.length > 0 && (
                            <div className="space-y-3 mb-6">
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
                                                    {/* Show streaming text if this message is currently streaming */}
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

                                            {/* Proceed and Skip buttons below last message */}
                                            {isLastMessage && !isComplete && (
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
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Completion message */}
                        {isComplete && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl p-3.5 shadow-lg bg-green-900/20 border border-green-700/50 text-center">
                            <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                <p className="text-sm text-green-300 font-semibold">Guide Complete!</p>
                        
                            </div>
                        </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Chat input at bottom - identical to AI chat */}
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
    }

    const renderAIChatView = () => (
        <div className="flex-1 flex flex-col overflow-hidden">
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
