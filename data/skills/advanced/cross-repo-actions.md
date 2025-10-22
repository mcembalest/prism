---
name: Cross-Repo Actions
level: Advanced
_index: 1
prerequisites:
  - Reusable Workflows
---

# Cross-Repo Actions

## Task: Consume artifacts or outputs across repos

1. **[GitHub Actions]** Upload artifacts in one workflow using `actions/upload-artifact`.
2. **[GitHub Actions]** In another repo, access artifacts via API or by fetching releases/assets.
3. **[GitHub UI]** Verify artifact availability and integrity.

## Task: Trigger a workflow in another repo via repository_dispatch

1. **[Editor]** In target repo, create a workflow listening to `repository_dispatch`.
2. **[Editor]** In source repo, create a workflow that calls GitHub API to dispatch an event to target.
3. **[GitHub UI]** Add a PAT/Token as secret with repo permissions.
4. **[GitHub UI]** Run source workflow and confirm target workflow is triggered.

