---
name: Git Basics
level: Basic
_index: 12
prerequisites: []
---

# Git Basics

## Task: Clone an existing repository

1. **[GitHub UI]** Navigate to the repository you want to clone and click the `Code` button.
2. **[GitHub UI]** Copy the HTTPS or SSH URL.
3. **[Terminal]** Navigate to your workspace directory using (1).
4. **[Terminal]** Run (2) to clone the repository locally.
5. **[Terminal]** (3) into the cloned repository.
6. **[Terminal]** Verify remotes with (4) and list branches with (5).
7. **[Editor]** Open the project in your editor (e.g., `code .` for VS Code).

**Commands:**
1. `cd <folder>`
2. `git clone <REPO_URL>`
3. `cd <repo>`
4. `git remote -v`
5. `git branch -a`

## Task: Initialize a new repository

1. **[Terminal]** Open the terminal and navigate to your project directory using (1).
2. **[Terminal]** Run (2) to initialize an empty repository.
3. **[Editor]** Create an initial file (e.g., `README.md`) and write a short description.
4. **[Terminal]** Stage changes with (3).
5. **[Terminal]** Commit with (4).
6. **[GitHub UI]** Click `New` to create a repository, set name/visibility, and create it.
7. **[Terminal]** Link the remote using (5).
8. **[Terminal]** Push the default branch: (6) then (7).
9. **[Browser]** Open the repository page and verify your initial commit is present.

**Commands:**
1. `cd <folder>`
2. `git init`
3. `git add README.md`
4. `git commit -m "Initial commit"`
5. `git remote add origin <REMOTE_URL>`
6. `git branch -M main`
7. `git push -u origin main`

## Task: Make a commit

1. **[Editor]** Modify an existing file or create a new one (e.g., `app.js` or `README.md`).
2. **[Terminal]** Run (1) to view changed files.
3. **[Terminal]** Stage specific files using (2) or stage all with (3).
4. **[Terminal]** Commit changes using (4).
5. **[Terminal]** View commit history with (5).

**Commands:**
1. `git status`
2. `git add <file>`
3. `git add .`
4. `git commit -m "Describe the change"`
5. `git log --oneline -n 5`

## Task: Pull and fetch remote changes

1. **[Terminal]** Fetch updates without merging using (1).
2. **[Terminal]** Compare local and remote with (2).
3. **[Terminal]** Merge updates with (3).
4. **[Terminal]** Resolve any merge conflicts if prompted, then commit the merge.
5. **[Terminal]** Verify your local branch is up to date with (4).

**Commands:**
1. `git fetch origin`
2. `git log --oneline ..origin/main`
3. `git pull origin main`
4. `git status`

## Task: Push commits to GitHub

1. **[Terminal]** Ensure a remote is configured with (1); add one if missing.
2. **[Terminal]** Push your branch: (2).
3. **[GitHub UI]** Open the repository page and confirm your commits are visible.
4. **[GitHub UI]** If prompted, set the default branch or create a Pull Request.

**Commands:**
1. `git remote -v`
2. `git push -u origin <branch>`

