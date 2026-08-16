# Svelte 5 / Vite 8 Upgrade — Sequencing Plan

**Date:** 2026-08-16
**Sizing spec:** [`chore-svelte5-vite-upgrade.md`](./chore-svelte5-vite-upgrade.md)
**Scope:** `apps/web` (+ root `package.json`, `scripts/`, `.github/workflows/ci.yml`, `amplify.yml`)

> Produced by the planner against the sizing spec with all seven operator decisions binding.
> The three spec corrections below were independently verified before this plan was accepted.

---

## Corrections to the sizing spec

**1. There are no 550 prerendered voice pages.** `apps/web/src/routes/voices/[id]/+page.ts:4` is `export const prerender = false`, as are `providers/[id]`, `collections/[id]`, `account/providers`, `account/api-keys`. `svelte.config.js` uses `fallback: 'index.html'`. The prerendered set is 14 routes; the other 5 are SPA-fallback, client-rendered.

*Consequence:* build-output verification shrinks by ~97%, **and** the e2e harness must run against `vite preview` (which honors the fallback), not `vite dev` — dynamic routes would otherwise pass in dev and 404 in the built artifact.

*Verified:* `grep -rn prerender apps/web/src/routes`. Already documented in `chore-seo-audit.md:42`.

**2. 19 navigable routes, not 20.** 19 `+page.svelte` + 1 `+layout.svelte`. There is no `+error.svelte` — worth adding, since the SPA fallback makes error states reachable.

**3. Root `playwright@1.58.2` cannot "become real."** `playwright` is the driver library; the runner is `@playwright/test`. It is replaced, not adopted.

**4. Root cause of §8 is not `amplify.yml`.** `scripts/publish-catalog.mjs:36` is `const VOICES_PATH = 'apps/web/static/data/voices.json'` — cwd-relative, so the script only functions from the repo root. That is why `apps/web`'s `build` cannot include it, why the root wrapper exists, and why the deploy path skips it. Patching `amplify.yml` fixes the symptom and leaves the trap armed.

---

## Q1 — Ordering: test gate first, on Svelte 4. Then Svelte 5, then runes, then Vite.

**A gate authored after the change it is meant to gate is not a gate — it is a description of the outcome.** Component tests written against Svelte 5 post-conversion encode whatever the conversion produced, bugs included. Written against Svelte 4 and carried through unmodified, they become an executable invariant, and the diff gains a property worth more than the tests themselves: **any test file edited during the Svelte 5 or Vite steps is by definition a behavior change**, and must be justified in the PR rather than absorbed. That is the cheapest possible implementation of "make failure modes explicit."

The counter-argument — tests written against Svelte 4 might not run under Svelte 5 — is real but bounded, and imposes exactly one authoring constraint (S3).

Svelte before Vite: `phosphor-svelte@3` is already blocked and Svelte 5 unblocks it; the plugin ladder lets Svelte 5 land on Vite 5 at near-zero cost; and the runes conversion is the only workstream with substantial human judgement in it — do it under a bundler you already trust, so failures are attributable to the compiler, not to Rolldown. Reversing this stacks the two riskiest changes with no way to bisect.

## Q2 — `rolldown-vite` hop: skip it. Take 5→6→7→8 as four commits.

The hop exists to isolate Rolldown-specific breakage from the rest of the v8 delta. **Here the rest of the v8 delta is empty** — §5.1 checks eleven v8 config breakages and finds zero present. The hop isolates a variable from nothing.

Worse, it does not isolate the variable that matters. The CJS `default`-import unification ships **with** Rolldown — `rolldown-vite` on Vite 7 carries it too. The hop splits on exactly the wrong seam: it takes on the highest risk while deferring the near-zero risk, then requires a second migration to unwind the alias.

Landing 5→6, 6→7, 7→8 as three separate green commits satisfies "make failure modes explicit" more cheaply and more honestly. Each intermediate is mechanical here, costing roughly one CI run. Their entire value: when Vite 8 lands, the only uncontrolled variable in the diff is the bundler swap, and `git bisect` has somewhere to land.

---

## The gate

**G** = the full green bar, run locally before every push and enforced in CI:

```
npm run check:web && npm run check:catalog && npm run test && npm run build:web
```

From S4 onward, G also includes `npm run test:e2e` and `npm run test:e2e:amplify`. Every step must leave G green. No step lands red.

---

## S1 — Node floor, unit suite in CI, dead Jest dep

- Root `package.json`: `engines.node` → `"^20.19.0 || >=22.12.0"`
- `.nvmrc`: `20` → `22`
- `.github/workflows/ci.yml`: `node-version: 20` → `22`; add `npm run test` between `check:catalog` and `build:web`
- `apps/web/package.json`: drop `svelte-jester` (Jest-only transform; this repo runs Vitest)

**Why here.** Vite 7 rejects Node 20.0–20.18 and CI pins bare `20`. Raising the runner before touching Vite makes the Node change attributable on its own, and surfaces any CI-vs-local divergence (local is on v26.7.0 — a six-major gap nothing has exercised) now rather than mid-bundler-swap. Wiring the existing 345 tests into CI is free and raises the floor for every later step.

**Risk.** Node 22 behavior changes for `@aws-amplify/backend-cli` or root `@aws-sdk/*`. Low probability; contained.

**Gate:** G on Node 22, locally and in CI.

**S1b (split if noisy):** `svelte-check` 3.8 → 4.7. Peer is `svelte: ^4 || ^5`, independent of the Svelte bump. Moving it now means `check:web` is already the modern diagnostic when Svelte 5 arrives. If v4 emits new diagnostics, land it separately — do not fold new type errors into S1.

---

## S2 — Collapse the build definition (spec §8)

- `scripts/publish-catalog.mjs`: anchor `VOICES_PATH` and all output paths to the repo root derived from `import.meta.url`, not `process.cwd()`. Script becomes location-independent.
- `apps/web/package.json`: `build` → `node ../../scripts/publish-catalog.mjs && svelte-kit sync && vite build`
- Root `package.json`: `build:web` → `npm run -w apps/web build` (pure delegate)
- `amplify.yml`: **no change** — its existing `npm run build` now runs the publish step. Verify and leave alone.
- `CLAUDE.md`: correct the Catalog-publish and CI wording. `scripts/check-catalog-fresh.mjs` header (lines 6–9) asserts "The Amplify build ships the committed static/api files as-is — it does not run publish-catalog" and becomes false — update it.

The divergence becomes structurally impossible rather than fixed by convention: one definition of "build the web app," reached by every caller.

**Why here.** Before any bundler change. If the first post-Vite-8 deploy misbehaves, you want one variable in flight.

**Never combine with:** any Vite step. This is the most important separation in the plan — the difference between "the deploy broke, and it was the bundler" and "the deploy broke, and we have two suspects."

**Risk.** `check-catalog-fresh.mjs` shells out to `publish-catalog.mjs` and `git`; re-anchoring can break its diff logic. Amplify's monorepo checkout does include `scripts/` (`appRoot` scopes only the artifact base dir) — verify, don't assume.

**Gate:** G, plus `node scripts/publish-catalog.mjs` from `apps/web/` as cwd producing clean `git status`, plus one branch deploy confirming the publish step appears in the Amplify build log.

---

## S3 — Behavioral component tests replace the 34 source-text tests

- Delete `apps/web/src/lib/redesign-structural.test.ts` (29) and `apps/web/src/lib/components/Icon.test.ts` (5)
- Add `@testing-library/svelte` rendering tests covering the same intents behaviorally: nav presence and `href` targets on `+layout.svelte`; card→detail navigation on `+page.svelte`; `Icon.svelte` rendering an `aria-hidden` SVG per registry name and resolving `-filled` to `fill` weight
- Make `@testing-library/jest-dom` real: `setupFiles: ['./src/test-setup.ts']` in `apps/web/vitest.config.ts` importing `@testing-library/jest-dom/vitest`. Already installed — reuse, not a new dependency.

**Never split** deletion from replacement. Splitting leaves either a window with no component gate, or a window gated by assertions that misreport.

**The authoring constraint that makes this ordering work.** `@testing-library/svelte@5` supports Svelte 3/4/5, but the parts of its API reaching the *component instance* — `component.$set`, `component.$on`, the returned instance generally — are Svelte-4-only, and are exactly the APIs removed in Svelte 5.

> **Rule: interact only through the DOM and through props supplied at `render()` time. Never touch the returned component object.**

Tests written under that rule survive S5 and S6 byte-for-byte. This is the entire cost of building the gate on Svelte 4, and it is cheap.

**Risk.** The deleted `Icon.test.ts` claims phosphor components "require full Svelte compilation to render in jsdom." That was an excuse, not a finding — `vitest.config.ts` already loads `sveltekit()` and sets `environment: 'jsdom'`. If phosphor v2 genuinely resists jsdom, assert on `Icon.svelte`'s own wrapper and its `aria-hidden`/weight resolution rather than phosphor's SVG internals. **Do not reintroduce a source-text assertion to route around it.**

**Gate:** G. Test count moves from 345 to ~311 + N.

---

## S4 — Playwright e2e, both lanes, wired into CI

- Root `package.json`: remove `playwright`, add `@playwright/test`
- `playwright.config.ts` with `webServer` running **`vite preview` against a real build — not `vite dev`**. 5 of 19 routes are `prerender = false` and depend on the `index.html` fallback; `dev` masks fallback failures.
- `e2e/` specs covering all 19 routes: loads, renders primary content, no console errors. Deeper flows on `/`, `/voices/[id]`, `/collections`.
- Add `+error.svelte` — the SPA fallback makes error states reachable and they are currently unstyled.
- CI: `e2e` job on every PR, per operator decision.

| Lane | Env | Breadth | Purpose |
|---|---|---|---|
| `test:e2e` | `PUBLIC_AUTH_MODE=mock`, `PUBLIC_SYNTH_MODE=mock` | 19 routes | Route/render/interaction breadth. No secrets, no spend. |
| `test:e2e:amplify` | `PUBLIC_AUTH_MODE=amplify` | 3 assertions | The **only** automated proof of the aws-amplify path. |

**Why here.** Same reason as S3, plus: e2e authored against Svelte 4 is the artifact proving the runes conversion preserved behavior. Highest-value test written in this chore.

**Risk.** Browser download and startup add CI minutes on a private repo — cache the browsers. Flake from real timing on `/voices/[id]` audio elements — assert on DOM state, not playback.

**Gate:** G + both lanes green on Svelte 4.

---

## 🔴 The highest-risk item, and why mock mode does not cover it

Vite 8 unifies CJS `default` import handling between dev and build, and `aws-amplify@^6.16.2` underlies all Cognito auth and AppSync data. **The chosen e2e configuration cannot detect this.**

The imports are static and top-level:
- `apps/web/src/lib/auth/store.ts:16` — `import { signIn, signOut, fetchAuthSession, getCurrentUser, ... } from 'aws-amplify/auth'`
- `apps/web/src/lib/auth/amplify-client.ts:1` — `import { Amplify } from 'aws-amplify'`
- `apps/web/src/lib/data/client.ts:1` — `import { generateClient } from 'aws-amplify/data'`

Being static, the modules *evaluate* even under `PUBLIC_AUTH_MODE=mock`, so a module-evaluation failure would be caught. But `store.ts:38` branches on `AUTH_MODE`, so in mock mode **none of those bindings is ever called**. If the interop change turns `signIn` into `undefined` — the classic namespace-vs-default wrapping failure, and the most likely shape of this breakage — the mock lane is green, the build is green, `check:web` is green (TS types come from `.d.ts`, not the runtime shape), and the site ships broken auth.

**A green build does not prove this out. Neither does the mock e2e lane. State this in the PR.**

Mitigations, in increasing strength:

1. **Import-shape unit test** (add in S3, cheap): assert `typeof signIn === 'function'` across the imported surface of all three files. Catches the dev/SSR-transform half. Runs in Vitest, so it exercises Vite's transform pipeline, not the Rolldown production bundle.
2. **`test:e2e:amplify` lane** — the real one. `amplify_outputs.json` is **committed** and contains only public client config (user-pool id, client id, AppSync endpoint). No secret required. Asserts: (a) app boots with no module-eval `TypeError`; (b) `/account` renders the sign-in form; (c) a known-bad credential surfaces a **Cognito-originated error**, not `undefined is not a function`. A genuine round-trip through `aws-amplify/auth` against the real user pool — costs nothing, spends nothing, needs no secret, and is the only automated artifact proving CJS interop against the production bundle.
   *Tradeoff, named:* a required PR job now depends on an external service, introducing flake. Accept it; keep the lane to three assertions and one retry so its failure signal stays legible.
3. **Manual signed-in smoke at S10.** `generateClient` is the other half and is unreachable without a session — no credential-free lane can touch it. Sign in against the dev pool and exercise one AppSync read and one write. A manual gate; written into the S10 checklist rather than left to memory.

---

## S5 — Svelte 5 bump, legacy mode, zero source changes

`apps/web/package.json` only:
- `svelte` `^4.2.18` → `^5`
- `@sveltejs/vite-plugin-svelte` `^3.1.0` → `^4` (the rung pairing Svelte 5 with Vite 5)
- `phosphor-svelte` `^2.0.1` → `^3` (unblocked here — the dependency blocking since before this chore)

**Never combine with S6.** Legacy mode compiles Svelte 4 syntax — the 87 `$:`, 160 `on:`, 23 `export let` all keep working. Landing the bump with **zero** `.svelte` diffs makes any failure attributable to the compiler alone. Combined with the rewrite you have 26 changed components and a new compiler and no way to separate them.

**Risk.** `phosphor-svelte@3` may rename or restructure icon exports; `Icon.svelte`'s registry is the blast radius, and S3's rendering tests are what catch it. Legacy-mode compilation of `<slot>`, `<svelte:component>`, `$$restProps`, and the 4 `createEventDispatcher` sites is supported but warns — expect `check:web` noise.

**Gate:** G + both e2e lanes, with `git diff --stat -- '*.svelte'` empty.

---

## S6 — Runes conversion, four slices, leaves inward

Run `sv migrate svelte-5` for the mechanical bulk (`on:` → `onclick`, `export let` → `$props()`), then hand-resolve the 87 `$:` across 14 files. Slice by dependency depth; each slice independently landable and green:

- **S6a — leaves:** `Icon.svelte`, `Toast.svelte`, `SsmlToolbar.svelte`, `ProviderSetupGuide.svelte`
- **S6b — composites:** `SsmlEditor.svelte` and remaining `lib/components/`; resolve the 4 `createEventDispatcher` → callback props, the 1 `<slot>` → snippet, the 1 `<svelte:component>`, the 1 `$$restProps`
- **S6c — `+layout.svelte`** alone (app shell; auth-aware, highest e2e exposure)
- **S6d — routes**, two passes: prerendered first, then `prerender = false`

**The `$:` rule, stated so it is not decided ad hoc:** LHS is a single assignment to a local consumed by markup → `$derived`. Statement performs side effects (function calls, store writes, navigation, DOM access) → `$effect`. Both → split into one of each. Do not batch-convert.

**Highest risk here, and it is not the obvious one: `$effect` does not run during SSR.** A `$:` that today executes at prerender time and populates markup will, if converted to `$effect`, silently stop running for the 14 prerendered routes — empty content in the built HTML while dev mode looks perfect. This is what the S4 e2e lane exists for, and precisely why `playwright.config.ts` must drive `vite preview` over a real build. **Any `$:` in a prerendered route computing displayed content must become `$derived`, never `$effect`.**

Secondary: `$props()` destructuring is not reactive-by-mutation the way `export let` was; components reassigning their own props need `$bindable` or a callback prop.

**Never combine with S7–S10.** Do not begin the Vite ladder until S6d is merged.

**Gate per slice:** G + both e2e lanes. **The e2e specs must not change.** If a slice requires editing an e2e assertion, stop — that is a behavior change needing justification in the PR body, not absorption into the diff.

---

## S7 — Vite 6 (+ plugin v5)

`vite` `^5` → `^6`, plugin `^4` → `^5`. Expected mechanical: no `resolve.conditions`, no PostCSS config, not a library build — all three v6 items absent.

**Watch:** v6 defaults CJS `strictRequires` to true. Same dependency-shape family as the v8 change and the first place `aws-amplify` can complain. **If it fails here that is good news arriving early** — the interop problem is real and found two steps before the bundler swap.

**Gate:** G + both e2e lanes.

## S8 — vitest 4.0.18 → 4.1.x

Unblocked exactly here (peer `vite: ^6 || ^7 || ^8`). Its own commit: a test-runner change must never ride along with a change to the code under test, or a runner regression reads as a product regression.

**Gate:** G.

## S9 — Vite 7 (+ plugin v6)

`vite` `^6` → `^7`, plugin `^5` → `^6`. No Sass, no `splitVendorChunkPlugin`, no `transformIndexHtml` custom plugins. Where the S1 Node floor pays for itself. Browser targets rise to Chrome 107 / Safari 16.0 / Firefox 104 — accepted, no `build.target` override.

**Gate:** G + both e2e lanes.

## S10 — 🔴 Vite 8 (+ plugin v7) — the bundler swap

`vite` `^7` → `^8`, plugin `^6` → `^7` (requires `svelte >=5.46.4` — verify the resolved Svelte from S5 satisfies it, bump if not). Rollup→Rolldown, esbuild→Oxc, CSS minification→Lightning CSS. Config surface untouched: all eleven v8 breakages absent.

**Verification checklist — all required:**
1. G, on Node 22 and on local Node 26
2. Both e2e lanes, including `test:e2e:amplify`
3. **Manual signed-in smoke** against the dev Cognito pool: one AppSync read and one write through `lib/data/client.ts`. The only way to reach `generateClient`. Non-negotiable.
4. **Built-artifact inspection:** diff the 14 prerendered HTML outputs against the S9 build. Not "the build succeeded" — actual content comparison. Confirm the SPA fallback still serves the 5 `prerender = false` routes.
5. **Visual check** of the 26 component-scoped `<style>` blocks. The Lightning CSS swap is a plausible source of subtle regression no assertion here catches. Spot-check `/`, `/voices/[id]`, `/docs`.
6. **Branch deploy to Amplify** before merging to `main`, exercising the S2 build path under the new bundler.

**Never combine with anything.** This commit changes two version numbers and nothing else.

## S11 — Documentation

`CLAUDE.md`: stack line to "SvelteKit 2 / Svelte 5"; code conventions from `export let` / `$:` to `$props()` / `$derived`; test counts; CI description; Node floor. `docs/ARCHITECTURE.md` where it names versions. An ADR under `docs/` recording the two decisions above — test-gate-first and no-`rolldown-vite` — with reasoning, so the next person does not re-litigate what the operator settled.

---

## Separations, restated

| Never combine | Why |
|---|---|
| S2 (build path) with any Vite step | A broken deploy must have one suspect, not two |
| S3 delete with S3 replace | Leaves a window with no component gate, or one gated by lies |
| S5 (Svelte 5 bump) with S6 (runes) | Legacy mode exists to make the compiler swap a zero-source-diff commit |
| S6 (runes) with S7–S10 (Vite) | The two largest behavioral risks in the chore |
| S8 (vitest) with any code change | A runner regression must not read as a product regression |
| S10 (Vite 8) with anything | Two version numbers, nothing else |

---

## Critical files

- `apps/web/package.json`
- `scripts/publish-catalog.mjs`
- `.github/workflows/ci.yml`
- `apps/web/vitest.config.ts`
- `apps/web/src/lib/auth/store.ts`
