---
description: Investigate and fix a bug in Vokda
argument-hint: [bug description]
---

# Bug Investigation

Investigate and fix a bug in the Vokda app.

## Instructions

- Check if the bug is in frontend (SvelteKit), auth (Cognito/Amplify), data layer (AppSync), API, or catalog data.
- Read `CLAUDE.md` for file map and conventions.
- Always run `npm run check:web` after making fixes.

## Workflow

1. **Reproduce**: Identify the failing behavior
2. **Locate**: Find the relevant source files (check `apps/web/src/lib/` and `apps/web/src/routes/`)
3. **Diagnose**: Trace the data flow and identify root cause
4. **Fix**: Make the minimal change to resolve
5. **Verify**: Run typecheck (`npm run check:web`) and build (`npm run build:web`)

## Bug
$ARGUMENTS
