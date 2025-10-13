import { serve } from 'bun'

// Type definitions for request bodies
interface TutorRequest {
  prompt: string
  checkpointTitle?: string
  trackTitle?: string
  product?: string
  requestType?: 'hint' | 'onboarding' | 'check' | 'question'
  conversationHistory?: Array<{ role: string; content: string }>
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY not found in environment variables')
}


const server = serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    // Helper function to determine max_tokens based on request type
    // NOTE: With gpt-5 reasoning models, these limits include BOTH reasoning tokens AND output tokens
    // So we need much higher limits to allow for reasoning + actual output
    const getMaxTokens = (requestType: string) => {
      switch (requestType) {
        case 'hint':
          return 8000 // Reasoning + concise hint
        case 'onboarding':
          return 10000 // Reasoning + greeting
        case 'check':
          return 10000 // Reasoning + feedback
        case 'question':
        default:
          return 15000 // Reasoning + detailed answer
      }
    }

    if (url.pathname === '/api/tutor/stream' && req.method === 'POST') {
      const requestStart = performance.now()
      let firstTokenTime: number | null = null

      try {
        const { prompt, checkpointTitle, trackTitle, product, requestType = 'question', conversationHistory = [] } = await req.json() as TutorRequest

        const instructions = `You are an AI tutor helping a learner master ${product || 'a topic'}.
The learner is working on: ${trackTitle || 'a learning track'}${checkpointTitle ? ` → ${checkpointTitle}` : ''}.

Provide concise, helpful guidance. Be encouraging and educational. Keep responses under 3 sentences unless more detail is explicitly requested.`

        const maxTokens = getMaxTokens(requestType)
        console.log(`🎯 Request type: ${requestType}, max_tokens: ${maxTokens}, history length: ${conversationHistory.length}`)

        // Build input array with conversation history
        // In Responses API, we can pass the conversation history as input
        const input = conversationHistory.length > 0 
          ? [...conversationHistory, { role: 'user', content: prompt }]
          : prompt

        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-5',
            instructions,
            input,
            max_output_tokens: maxTokens,
            stream: true,
            store: false, // Don't store responses by default
            reasoning: {
              effort: 'medium', // Enable reasoning for better responses
            },
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ OpenAI API error (streaming):', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })

          let errorMessage = 'Failed to get response from OpenAI'
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error?.message || errorMessage
          } catch {
            // Error is not JSON
          }

          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: response.status, headers }
          )
        }

        // Create streaming response
        const streamHeaders = {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        }

        const stream = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
              controller.close()
              return
            }

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                  controller.close()
                  break
                }

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n').filter(line => line.trim() !== '')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') {
                      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                      continue
                    }

                    try {
                      const parsed = JSON.parse(data)

                      // Log ALL events to debug
                      console.log('📨 Event:', parsed.type)

                      // Log detailed structure for first delta to debug
                      if (parsed.type === 'response.output_text.delta' && firstTokenTime === null) {
                        console.log('📋 First delta event:', JSON.stringify(parsed, null, 2))
                      }

                      // Handle text delta events - this is where the actual content comes from
                      if (parsed.type === 'response.output_text.delta') {
                        // The delta contains the incremental text
                        const content = parsed.delta

                        if (content) {
                          // Track first token time
                          if (firstTokenTime === null) {
                            firstTokenTime = performance.now() - requestStart
                            console.log(`⚡ First token received in ${firstTokenTime.toFixed(0)}ms`)
                          }

                          // Transform to match our client's expected format
                          const transformed = {
                            choices: [{
                              delta: {
                                content
                              }
                            }]
                          }
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(transformed)}\n\n`))
                        }
                      } else if (parsed.type === 'response.output_item.done') {
                        // Individual output item is complete (but response may continue)
                        const itemType = parsed.item?.type || 'unknown'
                        console.log(`📝 Output item complete (${itemType})`)
                      } else if (parsed.type === 'response.done' || parsed.type === 'response.completed') {
                        // Entire response is complete
                        console.log('✅ Response complete')
                        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                      } else if (parsed.type === 'response.incomplete') {
                        // Response incomplete - usually means token limit hit
                        const reason = parsed.response?.incomplete_details?.reason || 'unknown'
                        console.error(`⚠️  Response incomplete: ${reason}`)
                        // Still send [DONE] to close the stream
                        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                      } else if (parsed.type === 'error') {
                        console.error('❌ Stream error:', parsed.error)
                        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                      }
                    } catch (e) {
                      console.error('Failed to parse stream event:', e, 'Data:', data)
                    }
                  }
                }
              }

              const totalTime = performance.now() - requestStart
              console.log(`✅ Streaming complete in ${totalTime.toFixed(0)}ms`)
            } catch (error) {
              console.error('Streaming error:', error)
              controller.error(error)
            }
          },
        })

        return new Response(stream, { headers: streamHeaders })
      } catch (error) {
        const totalTime = performance.now() - requestStart
        console.error(`Server error after ${totalTime.toFixed(0)}ms:`, error)
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500, headers }
        )
      }
    }

    if (url.pathname === '/api/tutor' && req.method === 'POST') {
      const requestStart = performance.now()

      try {
        const { prompt, checkpointTitle, trackTitle, product, requestType = 'question', conversationHistory = [] } = await req.json() as TutorRequest

        const instructions = `You are an AI tutor helping a learner master ${product || 'a topic'}.
The learner is working on: ${trackTitle || 'a learning track'}${checkpointTitle ? ` → ${checkpointTitle}` : ''}.

Provide concise, helpful guidance. Be encouraging and educational. Keep responses under 3 sentences unless more detail is explicitly requested.`

        const maxTokens = getMaxTokens(requestType)
        console.log(`🎯 Request type: ${requestType}, max_tokens: ${maxTokens}, history length: ${conversationHistory.length}`)

        // Build input array with conversation history
        const input = conversationHistory.length > 0 
          ? [...conversationHistory, { role: 'user', content: prompt }]
          : prompt

        const openaiStart = performance.now()
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-5',
            instructions,
            input,
            max_output_tokens: maxTokens,
            store: false, // Don't store responses by default
            reasoning: {
              effort: 'medium', // Enable reasoning for better responses
            },
          }),
        })

        const openaiResponseTime = performance.now() - openaiStart

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ OpenAI API error (non-streaming):', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })

          let errorMessage = 'Failed to get response from OpenAI'
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error?.message || errorMessage
          } catch {
            // Error is not JSON
          }

          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: response.status, headers }
          )
        }

        const data = await response.json() as any

        // Extract message from Responses API format
        // Structure: { output: [{ type: "message", content: [{ type: "output_text", text: "..." }] }] }
        let message = 'Sorry, I could not generate a response.'

        if (data.output && Array.isArray(data.output)) {
          // Find the message item in the output array
          const messageItem = data.output.find((item: any) => item.type === 'message')

          if (messageItem?.content && Array.isArray(messageItem.content)) {
            // Find the text content in the message
            const textContent = messageItem.content.find((c: any) => c.type === 'output_text')

            if (textContent?.text) {
              message = textContent.text
            }
          }
        }

        console.log('📝 Extracted message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''))

        if (data.reasoning?.summary) {
          console.log('🧠 Reasoning summary:', data.reasoning.summary)
        }

        const totalTime = performance.now() - requestStart
        // Responses API uses input_tokens and output_tokens
        const inputTokens = data.usage?.input_tokens || 0
        const outputTokens = data.usage?.output_tokens || 0
        const reasoningTokens = data.usage?.output_tokens_details?.reasoning_tokens || 0
        const totalTokens = data.usage?.total_tokens || 0

        const metrics = {
          totalTime: `${totalTime.toFixed(0)}ms`,
          openaiTime: `${openaiResponseTime.toFixed(0)}ms`,
          overhead: `${(totalTime - openaiResponseTime).toFixed(0)}ms`,
          totalTokens,
          inputTokens,
          outputTokens,
          reasoningTokens: reasoningTokens > 0 ? reasoningTokens : undefined,
          timePerToken: outputTokens > 0 ? `${(openaiResponseTime / outputTokens).toFixed(0)}ms/token` : 'N/A',
          maxTokens,
          requestType,
        }

        console.log('🔥 Server Metrics:', metrics)

        return new Response(
          JSON.stringify({ message, metrics }),
          { headers }
        )
      } catch (error) {
        const totalTime = performance.now() - requestStart
        console.error(`Server error after ${totalTime.toFixed(0)}ms:`, error)
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500, headers }
        )
      }
    }

    return new Response('Not found', { status: 404 })
  },
})

console.log(`Tutor backend server running on http://localhost:${server.port}`)
