---
name: .gitignore and LFS
level: Basic
_index: 9
prerequisites:
  - Git Basics
---

# .gitignore and LFS

## Task: Add a .gitignore for common languages

1. **[Editor]** Create or open the `.gitignore` file at the repo root.
2. **[Editor]** Add patterns for your language/framework (e.g., `node_modules/`, `.env`).
3. **[Terminal]** Verify ignored files with (1) (they should not appear).
4. **[Terminal]** Commit the change: (2) then (3).
5. **[GitHub UI]** Push and verify the file is present.

**Commands:**
1. `git status`
2. `git add .gitignore`
3. `git commit -m "Add .gitignore"`

## Task: Configure Git LFS and track large files

1. **[Terminal]** Install Git LFS if needed ((1)).
2. **[Terminal]** Track file types: (2) (replace with your large file type).
3. **[Editor]** Commit the `.gitattributes` file created by LFS.
4. **[Terminal]** Add a large file and stage it normally with (3).
5. **[Terminal]** Commit and push; verify upload via Git LFS transfer output.
6. **[GitHub UI]** Confirm large files show LFS pointer metadata.

**Commands:**
1. `git lfs install`
2. `git lfs track "*.psd"`
3. `git add <file>`

