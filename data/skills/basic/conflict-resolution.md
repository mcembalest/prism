---
name: Conflict Resolution
level: Basic
_index: 11
prerequisites:
  - Branching and Merging
---

# Conflict Resolution

## Task: Abort a conflicted merge and restore state

1. **[Terminal]** When a merge goes wrong, run (1) to roll back the merge state.
2. **[Terminal]** For rebase issues, run (2) to restore the previous state.
3. **[Terminal]** Verify with (3) that you are back to a clean working tree.
4. **[Terminal]** Optionally reset hard to a known commit (4).

**Commands:**
1. `git merge --abort`
2. `git rebase --abort`
3. `git status`
4. `git reset --hard <SHA>`

## Task: Resolve a merge conflict and complete the merge

1. **[Terminal]** Attempt merge or rebase to surface conflicts ((1) or rebase).
2. **[Editor]** Open conflicted files and resolve conflict markers `<<<<<<`, `======`, `>>>>>>`.
3. **[Terminal]** Mark files resolved with (2).
4. **[Terminal]** Complete the operation: (3) or (4).
5. **[Terminal]** Run tests locally (if applicable) and commit the resolution.
6. **[GitHub UI]** Push and confirm checks pass on the PR.

**Commands:**
1. `git merge feature/<name>`
2. `git add <file>`
3. `git merge --continue`
4. `git rebase --continue`

