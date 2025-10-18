---
name: Secrets Management
level: Intermediate
_index: 30
prerequisites:
  - GitHub Actions Fundamentals
---

# Secrets Management

## Task: Add a repository secret in GitHub

1. **[GitHub UI]** Go to Settings > Secrets and variables > Actions > New repository secret.
2. **[GitHub UI]** Enter the name (e.g., `VERCEL_TOKEN`) and value, then save.
3. **[GitHub UI]** Optionally set environment-specific secrets.

## Task: Use a secret securely in GitHub Actions

1. **[Editor]** Reference the secret in a workflow step: `${{ secrets.VERCEL_TOKEN }}`.
2. **[Editor]** Ensure secret is only used in secure contexts and not echoed.
3. **[GitHub UI]** Run the workflow and confirm deployment/auth succeeds.

