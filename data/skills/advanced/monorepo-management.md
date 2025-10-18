---
name: Monorepo Management
level: Advanced
_index: 3
prerequisites:
  - Branching and Merging
---

# Monorepo Management

## Task: Configure CI caching and affected builds

1. **[Editor]** Configure CI to cache node_modules and build outputs.
2. **[Editor]** Add a job to detect changed packages and run tasks selectively.
3. **[GitHub UI]** Verify CI only builds affected packages on PRs.

## Task: Set up a Yarn/NPM workspaces monorepo

1. **[Editor]** Create a root `package.json` with `workspaces` config (Yarn/npm).
2. **[Editor]** Create `packages/<pkg-a>` and `packages/<pkg-b>` with their own `package.json`.
3. **[Terminal]** Install deps at root; verify hoisting.
4. **[Editor]** Add a shared library used by both packages.

