// GitHub mode configuration
import type { AppModeConfig } from '@/types/app-mode'
import type { PrebuiltGuide } from '@/types/walkthrough'

const guides: PrebuiltGuide[] = [
  {
    id: 'review-pr',
    title: 'Review a pull request',
    topic: 'Git Basics',
    description: 'Learn how to review code changes in a pull request on GitHub',
    isRecent: true,
    steps: [
      {
        caption: 'Open PR tab',
        instruction: 'Navigate to the Pull Requests (PR) tab',
        points: [{ x: 0.20, y: 0.20 }]
      },
      {
        caption: 'Pick a PR',
        instruction: 'Click on the PR you want to review.',
        observation: 'Looks like you have two open PRs here.',
        points: [{ x: 0.25, y: 0.5 }]
      },
      {
        caption: 'Open Files tab',
        instruction: 'Click the Files changed tab',
        points: [{ x: 0.42, y: 0.35 }]
      },
      {
        caption: 'Read code',
        instruction: 'At this point in a PR review, you read the code diffs (changes in the code).',
        observation: 'Looks like this is a simple change to the README file.',
        points: [{ x: 0.35, y: 0.6 }]
      },
      {
        caption: 'Review changes',
        instruction: 'Click the Review changes button',
        points: [{ x: 0.88, y: 0.39 }]
      },
      {
        caption: 'Add comment',
        instruction: 'Add your review comment and choose review type',
        points: [{ x: 0.88, y: 0.55 }]
      },
      {
        caption: 'Submit',
        instruction: 'Click Submit review',
        points: [{ x: 0.89, y: 0.83 }]
      }
    ]
  },
  {
    id: 'init-repo',
    title: 'Initialize a new repository',
    topic: 'Git Basics',
    description: 'Create a new Git repository from scratch',
    isRecent: true,
    isCompleted: false,
    steps: [
      {
        instruction: 'Open Terminal and navigate to your project directory using cd < folder >',
        hint: 'Use the cd command to change directories. For example: cd ~/Documents/my-project',
        points: [{ x: 0.5, y: 0.15 }]
      },
      {
        instruction: 'Run git init to initialize an empty repository',
        hint: 'This creates a new .git subdirectory in your project with all necessary repository files',
        points: [{ x: 0.5, y: 0.35 }]
      },
      {
        instruction: 'Add files to staging with git add .',
        hint: 'The dot (.) adds all files. You can also specify individual files',
        points: [{ x: 0.5, y: 0.55 }]
      },
      {
        instruction: 'Create your first commit with git commit -m "Initial commit"',
        hint: 'The -m flag lets you add a commit message inline',
        points: [{ x: 0.5, y: 0.75 }]
      }
    ]
  },
  {
    id: 'clone-repo',
    title: 'Clone an existing repository',
    topic: 'Git Basics',
    steps: [
      {
        instruction: 'Find the repository URL on GitHub',
        hint: 'Click the green "Code" button and copy the HTTPS or SSH URL',
        points: [{ x: 0.85, y: 0.2 }]
      },
      {
        instruction: 'Open Terminal and navigate to where you want the repo',
        hint: 'Use cd to navigate to your desired parent directory',
        points: [{ x: 0.5, y: 0.15 }]
      },
      {
        instruction: 'Run git clone <url>',
        hint: 'Paste the URL you copied. This creates a new directory with the repo name',
        points: [{ x: 0.5, y: 0.35 }]
      }
    ]
  },
  {
    id: 'make-commit',
    title: 'Make a commit',
    topic: 'Git Basics',
    steps: [
      {
        instruction: 'Make changes to your files',
        hint: 'Edit, add, or delete files in your project',
        points: [{ x: 0.5, y: 0.4 }]
      },
      {
        instruction: 'Stage your changes with git add',
        hint: 'Use git add . for all changes or git add <filename> for specific files',
        points: [{ x: 0.5, y: 0.35 }]
      },
      {
        instruction: 'Commit with git commit -m "Your message"',
        hint: 'Write a clear, concise commit message describing what changed',
        points: [{ x: 0.5, y: 0.55 }]
      }
    ]
  },
  {
    id: 'push-commits',
    title: 'Push Commits to GitHub',
    topic: 'Git Basics',
    steps: [
      {
        instruction: 'Ensure you have commits to push',
        hint: 'Run git status to see if you have commits that aren\'t on the remote',
        points: [{ x: 0.5, y: 0.25 }]
      },
      {
        instruction: 'Run git push origin main',
        hint: 'Replace "main" with your branch name if different. You may need to authenticate',
        points: [{ x: 0.5, y: 0.45 }]
      }
    ]
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    topic: 'Getting Started',
    isRecent: true,
    isCompleted: true,
    steps: [
      {
        instruction: 'Welcome to the platform!',
        hint: 'This is a sample completed guide'
      }
    ]
  }
]

const topics = [
  {
    id: 'git-basics',
    name: 'Git Basics',
    description: 'Learn the basics of using GitHub to collaborate on code repositories.',
    icon: '▷'
  },
  {
    id: 'conflict-resolution',
    name: 'Conflict Resolution',
    icon: '▷'
  },
  {
    id: 'branching-merging',
    name: 'Branching and merging',
    icon: '▷'
  },
  {
    id: 'github-cli',
    name: 'GitHub CLI',
    icon: '▷'
  },
  {
    id: 'issues-templates',
    name: 'Issues and Templates',
    icon: '▷'
  }
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

