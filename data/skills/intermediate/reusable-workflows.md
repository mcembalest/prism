---
name: Reusable Workflows
level: Intermediate
_index: 29
prerequisites:
  - GitHub Actions Fundamentals
---

# Reusable Workflows

## Task: Call a reusable workflow from another workflow

1. **[Editor]** In another workflow, call the reusable workflow using `uses: ./.github/workflows/reusable.yml`.
2. **[Editor]** Pass required inputs and secrets.
3. **[GitHub UI]** Run the workflow and confirm called jobs execute.

## Task: Create a reusable workflow

1. **[Editor]** Create `.github/workflows/reusable.yml` with `on: workflow_call`.
2. **[Editor]** Define inputs/outputs and common jobs (e.g., setup, test).
3. **[GitHub UI]** Commit and verify syntax in the Actions tab.

