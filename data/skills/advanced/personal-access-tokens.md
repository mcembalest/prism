---
name: Personal Access Tokens
level: Advanced
_index: 5
prerequisites:
  - Git Basics
---

# Personal Access Tokens

## Task: Create a fine-grained PAT

1. **[GitHub UI]** Go to Settings > Developer settings > Personal access tokens.
2. **[GitHub UI]** Create a fine-grained token, select repositories and minimal scopes.
3. **[GitHub UI]** Copy and store the token securely (password manager).

## Task: Use a PAT with GitHub CLI and/or git remotes

1. **[Terminal]** Use the PAT when prompted for HTTPS auth (username: your GitHub username, password: PAT).
2. **[GitHub CLI]** Authenticate with (1) and paste the token if needed.
3. **[Terminal]** Verify by pushing or using the API.

**Commands:**
1. `gh auth login`

