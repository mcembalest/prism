import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, Terminal, ArrowLeft, Check, Circle, CheckCircle2, Code, BookOpenCheck } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

// Mock data types
interface Step {
    id: string
    title: string
    description: string
    content: string
    tips?: string[]
}

interface Tutorial {
    id: string
    name: string
    description: string
    icon: 'code' | 'terminal'
    steps: Step[]
}

interface Course {
    id: string
    name: string
    description: string
    icon: JSX.Element
    tutorials: Tutorial[]
}

// Mock data
const mockCourses: Course[] = [
    {
        id: 'github-fundamentals',
        name: 'GitHub Fundamentals',
        description: 'Master GitHub UI and CLI through hands-on practice',
        icon: <GraduationCap className="h-6 w-6" />,
        tutorials: [
            {
                id: 'github-ui-basics',
                name: 'GitHub UI Basics',
                description: 'Learn to navigate and use the GitHub web interface',
                icon: 'code',
                steps: [
                    {
                        id: 'ui-1',
                        title: 'Understanding the Interface',
                        description: 'Get familiar with GitHub\'s web interface',
                        content: 'The GitHub interface consists of several key areas: the navigation bar at the top, the sidebar for repository navigation, and the main content area. Take a moment to explore each section.',
                        tips: [
                            'Use the search bar to quickly find repositories',
                            'The profile icon in the top-right gives access to settings',
                            'Star repositories to bookmark them for later'
                        ]
                    },
                    {
                        id: 'ui-2',
                        title: 'Creating a Repository',
                        description: 'Create your first GitHub repository',
                        content: 'Click the "+" icon in the top-right corner and select "New repository". Give it a name, add a description, and choose whether to make it public or private.',
                        tips: [
                            'Initialize with a README for quick setup',
                            'Add a .gitignore file for your project type',
                            'Choose a license to specify usage rights'
                        ]
                    },
                    {
                        id: 'ui-3',
                        title: 'Managing Issues',
                        description: 'Track bugs and feature requests with Issues',
                        content: 'Issues are GitHub\'s way of tracking tasks, bugs, and feature requests. Navigate to the Issues tab and click "New issue" to create one.',
                        tips: [
                            'Use labels to categorize issues',
                            'Assign issues to team members',
                            'Link issues to pull requests'
                        ]
                    },
                    {
                        id: 'ui-4',
                        title: 'Pull Request Workflow',
                        description: 'Learn to create and review pull requests',
                        content: 'Pull requests let you tell others about changes you\'ve pushed. Click the "Pull requests" tab and "New pull request" to start.',
                        tips: [
                            'Write clear PR descriptions',
                            'Request reviews from team members',
                            'Check the "Files changed" tab before merging'
                        ]
                    },
                    {
                        id: 'ui-5',
                        title: 'Exploring Code',
                        description: 'Navigate and search through code',
                        content: 'Use the file browser to explore repository contents. Press "t" to quickly search for files, or use the search bar for code search.',
                        tips: [
                            'Press "." to open the web-based VS Code editor',
                            'Use blame view to see who changed each line',
                            'View file history to track changes over time'
                        ]
                    },
                    {
                        id: 'ui-6',
                        title: 'Working with Branches',
                        description: 'Create and manage branches in the UI',
                        content: 'Branches let you develop features in isolation. Use the branch dropdown to create new branches or switch between existing ones.',
                        tips: [
                            'Name branches descriptively (e.g., feature/new-login)',
                            'Keep branches focused on single features',
                            'Delete branches after merging to keep things clean'
                        ]
                    },
                    {
                        id: 'ui-7',
                        title: 'Repository Settings',
                        description: 'Configure repository options and collaborators',
                        content: 'The Settings tab lets you configure collaborators, webhooks, branch protection, and more. Explore the different sections to understand what\'s available.',
                        tips: [
                            'Add collaborators under "Manage access"',
                            'Set up branch protection rules for main branches',
                            'Configure GitHub Actions for CI/CD'
                        ]
                    }
                ]
            },
            {
                id: 'github-cli-mastery',
                name: 'GitHub CLI Mastery',
                description: 'Master the gh command-line tool',
                icon: 'terminal',
                steps: [
                    {
                        id: 'cli-1',
                        title: 'Installing GitHub CLI',
                        description: 'Set up gh on your system',
                        content: 'Install gh using your package manager: brew install gh (macOS), apt install gh (Ubuntu), or download from github.com/cli/cli',
                        tips: [
                            'Run `gh --version` to verify installation',
                            'Update regularly with `brew upgrade gh`',
                            'Check the official docs for Windows installation'
                        ]
                    },
                    {
                        id: 'cli-2',
                        title: 'Authentication',
                        description: 'Connect gh to your GitHub account',
                        content: 'Run `gh auth login` and follow the prompts. You can authenticate via browser or with a personal access token.',
                        tips: [
                            'Choose HTTPS for simpler setup',
                            'Use SSH if you already have keys configured',
                            'Run `gh auth status` to check authentication'
                        ]
                    },
                    {
                        id: 'cli-3',
                        title: 'Repository Operations',
                        description: 'Clone, create, and manage repositories',
                        content: 'Use `gh repo clone owner/repo` to clone, `gh repo create` to create new repos, and `gh repo view` to see repository details.',
                        tips: [
                            '`gh repo view` opens the repo in your browser',
                            'Add `--web` flag to many commands to open in browser',
                            'Use `gh repo list` to see your repositories'
                        ]
                    },
                    {
                        id: 'cli-4',
                        title: 'PR Management from Terminal',
                        description: 'Create and review PRs without leaving the terminal',
                        content: 'Use `gh pr create` to create PRs, `gh pr list` to view them, and `gh pr checkout` to check out a PR locally.',
                        tips: [
                            '`gh pr create --web` opens the web form',
                            '`gh pr view` shows PR details in terminal',
                            '`gh pr merge` merges PRs from command line'
                        ]
                    },
                    {
                        id: 'cli-5',
                        title: 'Working with Issues',
                        description: 'Manage issues from the command line',
                        content: 'Create issues with `gh issue create`, list them with `gh issue list`, and view details with `gh issue view [number]`.',
                        tips: [
                            'Use `gh issue status` for your assigned issues',
                            'Add labels with `--label` flag',
                            '`gh issue close` to close issues'
                        ]
                    },
                    {
                        id: 'cli-6',
                        title: 'Advanced Workflows',
                        description: 'Combine gh with other CLI tools',
                        content: 'Use gh output with jq for JSON parsing, create aliases for common workflows, and integrate with your shell scripts.',
                        tips: [
                            'Create aliases in `~/.config/gh/config.yml`',
                            'Use `gh api` for direct API calls',
                            'Combine with git commands for powerful workflows'
                        ]
                    }
                ]
            }
        ]
    }
]

// Progress tracking components
function RadialProgress({ current, total }: { current: number; total: number }) {
    const percentage = total > 0 ? current / total : 0
    const radius = 20
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage * circumference)

    // Color interpolation from orange to teal
    const orangeColor = { r: 255, g: 140, b: 66 }
    const tealColor = { r: 78, g: 201, b: 176 }
    const r = Math.round(orangeColor.r + (tealColor.r - orangeColor.r) * percentage)
    const g = Math.round(orangeColor.g + (tealColor.g - orangeColor.g) * percentage)
    const b = Math.round(orangeColor.b + (tealColor.b - orangeColor.b) * percentage)

    return (
        <div className="relative w-20 h-20">
            <svg width="80" height="80" className="transform -rotate-90">
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="rgb(63 63 70)"
                    strokeWidth="4"
                />
                <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={`rgb(${r}, ${g}, ${b})`}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{current}/{total}</span>
            </div>
        </div>
    )
}

function ProgressDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex gap-2 items-center justify-center flex-wrap">
            {Array.from({ length: total }).map((_, idx) => {
                const isCompleted = idx < current
                const isCurrent = idx === current

                return (
                    <div
                        key={idx}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isCompleted
                                ? 'bg-[#4ec9b0]'
                                : isCurrent
                                ? 'bg-[#ff8c42] shadow-lg shadow-orange-500/50'
                                : 'bg-zinc-700'
                        }`}
                    />
                )
            })}
        </div>
    )
}

// Main component
export function Learning() {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
    const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

    // Navigation handlers
    const handleSelectCourse = (course: Course) => {
        setSelectedCourse(course)
        setSelectedTutorial(null)
        setCurrentStepIndex(0)
    }

    const handleSelectTutorial = (tutorial: Tutorial) => {
        setSelectedTutorial(tutorial)
        setCurrentStepIndex(0)
    }

    const handleBackToCourses = () => {
        setSelectedCourse(null)
        setSelectedTutorial(null)
        setCurrentStepIndex(0)
    }

    const handleBackToTutorials = () => {
        setSelectedTutorial(null)
        setCurrentStepIndex(0)
    }

    const handleNextStep = () => {
        if (selectedTutorial && currentStepIndex < selectedTutorial.steps.length - 1) {
            const currentStep = selectedTutorial.steps[currentStepIndex]
            setCompletedSteps(prev => new Set([...prev, currentStep.id]))
            setCurrentStepIndex(currentStepIndex + 1)
        }
    }

    const handleCompleteLesson = () => {
        if (selectedTutorial) {
            const currentStep = selectedTutorial.steps[currentStepIndex]
            setCompletedSteps(prev => new Set([...prev, currentStep.id]))
            handleBackToTutorials()
        }
    }

    const handleOpenSkillGraph = async () => {
        try {
            await invoke('open_skill_graph_viewer')
        } catch (error) {
            console.error('Failed to open skill graph viewer:', error)
        }
    }

    // View: Course list
    if (!selectedCourse) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-6">
                        <div className="text-center space-y-3 mb-8">
                            <h1 className="text-2xl font-bold text-white">Learn Mode</h1>
                            <p className="text-sm text-zinc-400">Interactive tutorials and courses</p>
                        </div>

                        <div className="max-w-md mx-auto mb-4">
                            <Button
                                onClick={handleOpenSkillGraph}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 rounded-xl py-6"
                            >
                                <BookOpenCheck className="h-5 w-5 mr-2" />
                                <span className="text-base font-semibold">Open Skill Graph Explorer</span>
                            </Button>
                        </div>

                        <div className="space-y-4 max-w-md mx-auto">
                            {mockCourses.map(course => {
                                const totalSteps = course.tutorials.reduce((sum, t) => sum + t.steps.length, 0)
                                const completedCount = course.tutorials.reduce(
                                    (sum, t) => sum + t.steps.filter(s => completedSteps.has(s.id)).length,
                                    0
                                )

                                return (
                                    <button
                                        key={course.id}
                                        onClick={() => handleSelectCourse(course)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-all text-left group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600/30 transition-all">
                                                <div className="text-purple-400">
                                                    {course.icon}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-semibold text-white mb-1">{course.name}</h3>
                                                <p className="text-xs text-zinc-400 mb-3">{course.description}</p>
                                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                    <span>{course.tutorials.length} tutorials</span>
                                                    <span>•</span>
                                                    <span>{totalSteps} steps</span>
                                                    {completedCount > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-[#4ec9b0]">{completedCount}/{totalSteps} completed</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        )
    }

    // View: Tutorial list (within selected course)
    if (selectedCourse && !selectedTutorial) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToCourses}
                                className="text-zinc-400 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                        </div>

                        <div className="text-center space-y-3 mb-8">
                            <h1 className="text-2xl font-bold text-white">{selectedCourse.name}</h1>
                            <p className="text-sm text-zinc-400">{selectedCourse.description}</p>
                        </div>

                        <div className="space-y-4 max-w-md mx-auto">
                            {selectedCourse.tutorials.map(tutorial => {
                                const completedCount = tutorial.steps.filter(s => completedSteps.has(s.id)).length
                                const isCompleted = completedCount === tutorial.steps.length
                                const inProgress = completedCount > 0 && !isCompleted

                                return (
                                    <button
                                        key={tutorial.id}
                                        onClick={() => handleSelectTutorial(tutorial)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-all text-left group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                                isCompleted
                                                    ? 'bg-[#4ec9b0]/20 group-hover:bg-[#4ec9b0]/30'
                                                    : inProgress
                                                    ? 'bg-[#ff8c42]/20 group-hover:bg-[#ff8c42]/30'
                                                    : 'bg-purple-600/20 group-hover:bg-purple-600/30'
                                            }`}>
                                                {tutorial.icon === 'terminal' ? (
                                                    <Terminal className={`h-6 w-6 ${
                                                        isCompleted
                                                            ? 'text-[#4ec9b0]'
                                                            : inProgress
                                                            ? 'text-[#ff8c42]'
                                                            : 'text-purple-400'
                                                    }`} />
                                                ) : (
                                                    <Code className={`h-6 w-6 ${
                                                        isCompleted
                                                            ? 'text-[#4ec9b0]'
                                                            : inProgress
                                                            ? 'text-[#ff8c42]'
                                                            : 'text-purple-400'
                                                    }`} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-base font-semibold text-white">{tutorial.name}</h3>
                                                    {isCompleted && <CheckCircle2 className="h-4 w-4 text-[#4ec9b0]" />}
                                                </div>
                                                <p className="text-xs text-zinc-400 mb-3">{tutorial.description}</p>
                                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                    <span>{tutorial.steps.length} steps</span>
                                                    {completedCount > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className={isCompleted ? 'text-[#4ec9b0]' : 'text-[#ff8c42]'}>
                                                                {completedCount}/{tutorial.steps.length} completed
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        )
    }

    // View: Interactive lesson (within selected tutorial)
    if (selectedTutorial) {
        const currentStep = selectedTutorial.steps[currentStepIndex]
        const isLastStep = currentStepIndex === selectedTutorial.steps.length - 1
        const completedCount = selectedTutorial.steps.filter(s => completedSteps.has(s.id)).length

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-6">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToTutorials}
                                className="text-zinc-400 hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                        </div>

                        {/* Progress Header */}
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <RadialProgress current={completedCount} total={selectedTutorial.steps.length} />
                            <div className="text-center">
                                <h2 className="text-lg font-semibold text-white mb-1">{selectedTutorial.name}</h2>
                                <p className="text-xs text-zinc-400">Step {currentStepIndex + 1} of {selectedTutorial.steps.length}</p>
                            </div>
                            <ProgressDots current={currentStepIndex} total={selectedTutorial.steps.length} />
                        </div>

                        {/* Current Step Content */}
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Circle className="h-4 w-4 text-[#ff8c42]" fill="currentColor" />
                                        <h3 className="text-lg font-semibold text-white">{currentStep.title}</h3>
                                    </div>
                                    <p className="text-sm text-zinc-400">{currentStep.description}</p>
                                </div>

                                <div className="border-t border-zinc-700/50 pt-4">
                                    <p className="text-sm text-zinc-300 leading-relaxed">{currentStep.content}</p>
                                </div>

                                {currentStep.tips && currentStep.tips.length > 0 && (
                                    <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                                            <BookOpen className="h-4 w-4" />
                                            <span className="text-xs font-semibold uppercase">Tips</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {currentStep.tips.map((tip, idx) => (
                                                <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                                                    <Check className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex gap-3">
                                {!isLastStep ? (
                                    <Button
                                        onClick={handleNextStep}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/20 rounded-xl"
                                    >
                                        Next Step
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleCompleteLesson}
                                        className="flex-1 bg-gradient-to-r from-[#4ec9b0] to-[#3da891] hover:from-[#3da891] hover:to-[#2d9379] text-white shadow-lg shadow-teal-500/20 rounded-xl"
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Complete Tutorial
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        )
    }

    return null
}
