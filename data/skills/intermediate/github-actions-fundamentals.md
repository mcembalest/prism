---
name: GitHub Actions Fundamentals
level: Intermediate
_index: 25
prerequisites:
  - Pull Requests and Reviews
---

# GitHub Actions Fundamentals

## Task: Add a status badge to the README

1. **[GitHub UI]** Open the Actions tab and select your workflow.
2. **[GitHub UI]** Copy the status badge markdown snippet.
3. **[Editor]** Paste the badge into `README.md` and commit.
4. **[GitHub UI]** Verify the badge reflects current run status.

## Task: Create a workflow to run tests on every PR

1. **[Editor]** Create `.github/workflows/ci.yml`.
2. **[Editor]** Define `on: [push, pull_request]`.
3. **[Editor]** Add steps to install dependencies, run lints and tests.
4. **[GitHub UI]** Open a PR and verify the workflow runs and reports status.

