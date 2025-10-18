import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Send, RotateCcw } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { visionService, Point, BoundingBox } from '@/services/vision'
import { geminiService } from '@/services/gemini'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    image?: string
    points?: Point[]
    boxes?: BoundingBox[]
}

interface RustPoint {
    x: number
    y: number
}

interface RustBoundingBox {
    x_min: number
    y_min: number
    x_max: number
    y_max: number
}

export function Helper() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string>('')
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const openFullscreenViewer = async (imageUrl: string, points: Point[] = [], boxes: BoundingBox[] = []) => {
        try {
            // Convert Point[] to RustPoint[] format
            const rustPoints: RustPoint[] = points.map(p => ({ x: p.x, y: p.y }))
            // Convert BoundingBox[] to RustBoundingBox[] format
            const rustBoxes: RustBoundingBox[] = boxes.map(b => ({
                x_min: b.x_min,
                y_min: b.y_min,
                x_max: b.x_max,
                y_max: b.y_max
            }))
            await invoke('open_fullscreen_viewer', {
                image: imageUrl,
                points: rustPoints,
                boxes: rustBoxes
            })
        } catch (error) {
            console.error('Failed to open fullscreen viewer:', error)
        }
    }

    const handleReset = () => {
        setMessages([])
        setInput('')
    }

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return

        setIsProcessing(true)
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        }

        setMessages(prev => [...prev, userMessage])
        const query = input
        setInput('')

        try {
            // Classify intent
            setStatusMessage('Analyzing request...')
            const intent = await geminiService.classifyIntent(query)

            // Take screenshot
            setStatusMessage('📸')
            const screenshotDataUrl = await invoke<string>('take_screenshot')

            // Execute based on classified intent
            if (intent === 'point') {
                setStatusMessage(`Finding "${query}"...`)
                const pointResult = await visionService.point(screenshotDataUrl, query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Found ${pointResult.points.length} instance(s) of "${query}"`,
                    image: screenshotDataUrl,
                    points: pointResult.points
                }
                setMessages(prev => [...prev, assistantMessage])
            } else if (intent === 'detect') {
                setStatusMessage(`Detecting "${query}"...`)
                const detectResult = await visionService.detect(screenshotDataUrl, query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Detected ${detectResult.objects.length} object(s) matching "${query}"`,
                    image: screenshotDataUrl,
                    boxes: detectResult.objects
                }
                setMessages(prev => [...prev, assistantMessage])
            } else {
                setStatusMessage('Answering...')
                const queryResult = await visionService.query(screenshotDataUrl, query)

                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: queryResult.answer,
                    image: screenshotDataUrl
                }
                setMessages(prev => [...prev, assistantMessage])
            }
        } catch (error) {
            console.error('Error details:', error)
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setStatusMessage('')
            setIsProcessing(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50">
                <div className="text-center space-y-1">
                    <p className="text-sm text-zinc-400">Get help with your current workflow</p>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div ref={scrollRef} className="p-4 space-y-3">
                        {messages.map((message, index) => (
                            <div
                                key={message.id}
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
                                    {message.image && (
                                        <div
                                            className="mt-3 cursor-pointer rounded-lg overflow-hidden border-2 border-zinc-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 group relative"
                                            onClick={() => openFullscreenViewer(message.image!, message.points, message.boxes)}
                                        >
                                            <div className="relative">
                                                <img
                                                    src={message.image}
                                                    alt="Message attachment"
                                                    className="w-full h-auto rounded"
                                                />
                                                {message.points && message.points.map((point, idx) => (
                                                    <div
                                                        key={`point-${idx}`}
                                                        className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                                                        style={{
                                                            left: `${point.x * 100}%`,
                                                            top: `${point.y * 100}%`
                                                        }}
                                                    >
                                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                                {message.boxes && message.boxes.map((box, idx) => (
                                                    <div
                                                        key={`box-${idx}`}
                                                        className="absolute border-2 border-green-500 bg-green-500/10 shadow-lg"
                                                        style={{
                                                            left: `${box.x_min * 100}%`,
                                                            top: `${box.y_min * 100}%`,
                                                            width: `${(box.x_max - box.x_min) * 100}%`,
                                                            height: `${(box.y_max - box.y_min) * 100}%`
                                                        }}
                                                    >
                                                        <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center pointer-events-none">
                                                <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">Click to fullscreen</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur space-y-3">
                {statusMessage && (
                    <div className="text-xs text-blue-400">
                        {statusMessage}
                    </div>
                )}
                <div className="flex gap-2">
                    <Button
                        onClick={handleReset}
                        variant="outline"
                        className="bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border-zinc-700/50 rounded-xl px-3 transition-all"
                        title="Reset chat"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask for help with your screen..."
                        className="flex-1 bg-zinc-800/80 text-white placeholder:text-zinc-500 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessing}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 rounded-xl px-4 transition-all"
                    >
                        {isProcessing ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
