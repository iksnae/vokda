---
description: Plan a new feature for the Vokda app
argument-hint: [feature description]
---

# Feature Planning

Create an implementation plan for a new Vokda feature.

## Instructions

- This is a SvelteKit 4 + TypeScript monorepo with Amplify Gen2 backend.
- Read `CLAUDE.md` for code conventions and file map.
- Read `PRD.md` for product context and requirements.
- Check `docs/ROADMAP.md` for current phase alignment.
- Plans are saved to `specs/<feature-name>.md`.
- Follow existing patterns in `apps/web/src/lib/` and `apps/web/src/routes/`.

## Plan Format

```md
# Feature: <name>

## Description
<what this adds and why>

## PRD Alignment
<which PRD sections this addresses>

## Scope
- [ ] New routes: <list or "none">
- [ ] New lib modules: <list or "none">
- [ ] Type changes: <describe or "none">
- [ ] Amplify schema changes: <describe or "none">
- [ ] API changes: <describe or "none">
- [ ] Catalog data changes: <describe or "none">

## Implementation Steps
<numbered steps>

## Files Changed
<list files to create or modify>

## Testing
- Typecheck: `npm run check:web`
- Build: `npm run build:web`
- Manual verification: <what to check in browser>

## Risks
<breaking changes, data migrations, auth implications>
```

## Feature
$ARGUMENTS
