import React from 'react'
import { Plus, Camera, Mic, ArrowUp } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isProcessing: boolean
  placeholder?: string
  statusMessage?: string
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isProcessing,
  placeholder = "Ask a question",
  statusMessage
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSend()
    }
  }

  return (
    <div className="px-6 py-4 bg-zinc-900/50 backdrop-blur">
      {statusMessage && (
        <div className="text-xs text-blue-400 mb-3">
          {statusMessage}
        </div>
      )}
      <div className="flex items-center gap-2 bg-zinc-800/90 rounded-full px-4 py-2.5 border border-zinc-700/50 max-w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
            onClick={onSend}
            disabled={!value.trim() || isProcessing}
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
  )
}
