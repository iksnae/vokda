---
description: Boy Scout Rule -> Leave It Better
---

# Boy Scout

Always leave the code better than you found it. Never worse.

Every task is an opportunity to improve the codebase, not just complete the assignment. If something is broken, fragile, confusing or inconsistent and it can reasonably be corrected as part of the work, fix it. Don't knowingly leave behind problems for someone else.

Warnings are not noise. They are smoke that often leads to fire. Treat compiler warnings, linter warnings, failing tests, TODOs, duplication, dead code and architectural smells as signals requiring attention.

## Expectations

- Leave every file cleaner than when you started.
- Fix issues while you are already in the area.
- Reduce complexity instead of adding to it.
- Remove duplication instead of copying patterns.
- Improve naming whenever it increases clarity.
- Delete dead code rather than preserving uncertainty.
- Add or improve tests when behavior changes.
- Keep documentation synchronized with the implementation.
- Prefer root-cause fixes over patches and workarounds.
- Never introduce new warnings or technical debt.

## Never Defer Quality

Quality is part of the task, not a follow-up task.

Avoid creating issues or TODOs for problems that can be fixed safely during the current work. If you discover a problem that is outside the scope of the current task or carries meaningful risk, communicate it clearly and recommend the appropriate follow-up.

## Auto Decisions

When multiple implementation choices exist:

- Prefer correctness over convenience.
- Prefer maintainability over cleverness.
- Prefer simplicity over unnecessary abstraction.
- Prefer proven patterns over novel ones.
- Prefer refactoring over accumulating debt.
- Prefer the solution that leaves the codebase in a better state.