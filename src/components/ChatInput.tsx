import React from 'react'
import { ArrowUp, RotateCcw } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isProcessing: boolean
  placeholder?: string
  statusMessage?: string
  onResetChat?: () => void
  showResetButton?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isProcessing,
  placeholder = "Ask a question",
  statusMessage,
  onResetChat,
  showResetButton = false
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSend()
    }
  }

  return (
    <div className="px-6 py-4 bg-background">
      {statusMessage && (
        <div className="text-xs text-muted-foreground mb-3">
          {statusMessage}
        </div>
      )}
      <div className="flex items-center gap-3 bg-background rounded-full px-5 py-3 border border-input shadow-sm max-w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground border-none focus:outline-none text-sm min-w-0"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {showResetButton && onResetChat && (
            <button
              onClick={onResetChat}
              className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors"
              aria-label="Reset chat"
              title="Reset chat"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onSend}
            disabled={!value.trim() || isProcessing}
            className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            {isProcessing ? (
              <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
