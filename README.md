# Prism

Prism delivers step-by-step on-screen product walkthroughs, helping your users know what to do and where to go on their screen.

## Quick Start

1. **Install Rust**: https://rust-lang.org/tools/install/
2. **Install dependencies**: `npm install`
3. **Run the app**: `npm run tauri dev`
4. **Add API key** (⌘+,) to add your Gemini API key

## How this is built

React + TypeScript frontend

Tauri (Rust) backend

Files to note:

- `src/components/helper.tsx` - Chat interface & walkthrough logic
- `src/services/gemini.ts` - Multimodal (vision+text) AI API
- `src-tauri/src/lib.rs` - Screenshots, window management, commands

## Todos

1. Pre-generate courses to be human-validated instead of relying on just-in-time determination of what to do and where to click with multimodal AI.
2. Use playwright to browse in advance of guiding the user to pre-browse websites
3. Is there a better way to build this than TypeScript + Tauri, i.e. is Rust not worth it?