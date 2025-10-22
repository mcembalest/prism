---
name: Forking and Open Source Contributions
level: Intermediate
_index: 24
prerequisites:
  - Pull Requests and Reviews
---

# Forking and Open Source Contributions

## Task: Create a branch and open a PR from the fork

1. **[Terminal]** Create a branch: (1).
2. **[Editor]** Implement the change and commit it.
3. **[Terminal]** Push to your fork: (2).
4. **[GitHub UI]** Open a PR from your fork to the upstream repository.
5. **[GitHub UI]** Follow contribution guidelines and request review.

**Commands:**
1. `git checkout -b fix/<issue-id>`
2. `git push -u origin fix/<issue-id>`

## Task: Fork a repository and clone your fork

1. **[GitHub UI]** Open the upstream repository and click `Fork`.
2. **[GitHub UI]** Choose your account/org and create the fork.
3. **[Terminal]** Clone your fork: (1) and (2).
4. **[Terminal]** Add upstream remote: (3).
5. **[Terminal]** Verify remotes: (4).

**Commands:**
1. `git clone <your_fork_url>`
2. `cd <repo>`
3. `git remote add upstream <upstream_url>`
4. `git remote -v`

## Task: Sync your fork with upstream

1. **[Terminal]** Fetch upstream: (1).
2. **[Terminal]** Rebase your fork's main onto upstream/main: (2) then (3).
3. **[Terminal]** Push updated main to your fork: (4).
4. **[GitHub UI]** Confirm your fork is up to date.

**Commands:**
1. `git fetch upstream`
2. `git checkout main`
3. `git rebase upstream/main`
4. `git push origin main`

