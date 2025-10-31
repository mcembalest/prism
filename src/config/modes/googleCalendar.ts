// Google Calendar mode configuration
import type { AppModeConfig } from '@/types/app-mode'
import type { PrebuiltGuide } from '@/types/walkthrough'

const guides: PrebuiltGuide[] = [
  {
    id: 'view-shared-calendar',
    title: 'View someone else\'s shared calendar',
    topic: 'Sharing',
    description: 'Display a calendar that someone has shared with you',
    isRecent: true,
    steps: [
      {
        caption: 'Open left sidebar',
        instruction: 'Look at the left sidebar where all calendars are listed',
        points: [{ x: 0.15, y: 0.3 }]
      },
      {
        caption: 'Find shared calendar',
        instruction: 'Scroll down to find "Other calendars" section',
        points: [{ x: 0.15, y: 0.6 }]
      },
      {
        caption: 'Check the box',
        instruction: 'Click the checkbox next to the shared calendar name to display it',
        points: [{ x: 0.12, y: 0.65 }],
      },
      {
        caption: 'View options',
        instruction: 'Hover over the calendar name and click the three-dot menu for more options',
        points: [{ x: 0.18, y: 0.65 }],
        observation: 'You can change the calendar color, hide it, or adjust notification settings.'
      }
    ]
  },
  {
    id: 'create-event',
    title: 'Create a new calendar event',
    topic: 'Calendar Basics',
    description: 'Create a new event on your calendar',
    isRecent: true,
    steps: [
      {
        caption: 'Click Create button',
        instruction: 'Click the "+ Create" button in the top left',
        points: [{ x: 0.12, y: 0.12 }]
      },
      {
        caption: 'Select Event',
        instruction: 'Click "Event" from the dropdown menu',
        points: [{ x: 0.15, y: 0.18 }]
      },
      {
        caption: 'Add event title',
        instruction: 'Enter a title for your event',
        points: [{ x: 0.5, y: 0.25 }]
      },
      {
        caption: 'Set date and time',
        instruction: 'Click the date and time fields to set when your event occurs',
        points: [{ x: 0.4, y: 0.35 }]
      },
      {
        caption: 'Add guests',
        instruction: 'Optionally, add guests by typing their email addresses',
        points: [{ x: 0.5, y: 0.45 }],
      },
      {
        caption: 'Add description',
        instruction: 'Add any additional details or notes in the description field',
        points: [{ x: 0.5, y: 0.55 }]
      },
      {
        caption: 'Save event',
        instruction: 'Click "Save" to add the event to your calendar',
        points: [{ x: 0.45, y: 0.75 }]
      }
    ]
  },
  {
    id: 'share-calendar',
    title: 'Share your calendar',
    topic: 'Sharing',
    description: 'Share your calendar with others',
    isRecent: true,
    steps: [
      {
        caption: 'Find your calendar',
        instruction: 'In the left sidebar, find your calendar under "My calendars"',
        points: [{ x: 0.15, y: 0.4 }]
      },
      {
        caption: 'Open settings',
        instruction: 'Hover over your calendar name and click the three-dot menu',
        points: [{ x: 0.18, y: 0.4 }]
      },
      {
        caption: 'Select Settings',
        instruction: 'Click "Settings and sharing" from the menu',
        points: [{ x: 0.22, y: 0.48 }]
      },
      {
        caption: 'Share with people',
        instruction: 'Scroll down to "Share with specific people" section',
        points: [{ x: 0.5, y: 0.5 }]
      },
      {
        caption: 'Add person',
        instruction: 'Click "+ Add people" and enter their email address',
        points: [{ x: 0.45, y: 0.55 }]
      },
      {
        caption: 'Set permissions',
        instruction: 'Choose the permission level (See all event details, Make changes, etc.)',
        points: [{ x: 0.5, y: 0.62 }],
        observation: 'Different permission levels control what the person can see and do with your calendar.'
      },
      {
        caption: 'Send invite',
        instruction: 'Click "Send" to share your calendar',
        points: [{ x: 0.55, y: 0.7 }]
      }
    ]
  },
  {
    id: 'recurring-event',
    title: 'Create a recurring event',
    topic: 'Calendar Basics',
    description: 'Set up events that repeat on a schedule',
    isRecent: true,
    steps: [
      {
        caption: 'Create event',
        instruction: 'Click "+ Create" and select "Event"',
        points: [{ x: 0.12, y: 0.12 }]
      },
      {
        caption: 'Add event details',
        instruction: 'Enter the event title and set the initial date and time',
        points: [{ x: 0.5, y: 0.3 }]
      },
      {
        caption: 'Find recurrence',
        instruction: 'Click "Does not repeat" dropdown menu',
        points: [{ x: 0.4, y: 0.42 }]
      },
      {
        caption: 'Select pattern',
        instruction: 'Choose a recurrence pattern (Daily, Weekly, Monthly, etc.)',
        points: [{ x: 0.4, y: 0.5 }],
      },
      {
        caption: 'Custom recurrence',
        instruction: 'For custom patterns, select "Custom..." at the bottom of the menu',
        points: [{ x: 0.4, y: 0.7 }],
        observation: 'Custom recurrence lets you specify exact days, frequency, and end dates.'
      },
      {
        caption: 'Save event',
        instruction: 'Click "Save" to create the recurring event',
        points: [{ x: 0.45, y: 0.75 }]
      }
    ]
  },
  {
    id: 'add-google-meet',
    title: 'Add Google Meet to an event',
    topic: 'Video Conferencing',
    description: 'Add a video conference link to your calendar event',
    isRecent: true,
    steps: [
      {
        caption: 'Create or edit event',
        instruction: 'Create a new event or click an existing event to edit it',
        points: [{ x: 0.5, y: 0.5 }]
      },
      {
        caption: 'Add Meet link',
        instruction: 'Click "Add Google Meet video conferencing"',
        points: [{ x: 0.45, y: 0.48 }]
      },
      {
        caption: 'Meet link added',
        instruction: 'A Google Meet link is automatically generated and added to the event',
        observation: 'Guests will receive the Meet link in their invitation.',
        points: [{ x: 0.5, y: 0.52 }]
      },
      {
        caption: 'Save event',
        instruction: 'Click "Save" to finalize the event with the Meet link',
        points: [{ x: 0.45, y: 0.75 }]
      }
    ]
  },
  {
    id: 'change-calendar-view',
    title: 'Change calendar view',
    topic: 'Calendar Basics',
    description: 'Switch between day, week, month, and other views',
    isRecent: false,
    steps: [
      {
        caption: 'Find view options',
        instruction: 'Look for the view selector in the top right area',
        points: [{ x: 0.85, y: 0.12 }]
      },
      {
        caption: 'Select view',
        instruction: 'Click on Day, Week, Month, Year, or Schedule view',
        points: [{ x: 0.85, y: 0.12 }],
      },
      {
        caption: 'Try Schedule view',
        instruction: 'Schedule view shows your events in a list format without time blocks',
        points: [{ x: 0.92, y: 0.12 }]
      }
    ]
  }
]

const topics = [
  {
    id: 'calendar-basics',
    name: 'Calendar Basics',
    description: 'Create events and manage your calendar',
    icon: '▷'
  },
  {
    id: 'sharing',
    name: 'Sharing',
    description: 'Share your calendar with others and view shared calendars',
    icon: '▷'
  },
  {
    id: 'video-conferencing',
    name: 'Video Conferencing',
    description: 'Add and manage video conference links in your events',
    icon: '▷'
  },
  {
    id: 'advanced',
    name: 'Advanced Features',
    description: 'Use advanced calendar features and settings',
    icon: '▷'
  }
]

export const googleCalendarMode: AppModeConfig = {
  id: 'gcal',
  name: 'Google Calendar',
  description: 'Use Google Calendar for scheduling and time management',
  guides,
  topics,
  welcomeMessage: "I can help you get started with Google Calendar! Try selecting one of the guides above, or ask me a specific question about managing your schedule.",
  aiContextPrompt: "The user is working with Google Calendar. When providing guidance, assume they are viewing Google Calendar's web interface at calendar.google.com."
}
