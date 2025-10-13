/**
 * Mock Response Library
 * Pre-defined responses for common student questions and interactions
 * Simulates an intelligent tutor without requiring LLM calls
 */

// Common student questions mapped to helpful responses
export const questionResponses: Record<string, string> = {
  // General questions
  'what is redis': 'Redis is an in-memory data structure store. It\'s incredibly fast because data lives in RAM, and it supports rich data types like strings, hashes, lists, sets, and sorted sets.',

  'why use redis': 'Redis excels at caching, session management, real-time analytics, and message queues. Its speed (sub-millisecond latency) and rich data types make it perfect for high-performance applications.',

  'what is a hash': 'A hash in Redis is like a mini key-value store within a key. Think of it as a row in a table or an object in JavaScript - it has multiple fields and values. Perfect for representing objects like users or products.',

  'what is a list': 'A Redis list is an ordered collection of strings, implemented as a linked list. You can push/pop from either end efficiently. Great for queues, activity feeds, or any ordered collection.',

  'what is a set': 'A set is an unordered collection of unique strings. Redis automatically handles deduplication. Use sets for tags, unique visitors, or when you need set operations like union and intersection.',

  'difference between list and set': 'Lists maintain order and allow duplicates, while sets are unordered and guarantee uniqueness. Use lists when order matters (like a timeline), sets when you need uniqueness (like tags).',

  // Command-specific questions
  'what does hset do': 'HSET sets a field in a hash. Format: HSET key field value. You can set multiple fields at once: HSET user:1 name Alice age 30',

  'what does hget do': 'HGET retrieves a single field from a hash. Format: HGET key field. To get all fields, use HGETALL.',

  'what does lpush do': 'LPUSH adds elements to the left (head) of a list. Format: LPUSH key value1 value2. Think of it as prepending to an array.',

  'what does rpush do': 'RPUSH adds elements to the right (tail) of a list. Format: RPUSH key value1 value2. Think of it as appending to an array.',

  'what does sadd do': 'SADD adds members to a set. Format: SADD key member1 member2. Duplicates are automatically ignored.',

  'what does zadd do': 'ZADD adds members with scores to a sorted set. Format: ZADD key score1 member1 score2 member2. Members are sorted by score.',

  // Conceptual questions
  'when to use hashes': 'Use hashes when you have an object with multiple fields. They\'re more memory-efficient than separate keys and let you update individual fields without fetching the whole object.',

  'when to use lists': 'Use lists for ordered collections where you need to push/pop from either end. Perfect for activity feeds, message queues, or maintaining recent items.',

  'what is ttl': 'TTL (Time To Live) shows how long until a key expires, in seconds. -1 means no expiration, -2 means the key doesn\'t exist. Use EXPIRE to set TTL.',

  'what is persistence': 'Redis can save data to disk for durability. RDB creates point-in-time snapshots, while AOF logs every write operation. By default, Redis persists data periodically.',

  // Troubleshooting
  'command not working': 'Let\'s debug this! Check: 1) Is your syntax correct? 2) Does the key exist? Use EXISTS to check. 3) Is it the right data type? Use TYPE to verify. Try the hint button for more specific help.',

  'wrong output': 'The output isn\'t what you expected? This is a great learning moment! Think about: What data type are you working with? What does the command documentation say? Try predicting the output step-by-step.',

  // Metacognitive support
  'i dont understand': 'That\'s completely okay - Redis has many concepts to learn! Let\'s break it down. Which specific part is confusing? The command syntax, the data structure, or when to use it? I can explain differently or show an example.',

  'this is hard': 'You\'re doing great! Learning new technology takes time and practice. The fact that you\'re asking questions shows you\'re thinking deeply. Want to try a worked example first, or should we review the concept?',

  'can i skip': 'You can use the Skip button, but I encourage you to try! Understanding this concept will help with future exercises. Want a hint instead?'
}

// Keyword-based question matching
export function findResponseForQuestion(question: string): string | null {
  const q = question.toLowerCase().trim()

  // Direct match
  if (questionResponses[q]) {
    return questionResponses[q]
  }

  // Keyword matching
  const keywordMatches: Array<{ keywords: string[], response: string }> = [
    {
      keywords: ['what', 'redis'],
      response: questionResponses['what is redis']
    },
    {
      keywords: ['why', 'redis'],
      response: questionResponses['why use redis']
    },
    {
      keywords: ['what', 'hash'],
      response: questionResponses['what is a hash']
    },
    {
      keywords: ['what', 'list'],
      response: questionResponses['what is a list']
    },
    {
      keywords: ['what', 'set'],
      response: questionResponses['what is a set']
    },
    {
      keywords: ['difference', 'list', 'set'],
      response: questionResponses['difference between list and set']
    },
    {
      keywords: ['hset'],
      response: questionResponses['what does hset do']
    },
    {
      keywords: ['hget'],
      response: questionResponses['what does hget do']
    },
    {
      keywords: ['lpush'],
      response: questionResponses['what does lpush do']
    },
    {
      keywords: ['rpush'],
      response: questionResponses['what does rpush do']
    },
    {
      keywords: ['sadd'],
      response: questionResponses['what does sadd do']
    },
    {
      keywords: ['when', 'hash'],
      response: questionResponses['when to use hashes']
    },
    {
      keywords: ['when', 'list'],
      response: questionResponses['when to use lists']
    },
    {
      keywords: ['ttl', 'expire'],
      response: questionResponses['what is ttl']
    },
    {
      keywords: ['not working', 'doesn\'t work', 'broken'],
      response: questionResponses['command not working']
    },
    {
      keywords: ['wrong', 'incorrect', 'different'],
      response: questionResponses['wrong output']
    },
    {
      keywords: ['don\'t understand', 'confused', 'unclear'],
      response: questionResponses['i dont understand']
    },
    {
      keywords: ['hard', 'difficult'],
      response: questionResponses['this is hard']
    }
  ]

  for (const match of keywordMatches) {
    if (match.keywords.every(kw => q.includes(kw))) {
      return match.response
    }
  }

  // Default response
  return 'That\'s a great question! While I don\'t have a specific answer for that, try breaking down the problem: What command are you working with? What do you expect to happen? Feel free to experiment in the terminal - that\'s the best way to learn!'
}

// Encouragement messages for correct answers
export const encouragementMessages = [
  'Excellent! You\'ve got it!',
  'Perfect! Your understanding is solid.',
  'Great work! You\'re thinking like a Redis expert.',
  'Nicely done! That\'s exactly right.',
  'Spot on! You\'re making great progress.',
  'Fantastic! You understand this concept well.',
  'Well done! Your reasoning is sound.',
  'Impressive! You\'re mastering this quickly.'
]

// Scaffolding responses for wrong answers
export const wrongAnswerResponses = [
  'Not quite, but you\'re thinking about this! Let\'s reconsider...',
  'That\'s a common misconception. Here\'s another way to think about it...',
  'Good attempt! Let me clarify the concept...',
  'I can see why you might think that. However...',
  'Close! You\'re on the right track. Consider this...'
]

// Get random encouragement
export function getEncouragement(): string {
  return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)]
}

// Get random wrong answer response
export function getWrongAnswerResponse(): string {
  return wrongAnswerResponses[Math.floor(Math.random() * wrongAnswerResponses.length)]
}

// Progressive hints (from gentle to more explicit)
export interface HintLevel {
  level: 1 | 2 | 3
  hint: string
}

export function generateProgressiveHints(exercise: any): HintLevel[] {
  // This could be enhanced to generate context-specific hints
  // For now, return generic progressive hints
  return [
    { level: 1, hint: 'Think about what data structure you\'re working with. What operations does it support?' },
    { level: 2, hint: 'Review the command syntax. Are you using the right order of arguments?' },
    { level: 3, hint: exercise.hint || 'Try the suggested command and observe what happens.' }
  ]
}
