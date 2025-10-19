import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { Point, BoundingBox } from '@/services/vision'

interface OverlayData {
    points: Point[]
    boxes: BoundingBox[]
    walkthroughSteps?: number
    currentStep?: number
    instruction?: string
    isComplete?: boolean
}

export function ScreenOverlay() {
    const [data, setData] = useState<OverlayData | null>(null)
    const [previousData, setPreviousData] = useState<OverlayData | null>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)

    useEffect(() => {
        console.log('ScreenOverlay mounted, setting up listener')

        // Listen for the overlay data
        const setupListener = async () => {
            try {
                const unlisten = await listen<OverlayData>('overlay-data', (event) => {
                    console.log('Received overlay-data event:', event.payload)
                    console.log('  - Points:', event.payload.points?.length || 0)
                    console.log('  - Boxes:', event.payload.boxes?.length || 0)
                    console.log('  - Current step:', event.payload.currentStep)
                    console.log('  - Instruction:', event.payload.instruction)

                    // Trigger fade transition using functional setState
                    setData(prevData => {
                        if (prevData && prevData.currentStep !== event.payload.currentStep) {
                            console.log('Setting previous data for transition')
                            setPreviousData(prevData)
                            setIsTransitioning(true)
                            // Clear transition state after animation completes
                            setTimeout(() => {
                                console.log('Clearing transition state')
                                setIsTransitioning(false)
                                setPreviousData(null)
                            }, 600) // Match CSS transition duration
                        } else {
                            console.log('First step, no transition')
                        }
                        return event.payload
                    })
                })

                // Signal that we're ready to receive data
                console.log('Emitting overlay-ready event')
                const window = getCurrentWindow()
                console.log('Current window:', window)
                await window.emit('overlay-ready', {})
                console.log('overlay-ready event emitted')

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
        return (
            <div className="fixed inset-0 pointer-events-none">
                <div className="fixed bottom-4 left-4 text-red-400 text-xs bg-black/50 px-3 py-2 rounded font-mono">
                    Waiting for overlay data...
                </div>
            </div>
        )
    }

    // Determine if this is a walkthrough
    const isWalkthrough = data.walkthroughSteps && data.walkthroughSteps > 1

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Render previous step (dimmed ghost) */}
            {previousData && (
                <>
                    {previousData.points.map((point, idx) => (
                        <div
                            key={`prev-point-${idx}`}
                            className="absolute w-6 h-6 rounded-full bg-red-500 border-3 border-white shadow-2xl transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 opacity-30"
                            style={{
                                left: `${point.x * 100}%`,
                                top: `${point.y * 100}%`,
                                zIndex: 8900,
                            }}
                        />
                    ))}
                    {previousData.boxes.map((box, idx) => (
                        <div
                            key={`prev-box-${idx}`}
                            className="absolute border-4 border-green-500 bg-green-500/5 shadow-2xl transition-opacity duration-500 opacity-30"
                            style={{
                                left: `${box.x_min * 100}%`,
                                top: `${box.y_min * 100}%`,
                                width: `${(box.x_max - box.x_min) * 100}%`,
                                height: `${(box.y_max - box.y_min) * 100}%`,
                                zIndex: 8900,
                            }}
                        />
                    ))}
                </>
            )}

            {/* Render current step (highlighted with fade-in) */}
            {data.points.map((point, idx) => (
                <div
                    key={`point-${idx}`}
                    className={`absolute w-8 h-8 rounded-full bg-red-500 border-4 border-white shadow-2xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse scale-110 transition-all duration-500 ${
                        isTransitioning ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                        left: `${point.x * 100}%`,
                        top: `${point.y * 100}%`,
                        zIndex: 9000,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                >
                    {/* Pulsing rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="absolute inset-0 rounded-full border border-red-400 opacity-30" />
                </div>
            ))}

            {/* Render current boxes (highlighted with fade-in) */}
            {data.boxes.map((box, idx) => (
                <div
                    key={`box-${idx}`}
                    className={`absolute border-4 border-green-400 bg-green-400/15 shadow-2xl scale-105 transition-all duration-500 ${
                        isTransitioning ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                        left: `${box.x_min * 100}%`,
                        top: `${box.y_min * 100}%`,
                        width: `${(box.x_max - box.x_min) * 100}%`,
                        height: `${(box.y_max - box.y_min) * 100}%`,
                        zIndex: 9000,
                    }}
                >
                    {/* Pulsing border */}
                    <div
                        className="absolute inset-0 border-2 border-green-300 animate-pulse"
                        style={{ animationDuration: '1.5s' }}
                    />
                </div>
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
