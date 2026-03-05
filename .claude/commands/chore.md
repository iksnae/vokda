---
description: Plan or execute a maintenance chore (deps, config, cleanup, CI)
argument-hint: [chore description]
---

# Chore

Execute a maintenance task for the Vokda project.

## Common Chores

- Dependency updates (`npm update`, check for breaking changes)
- Amplify config regeneration (`npm run amplify:outputs`)
- CI workflow updates (`.github/workflows/ci.yml`)
- `.gitignore` cleanup
- Code cleanup (dead code, unused imports)
- Add/configure tooling (ESLint, Prettier, Vitest)

## Instructions

- Read `CLAUDE.md` for project conventions.
- Always verify with `npm run check:web` after changes.
- For non-trivial chores, save plan to `specs/chore-<name>.md`.

## Chore
$ARGUMENTS
