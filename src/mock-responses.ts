/**
 * Mock Response Library
 * Pre-defined responses for common student questions and interactions
 * Simulates an intelligent tutor without requiring LLM calls
 */

// Common student questions mapped to helpful responses
export const questionResponses: Record<string, string> = {
  // General questions
  'what is redis': 'Redis: in-memory data store with rich types.',

  'why use redis': 'Fast caching, sessions, queues, analytics.',

  'what is a hash': 'Hash = key with fields (object-like).',

  'what is a list': 'List = ordered strings; push/pop ends.',

  'what is a set': 'Set = unique, unordered strings.',

  'difference between list and set': 'Lists keep order, allow duplicates; sets don\'t.',

  // Command-specific questions
  'what does hset do': 'HSET: set field(s) in a hash.',

  'what does hget do': 'HGET: get one field from a hash.',

  'what does lpush do': 'LPUSH: add to list head (left).',

  'what does rpush do': 'RPUSH: add to list tail (right).',

  'what does sadd do': 'SADD: add unique members to a set.',

  'what does zadd do': 'ZADD: add member+score to sorted set.',

  // Conceptual questions
  'when to use hashes': 'Use hashes for object-like data.',

  'when to use lists': 'Use lists for ordered queues/feeds.',

  'what is ttl': 'TTL: seconds to expire; -1 none, -2 missing.',

  'what is persistence': 'Redis persists via RDB snapshots and AOF logs.',

  // Troubleshooting
  'command not working': 'Check syntax, key exists (EXISTS), and type (TYPE).',

  'wrong output': 'Check data type, docs, and expected steps.',

  // Metacognitive support
  'i dont understand': 'No problem. Which part: syntax, type, or usage?',

  'this is hard': 'You\'re doing fine. Want an example or recap?',

  'can i skip': 'You can skip; prefer a hint?'
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
  return 'Good question. Which command? Expected result? Try and observe.'
}

// Encouragement messages for correct answers
export const encouragementMessages = [
  'Nice.',
  'Great.',
  'Well done.',
  'Perfect.',
  'Excellent.',
  'Strong work.',
  'Good job.',
  'On track.'
]

// Scaffolding responses for wrong answers
export const wrongAnswerResponses = [
  'Not yet. Rethink.',
  'Close. Check syntax.',
  'Good try. Here\'s a hint...',
  'I see the idea, but no.',
  'Almost. Consider the data type.'
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
    { level: 1, hint: 'What data type is it?' },
    { level: 2, hint: 'Check command argument order.' },
    { level: 3, hint: exercise.hint || 'Run the suggested command.' }
  ]
}
