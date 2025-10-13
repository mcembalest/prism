export interface TutorRequest {
  prompt: string
  checkpointTitle?: string
  trackTitle?: string
  product?: string
  requestType?: 'hint' | 'onboarding' | 'question' | 'check'
  conversationHistory?: Array<{ role: string; content: string }>
}

export interface TutorResponse {
  message: string
}

export class TutorClient {
  private baseUrl = 'http://localhost:3001'

  async generateResponse({
    prompt,
    checkpointTitle,
    trackTitle,
    product,
    requestType = 'question',
    conversationHistory = [],
  }: TutorRequest): Promise<TutorResponse> {
    const startTime = performance.now()

    try {
      const response = await fetch(`${this.baseUrl}/api/tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          checkpointTitle,
          trackTitle,
          product,
          requestType,
          conversationHistory,
        }),
      })

      const networkTime = performance.now() - startTime

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const totalTime = performance.now() - startTime

      console.log('📊 Tutor Performance Metrics:', {
        totalTime: `${totalTime.toFixed(0)}ms`,
        networkLatency: `${networkTime.toFixed(0)}ms`,
        serverProcessing: `${(totalTime - networkTime).toFixed(0)}ms`,
        promptLength: prompt.length,
        responseLength: data.message.length,
        requestType,
        serverMetrics: data.metrics,
      })

      return { message: data.message }
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error(`Failed to get tutor response after ${totalTime.toFixed(0)}ms:`, error)
      return {
        message: 'Sorry, I could not connect to the tutor. Please make sure the backend server is running.',
      }
    }
  }

  async generateStreamingResponse({
    prompt,
    checkpointTitle,
    trackTitle,
    product,
    requestType = 'question',
    conversationHistory = [],
    onToken,
    onComplete,
  }: TutorRequest & {
    onToken: (token: string) => void
    onComplete: (fullMessage: string) => void
  }): Promise<void> {
    const startTime = performance.now()
    let firstTokenTime: number | null = null
    let fullMessage = ''

    try {
      const response = await fetch(`${this.baseUrl}/api/tutor/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          checkpointTitle,
          trackTitle,
          product,
          requestType,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              const totalTime = performance.now() - startTime
              console.log('📊 Streaming Performance Metrics:', {
                totalTime: `${totalTime.toFixed(0)}ms`,
                timeToFirstToken: firstTokenTime ? `${firstTokenTime.toFixed(0)}ms` : 'N/A',
                requestType,
                responseLength: fullMessage.length,
              })
              onComplete(fullMessage)
              return
            }

            try {
              const parsed = JSON.parse(data)
              const token = parsed.choices?.[0]?.delta?.content || ''

              if (token) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now() - startTime
                }
                fullMessage += token
                onToken(token)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      onComplete(fullMessage)
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error(`Failed to get streaming tutor response after ${totalTime.toFixed(0)}ms:`, error)
      onComplete('Sorry, I could not connect to the tutor. Please make sure the backend server is running.')
    }
  }
}
