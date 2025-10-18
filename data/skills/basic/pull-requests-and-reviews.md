---
name: Pull Requests and Reviews
level: Basic
_index: 15
prerequisites:
  - Branching and Merging
---

# Pull Requests and Reviews

## Task: Merge a pull request with squash and delete the branch

1. **[GitHub UI]** Ensure all required checks and reviews are passing.
2. **[GitHub UI]** Click the dropdown next to `Merge` and choose `Squash and merge`.
3. **[GitHub UI]** Edit the final commit message if needed and confirm the merge.
4. **[GitHub UI]** Delete the source branch when prompted.
5. **[Terminal]** Pull latest main locally: (1).

**Commands:**
1. `git pull origin main`

## Task: Open a pull request with a clear description

1. **[GitHub UI]** Navigate to your repo and click `Compare & pull request` for your branch.
2. **[GitHub UI]** Provide a clear title and context (why, what, how).
3. **[GitHub UI]** Link related issues using keywords like `Closes #123`.
4. **[GitHub UI]** Assign reviewers and set labels/milestones as needed.
5. **[GitHub UI]** Create the PR and monitor checks.

## Task: Review a pull request and request changes

1. **[GitHub UI]** Open the PR's `Files changed` tab.
2. **[GitHub UI]** Leave inline comments and summarize feedback in the Review panel.
3. **[GitHub UI]** Choose `Request changes` or `Approve` as appropriate.
4. **[GitHub UI]** Re-run or wait for checks; ensure required reviews are complete.

