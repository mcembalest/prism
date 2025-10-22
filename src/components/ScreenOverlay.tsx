import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import type { Point, BoundingBox } from '@/types/walkthrough'

interface OverlayData {
    points: Point[]
    boxes: BoundingBox[]
    walkthroughSteps?: number
    currentStep?: number
    instruction?: string
    caption?: string
    isComplete?: boolean
}

// Reusable component for rendering overlay points
function OverlayPoint({ point, index, isPrevious, caption }: { point: Point; index: number; isPrevious?: boolean; caption?: string }) {
    const baseClasses = "absolute rounded-full bg-red-500 border-white shadow-2xl transform -translate-x-1/2 -translate-y-1/2"
    const sizeClasses = isPrevious ? "w-6 h-6 border-3" : "w-8 h-8 border-4 animate-pulse scale-110"
    const opacityClass = isPrevious ? "opacity-30" : "opacity-100 transition-all duration-500"

    return (
        <div
            key={`${isPrevious ? 'prev-' : ''}point-${index}`}
            className={`${baseClasses} ${sizeClasses} ${opacityClass}`}
            style={{
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                zIndex: isPrevious ? 8900 : 9000,
                animation: isPrevious ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
        >
            {!isPrevious && (
                <>
                    <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="absolute inset-0 rounded-full border border-red-400 opacity-30" />
                    {caption && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-sm px-3 py-1 rounded shadow-lg whitespace-nowrap font-medium">
                            {caption}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// Reusable component for rendering overlay boxes
function OverlayBox({ box, index, isPrevious, caption }: { box: BoundingBox; index: number; isPrevious?: boolean; caption?: string }) {
    const baseClasses = "absolute border-green-500 shadow-2xl"
    const sizeClasses = isPrevious ? "border-4 bg-green-500/5" : "border-4 bg-green-400/15 scale-105"
    const opacityClass = isPrevious ? "opacity-30" : "opacity-100 transition-all duration-500"

    return (
        <div
            key={`${isPrevious ? 'prev-' : ''}box-${index}`}
            className={`${baseClasses} ${sizeClasses} ${opacityClass}`}
            style={{
                left: `${box.xMin * 100}%`,
                top: `${box.yMin * 100}%`,
                width: `${(box.xMax - box.xMin) * 100}%`,
                height: `${(box.yMax - box.yMin) * 100}%`,
                zIndex: isPrevious ? 8900 : 9000,
            }}
        >
            {!isPrevious && (
                <>
                    <div className="absolute inset-0 border-2 border-green-300 animate-pulse" style={{ animationDuration: '1.5s' }} />
                    {caption && (
                        <div className="absolute -top-8 left-0 bg-green-500 text-white text-sm px-3 py-1 rounded shadow-lg whitespace-nowrap font-medium">
                            {caption}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export function ScreenOverlay() {
    const [data, setData] = useState<OverlayData | null>(null)
    const [previousData, setPreviousData] = useState<OverlayData | null>(null)

    useEffect(() => {
        // Listen for the overlay data
        const setupListener = async () => {
            try {
                const unlisten = await listen<OverlayData>('overlay-data', (event) => {
                    setData(prevData => {
                        // Show previous step briefly for transition effect
                        if (prevData && prevData.currentStep !== event.payload.currentStep) {
                            setPreviousData(prevData)
                            setTimeout(() => setPreviousData(null), 600)
                        }
                        return event.payload
                    })
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
            {/* Render previous step (dimmed ghost) */}
            {previousData && (
                <>
                    {previousData.points.map((point, idx) => (
                        <OverlayPoint key={`prev-point-${idx}`} point={point} index={idx} isPrevious />
                    ))}
                    {previousData.boxes.map((box, idx) => (
                        <OverlayBox key={`prev-box-${idx}`} box={box} index={idx} isPrevious />
                    ))}
                </>
            )}

            {/* Render current step (highlighted with fade-in) */}
            {data.points.map((point, idx) => (
                <OverlayPoint key={`point-${idx}`} point={point} index={idx} caption={data.caption} />
            ))}

            {data.boxes.map((box, idx) => (
                <OverlayBox key={`box-${idx}`} box={box} index={idx} caption={data.caption} />
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
                            <div>Click "Proceed" in the chat to continue</div>
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
