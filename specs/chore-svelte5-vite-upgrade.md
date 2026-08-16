# Svelte 5 / Vite 8 Upgrade — Sizing

**Date:** 2026-08-16
**Status:** Sized. Scope decided by operator; sequencing open for the planner.
**Scope:** `apps/web` (sole Svelte/Vite consumer in the monorepo)

---

## Decisions Taken (operator, 2026-08-16)

| Decision | Choice |
|---|---|
| **Chore scope** | **Full modernization** — Svelte 5 + runes conversion + Vite to current, as tracked steps. No half-migrated legacy-mode codebase left as standing debt. |
| **Test gate** | **Component rendering tests + Playwright e2e.** Both layers. CI currently runs no tests at all, so both need wiring in. |
| **Vite sizing** | Investigate before planning. **Done — see §5.** |
| **Browser floor** | **Accept the modern baseline** — Chrome/Edge 111, Firefox 114, Safari 16.4. No telemetry exists to argue otherwise (see §5.5); target modern browsers and do not carry a `build.target` override. |
| **CI** | Unit suite **and** Playwright e2e on **every PR**. Full gate before merge. *(best-practice auto-answer — the cheaper "e2e on main only" split was rejected as the easy option)* |
| **Node floor** | Explicit `engines: "^20.19.0 \|\| >=22.12.0"`; `.nvmrc` and CI pin raised to match. A bare `>=20` admits versions Vite 7+ rejects. *(best-practice auto-answer)* |
| **Deploy path** | **In scope.** `amplify.yml` runs the workspace `build`, skipping `publish-catalog.mjs`. This chore changes build behavior, and AGENTS.md requires maintaining CI/CD workflows when it does. See §8. |
| **e2e harness** | Runs against `PUBLIC_AUTH_MODE=mock` + `PUBLIC_SYNTH_MODE=mock`. Seams already exist — no secrets in CI, no provider spend. *(reuse existing infrastructure)* |
| Source-text assertions | Replaced with behavioral tests, not carried and patched. *(best-practice auto-answer)* |
| Dead devDependencies | Removed or made real. Nothing stays installed-and-unimported. *(best-practice auto-answer)* |
| Out of scope | Stale `app.html` meta → `specs/chore-stale-site-meta.md`. Telemetry gap → `specs/chore-usage-telemetry.md`. |

---

## Executive Summary

| Dimension | Assessment | Notes |
|---|---|---|
| **Component surface** | 🟢 Small | 26 `.svelte` files; logic mass lives in 90 `.ts` files |
| **Svelte hard blockers** | 🟢 None | Zero `beforeUpdate`/`afterUpdate`, zero Svelte 4 class-component API |
| **Vite config surface** | 🟢 Near-zero | No `rollupOptions`, `manualChunks`, `resolve.conditions`, Sass, or PostCSS to migrate |
| **Deprecated-but-working idiom** | 🟡 Moderate | 87 `$:`, 160 `on:`, 23 `export let` — the bulk of the runes conversion |
| **Dependency gates** | 🟡 Two forcing functions | `phosphor-svelte@3` needs `svelte@^5`; `vitest@4.1+` needs `vite@^6+` |
| **Node floor** | 🟡 Too loose | `engines: >=20` admits 20.0–20.18, which Vite 7+ rejects |
| **Vite 8 runtime risk** | 🔴 Real | Rollup→Rolldown, esbuild→Oxc. Config is clean; **behavior** is the risk, chiefly CJS interop against `aws-amplify` |
| **Test gate for components** | 🔴 Absent today | Zero tests render a component. See §4. |

---

## 1. Version Gap

| Package | Installed | Latest | Gap |
|---|---|---|---|
| `svelte` | 4.2.20 | 5.56.9 | 1 major |
| `vite` | 5.4.21 | 8.2.1 | 3 majors |
| `@sveltejs/vite-plugin-svelte` | 3.1.2 | 7.3.0 | 4 majors |
| `svelte-check` | 3.8.6 | 4.7.6 | 1 major |
| `vitest` | 4.0.18 | 4.1.10 | minor — but see §3 |
| `@sveltejs/kit` | 2.53.4 | 2.70.2 | minor only — **current major** |
| `@sveltejs/adapter-static` | 3.0.10 | 3.0.10 | **current** |

SvelteKit is **not** stale. The `CLAUDE.md` "SvelteKit 4" claim was wrong and has been corrected to "SvelteKit 2 / Svelte 4".

---

## 2. Svelte 4 Idiom Inventory

Measured across `apps/web/src` (`*.svelte` + `*.ts`).

| Idiom | Occurrences | Files | Svelte 5 status |
|---|---:|---:|---|
| `$:` reactive statements | 87 | 14 | Works in legacy mode; → `$derived`/`$effect` |
| `on:` event directives | 160 | 16 | Works; → `onclick` form |
| `export let` props | 23 | 11 | Works; → `$props()` |
| `svelte/store` constructors | 24 | 6 | **No change required** — stores fully supported in Svelte 5 |
| `createEventDispatcher` | 4 | 2 | Deprecated → callback props |
| `<slot>` | 1 | 1 | Deprecated → snippets |
| `<svelte:component>` | 1 | 1 | Deprecated → dynamic components are automatic |
| `$$props` / `$$restProps` | 1 | 1 | Deprecated → `$props()` rest |
| `beforeUpdate` / `afterUpdate` | **0** | 0 | The one removed API — none present |
| `.$set()` / `.$on()` / `.$destroy()` / `new Component({target})` | **0** | 0 | Removed class API — none present |
| `<svelte:fragment>`, `accessors`, `immutable` | **0** | 0 | None present |
| `.ts` importing `.svelte` programmatically | **0** | 0 | None outside tests |

**Reading:** nothing forces a rewrite. `sv migrate svelte-5` handles the mechanical bulk. The 87 `$:` across 14 files is the judgement-heavy remainder — `$:` maps to `$derived` or `$effect` depending on whether the statement computes or side-effects, and that distinction is not mechanical.

---

## 3. Dependency Gates

| Package | Constraint | Consequence |
|---|---|---|
| `phosphor-svelte@3` | peer `svelte: ^5.0.0` | **Already blocking.** Pinned at v2; no icon updates until Svelte 5 lands. |
| `vitest@4.1.10` | peer `vite: ^6 \|\| ^7 \|\| ^8` | **Already blocking.** `vitest@4.0.18` has no vite peer; 4.1+ added one. Vite 5 pins vitest at 4.0.x. |
| `@sveltejs/kit@2.70.2` | peer `vite: ^5.0.3 \|\| ^6 \|\| ^7 \|\| ^8`<br>peer plugin `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7` | 🟢 **Spans the entire range.** SvelteKit blocks nothing and needs no coordinated bump. |
| `@sveltejs/adapter-static` | peer `@sveltejs/kit: ^2.0.0` | 🟢 Already current. |
| `@testing-library/svelte@5` | peer `svelte: ^3 \|\| ^4 \|\| ^5` | No version change needed — but it is never imported. See §4. |
| `svelte-check@4` | peer `svelte: ^4 \|\| ^5` | **Independent** of the Svelte bump. |
| `svelte-jester@5` | — | **Dead.** Referenced only in `package.json`; project runs Vitest. |
| `@testing-library/jest-dom` | — | **Dead.** Never imported. |
| `playwright@1.58.2` (root) | — | No specs, no config. **Replaced, not adopted** — `playwright` is the driver library; the runner is `@playwright/test`. |

Only `apps/web` declares `svelte` or `vite`. No blast radius into `packages/`, `apps/api`, `infra/`, or `sdks/`.

### Plugin ladder

`@sveltejs/vite-plugin-svelte` is what couples the Svelte and Vite versions:

| plugin | vite | svelte |
|---|---|---|
| v4 | `^5` | `^5` |
| v5 | `^6` | `^5` |
| v6 | `^6.3 \|\| ^7` | `^5` |
| v7 | `^8` | `^5.46.4` |

Every rung is a valid resting place, and SvelteKit 2 spans all of them. **Svelte 5 and Vite 8 are separable** — Svelte 5 can land on Vite 5 via plugin v4.

---

## 4. 🔴 The Test Gate Does Not Cover Components

The suite is 345 passing tests across 17 files. Its coverage of the component layer is **zero**.

- **No test renders a Svelte component.** `@testing-library/svelte` and `@testing-library/jest-dom` are installed and never imported anywhere in `src`.
- **34 tests assert on `.svelte` source text**, read via `readFileSync`:
  - `src/lib/redesign-structural.test.ts` — 29 tests, `readComponent()` + `expect(source).toContain('href="/"')`
  - `src/lib/components/Icon.test.ts` — 5 tests, same pattern. Its own comment states phosphor-svelte "require[s] full Svelte compilation to render in jsdom."
- **The remaining 311 tests are pure TypeScript logic** (data-layer 63, language-utils 57, text-utilities 40, chunk-text 24, ssml 50, provider/synthesis 28) — unaffected by the Svelte or Vite version.
- **No e2e coverage.** No Playwright specs or config exist; `.playwright-cli/` holds only ad-hoc console logs from March 2026.

**Why this matters for this migration specifically:** the 34 source-text tests are coupled to *syntax*, not behavior. The runes conversion rewrites `on:click` → `onclick` and `export let` → `$props()`, which will **fail those assertions while behavior is unchanged**, and **pass them while behavior breaks**. They generate false signal in both directions and are worse than no gate.

Per the decision above: both a component rendering layer (`@testing-library/svelte`, already installed; jsdom already configured in `vitest.config.ts`) and Playwright e2e across the **19** routes (19 `+page.svelte`; the 20th `+*.svelte` is `+layout.svelte`). There is no `+error.svelte` — worth adding, since the SPA fallback makes error states reachable.

---

## 5. Vite 5 → 8 Sizing

### 5.1 Config surface: near-zero

`apps/web/vite.config.ts` is four lines:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [sveltekit()] });
```

`vitest.config.ts` adds only `include`, `environment: 'jsdom'`, `globals`, and three `$app/*` aliases.

Cross-referencing every renamed or removed option across the three majors:

| Breaking change | Present in repo? |
|---|---|
| `build.rollupOptions` → `build.rolldownOptions` (v8) | ❌ none |
| `worker.rollupOptions` → `worker.rolldownOptions` (v8) | ❌ none |
| `optimizeDeps.esbuildOptions` → `rolldownOptions` (v8) | ❌ none |
| Object form of `output.manualChunks` removed (v8) | ❌ none |
| `esbuild` option → `oxc` (v8) | ❌ none |
| `resolve.conditions` now requires explicit defaults (v6) | ❌ none |
| Sass legacy API removed (v7) | ❌ no Sass — CSS is plain, component-scoped |
| PostCSS TS/YAML config needs `tsx`/`jiti`/`yaml` (v6) | ❌ no PostCSS config |
| `splitVendorChunkPlugin` removed (v7) | ❌ none |
| `transformIndexHtml` hook-level `enforce`/`transform` removed (v7) | ❌ no custom plugins |
| `build.lib.cssFileName` (v6) | ❌ not a library build |

**No config migration work exists.** The near-zero config is the single biggest de-risking factor in this chore.

### 5.2 Where the actual risk is

Not in config — in runtime behavior and toolchain substitution.

| Risk | Major | Assessment |
|---|---|---|
| **CJS `default` import interop unified between dev and build** | v8 | 🔴 **Highest-probability breakage.** `aws-amplify@^6.16.2` is a large dependency used for Cognito auth and AppSync across `lib/auth/` and `lib/data/`. Imports from CJS packages lacking `__esModule` can change shape. Must be exercised against real auth and data paths, not just a build. |
| **Rollup → Rolldown, esbuild → Oxc** | v8 | 🟠 Whole-bundler substitution. Config is clean, but output correctness under `adapter-static` needs verification across the **14 prerendered routes**, plus confirmation that the `index.html` fallback still serves the 5 `prerender = false` routes. *(Corrected — an earlier revision claimed 550 prerendered voice pages. `routes/voices/[id]/+page.ts:4` is `prerender = false`, as are `providers/[id]`, `collections/[id]`, `account/providers`, `account/api-keys`. Already documented in `chore-seo-audit.md:42`.)* |
| **CSS minification via Lightning CSS** (was esbuild) | v8 | 🟠 CSS is component-scoped across 26 components. Minifier swap is a plausible source of subtle visual regression. |
| **Default browser targets raised twice** | v7, v8 | 🟢 **Resolved.** Chrome 87→107→111, Safari 14.0→16.0→16.4, Firefox 78→104→114. Operator accepted the modern baseline; no `build.target` override. See §5.5. |
| **Node floor: 20.19+ / 22.12+** | v7 | 🟡 Concrete fix needed. `package.json` says `engines: node >=20`, which admits 20.0–20.18. `.nvmrc` is `20`. CI pins `node-version: 20`. Local dev is on **v26.7.0**. |
| **Environment API internal refactor** | v6 | 🟡 Framework-level; SvelteKit 2.70 already supports through v8, so absorbed upstream. |
| **CJS `strictRequires` defaults true** | v6 | 🟡 Same dependency-shape family as the v8 interop change. |
| **Oxc lacks native decorator lowering** | v8 | 🟢 No decorators in the codebase. |
| **SystemJS/AMD, `shouldTransformCachedModule`, `resolveImportMeta`, `renderDynamicImport`, `resolveFileUrl` unsupported** | v8 | 🟢 No custom plugins; not applicable. |

### 5.3 Vendor-recommended path

Vite's own guidance for larger projects is to **adopt the `rolldown-vite` package while still on Vite 7**, isolating Rolldown-specific breakage from the rest of the v8 changes, then move to Vite 8 proper. Worth weighing against this repo's near-zero config surface, which may not warrant the extra hop.

### 5.4 Browser floor — decided

Target the modern baseline. Take the Vite defaults (Chrome/Edge 111, Firefox 114, Safari 16.4) and carry **no** `build.target` override.

The evidence-based path was attempted and is a dead end — **there is no telemetry to consult**:

- No analytics of any kind in the web app. Grepped `apps/web/src` and `app.html` for GA/gtag/GTM, Plausible, Umami, PostHog, Amplitude, Mixpanel, Fathom, Segment, CloudWatch RUM, and `@aws-amplify/analytics` — zero matches.
- No Amplify Analytics category in the backend.
- Amplify hosting access logs are not retrievable for the custom domain: `aws amplify generate-access-logs --app-id d2k1odilh9xpem --domain-name vokda.iksnae.com` returns `NotFoundException: Domain vokda.iksnae.com not found`.

Operator decision: proceed to modern browsers rather than block on instrumenting first.

> **Follow-on, out of scope for this chore:** the site has no usage telemetry whatsoever. Every future reach-versus-modernity decision will hit this same wall. Worth its own spec.

### 5.5 Upside

Rolldown production builds benchmark 2–5× faster on small codebases, 10–30× on large ones (a 19,000-module build went 40.1s → 1.61s). `build:web` also runs `publish-catalog.mjs` over 550 voices and is on the CI critical path.

---

## 6. CI Context

`.github/workflows/ci.yml` (`web-checks`) runs `check:web` → `check:catalog` → `build:web` on Node 20. It **does not run `npm run test`**. Paths `**/*.md`, `docs/**`, `.agencyx/**` are skipped.

Under the chosen test gate, CI needs: the unit suite wired in, a Playwright job added, and the Node pin raised to satisfy Vite 7+.

---

## 7. Open for the Planner

Scope, browser floor, CI policy, and Node floor are all settled. Two sequencing calls remain — both the planner's:

1. **Ordering of the four workstreams** — test gate, Svelte 5 bump, runes conversion, Vite 5→8. Note the test gate must be built against *some* Svelte version; building it against Svelte 4 first means the rendering and e2e tests themselves survive the migration as the artifact proving it worked.
2. **Whether to take the `rolldown-vite`-on-v7 intermediate hop** (§5.3) or go straight to Vite 8 given the near-zero config surface. Isolating one variable at a time argues for the hop; the clean config argues it may be unnecessary ceremony.

### Split out to their own specs

- `specs/chore-stale-site-meta.md` — `app.html` advertises 180 voices / 19 providers against an actual 550 / 25.
- `specs/chore-usage-telemetry.md` — the site has no usage instrumentation of any kind (§5.4).

---

## 8. Deploy Path — In Scope

**The Amplify deploy does not run the catalog publish step.**

`amplify.yml` sets `appRoot: apps/web` and runs `npm run build`, which resolves to the *workspace* script:

```
apps/web  build  →  svelte-kit sync && vite build
root      build:web  →  node scripts/publish-catalog.mjs && npm run -w apps/web build
```

Only the root script wraps `publish-catalog.mjs`. `CLAUDE.md` documents `build:web` as the build command and states that `build:web` runs the publish step automatically — true locally and in CI, **false on the deploy path**.

**Root cause is not `amplify.yml`.** `scripts/publish-catalog.mjs:36` is `const VOICES_PATH = 'apps/web/static/data/voices.json'` — a **cwd-relative** path, so the script only functions when invoked from the repo root. That is why `apps/web`'s `build` cannot include it, why the root wrapper exists, and why the deploy path skips it. Patching `amplify.yml` to `cd ../.. && npm run build:web` fixes the symptom and leaves the trap armed for the next caller. See the plan's S2 for the structural fix.

Currently non-breaking: `check:catalog` in CI enforces that the committed `static/`+`api/` artifacts match `voices.json`, so Amplify builds from already-fresh artifacts. That guard is the only thing holding it — the deploy has no independent ability to regenerate.

**Why it belongs to this chore:** AGENTS.md — *"Maintain or improve CI/CD workflows when changing build or delivery behavior."* Vite 5→8 changes build behavior. Leaving a deploy path that diverges from both the documented path and the CI path while swapping the bundler underneath it is exactly the condition that mandate exists to prevent.

Resolution is the planner's to sequence, but the end state must be: deploy, CI, and documentation describe the same build.

---

## 8. Verification Method

All figures produced by direct inspection on 2026-08-16:

- Version gaps and peer constraints: `npm view <pkg> version peerDependencies engines` against `npm ls --workspace apps/web`
- Idiom counts: `grep -rE` over `apps/web/src`, `--include='*.svelte' --include='*.ts'`
- Test counts: `npm run test` (345 passed / 17 files) plus per-file `it(`/`test(` block counts
- Component-layer coverage: `grep -rn '@testing-library' src` → no matches
- Vite breaking changes: official migration guides for [v5→v6](https://v6.vite.dev/guide/migration), [v6→v7](https://v7.vite.dev/guide/migration), and [v7→v8](https://vite.dev/guide/migration)
