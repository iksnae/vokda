---
name: js-engineering-discipline
description: >
  The umbrella methodology for building JavaScript/TypeScript software the
  LOSWF way — define the problem and pair it with a solution, then deliver
  it through incremental test-first iteration that holds the line on clean
  code, clean architecture, and SOLID principles, applied in JS/TS idiom.
  Use this skill when an engagement is implementing or evolving JS/TS code
  (SvelteKit apps, Node/Lambda services, libraries, CLIs, SDK packages) and
  the operator wants the full discipline loaded. It orchestrates the
  language-neutral member skills — gherkin-feature-drive (BDD outer loop),
  writing-tests (TDD inner loop), code-quality-review (structural gate) —
  and adapts them to JS/TS tooling (npm scripts, Vitest, tsc/svelte-check,
  npm workspaces). Do NOT use it to implement a single feature file in
  isolation (use gherkin-feature-drive), to only add tests (use
  writing-tests), or to review a diff (use code-quality-review).
side: client
contract:
  kind: methodology
  inputs: []
  outputs: []
  verify:
    - skill-frontmatter
---

# JS/TS Engineering Discipline

The **umbrella methodology** for JavaScript/TypeScript delivery — the JS/TS
sibling of `go-engineering-discipline` and `swift-engineering-discipline`. It
does not restate the procedures its member skills own; it sequences them into
one loop and states the principles that hold across all of them, in JS/TS
idiom. When a step has a dedicated skill, this skill points there rather than
duplicating it. The repo's authoritative rules live in
[`docs/constitutions/ts/CONSTITUTION.md`](../../../docs/constitutions/ts/CONSTITUTION.md);
this skill enacts that constitution as a delivery loop.

## Purpose and boundaries

The skill commits to:

- Forcing a **problem statement paired with a solution statement** before
  any code is written.
- **Test-first** delivery: red → green → refactor, using `vitest` as the
  inner loop. Every line of production code exists to make a failing test
  pass — no "just in case" logic, never backfilled to a coverage number.
- Holding the **structural bar** every increment: correct AND no structural
  regression (`npm run check:web` / `tsc` clean, lint clean).

It does **not** commit to a specific app architecture (component-driven,
hexagonal, feature-sliced, etc.) — that is a per-engagement design decision
surfaced in planning. Introduce an abstraction only when there are two
concrete uses that benefit; over-layering is the dominant failure mode in
JS/TS "clean" code.

## The loop (summary)

0. **Define problem, pair with solution.** Crisp problem in observable
   terms; smallest solution named as behavior. No crisp problem → stop and
   clarify.
1. **Size the increment** — `iteration-plan` + `effort-pointing` into the
   smallest shippable units (one module, one exported function, one
   component, one route handler).
2. **BDD outer loop** — express behavior as scenarios; hand `.feature`
   implementation to `gherkin-feature-drive`.
3. **TDD inner loop** — red → green → refactor per `writing-tests`, run with
   `vitest` (watch mode for instant feedback). Tests first, always.
4. **Structural gate** — clear the `code-quality-review` bar.
5. **Land it** — `incremental-commit-all`; commit + push often. Loop to 1
   until the solution statement is satisfied.

## Standing bar (JS/TS idiom)

- **Clean code** — names say intent; small single-responsibility functions;
  prefer pure functions and immutable data (`const`, `readonly`, no shared
  mutation); make illegal states unrepresentable with the type system
  (discriminated unions, branded types, non-nullable over optional). No
  `any` — `unknown` + a narrowing guard for untrusted values.
- **Clean architecture** — dependencies point inward; IO (network, disk,
  DOM, AWS SDKs, provider APIs) lives at the edge behind interfaces the core
  owns. The core (domain + use cases) is framework-agnostic and testable
  without a browser, a network, or a deployed backend.
- **SOLID (JS/TS idiom)** — one module/one reason to change (S); extend via
  new implementations/strategies, not new `switch` arms (O); any
  implementation of an interface is substitutable (L); small,
  consumer-defined interfaces over fat ones (I); core depends on interface
  abstractions, not concrete SDK/framework types — inject the concrete at
  the composition root (D).
- **Async & concurrency** — model concurrency with `async`/`await`; never
  leave a **floating promise** (await it, `return` it, or explicitly
  `void`); use `Promise.all` for independent work and `Promise.allSettled`
  when partial failure is acceptable. No shared mutable state across awaits.
- **Errors** — typed, intentional failure: `throw` typed `Error` subclasses
  or return a `Result`/discriminated union; never swallow an error or leave
  a `catch` empty; validate every external input at runtime (HTTP, DB, env,
  file) before trusting its TS type — types do not exist at runtime.

## Toolchain

- Test: `vitest` (`npm run test`, or `npm -w apps/web run test:watch` for the
  TDD watch loop, `npm -w <ws> run test -- <name>` for a single file). Type
  + structural gate: `npm run check:web` (svelte-check + `tsc`). Build:
  `npm run build:web`. These must be on `policy.allowedCommands`
  (stack-aware onboarding seeds this).
- Layout: npm-workspaces monorepo (`apps/*`, `packages/*`); sources under
  `src/`, tests colocated as `*.test.ts` next to the unit under test (or
  `tests/`). TypeScript `strict` is mandatory and not casually disabled.
- Pin `engines.node` and the `tsconfig` target/module/moduleResolution;
  prefer ESM (`"type": "module"`, `"module": "ESNext"`).

## Member skills

`gherkin-feature-drive`, `writing-tests`, `code-quality-review`,
`iteration-plan`, `effort-pointing`, `incremental-commit-all`. The same
language-neutral discipline as `go-engineering-discipline` and
`swift-engineering-discipline`; only the tooling and idiom differ.
