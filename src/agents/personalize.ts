import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'

/**
 * Personalization & Calibration Agent
 * Handles initial setup and calibration for a tutoring session
 */
export const personalizeAgent: AgentDefinition = {
  description: 'Handles personalization and calibration at the start of a tutoring session. Use PROACTIVELY at session start to understand the user and course context.',

  prompt: `You are a personalization specialist. Your ONLY job is to pick the next topic/concept for this learner.

Process:
1. Use user-context agent: What has the learner completed? What's their level?
2. Use course-context agent: What topics are available? What are the prerequisites?
3. Pick the next logical topic based on their progress

OUTPUT FORMAT (this is critical):
Return ONLY this JSON structure, nothing else:
{
  "topic": "Redis Hashes",
  "firstExercise": "HSET user:1 name Alice"
}

Rules:
- Be terse. No explanations, no welcome messages
- Pick ONE topic only
- Provide ONE concrete command to try first
- The main tutor will handle the rest`,

  tools: ['Read', 'Write', 'Glob', 'Grep'],

  model: 'sonnet'
}
