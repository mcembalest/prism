# Prism

Interactive AI tutor that wraps redis-cli for hands-on learning.

## Quick Start

```bash
npm install
npm run dev
```

**Make sure Redis is running:**
```bash
redis-server
```

## How It Works

1. **Diagnostic Phase**: Try 2 commands to calibrate your level (instant start!)
2. **Lesson Generation**: ONE agent call creates personalized 5-10 exercise plan
3. **Learning Loop**: All feedback is instant (local evaluation against plan)

## Architecture

The system uses **separate processes** for clean UX:

```
┌─────────────────────────────────┐
│  Browser (localhost:3000)       │
│  ┌───────────────────────────┐  │
│  │ Redis CLI (xterm.js)      │  │  ← Your workspace (clean!)
│  │ 127.0.0.1:6379> HSET...   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
           ↕ WebSocket
┌─────────────────────────────────┐
│  Node Server (src/server.ts)    │
│  • Runs redis-cli via node-pty  │  ← Captures commands
│  • Publishes to Redis pub/sub   │
└─────────────────────────────────┘
           ↕ Redis Pub/Sub
┌─────────────────────────────────┐
│  Terminal (src/tutor.ts)        │
│  🎓 Prism Tutor                 │  ← Live coaching feedback
│                                  │
│  ✓ Perfect! You set a field     │
│  Next: Try HGET user:1 name     │
└─────────────────────────────────┘
```

**Key Components:**
- `src/server.ts` - Web server with xterm.js, publishes commands to Redis
- `src/tutor.ts` - Terminal tutor, subscribes to commands, shows feedback
- `src/agents/` - Specialized agents (course search, lesson generation, etc.)

**Why this design?**
- Browser gives clean Redis workspace (no interruptions)
- Terminal tutor provides live coaching without blocking your work
- Redis pub/sub keeps processes decoupled
- Smooth path to full web UI later

## Data

All data is stored as **markdown files**

```
data/
├── users/
│   └── {userId}/
│       ├── profile.md           # User background, preferences, goals
│       └── sessions/
│           └── {sessionId}.md   # Individual session logs
└── courses/
    └── {courseId}/
        └── *.md                  # Course materials (any structure)
```

### Example Data

- Demo user profile (data/users/demo-user/profile.md)
- Sample past session (data/users/demo-user/sessions/)
- Redis fundamentals course (data/courses/redis-fundamentals/)

