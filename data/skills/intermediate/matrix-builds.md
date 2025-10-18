---
name: Matrix Builds
level: Intermediate
_index: 27
prerequisites:
  - GitHub Actions Fundamentals
---

# Matrix Builds

## Task: Configure a matrix build for multiple Node.js versions

1. **[Editor]** In the workflow, define `strategy.matrix.node-version: [18, 20, 22]`.
2. **[Editor]** Use `actions/setup-node` with `${{ matrix.node-version }}`.
3. **[GitHub UI]** Trigger the workflow and observe parallel job executions.

