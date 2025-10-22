---
name: Deployment Automation
level: Intermediate
_index: 22
prerequisites:
  - Secrets Management
---

# Deployment Automation

## Task: Deploy a React app to Vercel from GitHub Actions

1. **[Vercel UI]** Create a new Vercel project and link your GitHub repository.
2. **[GitHub UI]** Add `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` as repo secrets.
3. **[Editor]** Add a deployment job in Actions that calls Vercel CLI with secrets.
4. **[GitHub UI]** Open a PR and verify preview deployments are created.

## Task: Deploy a static site to GitHub Pages from Actions

1. **[Editor]** Build a static site (e.g., `npm run build` to `dist/`).
2. **[Editor]** Add an Actions job to deploy to `gh-pages` branch (e.g., `peaceiris/actions-gh-pages`).
3. **[GitHub UI]** Enable Pages in Settings and select `gh-pages` branch.
4. **[Browser]** Verify site is live at `https://<user>.github.io/<repo>`.

