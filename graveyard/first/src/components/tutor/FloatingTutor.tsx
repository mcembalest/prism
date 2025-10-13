import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCheckpointProgress } from '@/state/checkpoints'
import { TutorClient } from '@/lib/tutor/Client'
import { cn } from '@/lib/utils'
import { subscribeToObservations, type Observation } from '@/lib/screen-tracker'

type FloatingTutorProps = {
  variant?: 'overlay' | 'standalone'
}

export default function FloatingTutor({ variant = 'overlay' }: FloatingTutorProps) {
  const {
    activeTrack,
    activeCheckpoint,
    activeCheckpointId,
    sessionLog,
    appendSessionEntry,
    markCheckpointStatus,
  } = useCheckpointProgress()

  const [assistantMessage, setAssistantMessage] = useState<string>('...')
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConversationOpen, setIsConversationOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  const tutorClient = useMemo(() => new TutorClient(), [])
  const latestRequestRef = useRef(0)
  const lastCheckpointRef = useRef<string | null>(null)
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const appendSessionEntryRef = useRef(appendSessionEntry)
  const markCheckpointStatusRef = useRef(markCheckpointStatus)

  useEffect(() => {
    appendSessionEntryRef.current = appendSessionEntry
    markCheckpointStatusRef.current = markCheckpointStatus
  })

  const currentCheckpointId = useMemo(
    () => activeCheckpoint?.id ?? activeTrack?.id ?? null,
    [activeCheckpoint?.id, activeTrack?.id],
  )

  const conversation = useMemo(
    () => sessionLog.filter((entry) => entry.checkpointId === currentCheckpointId),
    [sessionLog, currentCheckpointId],
  )

  // Build conversation history for LLM (convert to OpenAI format)
  const conversationHistory = useMemo(() => {
    return conversation.map((entry) => {
      // Map our roles to OpenAI roles
      const role = entry.role === 'tutor' ? 'assistant' : entry.role === 'user' ? 'user' : 'system'
      return {
        role,
        content: entry.content,
      }
    }).filter((msg) => msg.role !== 'system') // Don't send system messages to LLM
  }, [conversation])

  useEffect(() => {
    if (isConversationOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [conversation.length, isLoading, isConversationOpen, streamingMessage])

  const handleObservation = useCallback(
    (observation: Observation) => {
      const checkpointId = observation.checkpointId ?? currentCheckpointId
      appendSessionEntryRef.current({
        role: 'system',
        content: `[Observation] ${observation.message}`,
        checkpointId,
      })

      if (observation.type === 'milestone' && observation.checkpointId) {
        markCheckpointStatusRef.current(observation.checkpointId, 'completed')
      } else if (observation.type === 'progress' && observation.checkpointId) {
        markCheckpointStatusRef.current(observation.checkpointId, 'in-progress')
      }

      setAssistantMessage(observation.message)
    },
    [currentCheckpointId],
  )

  const handleAssistantPrompt = useCallback(
    async (prompt: string, options?: { userContent?: string; requestType?: 'hint' | 'onboarding' | 'question' | 'check' }) => {
      const checkpointId = currentCheckpointId

      if (options?.userContent) {
        appendSessionEntryRef.current({
          role: 'user',
          content: options.userContent,
          checkpointId,
        })
      }

      if (!activeCheckpoint) {
        const fallback = 'No active checkpoint. Select one to get started.'
        setAssistantMessage(fallback)
        appendSessionEntryRef.current({
          role: 'system',
          content: fallback,
          checkpointId,
        })
        return
      }

      const requestId = Date.now()
      latestRequestRef.current = requestId
      setIsLoading(true)
      setIsStreaming(true)
      setStreamingMessage('')

      try {
        await tutorClient.generateStreamingResponse({
          prompt,
          checkpointTitle: activeCheckpoint.title,
          trackTitle: activeTrack?.title,
          product: activeTrack?.product,
          requestType: options?.requestType || 'question',
          conversationHistory,
          onToken: (token) => {
            if (latestRequestRef.current === requestId) {
              setStreamingMessage((prev) => prev + token)
            }
          },
          onComplete: (fullMessage) => {
            if (latestRequestRef.current === requestId) {
              setAssistantMessage(fullMessage)
              setIsStreaming(false)
              setStreamingMessage('')
              appendSessionEntryRef.current({
                role: 'tutor',
                content: fullMessage,
                checkpointId,
              })
            }
          },
        })
      } catch {
        if (latestRequestRef.current !== requestId) {
          return
        }
        const fallback = 'Failed to load tutor message.'
        setAssistantMessage(fallback)
        setIsStreaming(false)
        setStreamingMessage('')
        appendSessionEntryRef.current({
          role: 'system',
          content: fallback,
          checkpointId,
        })
      } finally {
        if (latestRequestRef.current === requestId) {
          setIsLoading(false)
        }
      }
    },
    [activeCheckpoint, activeTrack, tutorClient, currentCheckpointId],
  )

  useEffect(() => {
    const unsubscribe = subscribeToObservations(handleObservation)
    return unsubscribe
  }, [handleObservation])

  useEffect(() => {
    if (!activeCheckpoint) {
      setAssistantMessage('No active checkpoint. Select a checkpoint to get started.')
      lastCheckpointRef.current = null
      setIsConversationOpen(false)
      setIsComposerOpen(false)
      return
    }

    if (lastCheckpointRef.current === activeCheckpoint.id) {
      return
    }

    lastCheckpointRef.current = activeCheckpoint.id
    const prompt = `Provide an intro for: ${activeCheckpoint.title}`
    handleAssistantPrompt(prompt, { requestType: 'onboarding' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCheckpoint?.id])

  const handleShowHint = () => {
    if (!activeCheckpoint) {
      return
    }
    const prompt = `Give a concise hint for the learner working on: ${activeCheckpoint.title}`
    handleAssistantPrompt(prompt, { userContent: 'Requested a hint', requestType: 'hint' })
  }

  const handleCheckWork = () => {
    if (!activeCheckpoint) {
      return
    }
    const checkpointId = currentCheckpointId
    appendSessionEntryRef.current({
      role: 'user',
      content: `Marked ${activeCheckpoint.title} for review`,
      checkpointId,
    })

    if (activeCheckpoint.status !== 'completed') {
      markCheckpointStatusRef.current(activeCheckpoint.id, 'completed')
      appendSessionEntryRef.current({
        role: 'system',
        content: `${activeCheckpoint.title} marked as completed`,
        checkpointId,
      })
    } else {
      appendSessionEntryRef.current({
        role: 'system',
        content: `${activeCheckpoint.title} is already completed`,
        checkpointId,
      })
    }
  }

  const handleAskQuestionClick = () => {
    setIsComposerOpen(true)
    requestAnimationFrame(() => {
      questionInputRef.current?.focus()
    })
  }

  const handleSubmitQuestion = async () => {
    const trimmed = question.trim()
    if (!trimmed) {
      return
    }
    const prompt = `The learner asks about ${activeCheckpoint?.title ?? 'their work'}: ${trimmed}`
    await handleAssistantPrompt(prompt, { userContent: trimmed, requestType: 'question' })
    setQuestion('')
  }

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSubmitQuestion()
    }
  }

  const statusLabel = activeCheckpoint?.status
    ? activeCheckpoint.status === 'completed'
      ? 'Completed'
      : activeCheckpoint.status === 'in-progress'
        ? 'In Progress'
        : 'Pending'
    : 'No checkpoint'

  const statusVariant = activeCheckpoint?.status === 'in-progress' ? 'default' : 'outline'

  const containerClassName =
    variant === 'overlay'
      ? 'fixed bottom-6 right-6 w-80 space-y-3 z-50'
      : 'mx-auto w-full max-w-sm space-y-3'

  const trackLabel = activeTrack?.product ?? 'General'

  return (
    <div className={containerClassName}>
      <Card className="shadow-lg">
        <CardHeader className="pb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {trackLabel}
            </Badge>
            <CardTitle className="text-base">
              {activeCheckpoint?.title ?? 'AI Tutor'}
            </CardTitle>
            <Badge variant={statusVariant} className="text-[10px]">
              {statusLabel}
            </Badge>
          </div>
          {activeCheckpoint?.evaluationCriteria?.exampleTasks?.[0] && (
            <p className="text-xs text-muted-foreground">
              {activeCheckpoint.evaluationCriteria.exampleTasks[0]}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 text-sm min-h-[88px]">
              <p className="text-muted-foreground mb-1 text-xs font-medium">Tutor</p>
              <p className={isLoading && !isStreaming ? 'animate-pulse' : ''}>
                {isStreaming ? (streamingMessage || 'Tutor is thinking…') : isLoading ? 'Tutor is thinking…' : assistantMessage}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Chat</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={conversation.length === 0}
                onClick={() => setIsConversationOpen((previous) => !previous)}
              >
                {isConversationOpen
                  ? 'Hide chat'
                  : `View chat${conversation.length ? ` (${conversation.length})` : ''}`}
              </Button>
            </div>
            {isConversationOpen && (conversation.length > 0 || isStreaming || isLoading) && (
              <div ref={chatContainerRef} className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {conversation.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'rounded-lg border border-border/60 p-3 text-sm',
                      entry.role === 'tutor' && 'bg-muted',
                      entry.role === 'user' && 'bg-primary/10',
                      entry.role === 'system' && 'bg-secondary/10',
                    )}
                  >
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {entry.role === 'tutor'
                        ? 'Tutor'
                        : entry.role === 'user'
                          ? 'You'
                          : 'System'}
                    </p>
                    <p>{entry.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
                {isStreaming && streamingMessage && (
                  <div className="bg-muted rounded-lg border border-border/60 p-3 text-sm">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">Tutor</p>
                    <p>{streamingMessage}</p>
                  </div>
                )}
                {isLoading && !isStreaming && (
                  <div className="bg-muted rounded-lg border border-border/60 p-3 text-sm animate-pulse">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">Tutor</p>
                    <p>Thinking...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick actions</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!activeCheckpoint || isLoading}
                onClick={handleShowHint}
              >
                ! Show a hint
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!activeCheckpoint || isLoading}
                onClick={handleCheckWork}
              >
                ✓ Check your work
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!activeCheckpoint}
                onClick={handleAskQuestionClick}
              >
                ? Ask a question
              </Button>
            </div>
          </div>

          {isComposerOpen && (
            <div className="space-y-2">
              <textarea
                id="tutor-question"
                ref={questionInputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder={activeCheckpoint ? 'Type your question…' : 'Select a checkpoint first'}
                disabled={!activeCheckpoint || isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!activeCheckpoint || isLoading || question.trim().length === 0}
                  onClick={handleSubmitQuestion}
                >
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsComposerOpen(false)
                    if (question.trim().length === 0 && conversation.length === 0) {
                      setIsConversationOpen(false)
                    }
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            <div>{activeTrack?.title ?? 'No track selected'}</div>
            <div>{activeCheckpoint ? `Checkpoint ${activeCheckpointId}` : 'No checkpoint selected'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
