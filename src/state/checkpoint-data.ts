export type CheckpointStatus = 'pending' | 'in-progress' | 'completed'

export type Checkpoint = {
  id: string
  title: string
  status: CheckpointStatus
  product?: string
  prerequisites?: string[]
  evaluationCriteria?: {
    detectableProperties: string[]
    exampleTasks?: string[]
  }
  children?: Checkpoint[]
}

export const defaultCheckpointGraph: Checkpoint[] = [
  {
    id: 'checkpoint-1',
    title: 'Frame-based composition',
    status: 'completed',
    product: 'Figma',
    evaluationCriteria: {
      detectableProperties: [
        'Frame element present in layer tree',
        'Frame has defined bounds (x, y, width, height)',
        'Frame contains at least one child element',
      ],
      exampleTasks: [
        'Create a header section with logo and navigation',
        'Build a card container for a product',
        'Design a sidebar layout',
      ],
    },
    children: [
      {
        id: 'checkpoint-1a',
        title: 'Semantic naming conventions',
        status: 'completed',
        prerequisites: ['checkpoint-1'],
        evaluationCriteria: {
          detectableProperties: [
            'Frame/layer name follows pattern (e.g., "Header", "Card/Content", "Button/Primary")',
            'Name describes purpose, not appearance',
            'Uses consistent casing (PascalCase, kebab-case, etc.)',
          ],
          exampleTasks: [
            'Rename a navigation frame to "Navigation/Main"',
            'Name a group of buttons "Actions/Footer"',
            'Label an image container "Hero/Background"',
          ],
        },
      },
      {
        id: 'checkpoint-1b',
        title: 'Nesting and hierarchy',
        status: 'completed',
        prerequisites: ['checkpoint-1a'],
        evaluationCriteria: {
          detectableProperties: [
            'Parent-child relationships established correctly',
            'Minimum depth of 2 levels (grandparent > parent > child)',
            'Related elements grouped under common parent',
          ],
          exampleTasks: [
            'Nest text and icon inside a button frame',
            'Create a card with header, content, and footer sections',
            'Build a navigation with nested menu items',
          ],
        },
      },
    ],
  },
  {
    id: 'checkpoint-2',
    title: 'Responsive layout systems',
    status: 'in-progress',
    product: 'Figma',
    prerequisites: ['checkpoint-1'],
    evaluationCriteria: {
      detectableProperties: [
        'Frame has layoutMode property (HORIZONTAL or VERTICAL)',
        'Auto layout constraints defined',
        'Layout adapts when content changes',
      ],
      exampleTasks: [
        'Create a horizontal button group that spaces evenly',
        'Build a vertical list that grows with items',
        'Design a navigation bar with auto-distributed items',
      ],
    },
    children: [
      {
        id: 'checkpoint-2a',
        title: 'Spacing and distribution',
        status: 'in-progress',
        prerequisites: ['checkpoint-2'],
        evaluationCriteria: {
          detectableProperties: [
            'itemSpacing property set (gap between children)',
            'primaryAxisAlignMode defined (how items align on main axis)',
            'counterAxisAlignMode defined (cross-axis alignment)',
          ],
          exampleTasks: [
            'Set 16px gap between button group items',
            'Space list items with 8px vertical spacing',
            'Distribute navigation items with 24px gaps',
          ],
        },
      },
      {
        id: 'checkpoint-2b',
        title: 'Padding and margins',
        status: 'pending',
        prerequisites: ['checkpoint-2a'],
        evaluationCriteria: {
          detectableProperties: [
            'paddingLeft, paddingRight, paddingTop, paddingBottom values set',
            'Padding creates internal whitespace',
            'layoutAlign property for margins (in parent auto layout)',
          ],
          exampleTasks: [
            'Add 24px padding inside a card frame',
            'Apply 16px horizontal padding to a button',
            'Create 32px padding around a content section',
          ],
        },
      },
    ],
  },
  {
    id: 'checkpoint-3',
    title: 'Component architecture',
    status: 'pending',
    product: 'Figma',
    prerequisites: ['checkpoint-1', 'checkpoint-2'],
    evaluationCriteria: {
      detectableProperties: [
        'Node type is COMPONENT or INSTANCE',
        'Component has defined properties/variants',
        'Component can be reused across frames',
      ],
      exampleTasks: [
        'Convert a button into a reusable component',
        'Create a card component with variants',
        'Build an icon component library',
      ],
    },
    children: [
      {
        id: 'checkpoint-3a',
        title: 'Shape fundamentals',
        status: 'pending',
        prerequisites: ['checkpoint-3'],
        evaluationCriteria: {
          detectableProperties: [
            'Basic shape nodes present (RECTANGLE, ELLIPSE, POLYGON, etc.)',
            'Shape has fills or strokes defined',
            'Dimensions and positioning set correctly',
          ],
          exampleTasks: [
            'Draw a rounded rectangle for a button background',
            'Create a circle for an avatar placeholder',
            'Design an icon using vector shapes',
          ],
        },
      },
      {
        id: 'checkpoint-3b',
        title: 'Color systems and theming',
        status: 'pending',
        prerequisites: ['checkpoint-3a'],
        evaluationCriteria: {
          detectableProperties: [
            'Fills array contains color with rgba values',
            'Uses hex colors or color styles',
            'Consistent color palette across elements',
          ],
          exampleTasks: [
            'Apply a primary brand color (#4F46E5) to buttons',
            'Create a color palette with 3+ consistent colors',
            'Use color styles for text and backgrounds',
          ],
        },
      },
      {
        id: 'checkpoint-3c',
        title: 'Typography and text styling',
        status: 'pending',
        prerequisites: ['checkpoint-3a'],
        evaluationCriteria: {
          detectableProperties: [
            'TEXT node with characters property',
            'fontName, fontSize, fontWeight defined',
            'textAlignHorizontal and textAlignVertical set',
          ],
          exampleTasks: [
            'Add a heading with 24px bold font',
            'Style button text with center alignment',
            'Create body text with 16px regular weight',
          ],
        },
      },
    ],
  },
  {
    id: 'redis-1',
    title: 'Keyspace fundamentals',
    status: 'completed',
    product: 'Redis',
    evaluationCriteria: {
      detectableProperties: [
        'Redis server connection established',
        'PING command responds with PONG',
        'Basic key inspection commands (KEYS, SCAN) executed',
      ],
      exampleTasks: [
        'Connect to Redis CLI and ping the server',
        'Inspect keys matching a prefix',
        'Delete expired sample keys safely',
      ],
    },
    children: [
      {
        id: 'redis-1a',
        title: 'Key typing and TTLs',
        status: 'completed',
        prerequisites: ['redis-1'],
        evaluationCriteria: {
          detectableProperties: [
            'TYPE command identifies key data structures',
            'TTL or PTTL used to inspect expiration',
            'Keys without expiration are documented',
          ],
          exampleTasks: [
            'Check TTL on session:* keys',
            'Describe data types used in sample dataset',
            'Convert a persistent key to expire in 5 minutes',
          ],
        },
      },
      {
        id: 'redis-1b',
        title: 'Working with hashes',
        status: 'completed',
        prerequisites: ['redis-1a'],
        evaluationCriteria: {
          detectableProperties: [
            'HSET and HGET operations succeed',
            'HSCAN iterates over hash fields',
            'Hash values converted to JSON when needed',
          ],
          exampleTasks: [
            'Store user profile data in a Redis hash',
            'Retrieve nested attributes efficiently',
            'Clean up outdated hash fields',
          ],
        },
      },
    ],
  },
  {
    id: 'redis-2',
    title: 'Search index modeling',
    status: 'in-progress',
    product: 'Redis',
    prerequisites: ['redis-1'],
    evaluationCriteria: {
      detectableProperties: [
        'RediSearch module available (FT._LIST)',
        'FT.CREATE executed with schema definition',
        'Indexes use appropriate data types for fields',
      ],
      exampleTasks: [
        'Create a RediSearch index for products',
        'Define text, numeric, and tag fields',
        'Load sample documents for indexing',
      ],
    },
    children: [
      {
        id: 'redis-2a',
        title: 'Index schema design',
        status: 'in-progress',
        prerequisites: ['redis-2'],
        evaluationCriteria: {
          detectableProperties: [
            'FT.CREATE uses SORTABLE fields where needed',
            'NOINDEX applied to computed metadata',
            'Stop-words list configured when necessary',
          ],
          exampleTasks: [
            'Model product catalog fields for search',
            'Choose appropriate weights for text fields',
            'Add geo field for location-aware search',
          ],
        },
      },
      {
        id: 'redis-2b',
        title: 'Document ingestion pipelines',
        status: 'pending',
        prerequisites: ['redis-2a'],
        evaluationCriteria: {
          detectableProperties: [
            'JSON.SET or HSET used to load documents',
            'Pipeline handles idempotent updates',
            'FT.ADDHASH or FT.ADD used for indexing',
          ],
          exampleTasks: [
            'Build script to index products from CSV',
            'Backfill existing data into RediSearch',
            'Ensure updates propagate to the index',
          ],
        },
      },
    ],
  },
  {
    id: 'redis-3',
    title: 'Querying and ranking',
    status: 'pending',
    product: 'Redis',
    prerequisites: ['redis-1', 'redis-2'],
    evaluationCriteria: {
      detectableProperties: [
        'FT.SEARCH queries executed with filters',
        'FT.AGGREGATE used for facets or analytics',
        'Query profile analyzed for performance',
      ],
      exampleTasks: [
        'Build search queries for prefix and fuzzy matches',
        'Add numeric filters and sorting to queries',
        'Profile and optimize slow search queries',
      ],
    },
    children: [
      {
        id: 'redis-3a',
        title: 'Full-text search tuning',
        status: 'pending',
        prerequisites: ['redis-3'],
        evaluationCriteria: {
          detectableProperties: [
            'Queries use exact, phrase, and wildcard matching',
            'Scores adjusted with field weights or SUMMARIZE',
            'Highlighting configured for result snippets',
          ],
          exampleTasks: [
            'Tune search results for product descriptions',
            'Highlight matched terms in UI output',
            'Experiment with weight adjustments for ranking',
          ],
        },
      },
      {
        id: 'redis-3b',
        title: 'Aggregations and facets',
        status: 'pending',
        prerequisites: ['redis-3a'],
        evaluationCriteria: {
          detectableProperties: [
            'FT.AGGREGATE pipelines return grouped counts',
            'APPLY and GROUPBY used for computed metrics',
            'SORTBY optimizes pagination of results',
          ],
          exampleTasks: [
            'Create category facets for product search',
            'Calculate average price per brand',
            'Implement paginated search results with sorting',
          ],
        },
      },
    ],
  },
]

export function flattenCheckpointTree(checkpoint: Checkpoint): Checkpoint[] {
  const stack: Checkpoint[] = [checkpoint]
  const result: Checkpoint[] = []

  while (stack.length) {
    const node = stack.pop()!
    result.push(node)
    if (node.children && node.children.length) {
      for (let i = node.children.length - 1; i >= 0; i -= 1) {
        stack.push(node.children[i])
      }
    }
  }

  return result
}

export function findCheckpointInTree(nodes: Checkpoint[], targetId: string): Checkpoint | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node
    }
    if (node.children) {
      const found = findCheckpointInTree(node.children, targetId)
      if (found) {
        return found
      }
    }
  }

  return null
}

export function updateCheckpointStatus(
  nodes: Checkpoint[],
  checkpointId: string,
  status: CheckpointStatus,
): { updated: Checkpoint[]; changed: boolean } {
  let changed = false

  const updateNodes = (items: Checkpoint[]): Checkpoint[] =>
    items.map((node) => {
      if (node.id === checkpointId) {
        changed = true
        return {
          ...node,
          status,
        }
      }

      if (!node.children || node.children.length === 0) {
        return node
      }

      const updatedChildren = updateNodes(node.children)
      if (updatedChildren !== node.children) {
        changed = true
        return {
          ...node,
          children: updatedChildren,
        }
      }

      return node
    })

  const updated = updateNodes(nodes)

  return {
    updated: changed ? updated : nodes,
    changed,
  }
}

export function getTrackAndCheckpoint(
  tracks: Checkpoint[],
  checkpointId: string,
): { track: Checkpoint | null; checkpoint: Checkpoint | null } {
  for (const track of tracks) {
    if (track.id === checkpointId) {
      return { track, checkpoint: track }
    }
    const found = findCheckpointInTree(track.children ?? [], checkpointId)
    if (found) {
      return { track, checkpoint: found }
    }
  }

  return { track: null, checkpoint: null }
}
