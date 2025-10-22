import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import type { Point, BoundingBox } from '@/types/coordinates'

interface FullscreenData {
    image: string
    points: Point[]
    boxes: BoundingBox[]
    caption?: string
}

export function FullscreenViewer() {
    const [data, setData] = useState<FullscreenData | null>(null)

    useEffect(() => {
        console.log('FullscreenViewer mounted, setting up listener')

        // Listen for the fullscreen data
        const setupListener = async () => {
            const unlisten = await listen<FullscreenData>('fullscreen-data', (event) => {
                console.log('Received fullscreen-data event:', event.payload)
                setData(event.payload)
            })

            // Signal that we're ready to receive data
            console.log('Emitting viewer-ready event')
            await getCurrentWindow().emit('viewer-ready', {})

            return unlisten
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
            <div className="w-screen h-screen bg-black flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        )
    }

    return (
        <div
            className="w-screen h-screen bg-black flex items-center justify-center"
        >
            <div className="relative max-w-full max-h-full" onClick={(e) => {
                // Only close if clicking the image itself, not the overlays
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
                    getCurrentWindow().close()
                }
            }}>
                <img
                    src={data.image}
                    alt="Image preview"
                    className="max-w-full max-h-screen object-contain cursor-pointer"
                />
                {data.points && data.points.map((point, idx) => (
                    <div
                        key={`point-${idx}`}
                        className="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                        style={{
                            left: `${point.x * 100}%`,
                            top: `${point.y * 100}%`
                        }}
                    >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-sm px-2 py-1 rounded whitespace-nowrap font-bold">
                            {data.caption || (idx + 1)}
                        </div>
                    </div>
                ))}
                {data.boxes && data.boxes.map((box, idx) => (
                    <div
                        key={`box-${idx}`}
                        className="absolute border-4 border-green-500 bg-green-500/10 shadow-xl"
                        style={{
                            left: `${box.xMin * 100}%`,
                            top: `${box.yMin * 100}%`,
                            width: `${(box.xMax - box.xMin) * 100}%`,
                            height: `${(box.yMax - box.yMin) * 100}%`
                        }}
                    >
                        <div className="absolute -top-10 left-0 bg-green-500 text-white text-base px-3 py-1 rounded font-bold shadow-lg">
                            {data.caption || (idx + 1)}
                        </div>
                    </div>
                ))}
            </div>
            <div className="absolute bottom-8 text-white/70 text-sm bg-black/50 px-4 py-2 rounded">
                Click image or press ESC to close
            </div>
        </div>
    )
}
