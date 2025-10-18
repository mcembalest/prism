---
name: Webhooks and APIs
level: Advanced
_index: 8
prerequisites:
  - GitHub CLI (gh)
---

# Webhooks and APIs

## Task: Create a repository webhook

1. **[GitHub UI]** Go to Repo Settings > Webhooks > Add webhook.
2. **[GitHub UI]** Enter payload URL (ngrok/localtunnel for local dev), choose content type `application/json`.
3. **[GitHub UI]** Select events (e.g., `push`, `pull_request`) and add the webhook.
4. **[Browser]** Verify delivery logs after triggering an event.

## Task: Query PRs with the GraphQL API

1. **[Terminal]** Create a GraphQL query file (e.g., `prs.graphql`).
2. **[Terminal]** Use curl or (1) to execute.
3. **[Terminal]** Parse JSON response and confirm data matches expectations.

**Commands:**
1. `gh api graphql -f query=@prs.graphql`

## Task: Use REST API to create an issue programmatically

1. **[GitHub CLI]** Retrieve a token or use (1) to confirm auth.
2. **[Terminal]** Run (2) to create an issue programmatically.
3. **[GitHub UI]** Verify the new issue appears.

**Commands:**
1. `gh auth status`
2. `curl -H "Authorization: token <PAT>" -d '{"title":"API-created issue"}' https://api.github.com/repos/<owner>/<repo>/issues`

