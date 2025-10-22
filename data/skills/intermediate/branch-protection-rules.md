---
name: Branch Protection Rules
level: Intermediate
_index: 18
prerequisites:
  - Pull Requests and Reviews
---

# Branch Protection Rules

## Task: Configure a branch protection rule on main

1. **[GitHub UI]** Go to Settings > Branches > Add rule for `main`.
2. **[GitHub UI]** Require pull request reviews, status checks, and conversation resolution.
3. **[GitHub UI]** Save changes and note the rule effects.

## Task: Validate the rule by attempting a direct push

1. **[Terminal]** Attempt to push directly to main: (1).
2. **[GitHub UI]** Observe the rejection and error message.
3. **[GitHub UI]** Open a PR instead and satisfy required checks to merge.

**Commands:**
1. `git push origin main`

