# Codex Workspace — Vokda

Voice discovery and curation app for TTS voices — SvelteKit 4 + TypeScript + AWS Amplify Gen2.

## Asset Symlinks

- `./commands` → `../.claude/commands` (shared commands)
- `./skills` → `../.claude/skills` (shared skills)

## Project Scope

SvelteKit monorepo with Amplify backend. Key areas:

- **Frontend**: `apps/web/src/` (SvelteKit pages, lib modules, stores)
- **Auth**: Cognito user pools (visitor/guest/curator/admin roles)
- **Data**: Amplify AppSync/DynamoDB (favorites, collections, cart, curation)
- **API**: `apps/api/src/server.mjs` (admin user management, synthesis gateway)
- **Catalog**: `apps/web/static/data/voices.json` (seed voice data)
- **Schema**: `amplify/data/resource.ts` (Amplify Gen2 data models)

## Engineering Standards

- **TS Constitution**: `docs/constitutions/ts/CONSTITUTION.md`
- **Go Constitution**: `docs/constitutions/go/CONSTITUTION.md`

## Commands

| Command | Purpose |
|---------|---------|
| `prime` | Orient to the project |
| `maintenance` | Project health check (types, build, quality) |
| `feature` | Plan a new feature |
| `bug` | Investigate and fix a bug |
| `chore` | Maintenance task (deps, config, cleanup) |
| `build` | Build/typecheck/dev server |
| `plan` | General implementation planning |
| `implement` | Execute a plan from `specs/` |
| `debug-gh-workflows` | Fix CI workflows |
