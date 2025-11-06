// Zoom mode configuration
import type { AppModeConfig } from '@/types/app-mode'
import type { GuideDefinition } from '@/types/guide'

const guides: GuideDefinition[] = [
  {
    id: 'join-meeting',
    source: 'static',
    title: 'Join a Zoom meeting',
    topic: 'Getting Started',
    description: 'Learn how to join a Zoom video conference',
    isRecent: true,
    steps: [
      {
        caption: 'Click Join',
        instruction: 'Click the "Join" button in the Zoom application',
        points: [{ x: 0.5, y: 0.4 }]
      },
      {
        caption: 'Enter Meeting ID',
        instruction: 'Enter the meeting ID provided by the host',
        points: [{ x: 0.5, y: 0.55 }]
      },
      {
        caption: 'Join Meeting',
        instruction: 'Click "Join" to enter the meeting',
        points: [{ x: 0.5, y: 0.7 }]
      }
    ]
  },
  {
    id: 'start-meeting',
    source: 'static',
    title: 'Start a new meeting',
    topic: 'Hosting',
    description: 'Learn how to start your own Zoom meeting',
    isRecent: true,
    steps: [
      {
        instruction: 'Click "New Meeting" in the Zoom application',
        points: [{ x: 0.3, y: 0.3 }]
      },
      {
        instruction: 'Choose whether to start with video on or off',
        points: [{ x: 0.5, y: 0.45 }]
      },
      {
        instruction: 'Your meeting will start immediately'
      }
    ]
  },
  {
    id: 'share-screen',
    source: 'static',
    title: 'Share screen',
    topic: 'Hosting',
    steps: [
      {
        instruction: 'Click the "Share Screen" button at the bottom of the meeting window',
        points: [{ x: 0.75, y: 0.95 }]
      },
      {
        instruction: 'Select which screen or window you want to share',
        points: [{ x: 0.5, y: 0.45 }]
      },
      {
        instruction: 'Click "Share" to begin sharing',
        points: [{ x: 0.8, y: 0.85 }]
      }
    ]
  },
  {
    id: 'guest-share-screen',
    source: 'static',
    title: 'Guest share screen',
    topic: 'Hosting',
    description: 'Learn how to let a guest share their screen in a Zoom meeting',
    isRecent: true,
    steps: [
      {
        instruction: 'Click the carrot in the corner of the "Share Screen" button at the bottom of the Zoom meeting window',
        points: [{ x: 0.5, y: 0.87 }]
      },
      {
        instruction: "Click 'Multiple participants can share simultaneously'",
        points: [{ x: 0.8, y: 0.8 }]
      }
    ]
  }
]

const topics = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of joining and participating in Zoom meetings',
    icon: '▷'
  },
  {
    id: 'hosting',
    name: 'Hosting',
    description: 'Learn how to host and manage Zoom meetings',
    icon: '▷'
  },
  {
    id: 'basics',
    name: 'Basic Features',
    icon: '▷'
  },
  {
    id: 'advanced',
    name: 'Advanced Features',
    icon: '▷'
  }
]

export const zoomMode: AppModeConfig = {
  id: 'zoom',
  name: 'Zoom',
  description: 'Learn how to use Zoom for video conferencing',
  guides,
  topics,
  welcomeMessage: "I can help you get started! Try selecting one of the guides above, or ask me a specific question about using Zoom.",
  aiContextPrompt: "The user is working with Zoom video conferencing software. When providing guidance, assume they are using the Zoom desktop or web application."
}

