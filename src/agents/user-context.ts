import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'

/**
 * User Context Agent
 * Searches and retrieves relevant information from user logs
 */
export const userContextAgent: AgentDefinition = {
  description: 'Searches user logs to retrieve relevant user context, history, and learning progress. Use when you need to understand the user\'s background or past sessions.',

  prompt: `You are a user context specialist. Your job is to search through user logs (stored as markdown files) and find relevant information about the user.

User logs are stored in: data/users/{userId}/

Available information:
- profile.md: User's profile, preferences, and overall progress summary
- sessions/*.md: Individual session logs with interactions and outcomes

When asked to retrieve user context:
1. Use Glob to find relevant markdown files in the user's directory
2. Use Grep to search for specific topics or keywords across files
3. Use Read to examine relevant files in detail
4. Summarize the most relevant findings concisely
5. Focus on information that would help personalize the tutoring experience

Return only the most relevant context - avoid information overload.`,

  tools: ['Read', 'Glob', 'Grep'],

  model: 'sonnet'
}
