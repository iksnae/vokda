---
description: Debug failing GitHub Actions CI workflows
argument-hint: [workflow name or run ID]
---

# GH Workflow Debugging

Resolve failing GitHub Actions workflows for Vokda CI.

## Workflow

1. List recent runs: `gh run list -L 10`
2. View failing run: `gh run view <run-id>`
3. Check logs: `gh run view <run-id> --log-failed`
4. Identify the issue (typecheck, build, deps, permissions)
5. Fix and push
6. Watch: `gh run watch`

## Context

- CI config: `.github/workflows/ci.yml`
- Runs `npm run check:web` (svelte-check + typecheck) and `npm run build:web`
- Triggered on push to `main` and pull requests
- Node 20, npm caching enabled
- Amplify handles frontend deployment separately (not in CI)

## Debug
$ARGUMENTS
