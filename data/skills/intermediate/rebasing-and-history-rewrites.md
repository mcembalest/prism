---
name: Rebasing and History Rewrites
level: Intermediate
_index: 28
prerequisites:
  - Branching and Merging
---

# Rebasing and History Rewrites

## Task: Rebase a feature branch onto main

1. **[Terminal]** Update main: (1) then (2).
2. **[Terminal]** Switch to your feature branch: (3).
3. **[Terminal]** Rebase onto main: (4).
4. **[Terminal]** Resolve conflicts as they appear, (5) then (6).
5. **[Terminal]** Force-push updated branch: (7).
6. **[GitHub UI]** Confirm the PR now has a linear history.

**Commands:**
1. `git checkout main`
2. `git pull`
3. `git checkout feature/<name>`
4. `git rebase main`
5. `git add <file>`
6. `git rebase --continue`
7. `git push --force-with-lease`

## Task: Reword a previous commit message

1. **[Terminal]** Run (1) to identify the commit.
2. **[Terminal]** Start interactive rebase: (2) (adjust depth).
3. **[Editor]** Change `pick` to `reword` for the target commit, save and exit.
4. **[Editor]** Enter the new commit message when prompted and save.
5. **[Terminal]** If the commit is pushed already, run (3).
6. **[GitHub UI]** Verify updated commit message in the PR or commits view.

**Commands:**
1. `git log --oneline -n 5`
2. `git rebase -i HEAD~5`
3. `git push --force-with-lease`

## Task: Squash commits with interactive rebase

1. **[Terminal]** Ensure your feature branch is current: (1).
2. **[Terminal]** Start interactive rebase: (2) where N is number of commits.
3. **[Editor]** Mark commits to `squash` or `fixup` as needed and save the rebase todo file.
4. **[Editor]** Edit the combined commit message when prompted and save.
5. **[Terminal]** Force-push the rewritten branch: (3).
6. **[GitHub UI]** Verify the PR reflects the squashed commit history.

**Commands:**
1. `git fetch --all`
2. `git rebase -i HEAD~<N>`
3. `git push --force-with-lease`

