import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import type { Point, CaptionPosition } from '@/types/guide'

interface OverlayData {
    points: Point[]
    walkthroughSteps?: number
    currentStep?: number
    instruction?: string
    caption?: string
    captionPosition?: CaptionPosition
    isComplete?: boolean
}

/**
 * Get Tailwind CSS classes for caption positioning based on the specified direction
 * @param position - The desired position of the caption relative to the cursor
 * @returns CSS classes for positioning the caption
 */
function getCaptionPositionClasses(position: CaptionPosition = 'down-right'): string {
    const baseClasses = 'absolute bg-red-500 text-white text-sm px-3 py-1 rounded whitespace-nowrap font-medium'

    // All positions relative to cursor tip at top-left (0, 0) of the container
    const positionClasses: Record<CaptionPosition, string> = {
        'up': 'bottom-full mb-4 left-0',
        'up-right': 'bottom-full mb-4 left-6',
        'right': 'top-0 left-full ml-6',
        'down-right': 'top-6 left-6',
        'down': 'top-full mt-4 left-0',
        'down-left': 'top-6 right-full mr-6',
        'left': 'top-0 right-full mr-6',
        'up-left': 'bottom-full mb-4 right-6',
    }

    return `${baseClasses} ${positionClasses[position]}`
}

// Reusable component for rendering overlay points
function OverlayPoint({
    point,
    index,
    caption,
    captionPosition = 'down-right'
}: {
    point: Point
    index: number
    caption?: string
    captionPosition?: CaptionPosition
}) {
    return (
        <div
            key={`point-${index}`}
            className="absolute w-20 h-20 opacity-100 transition-all duration-500"
            style={{
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                zIndex: 9000,
            }}
        >
            {/* Polygon cursor icon */}
            <img
                src="/polygon-cursor.png"
                alt="Cursor"
                className="absolute top-0 left-0"
                style={{ width: '30%', height: '30%' }}
            />

            {caption && (
                <div className={getCaptionPositionClasses(captionPosition)}>
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
                    // DEBUG: Log captionPosition received from Tauri
                    console.log('[ScreenOverlay] Received captionPosition:', event.payload.captionPosition, 'Full payload:', event.payload)
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
        <div 
            className="fixed inset-0 pointer-events-none"
            style={{
                backgroundColor: 'transparent',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
            }}
        >
            {/* Render current step */}
            {data.points.map((point, idx) => (
                <OverlayPoint
                    key={`point-${idx}`}
                    point={point}
                    index={idx}
                    caption={data.caption}
                    captionPosition={data.captionPosition ?? 'down-right'}
                />
            ))}

            {/* Step counter and instruction for walkthroughs */}
            {isWalkthrough && (
                <div className={`fixed top-8 left-8 bg-black/80 backdrop-blur text-white px-6 py-4 rounded-lg pointer-events-auto border-2 max-w-md transition-all duration-500 ${
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

        </div>
    )
}
