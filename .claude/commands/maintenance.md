---
description: Run project health checks — typecheck, build, CI, code quality
---

# Purpose

Verify the Vokda project is healthy across typecheck, build, code quality, and CI.

## Checks

1. **Typecheck**
   - `npm run check:web`
   - Report any svelte-check errors or warnings

2. **Build**
   - `npm run build:web`
   - Verify static output is generated in `apps/web/build/`

3. **Dependencies**
   - `npm ls --depth=0` — check for peer dependency warnings
   - Review `package.json` workspace deps for staleness

4. **Git State**
   - `git status` — any uncommitted changes?
   - `git log -5 --oneline` — recent activity

5. **CI Status**
   - `gh run list -L 5` — recent GitHub Actions runs
   - Flag any failures

6. **Code Quality**
   - Check for `console.log` statements in source: `grep -r "console.log" apps/web/src/lib/ apps/web/src/routes/`
   - Check for unused imports or dead code patterns
   - Verify `.gitignore` covers build artifacts

7. **Catalog Data**
   - Validate `apps/web/static/data/voices.json` is valid JSON
   - Count voices and verify all have required fields

## Report Format

| Check | Status | Details |
|-------|--------|---------|
| Typecheck | ✅/🔴 | errors/warnings |
| Build | ✅/🔴 | success/failure |
| Dependencies | ✅/🔴 | clean/issues |
| Git state | ✅/🔴 | clean/dirty |
| CI | ✅/🔴 | passing/failing |
| Code quality | ✅/🔴 | clean/issues |
| Catalog | ✅/🔴 | valid/invalid |

**Issues Found**: [list problems]
**Recommended Actions**: [what to fix]
