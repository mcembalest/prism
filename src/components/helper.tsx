import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DraggableHeader } from './DraggableHeader'
import { Button } from '@/components/ui/button'
import { Send, MessageSquare, Target, Search } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { moondreamService, Point, BoundingBox } from '@/services/moondream'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  points?: Point[]
  boxes?: BoundingBox[]
}

export function Helper() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'Hello! Use Ask to query your screen, Point to locate objects, or Find to detect objects with bounding boxes.' 
    }
  ])
  const [input, setInput] = useState('')
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [mode, setMode] = useState<'answer' | 'point' | 'find'>('answer')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        await exitFullscreen()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [fullscreenImage])

  const enterFullscreen = async (imageUrl: string) => {
    setFullscreenImage(imageUrl)
    const window = getCurrentWindow()
    await window.setFullscreen(true)
  }

  const exitFullscreen = async () => {
    setFullscreenImage(null)
    const window = getCurrentWindow()
    await window.setFullscreen(false)
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
      setStatusMessage('📸 Taking screenshot...')
      const screenshotDataUrl = await invoke<string>('take_screenshot')
      
      if (mode === 'point') {
        setStatusMessage(`🎯 Finding "${query}"...`)
        const pointResult = await moondreamService.point(screenshotDataUrl, query)
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Found ${pointResult.points.length} instance(s) of "${query}"`,
          image: screenshotDataUrl,
          points: pointResult.points
        }
        setMessages(prev => [...prev, assistantMessage])
      } else if (mode === 'find') {
        setStatusMessage(`🔍 Detecting "${query}"...`)
        const detectResult = await moondreamService.detect(screenshotDataUrl, query)
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Detected ${detectResult.objects.length} object(s) of "${query}"`,
          image: screenshotDataUrl,
          boxes: detectResult.objects
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setStatusMessage('🤔 Analyzing screenshot...')
        const queryResult = await moondreamService.query(screenshotDataUrl, query)
        
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
    <>
      <Card className="h-screen w-full bg-gradient-to-br from-zinc-900 to-zinc-950 backdrop-blur-xl border-zinc-800/50 shadow-2xl overflow-hidden flex flex-col">
        <DraggableHeader />

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-3 min-h-full flex flex-col">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-lg ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                        : 'bg-zinc-800/80 text-gray-100 border border-zinc-700/50'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.image && (
                      <div 
                        className="mt-3 cursor-pointer rounded-lg overflow-hidden border-2 border-zinc-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 group relative"
                        onClick={() => enterFullscreen(message.image!)}
                      >
                        <div className="relative">
                          <img 
                            src={message.image} 
                            alt="Message attachment"
                            className="w-full h-auto rounded"
                          />
                          {message.points && message.points.map((point, idx) => (
                            <div
                              key={idx}
                              className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
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
                              key={idx}
                              className="absolute border-2 border-green-500 bg-green-500/20 shadow-lg"
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
          <Tabs defaultValue="answer" onValueChange={(v) => setMode(v as 'answer' | 'point' | 'find')}>
            <TabsList className="grid w-full grid-cols-3 bg-zinc-800/80 border border-zinc-700/50">
              <TabsTrigger value="answer" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask
              </TabsTrigger>
              <TabsTrigger value="point" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Target className="h-4 w-4 mr-2" />
                Point
              </TabsTrigger>
              <TabsTrigger value="find" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Search className="h-4 w-4 mr-2" />
                Find
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {statusMessage && (
            <div className="text-xs text-blue-400 animate-pulse">
              {statusMessage}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={mode === 'find' ? 'Describe object to detect...' : mode === 'point' ? 'Describe what to find...' : 'Ask a question...'}
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
      </Card>

      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black flex items-center justify-center z-[9999] cursor-pointer"
          onClick={exitFullscreen}
        >
          <img 
            src={fullscreenImage} 
            alt="Full screen preview"
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute bottom-8 text-white/70 text-sm">
            Click anywhere or press ESC to exit
          </div>
        </div>
      )}
    </>
  )
}
