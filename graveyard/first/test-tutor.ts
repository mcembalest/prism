// Test script to verify tutor API is working
const TEST_URL = 'http://localhost:3001/api/tutor/stream'

async function testTutorStreaming() {
  console.log('🧪 Testing tutor streaming API...\n')

  const requestBody = {
    prompt: 'Provide an intro for: Search index modeling',
    checkpointTitle: 'Search index modeling',
    trackTitle: 'Redis fundamentals',
    product: 'Redis',
    requestType: 'onboarding',
    conversationHistory: [],
  }

  console.log('📤 Request:', JSON.stringify(requestBody, null, 2))
  console.log('\n📥 Streaming response:\n')

  try {
    const response = await fetch(TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText)
      const text = await response.text()
      console.error('Error body:', text)
      return
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      console.error('❌ No readable stream')
      return
    }

    let fullMessage = ''
    let chunkCount = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            console.log('\n\n✅ Stream complete')
            break
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content

            if (content) {
              chunkCount++
              fullMessage += content
              process.stdout.write(content)
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('\n\n📊 Results:')
    console.log(`- Chunks received: ${chunkCount}`)
    console.log(`- Total length: ${fullMessage.length}`)
    console.log(`- Full message: "${fullMessage}"`)

    if (fullMessage.length === 0) {
      console.error('\n❌ FAILED: No content received')
      process.exit(1)
    } else {
      console.log('\n✅ SUCCESS: Content received and displayed')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testTutorStreaming()
