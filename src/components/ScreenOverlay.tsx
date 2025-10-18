import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { Point, BoundingBox } from '@/services/vision'

interface OverlayData {
    points: Point[]
    boxes: BoundingBox[]
    walkthroughSteps?: number
    currentStep?: number
}

export function ScreenOverlay() {
    const [data, setData] = useState<OverlayData | null>(null)

    useEffect(() => {
        console.log('ScreenOverlay mounted, setting up listener')

        // Listen for the overlay data
        const setupListener = async () => {
            try {
                const unlisten = await listen<OverlayData>('overlay-data', (event) => {
                    console.log('Received overlay-data event:', event.payload)
                    setData(event.payload)
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

        // Handle ESC key to close
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

    // Determine if this is a walkthrough with multiple steps
    const isWalkthrough = data.walkthroughSteps && data.walkthroughSteps > 1
    const currentStep = data.currentStep ?? 1

    // Filter points and boxes based on walkthrough step (progressive reveal)
    const visiblePoints = isWalkthrough
        ? data.points.filter((_, idx) => idx + 1 <= currentStep)
        : data.points

    const visibleBoxes = isWalkthrough
        ? data.boxes.filter((_, idx) => idx + 1 <= currentStep)
        : data.boxes

    // Points that are completed (before current step)
    const completedPointCount = isWalkthrough ? Math.max(0, currentStep - 1) : 0
    const completedBoxCount = isWalkthrough ? Math.max(0, currentStep - 1) : 0

    return (
        <div className="fixed inset-0 pointer-events-none">
            {/* Render points */}
            {visiblePoints.map((point, idx) => {
                const globalIdx = idx
                const isCompleted = isWalkthrough && globalIdx < completedPointCount
                const isCurrent = isWalkthrough && globalIdx === completedPointCount

                return (
                    <div
                        key={`point-${idx}`}
                        className={`absolute w-6 h-6 rounded-full shadow-2xl transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                            isCurrent
                                ? 'bg-red-500 border-3 border-white animate-pulse scale-125'
                                : isCompleted
                                ? 'bg-red-500 border-3 border-white opacity-40'
                                : 'bg-red-500 border-3 border-white'
                        }`}
                        style={{
                            left: `${point.x * 100}%`,
                            top: `${point.y * 100}%`,
                            zIndex: 9000 + (isCurrent ? 100 : 0),
                        }}
                    >
                        {/* Number label */}
                        <div
                            className={`absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white font-bold px-3 py-2 rounded whitespace-nowrap shadow-2xl transition-all duration-300 ${
                                isCurrent ? 'text-lg scale-110' : 'text-sm'
                            } ${isCompleted ? 'opacity-40' : ''}`}
                        >
                            Step {globalIdx + 1}
                        </div>

                        {/* Outer pulsing ring for current step */}
                        {isCurrent && (
                            <>
                                <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" style={{ animationDuration: '1.5s' }} />
                                <div className="absolute inset-0 rounded-full border border-red-400 opacity-30" />
                            </>
                        )}
                    </div>
                )
            })}

            {/* Render boxes */}
            {visibleBoxes.map((box, idx) => {
                const globalIdx = idx
                const isCompleted = isWalkthrough && globalIdx < completedBoxCount
                const isCurrent = isWalkthrough && globalIdx === completedBoxCount

                return (
                    <div
                        key={`box-${idx}`}
                        className={`absolute border-4 shadow-2xl transition-all duration-300 ${
                            isCurrent
                                ? 'border-green-400 bg-green-400/15 scale-105'
                                : isCompleted
                                ? 'border-green-500 bg-green-500/5 opacity-40'
                                : 'border-green-500 bg-green-500/10'
                        }`}
                        style={{
                            left: `${box.x_min * 100}%`,
                            top: `${box.y_min * 100}%`,
                            width: `${(box.x_max - box.x_min) * 100}%`,
                            height: `${(box.y_max - box.y_min) * 100}%`,
                            zIndex: 9000 + (isCurrent ? 100 : 0),
                        }}
                    >
                        {/* Label for box */}
                        <div
                            className={`absolute -top-10 left-0 bg-green-500 text-white font-bold px-3 py-2 rounded shadow-2xl transition-all duration-300 ${
                                isCurrent ? 'text-base scale-110' : 'text-sm'
                            } ${isCompleted ? 'opacity-40' : ''}`}
                        >
                            Step {globalIdx + 1}
                        </div>

                        {/* Pulsing border for current step */}
                        {isCurrent && (
                            <div
                                className="absolute inset-0 border-2 border-green-300 animate-pulse"
                                style={{ animationDuration: '1.5s' }}
                            />
                        )}
                    </div>
                )
            })}

            {/* Step counter in top-left for walkthroughs */}
            {isWalkthrough && (
                <div className="fixed top-8 left-8 bg-black/70 backdrop-blur text-white px-6 py-4 rounded-lg shadow-2xl font-semibold text-lg pointer-events-auto border-2 border-purple-500/50">
                    <div className="text-purple-300">Step {currentStep} of {data.walkthroughSteps}</div>
                    <div className="text-xs text-gray-400 mt-1">Press ESC to close</div>
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
