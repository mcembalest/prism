/**
 * Types for the skill graph/learning system
 */

export interface Step {
  tag?: string | null
  text: string
}

export interface SkillTask {
  skill: string
  level: string
  prerequisites: string[]
  task: string
  steps: Step[]
  commands?: Array<string | { id?: number; code?: string; cmd?: string; text?: string; label?: string; tag?: string }>
}

export interface GroupedSkill {
  name: string
  level: string
  tasks: SkillTask[]
}

export interface Command {
  id: number | string
  code: string
  label?: string | null
  tag?: string | null
}
