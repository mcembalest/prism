// GitHub mode configuration
import type { AppModeConfig } from '@/types/app-mode'
import type { GuideDefinition } from '@/types/guide'

const guides: GuideDefinition[] = [
  {
    id: 'review-pr',
    source: 'static',
    title: 'Review a pull request',
    topic: 'GitHub Basics',
    description: 'Learn how to review code changes in a pull request on GitHub',
    isRecent: true,
    steps: [
      {
        caption: 'Open PR tab',
        instruction: 'Navigate to the Pull Requests (PR) tab',
        points: [{ x: 0.20, y: 0.20 }],
      },
      {
        caption: 'Pick a PR',
        instruction: 'Click on the PR you want to review.',
        points: [{ x: 0.25, y: 0.5 }]
      },
      {
        caption: 'Open Files tab',
        instruction: 'Click the Files changed tab',
        points: [{ x: 0.42, y: 0.35 }],
      },
      {
        caption: 'Read code',
        instruction: 'At this point in a PR review, you read the code diffs (changes in the code).',
        points: [{ x: 0.35, y: 0.6 }]
      },
      {
        caption: 'Review changes',
        instruction: 'Click the Review changes button',
        points: [{ x: 0.88, y: 0.39 }],
      },
      {
        caption: 'Add comment',
        instruction: 'Add your review comment and choose review type',
        points: [{ x: 0.88, y: 0.55 }],
      },
      {
        caption: 'Submit',
        instruction: 'Click Submit review',
        points: [{ x: 0.89, y: 0.83 }],
      }
    ]
  },
  {
    id: 'github-ui-tutorial',
    source: 'static',
    title: 'Create a repository using the GitHub UI',
    topic: 'GitHub Basics',
    description: "Learn how to create a new repository step-by-step using GitHub's website.",
    isRecent: true,
    steps: [
      {
        caption: 'Open menu',
        instruction: 'Click the "+" icon in the top right of GitHub.',
        points: [{ x: 0.96, y: 0.08 }],
      },
      {
        caption: 'Select "New repository"',
        instruction: 'From the dropdown menu, select "New repository".',
        points: [{ x: 0.93, y: 0.13 }],
      },
      {
        caption: 'Name Repository',
        instruction: 'Enter a unique Repository name.',
        points: [{ x: 0.4, y: 0.30 }],
      },
      {
        caption: 'Add Description',
        instruction: 'Optionally, enter a description for your repository.',
        points: [{ x: 0.4, y: 0.35 }]
      },
      {
        caption: 'Choose Visibility',
        instruction: 'Select repository visibility: Public or Private.',
        points: [{ x: 0.4, y: 0.40 }]
      },
      {
        caption: 'Initialize Repository',
        instruction: 'Optionally check "Add a README file" to give your repository a home page document.',
        points: [{ x: 0.43, y: 0.58 }],
      },
      {
        caption: 'Create Repo',
        instruction: 'Click the "Create repository" button to finish.',
        points: [{ x: 0.45, y: 0.72 }],
      }
    ]
  },
  {
    id: 'onboarding',
    source: 'static',
    title: 'Onboarding',
    topic: 'Getting Started',
    isRecent: true,
    steps: [
      {
        instruction: 'Welcome!',
      }
    ]
  }
]

const topics = [
  {
    id: 'github-basics',
    name: 'GitHub Basics',
    description: 'Use GitHub to collaborate on code repositories.',
    icon: '▷'
  },
  {
    id: 'git-cli',
    name: 'Git CLI',
    icon: '▷'
  },
]

export const githubMode: AppModeConfig = {
  id: 'github',
  name: 'GitHub',
  description: 'Learn how to use GitHub for code collaboration',
  guides,
  topics,
  welcomeMessage: "I can help you get started! Try selecting one of the guides above, or ask me a specific question about GitHub workflows.",
  aiContextPrompt: "The user is working with GitHub. When providing guidance, assume they are viewing GitHub's web interface or using Git commands."
}

