/**
 * Messages hook
 * Manages chat message state and input
 * Following React principles: minimal state, clear actions
 */

import { useState, useCallback } from 'react'
import type { Message } from '@/types/guide'

export interface UseMessagesReturn {
  // State
  messages: Message[]
  input: string
  isProcessing: boolean

  // Actions
  setInput: (value: string) => void
  addMessage: (message: Message) => void
  addMessages: (newMessages: Message[]) => void
  clearMessages: () => void
  setIsProcessing: (processing: boolean) => void
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

/**
 * Hook for managing chat messages and input
 *
 * @example
 * const { messages, input, setInput, addMessage } = useMessages()
 */
export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Add a single message (memoized)
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  // Add multiple messages at once
  const addMessages = useCallback((newMessages: Message[]) => {
    setMessages(prev => [...prev, ...newMessages])
  }, [])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setInput('')
  }, [])

  return {
    messages,
    input,
    isProcessing,
    setInput,
    addMessage,
    addMessages,
    clearMessages,
    setIsProcessing,
    setMessages,
  }
}
