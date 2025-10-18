---
name: Issues and Templates
level: Basic
_index: 14
prerequisites:
  - Git Basics
---

# Issues and Templates

## Task: Close issues automatically via PR keywords

1. **[GitHub UI]** In a PR description, include `Fixes #<issue_number>` or `Closes #<issue_number>`.
2. **[GitHub UI]** Merge the PR once approved.
3. **[GitHub UI]** Verify the linked issue is closed automatically.

## Task: Create an issue with labels and a milestone

1. **[GitHub UI]** Open Issues > New issue and pick a template.
2. **[GitHub UI]** Add labels (e.g., `bug`, `enhancement`) and select a milestone.
3. **[GitHub UI]** Assign to yourself or a teammate and submit the issue.

## Task: Create issue templates (bug, feature)

1. **[GitHub UI]** Go to Settings > General > Features > Set up templates (or .github/ISSUE_TEMPLATE).
2. **[GitHub UI]** Create `bug_report.md` and `feature_request.md` with structured fields.
3. **[GitHub UI]** Commit templates to the `.github/ISSUE_TEMPLATE` directory.
4. **[Browser]** Test by opening a new issue and choosing a template.

