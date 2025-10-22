---
name: Docker and Container Registry
level: Intermediate
_index: 23
prerequisites:
  - Deployment Automation
---

# Docker and Container Registry

## Task: Build and push an image to ghcr.io

1. **[Terminal]** Build image: (1).
2. **[Terminal]** Login: (2).
3. **[Terminal]** Push: (3).
4. **[GitHub UI]** Verify image under Packages.

**Commands:**
1. `docker build -t ghcr.io/<owner>/<image>:v1 .`
2. `echo $CR_PAT | docker login ghcr.io -u <user> --password-stdin`
3. `docker push ghcr.io/<owner>/<image>:v1`

## Task: Pull and run an image from ghcr.io

1. **[Terminal]** Pull: (1).
2. **[Terminal]** Run: (2).
3. **[Terminal]** Inspect logs and exit code.

**Commands:**
1. `docker pull ghcr.io/<owner>/<image>:v1`
2. `docker run --rm ghcr.io/<owner>/<image>:v1`

