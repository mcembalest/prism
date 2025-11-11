# SnowKite

SnowKite is the agent in your product, helping your customers understand what's going on and what to do next.

## Quick Start

1. **Install Rust**: https://rust-lang.org/tools/install/
2. **Install dependencies**: `npm install`
3. **Set product mode**: set `productMode` in `src/config/modes/index.ts` to the product for SnowKite to help with. For now you should use `rocketalumni`.
4. **Set VITE_ANTHROPIC_API_KEY**: place your API key in a file named `.env`. Make sure it started with VITE for local development.
5. **Run the app**: `npm run tauri dev`
