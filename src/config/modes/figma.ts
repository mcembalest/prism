// Figma mode configuration
import type { AppModeConfig } from '@/types/app-mode'
import type { GuideDefinition } from '@/types/guide'

const guides: GuideDefinition[] = [
  {
    source: 'static',
    id: 'crop-image',
    title: 'Crop an image',
    topic: 'Basics',
    description: 'Learn how to crop an image in Figma',
    isRecent: true,
    steps: [
      {
        caption: 'Select Image',
        instruction: 'Select the image you want to crop',
        points: [{ x: 0.5, y: 0.5 }]
      },
      {
        caption: 'Click image in Fill',
        instruction: 'Click the image icon in Fill in the toolbar',
        points: [{ x: 0.85, y: 0.73 }]
      },
      {
        caption: 'Click dropdown',
        instruction: "Click the dropdown that currently says 'Fill' in the image editing window",
        points: [{ x: 0.65, y: 0.42 }]
      },
      {
        caption: 'Choose crop',
        instruction: "Change to crop mode by clicking Crop",
        points: [{ x: 0.65, y: 0.48 }]
      },
      {
        caption: 'Adjust your Image',
        instruction: 'Adjust the image to your liking by dragging the handles',
        points: [{ x: 0.5, y: 0.5 }]
      },
      {
        caption: 'Click on background to save',
        instruction: 'Click outside the editing window on the background canvas to save your image crop edit',
        points: [{ x: 0.15, y: 0.85 }]
      },
    ]
  },
  {
    source: 'static',
    id: 'create-frame',
    title: 'Create a new frame',
    topic: 'Basics',
    description: 'Learn how to create frames in Figma',
    isRecent: true,
    steps: [
      {
        caption: 'Select Frame Tool',
        instruction: 'Press F or click the Frame tool in the toolbar',
        points: [{ x: 0.1, y: 0.05 }]
      },
      {
        caption: 'Choose Frame Size',
        instruction: 'Select a frame size from the options (e.g., Desktop, Mobile, Tablet)',
        points: [{ x: 0.5, y: 0.2 }]
      },
      {
        caption: 'Draw Frame',
        instruction: 'Click and drag on the canvas to create your frame'
      }
    ]
  },
  {
    source: 'static',
    id: 'add-components',
    title: 'Add components to your design',
    topic: 'Basics',
    description: 'Learn how to use components in Figma',
    isRecent: true,
    steps: [
      {
        instruction: 'Open the Assets panel (or press Option+2)',
        points: [{ x: 0.95, y: 0.2 }]
      },
      {
        instruction: 'Browse or search for the component you need',
        points: [{ x: 0.84, y: 0.5 }]
      },
      {
        instruction: 'Drag the component onto your frame'
      }
    ]
  },
  {
    source: 'static',
    id: 'export-assets',
    title: 'Export design assets',
    topic: 'Export',
    steps: [
      {
        instruction: 'Select the element or frame you want to export'
      },
      {
        instruction: 'Open the Export section in the right sidebar',
        points: [{ x: 0.915, y: 0.6 }]
      },
      {
        instruction: 'Click the + icon to add an export format (PNG, SVG, PDF, etc.)',
        points: [{ x: 0.88, y: 0.55 }]
      },
      {
        instruction: 'Click "Export" to save your assets',
        points: [{ x: 0.9, y: 0.75 }]
      }
    ]
  },
  {
    source: 'static',
    id: 'prototype-flow',
    title: 'Create a prototype flow',
    topic: 'Prototyping',
    steps: [
      {
        instruction: 'Switch to Prototype mode using the toggle at the top right',
        points: [{ x: 0.85, y: 0.05 }]
      },
      {
        instruction: 'Select an element and drag the connection point to another frame'
      },
      {
        instruction: 'Configure the interaction (on click, hover, etc.)',
        points: [{ x: 0.915, y: 0.4 }]
      },
      {
        instruction: 'Click the Play button to preview your prototype',
        points: [{ x: 0.9, y: 0.02 }]
      }
    ]
  }
]

const topics = [
  {
    id: 'basics',
    name: 'Basics',
    description: 'Learn the fundamentals of designing in Figma',
    icon: '▷'
  },
  {
    id: 'components',
    name: 'Components & Styles',
    icon: '▷'
  },
  {
    id: 'prototyping',
    name: 'Prototyping',
    icon: '▷'
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    icon: '▷'
  }
]

export const figmaMode: AppModeConfig = {
  id: 'figma',
  name: 'Figma',
  description: 'Learn how to design and prototype in Figma',
  guides,
  topics,
  welcomeMessage: "I can help you get started! Try selecting one of the guides above, or ask me a specific question about using Figma.",
  aiContextPrompt: "The user is working with Figma design software. When providing guidance, assume they are using the Figma desktop app or web interface. Familiar UI elements include frames, components, the assets panel, and prototype mode."
}

