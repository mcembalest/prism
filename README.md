# SnowKite

SnowKite is the agent in your product, helping your customers understand what's going on and what to do next.

## Quick Start

1. **Install Bun**: https://bun.sh/docs/installation
2. **Install Rust**: https://rust-lang.org/tools/install/
3. **Install dependencies**: `bun install`
4. **Set product mode**: set `productMode` in `src/config/modes/index.ts` to the product for SnowKite to help with. For now you should use `rocketalumni`.
5. **Set VITE_ANTHROPIC_API_KEY**: place your API key in a file named `.env`. Make sure it started with VITE for local development.
6. **Run the app**: `bun run tauri dev`
