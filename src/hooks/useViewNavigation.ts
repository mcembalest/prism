/**
 * View navigation hook
 * Manages routing between different views in the app
 * Following React principles: minimal state, clear data flow
 */

import { useState, useCallback } from 'react'
import type { ViewName } from '@/utils/constants'
import { VIEWS } from '@/utils/constants'

export interface UseViewNavigationReturn {
  // Current state
  currentView: ViewName
  searchQuery: string
  selectedTopic: string | null

  // Navigation functions
  navigateToLanding: () => void
  navigateToTopic: (topicId: string) => void
  navigateToGuide: () => void
  navigateToAIChat: () => void

  // Search
  setSearchQuery: (query: string) => void

  // Direct setters (for compatibility)
  setCurrentView: (view: ViewName) => void
  setSelectedTopic: (topic: string | null) => void
}

/**
 * Hook for managing view navigation state
 *
 * @example
 * const { currentView, navigateToTopic, setSearchQuery } = useViewNavigation()
 */
export function useViewNavigation(): UseViewNavigationReturn {
  const [currentView, setCurrentView] = useState<ViewName>(VIEWS.LANDING)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  // Navigation handlers (memoized to prevent unnecessary re-renders)
  const navigateToLanding = useCallback(() => {
    setCurrentView(VIEWS.LANDING)
    setSelectedTopic(null)
  }, [])

  const navigateToTopic = useCallback((topicId: string) => {
    setSelectedTopic(topicId)
    setCurrentView(VIEWS.TOPIC)
  }, [])

  const navigateToGuide = useCallback(() => {
    setCurrentView(VIEWS.ACTIVE_GUIDE)
  }, [])

  const navigateToAIChat = useCallback(() => {
    setCurrentView(VIEWS.AI_CHAT)
  }, [])

  return {
    currentView,
    searchQuery,
    selectedTopic,
    navigateToLanding,
    navigateToTopic,
    navigateToGuide,
    navigateToAIChat,
    setSearchQuery,
    setCurrentView,
    setSelectedTopic,
  }
}
