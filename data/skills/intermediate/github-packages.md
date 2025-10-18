---
name: GitHub Packages
level: Intermediate
_index: 26
prerequisites:
  - Git Basics
---

# GitHub Packages

## Task: Install and use a package from GitHub Packages

1. **[Terminal]** In a separate project, configure `.npmrc` to use GitHub Packages registry.
2. **[Terminal]** Run (1).
3. **[Editor]** Import and use the package in code; verify it works.

**Commands:**
1. `npm install @OWNER/<package>@<version>`

## Task: Publish an npm package to GitHub Packages

1. **[Editor]** Create or update `package.json` with `name`, `version`, `publishConfig`.
2. **[GitHub UI]** Create a PAT with `packages:write` scope and add as secret if using Actions.
3. **[Terminal]** Login to GitHub Packages registry (npm or yarn config).
4. **[Terminal]** Run (1) (scoped to `@OWNER`) and verify in GitHub Packages.

**Commands:**
1. `npm publish`

