// Rocket Alumni mode configuration
import type { AppModeConfig } from '@/types/app-mode'
import type { GuideDefinition } from '@/types/guide'

const guides: GuideDefinition[] = [
  // Editing Homepage
  {
    source: 'static',
    id: 'change-header-style',
    title: 'How can I change the header style?',
    topic: 'Editing Homepage',
    isRecent: true,
    steps: [
      {
        caption: 'Go to homepage',
        instruction: 'Go to the homepage by clicking your logo in the top left corner.',
        points: [{ x: 0.1, y: 0.1 }]
      },
      {
        caption: 'Open Settings and Layouts',
        instruction: 'Navigate to the "Setting and Layouts" tab in the Content Management System (CMS). This tab is the one with the two gears icon.',
        points: [{ x: 0.9, y: 0.1 }]
      },
      {
        caption: 'Edit Header',
        instruction: 'Select "Edit Header".',
        points: [{ x: 0.9, y: 0.5 }]
      },
      {
        caption: 'Choose header style',
        instruction: 'Choose either "Transparent" or "Solid".',
        points: [{ x: 0.7, y: 0.5 }]
      }
    ]
  },
  {
    source: 'static',
    id: 'change-start-button-text',
    title: 'Can I change the text of the start button?',
    topic: 'Editing Homepage',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'edit-announcements',
    title: 'How do I edit announcements on the home layout?',
    topic: 'Editing Homepage',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'motion-graphic-homescreen',
    title: 'How do I get a motion graphic for my homescreen?',
    topic: 'Editing Homepage',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'modify-title-text',
    title: "How do I modify the site's title text?",
    topic: 'Editing Homepage',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'add-video-background',
    title: 'How to add a video background',
    topic: 'Editing Homepage',
    steps: []
  },
  {
    source: 'static',
    id: 'change-slideshow-backgrounds',
    title: 'How to change slideshow backgrounds',
    topic: 'Editing Homepage',
    steps: []
  },
  {
    source: 'static',
    id: 'customize-home-buttons',
    title: 'How to customize home buttons',
    topic: 'Editing Homepage',
    steps: []
  },
  {
    source: 'static',
    id: 'showcase-profile-carousel',
    title: 'Showcase a carousel of profiles on the homepage',
    topic: 'Editing Homepage',
    steps: []
  },

  // Editing Folders
  {
    source: 'static',
    id: 'custom-folder-filter-names',
    title: "Can I give custom names to a folder's dropdown filters?",
    topic: 'Editing Folders',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'edit-folder-card-background',
    title: 'How do I edit the card background for a specific folder card?',
    topic: 'Editing Folders',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'bulk-upload-records',
    title: 'How to bulk upload records',
    topic: 'Editing Folders',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'add-folder-description',
    title: 'Is there a way to add a folder description?',
    topic: 'Editing Folders',
    isRecent: true,
    steps: []
  },

  // Editing Profiles
  {
    source: 'static',
    id: 'upload-default-headshot',
    title: 'Can I upload a default headshot for profiles in a folder?',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'change-date-format',
    title: 'Change the date format of profiles',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'change-date-format-alt',
    title: 'How do I change the date format of profiles?',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'create-yearbook',
    title: 'How to Create a Yearbook',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: [
      {
        caption: 'Select profile',
        instruction: 'Click on the profile you want to place a yearbook in.'
      },
      {
        caption: 'Open settings tab',
        instruction: 'Go to the settings tab (first tab)'
      },
      {
        caption: 'Entry Layout Options',
        instruction: 'Click on Entry Layout Options'
      },
      {
        caption: 'Select yearbook layout',
        instruction: 'Scroll down and select the yearbook layout'
      },
      {
        caption: 'Open Flip Book editor',
        instruction: 'Go to the media tab (3rd tab) and click "Editing Flip Book"'
      },
      {
        caption: 'Upload content',
        instruction: 'If you have a PDF, upload the PDF into the modal. If you have images, upload them into the modal.'
      },
      {
        caption: 'Add table of contents',
        instruction: 'Once you close the modal, click "Edit Table of Contents" if you would like one'
      }
    ]
  },
  {
    source: 'static',
    id: 'change-profile-slideshow-labels',
    title: 'How to change the labels of profile slideshows?',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'embed-website-in-profile',
    title: 'How to embed website in profile',
    topic: 'Editing Profiles',
    steps: []
  },
  {
    source: 'static',
    id: 'profile-display-order',
    title: 'In what order can profiles be displayed?',
    topic: 'Editing Profiles',
    steps: []
  },
  {
    source: 'static',
    id: 'multiple-photos-in-profile',
    title: 'Is it possible to post multiple photos in a profile?',
    topic: 'Editing Profiles',
    steps: []
  },
  {
    source: 'static',
    id: 'default-profile-image',
    title: 'Is there a default image for profile cards?',
    topic: 'Editing Profiles',
    steps: []
  },
  {
    source: 'static',
    id: 'edit-default-profile-description',
    title: 'Where do I edit the default profile description?',
    topic: 'Editing Profiles',
    steps: []
  },

  // Getting Started
  {
    source: 'static',
    id: 'adding-folders',
    title: 'Adding Folders',
    topic: 'Getting Started',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'adding-profiles',
    title: 'Adding Profiles',
    topic: 'Getting Started',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'choosing-switching-layouts',
    title: 'Choosing & Switching Layouts',
    topic: 'Getting Started',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'demo-overview',
    title: 'Demo & Overview',
    topic: 'Getting Started',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'example-sites',
    title: 'Example Sites',
    topic: 'Getting Started',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'getting-started-onboarding',
    title: 'Getting Started - Onboarding',
    topic: 'Getting Started',
    steps: []
  },
  {
    source: 'static',
    id: 'logging-in',
    title: 'Logging In',
    topic: 'Getting Started',
    steps: []
  },
  {
    source: 'static',
    id: 'setting-up-hardware',
    title: 'Setting Up Your Hardware',
    topic: 'Getting Started',
    steps: []
  },
  {
    source: 'static',
    id: 'setting-up-dropdown-menus',
    title: 'Setting up Your Drop Down Menus',
    topic: 'Getting Started',
    steps: []
  },

  // Tips & Tricks
  {
    source: 'static',
    id: 'change-font',
    title: 'Can I change the font?',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: [
      {
        caption: 'Open Settings',
        instruction: 'Click on "Settings" in the bottom right corner of the screen (when viewing the CMS).'
      },
      {
        caption: 'Select Fonts',
        instruction: 'Select "Fonts".'
      },
      {
        caption: 'Change font',
        instruction: 'Here you can change the font of the site or upload a custom one.'
      }
    ]
  },
  {
    source: 'static',
    id: 'restore-deleted',
    title: 'Can I restore a deleted folder/profile?',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'site-navigation-open-default',
    title: 'Can I set the site navigation to be open by default?',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'whitelist-emails',
    title: 'How to Whitelist Emails',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'add-change-logo',
    title: 'How to add/change your logo',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'bulk-upload-profiles',
    title: 'How to bulk upload profiles to a folder',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'change-backgrounds',
    title: 'How to change backgrounds',
    topic: 'Tips & Tricks',
    steps: [
      {
        caption: 'Go to homepage',
        instruction: 'Go to the homepage by pressing the top left logo'
      },
      {
        caption: 'Open media tab',
        instruction: 'Go to the media tab'
      },
      {
        caption: 'Upload background',
        instruction: 'Upload your background to the Background Image field'
      }
    ]
  },
  {
    source: 'static',
    id: 'clear-website-cache',
    title: 'How to clear your website cache',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'custom-backgrounds',
    title: 'How to set custom backgrounds',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'sponsor-logos',
    title: 'Incorporate Sponsor Logos & Raise Money',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'media-specifications',
    title: 'Media Specifications',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'move-folders-profiles',
    title: 'Move folders/profiles',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'media-exceeds-max-size',
    title: 'My media exceeds the maximum file size',
    topic: 'Tips & Tricks',
    steps: []
  },
  {
    source: 'static',
    id: 'qr-code-touchscreen',
    title: 'QR code on every page (touchscreens only)',
    topic: 'Tips & Tricks',
    steps: []
  },

  // Administrative
  {
    source: 'static',
    id: 'firewall-information',
    title: 'Firewall Information',
    topic: 'Administrative',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'upload-primary-logo',
    title: 'How do I upload the primary logo for the site?',
    topic: 'Administrative',
    isRecent: true,
    steps: []
  },
  {
    source: 'static',
    id: 'add-new-user',
    title: 'How to add a new user',
    topic: 'Administrative',
    isRecent: true,
    steps: [
      {
        caption: 'Open Settings',
        instruction: 'Click on "Settings" in the bottom right corner of the screen (when viewing the CMS).'
      },
      {
        caption: 'Select New User',
        instruction: 'Select "New User".'
      },
      {
        caption: 'Add user',
        instruction: 'Here you can add a new user or admin to the site.'
      }
    ]
  },
  {
    source: 'static',
    id: 'recovering-deleted-info',
    title: 'Recovering Deleted Information',
    topic: 'Administrative',
    isRecent: true,
    steps: []
  }
]

const topics = [
  {
    id: 'editing-homepage',
    name: 'Editing Homepage',
    description: 'Learn how to customize your homepage layout and content',
    icon: '▷'
  },
  {
    id: 'editing-folders',
    name: 'Editing Folders',
    description: 'Manage and customize folders for organizing content',
    icon: '▷'
  },
  {
    id: 'editing-profiles',
    name: 'Editing Profiles',
    description: 'Create and customize profile pages and yearbooks',
    icon: '▷'
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential guides to help you get up and running',
    icon: '▷'
  },
  {
    id: 'tips-tricks',
    name: 'Tips & Tricks',
    description: 'Advanced tips and best practices for managing your site',
    icon: '▷'
  },
  {
    id: 'administrative',
    name: 'Administrative',
    description: 'User management, security, and administrative tasks',
    icon: '▷'
  }
]

export const rocketalumniMode: AppModeConfig = {
  id: 'rocketalumni',
  name: 'Rocket Alumni',
  description: 'Learn how to use Rocket Alumni Solutions to manage your alumni website',
  guides,
  topics,
  welcomeMessage: "I can help you get started with Rocket Alumni! Try selecting one of the guides above, or ask me a specific question about managing your site.",
  aiContextPrompt: "The user is working with Rocket Alumni Solutions, a platform for creating and managing alumni websites and touchscreen kiosks. When providing guidance, assume they are working in the Rocket Alumni admin interface to manage folders, profiles, layouts, and site content."
}

