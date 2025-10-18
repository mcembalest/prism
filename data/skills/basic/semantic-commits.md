---
name: Semantic Commits
level: Basic
_index: 16
prerequisites:
  - Git Basics
---

# Semantic Commits

## Task: Enforce Conventional Commits with a linter in CI

1. **[Editor]** Add commitlint config (e.g., `@commitlint/config-conventional`).
2. **[Terminal]** Install husky and commitlint; set up a commit-msg hook.
3. **[GitHub Actions]** Add a workflow step to validate commit messages on PR.
4. **[GitHub UI]** Verify failing PRs are blocked until messages are fixed.

## Task: Write Conventional Commits

1. **[Editor]** Craft commit messages using the pattern `type(scope): summary` (e.g., `feat(ui): add modal`).
2. **[Editor]** Include body and footer when needed (breaking changes, issue refs).
3. **[Terminal]** Review (1) to ensure consistent format.

**Commands:**
1. `git log`

