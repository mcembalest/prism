---
name: Tagging and Versioning
level: Basic
_index: 17
prerequisites:
  - Git Basics
---

# Tagging and Versioning

## Task: Create an annotated tag

1. **[Terminal]** Create an annotated tag: (1).
2. **[Terminal]** List tags with (2).
3. **[Terminal]** Push tags: (3).
4. **[GitHub UI]** Verify the tag appears under Releases > Tags.

**Commands:**
1. `git tag -a v1.0.0 -m "Release v1.0.0"`
2. `git tag --list`
3. `git push origin --tags`

## Task: Push tags and create a GitHub release

1. **[Terminal]** Push latest tags with (1).
2. **[GitHub UI]** Go to Releases and click `Draft a new release`.
3. **[GitHub UI]** Select the tag (or create one), add notes, and publish the release.
4. **[Browser]** Share the release URL with stakeholders.

**Commands:**
1. `git push origin --tags`

