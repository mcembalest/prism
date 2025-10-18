---
name: Branching and Merging
level: Basic
_index: 10
prerequisites:
  - Git Basics
---

# Branching and Merging

## Task: Create and switch to a new branch

1. **[Terminal]** Create and switch to a new branch using (1).
2. **[Terminal]** Confirm branch with (2).
3. **[Editor]** Make changes on the new branch.
4. **[Terminal]** Stage and commit your changes with meaningful messages.
5. **[Terminal]** Push the branch: (3).

**Commands:**
1. `git checkout -b feature/<name>`
2. `git branch --show-current`
3. `git push -u origin feature/<name>`

## Task: Merge a feature branch locally (fast-forward)

1. **[Terminal]** Switch to main: (1) and update: (2).
2. **[Terminal]** Merge the feature branch: (3) (or without flag).
3. **[Terminal]** Resolve any conflicts if they arise and complete the merge.
4. **[Terminal]** Push the updated main: (4).
5. **[GitHub UI]** Verify the merge on the repository commits view.

**Commands:**
1. `git checkout main`
2. `git pull`
3. `git merge --ff-only feature/<name>`
4. `git push origin main`

## Task: Merge via Pull Request on GitHub

1. **[GitHub UI]** Open your repository and click `Compare & pull request` for your branch.
2. **[GitHub UI]** Enter a clear title and description, link issues with `Fixes #<id>` if applicable.
3. **[GitHub UI]** Assign reviewers and ensure required checks are passing.
4. **[GitHub UI]** Click `Merge` (e.g., `Squash and merge`), confirm, and delete the branch.
5. **[Terminal]** Pull latest changes locally: (1).

**Commands:**
1. `git pull origin main`

