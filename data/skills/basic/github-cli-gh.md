---
name: GitHub CLI (gh)
level: Basic
_index: 13
prerequisites:
  - Git Basics
---

# GitHub CLI (gh)

## Task: Authenticate and create a repo with gh

1. **[GitHub CLI]** Run (1) and follow prompts (protocol, SSH/HTTPS).
2. **[GitHub CLI]** Create a repo: (2).
3. **[GitHub CLI]** Verify repo exists on GitHub.

**Commands:**
1. `gh auth login`
2. `gh repo create <name> --public --source=. --push`

## Task: Create a pull request using gh

1. **[GitHub CLI]** Create a branch and commit changes.
2. **[GitHub CLI]** Run (1).
3. **[GitHub UI]** Review and merge the PR.

**Commands:**
1. `gh pr create --fill --base main --head <branch>`

