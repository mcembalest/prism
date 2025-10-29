import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import type { Point } from '@/types/walkthrough'

interface OverlayData {
    points: Point[]
    walkthroughSteps?: number
    currentStep?: number
    instruction?: string
    caption?: string
    isComplete?: boolean
}

// Reusable component for rendering overlay points
function OverlayPoint({ point, index, isPrevious, caption }: { point: Point; index: number; isPrevious?: boolean; caption?: string }) {
    const baseClasses = "absolute shadow-2xl"
    const sizeClasses = isPrevious ? "w-6 h-8" : "w-8 h-10"
    const opacityClass = isPrevious ? "opacity-30" : "opacity-100 transition-all duration-500"

    return (
        <div
            key={`${isPrevious ? 'prev-' : ''}point-${index}`}
            className={`${baseClasses} ${sizeClasses} ${opacityClass}`}
            style={{
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                zIndex: isPrevious ? 8900 : 9000,
            }}
        >
            {/* 2x smaller, much narrower and slightly shorter Cursor SVG Icon */}
            <svg
                viewBox="0 0 10 14"
                fill="none"
                className="w-full h-full drop-shadow-lg"
                style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.4))', width: '50%', height: '50%' }}
            >
                <path
                    d="M2.5 1.0V11.5L5 8.0L7 12.2L8.6 11.7L6 7.5L10 6.7L2.5 1Z"
                    fill="#EF4444"
                    stroke="white"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                />
            </svg>

            {!isPrevious && caption && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-sm px-3 py-1 rounded shadow-lg whitespace-nowrap font-medium">
                    {caption}
                </div>
            )}
        </div>
    )
}


export function ScreenOverlay() {
    const [data, setData] = useState<OverlayData | null>(null)

    useEffect(() => {
        // Listen for the overlay data
        const setupListener = async () => {
            try {
                const unlisten = await listen<OverlayData>('overlay-data', (event) => {
                    setData(event.payload)
                })

                // Signal that we're ready to receive data
                const window = getCurrentWindow()
                await window.emit('overlay-ready', {})

                return unlisten
            } catch (error) {
                console.error('Error setting up overlay listener:', error)
                throw error
            }
        }

        const unlistenPromise = setupListener()

        // Handle ESC key to close overlay
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                getCurrentWindow().close()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            unlistenPromise.then(fn => fn())
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    if (!data) {
        return null // Wait for data to arrive
    }

    // Determine if this is a walkthrough
    const isWalkthrough = data.walkthroughSteps && data.walkthroughSteps > 1

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Render current step */}
            {data.points.map((point, idx) => (
                <OverlayPoint key={`point-${idx}`} point={point} index={idx} caption={data.caption} />
            ))}

            {/* Step counter and instruction for walkthroughs */}
            {isWalkthrough && (
                <div className={`fixed top-8 left-8 bg-black/80 backdrop-blur text-white px-6 py-4 rounded-lg shadow-2xl pointer-events-auto border-2 max-w-md transition-all duration-500 ${
                    data.isComplete ? 'border-green-500/70 bg-green-900/40' : 'border-purple-500/50'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        {data.isComplete ? (
                            <div className="flex items-center gap-2 text-green-400 font-bold text-xl animate-pulse">
                                <span className="text-3xl">✓</span>
                                <span>Walkthrough Complete!</span>
                            </div>
                        ) : (
                            <div className="text-purple-300 font-semibold text-lg">
                                Step {data.currentStep} of {data.walkthroughSteps}
                            </div>
                        )}
                    </div>
                    {data.instruction && (
                        <div className="text-white text-base mb-3 leading-relaxed">
                            {data.instruction}
                        </div>
                    )}
                    <div className="text-xs text-gray-400 space-y-1">
                        {!data.isComplete && (
                            <div>Click "Proceed" in the chat to continue (or press <kbd>⌘+Enter</kbd>)</div>
                        )}
                        <div>ESC to close</div>
                    </div>
                </div>
            )}

            {/* ESC hint (non-walkthrough) */}
            {!isWalkthrough && (
                <div className="fixed bottom-8 left-8 bg-black/70 backdrop-blur text-white px-4 py-2 rounded text-xs text-gray-400 pointer-events-auto border border-gray-600/50">
                    Press ESC to close
                </div>
            )}
        </div>
    )
}
