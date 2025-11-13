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
    steps: [
      {
        caption: 'Go to homepage',
        instruction: 'Go to the homepage by clicking your logo in the top left corner.'
      },
      {
        caption: 'Open Text and Titles tab',
        instruction: 'Navigate to the "Text and Titles" tab in the Content Management System (CMS). This tab is the one with the A & I icon.'
      },
      {
        caption: 'Change button text',
        instruction: 'Change the start button text by typing in the text box underneath "Start Button Text".'
      }
    ]
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
    steps: [
      {
        caption: 'Open folder',
        instruction: 'Within the folder, navigate to the "Text and Titles" tab in the Content Management System (CMS). This tab is the one with the A & I icon.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Select "Advanced Features".'
      },
      {
        caption: 'Customize filter names',
        instruction: 'Here you can customize the names of the dropdown filters.'
      }
    ]
  },
  {
    source: 'static',
    id: 'edit-folder-card-background',
    title: 'How do I edit the card background for a specific folder card?',
    topic: 'Editing Folders',
    isRecent: true,
    steps: [
      {
        caption: 'Open folder',
        instruction: 'Go into the folder you would like to edit the card image for.'
      },
      {
        caption: 'Open Images and Videos tab',
        instruction: 'Navigate to the "Images and Videos" tab within the CMS.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Select "Advanced Features".'
      },
      {
        caption: 'Find Card Background section',
        instruction: 'Scroll down until you see "Card Background (for card on previous page)".'
      },
      {
        caption: 'Upload image',
        instruction: 'You can drag and drop an image into that slot. That image will then display as the card / folder image on the previous page.'
      }
    ]
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
    steps: [
      {
        caption: 'Open folder',
        instruction: 'Within the folder, navigate to the "Text and Titles" tab in the Content Management System (CMS). This tab is the one with the A & I icon.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Select "Advanced Features".'
      },
      {
        caption: 'Find Folder Description',
        instruction: 'Scroll down to the bottom until you see "Folder Description".'
      },
      {
        caption: 'Add description',
        instruction: 'Here you can add a folder description that will display at the top of the page.'
      }
    ]
  },

  // Editing Profiles
  {
    source: 'static',
    id: 'upload-default-headshot',
    title: 'Can I upload a default headshot for profiles in a folder?',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: [
      {
        caption: 'Open Images and Videos tab',
        instruction: 'Navigate to the "Images and Videos" tab within the CMS.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Select "Advanced Features".'
      },
      {
        caption: 'Upload default image',
        instruction: 'Here you can drag and drop an image into the "Default Profile Image" slot which will automatically make any profile within that folder use that image as its profile picture (if it does not already have a different profile picture).'
      }
    ]
  },
  {
    source: 'static',
    id: 'change-date-format',
    title: 'Change the date format of profiles',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: [
      {
        caption: 'Go to folder',
        instruction: 'Go to the folder that contains the profiles you want to change the date format of.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Go to the Advanced Features section of the Settings tab (first tab).'
      },
      {
        caption: 'Select date format',
        instruction: 'Select your desired format from the Date Format dropdown menu.'
      }
    ]
  },
  {
    source: 'static',
    id: 'change-date-format-alt',
    title: 'How do I change the date format of profiles?',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: [
      {
        caption: 'Open Settings tab',
        instruction: 'Navigate to the "Settings" tab within the CMS.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Click on "Advanced Features".'
      },
      {
        caption: 'Select date format',
        instruction: 'Select the dropdown titled "Date Format" to choose which format you would like dates to appear in.'
      }
    ]
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
        instruction: 'Go to the settings tab (first tab).'
      },
      {
        caption: 'Entry Layout Options',
        instruction: 'Click on Entry Layout Options.'
      },
      {
        caption: 'Select yearbook layout',
        instruction: 'Scroll down and select the yearbook layout.'
      },
      {
        caption: 'Open Flip Book editor',
        instruction: 'Go to the media tab (3rd tab) and click "Editing Flip Book".'
      },
      {
        caption: 'Upload PDF content',
        instruction: 'If you have a PDF, upload the PDF into the modal. Note that the max file size for PDFs is 50MB. You can use a free online compressor if your PDF is over 50MB e.g. FreeConvert.'
      },
      {
        caption: 'Upload image content',
        instruction: 'If you have images, select the first one, hold shift and select the last one, then drag and drop them all into the upload modal. They will upload in the order that you selected them. Keep the modal open until they have all uploaded.'
      },
      {
        caption: 'Add table of contents',
        instruction: 'Once you close the modal, click "Edit Table of Contents" if you would like one. Add headings and their respective page numbers. You can also add subheadings underneath headings.'
      }
    ]
  },
  {
    source: 'static',
    id: 'change-profile-slideshow-labels',
    title: 'How to change the labels of profile slideshows?',
    topic: 'Editing Profiles',
    isRecent: true,
    steps: [
      {
        caption: 'Go to folder',
        instruction: 'Go to the folder that contains profiles with a slideshow layout.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'In the Advanced Features section of the Text tab (second tab), find the slideshow label options.'
      },
      {
        caption: 'Edit labels',
        instruction: 'Edit "Slideshow Image Tab Name" and "Slideshow Video Tab Name" to customize the labels "Images" and "Videos" on a folder basis.'
      }
    ]
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
    steps: [
      {
        caption: 'Select slideshow layout',
        instruction: 'Select a "Slideshow/Video" Layout within the "Profile Layout Options". This can be found in the "Settings" tab of the CMS.'
      },
      {
        caption: 'Open Images tab',
        instruction: 'Navigate to the Images tab and select "Edit Slideshow Items".'
      },
      {
        caption: 'Upload media',
        instruction: 'Drag and drop multiple photos or videos here.'
      }
    ]
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
    steps: [
      {
        caption: 'Go to homepage',
        instruction: 'Go to the homepage by clicking your logo in the top left corner.'
      },
      {
        caption: 'Open Text and Titles tab',
        instruction: 'Navigate to the "Text and Titles" tab in the Content Management System (CMS). This tab is the one with the A & I icon.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Select "Advanced Features".'
      },
      {
        caption: 'Edit description',
        instruction: 'Change the default profile descriptions by typing in the text box underneath "Default Profile Description".'
      }
    ]
  },

  // Getting Started
  {
    source: 'static',
    id: 'cms-tutorial',
    title: 'CMS Tutorial',
    topic: 'Getting Started',
    isRecent: true,
    steps: [
      {
        caption: 'Welcome to Rocket',
        instruction: 'Welcome to Rocket Alumni Solutions. This tutorial will help you get your virtual hall of fame set up.'
      },
      {
        caption: 'CMS Overview',
        instruction: 'This is the content management system. On the left you can see what is on your touch screen and on the right side is the formatting panel with four tabs: Settings, Text, Content, and Colors. This is where you can set up and modify your touch screen.'
      },
      {
        caption: 'Change title text',
        instruction: 'To change the title on your touch screen, go to the Text tab and modify the name there.'
      },
      {
        caption: 'Create a folder',
        instruction: 'Click "Add Content" > "Folder". You can use the site builder to add multiple sections at once. When a folder is in progress, click the eye icon to hide it until it\'s ready. To title your new folder, click on it and hit the text button to modify the title.'
      },
      {
        caption: 'Add profiles',
        instruction: 'Inside a folder you can add more folders or add a profile. When you are in a profile you can add name, photo and information. Apply different layout options in the Settings tab.'
      },
      {
        caption: 'Bulk upload',
        instruction: 'Click the bulk upload button, copy the template, put your info into the template, then upload the sheet. You can view bulk edit mode to edit multiple items at once.'
      },
      {
        caption: 'Get help',
        instruction: 'If you have any questions, contact Rocket Alumni Solutions support.'
      }
    ]
  },
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
    id: 'add-change-logo',
    title: 'How to add/change your logo',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: [
      {
        caption: 'Open CMS editor',
        instruction: 'Open the CMS editor by pressing the top right button.',
        points: [{ x: 0.95, y: 0.15}],
        captionPosition: 'up-left'
      },
      {
        caption: 'Go to homepage',
        instruction: 'Go to the homepage by pressing the top left logo.',
        points: [{ x: 0.07, y: 0.3 }]
      },
      {
        caption: 'Open Media Tab',
        instruction: 'Go to the Media Tab.',
        points: [{ x: 0.88, y: 0.15 }]
      },
      {
        caption: 'Click logo',
        instruction: 'Click your existing logo to swap it out for a new one.',
        points: [{ x: 0.78, y: 0.31 }]
      },
      {
        caption: "Click Media Library",
        instruction: "Click 'Add from Media Library...'",
        points: [{ x: 0.75, y: 0.8 }]
      },
      {
        caption: 'Choose logo',
        instruction: 'Choose your new logo from the media library.',
      },
      {
        caption: "Click Overwrite",
        instruction: "Click 'Overwrite media item' to apply the changes.",
        points: [{ x: 0.75, y: 0.8 }]
      }
    ]
  },
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
    steps: [
      {
        caption: 'Open trash',
        instruction: 'Click on the trash icon in the bottom right corner of the screen (when viewing the CMS).'
      },
      {
        caption: 'Restore items',
        instruction: 'You can restore recently deleted folders and profiles.'
      }
    ]
  },
  {
    source: 'static',
    id: 'site-navigation-open-default',
    title: 'Can I set the site navigation to be open by default?',
    topic: 'Tips & Tricks',
    isRecent: true,
    steps: [
      {
        caption: 'Understanding site navigator',
        instruction: 'The site navigator allows quick navigation to any folder on your site. It will always appear on your live site, but will be closed by default.'
      },
      {
        caption: 'Go to main folders page',
        instruction: 'Navigate to your main folders page.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Click on the Advanced Features section of the gear tab.'
      },
      {
        caption: 'Toggle setting',
        instruction: 'Toggle "Site Navigation Default Open".'
      }
    ]
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
    steps: [
      {
        caption: 'Open folder to move',
        instruction: 'Open the folder you want to move.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Click "Advanced Features" under the Settings & Layout tab.'
      },
      {
        caption: 'Select destination',
        instruction: 'Select the "Move Folder Location" dropdown menu and choose the destination folder. Note that the destination folder must contain at least one folder, not a profile.'
      },
      {
        caption: 'Moving Profiles',
        instruction: 'To move profiles: Open the profile, click "Advanced Features" under Settings & Layout, select "Move Profile Location" dropdown. The destination folder must contain at least one profile and cannot contain a subfolder.'
      }
    ]
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
    steps: [
      {
        caption: 'Navigate to main folders',
        instruction: 'Navigate to the main folders page.'
      },
      {
        caption: 'Open Advanced Features',
        instruction: 'Click on the Advanced Features section of the gear tab.'
      },
      {
        caption: 'Toggle QR code',
        instruction: 'Toggle "Show Footer QR". This will display a QR code on the bottom-right of your site that will open up your site on a phone when scanned. Keep in mind that the QR will only show up on touchscreens!'
      }
    ]
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
    steps: [
      {
        caption: 'Go to homepage',
        instruction: 'Go to the homepage by clicking your logo in the top left corner.'
      },
      {
        caption: 'Open Images and Videos tab',
        instruction: 'Navigate to the "Images and Videos" tab in the Content Management System (CMS). This tab is the one with the photo and video icon.'
      },
      {
        caption: 'Upload logo',
        instruction: 'Under "Primary Logo" you can drag and drop the image you want to be displayed as the logo throughout the site.'
      }
    ]
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
    steps: [
      {
        caption: 'Go to trash',
        instruction: 'Click on the trash icon in the bottom right corner of the screen when viewing the CMS.'
      },
      {
        caption: 'Restore items',
        instruction: 'You can restore recently deleted folders and profiles from the trash page. Note: There is no way to recover deleted images, videos, and logos.'
      }
    ]
  }
]

const topics = [
  {
    id: 'editing-homepage',
    name: 'Editing Homepage',
    description: 'Learn how to customize your homepage layout and content',
    icon: '●'
  },
  {
    id: 'editing-folders',
    name: 'Editing Folders',
    description: 'Manage and customize folders for organizing content',
    icon: '●'
  },
  {
    id: 'editing-profiles',
    name: 'Editing Profiles',
    description: 'Create and customize profile pages and yearbooks',
    icon: '●'
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential guides to help you get up and running',
    icon: '●'
  },
  {
    id: 'tips-tricks',
    name: 'Tips & Tricks',
    description: 'Advanced tips and best practices for managing your site',
    icon: '●'
  },
  {
    id: 'administrative',
    name: 'Administrative',
    description: 'User management, security, and administrative tasks',
    icon: '●'
  }
]

export const rocketalumniMode: AppModeConfig = {
  id: 'rocketalumni',
  name: 'Rocket Alumni',
  description: 'Learn how to use Rocket Alumni Solutions to manage your alumni website',
  guides,
  topics,
  welcomeMessage: "I can help you get started with Rocket Alumni! Try selecting one of the guides above, or ask me a specific question about managing your site.",
  aiContextPrompt: "The user is working with Rocket Alumni Solutions, a platform for creating and managing alumni websites and touchscreen kiosks. You are a knowledge base retrieval agent for Rocket Alumni Solutions, a company that provides TVs and setup software to educational institutions with mounted TVs in hallways. The software sets up those TVs, and the knowledge base explains how to use the software to customize the TVs. When providing guidance, assume they are working in the Rocket Alumni admin interface to manage folders, profiles, layouts, and site content."
}

