---
description: Create an implementation plan for Vokda work
argument-hint: [what to plan]
---

# Planning

Create a clear, actionable plan for Vokda development work.

## Instructions

- Read `CLAUDE.md` for code conventions and file map.
- Read `PRD.md` for product requirements.
- Check `docs/ROADMAP.md` for phase alignment.
- Plans go in `specs/<plan-name>.md`.
- Consider all layers: frontend (SvelteKit), auth (Cognito), data (Amplify), API, catalog, synthesis adapters.

## Plan Format

```md
# Plan: <title>

## Goal
<what we're achieving>

## Current State
<what exists now>

## Steps
1. <step>
2. <step>

## Verification
- Typecheck: `npm run check:web`
- Build: `npm run build:web`
- <additional checks>

## Risks
- <what could go wrong>
```

## Plan
$ARGUMENTS
