---
name: js-tree-shaking
description: >
  Strategy and technique for shrinking JavaScript/TypeScript bundles — ESM over
  CommonJS, bundler tree-shaking (Vite/Rollup/esbuild/Webpack/tsup), `sideEffects`
  declarations, `/* @__PURE__ */` annotations, code splitting & dynamic imports,
  minification, dead-branch elimination via `define`, barrel-file avoidance, and
  modular package/`exports` design. Use when an operator asks to reduce bundle or
  Lambda size, strip unused JS/TS code, "tree shake" a build, audit why a bundle is
  large, lazy-load a heavy feature, or design a tree-shakeable package. This is an
  APPLICATION skill — it decides which lever to pull and how to verify the win. The
  mechanism deep-dive lives in the linked GUIDE.md. Do NOT use it for runtime-speed
  tuning unrelated to size, or for non-JS/TS builds (Go, Swift, etc.).
side: shadow
---

# js-tree-shaking

JavaScript/TypeScript has the most explicit tree shaking of any mainstream ecosystem,
but it only pays off when the code is *designed* for it — and the biggest wins are
architectural (ESM, module boundaries, no import-time side effects), not flag-level.
This skill is the playbook for **which lever to pull, in what order, and how to prove
it worked.** When a rule needs the underlying "why" (how bundlers do static analysis,
why `sideEffects` beats `usedExports`, esbuild's conservatism), read the companion
**[GUIDE.md](GUIDE.md)** — it is the reference; this file is the strategy.

## The one idea

> Bundlers keep the *statically-reachable export graph* from each entry point — but
> only when they can prove a module is safe to drop. Every lever below either
> (a) shrinks what's reachable (named imports, code splitting, fewer deps), or
> (b) removes a reason the bundler is *forced to keep* code it can't prove is dead
> (CommonJS, missing `sideEffects`, import-time registration, broad dynamic imports).

Reach for ESM + module/package design first (it unlocks the most), `sideEffects` +
import hygiene second, minification/define and release config last. Static analysis is
free — you don't pull it, you just avoid blocking it with dynamic patterns.

## Lever order (highest leverage first)

1. **Ship ESM; never CommonJS for libraries.** Tree shaking depends on static
   `import`/`export`. `require()`/`module.exports` and dynamic property access defeat
   it. For TS, emit `"module": "ESNext"` so bundlers see ESM. → GUIDE: *Why ESM
   Matters*, *CommonJS vs ESM*, *TypeScript Compiler Settings*.
2. **`sideEffects` + no side effects in index/barrel files.** `"sideEffects": false`
   (or an explicit file list for polyfills/CSS/registration) lets bundlers drop whole
   unused modules. Import-time work in `index.ts` (`registerEverything()`) pins
   everything. → GUIDE: *`sideEffects`*, *Selective Side Effects*, *Mistake 4*.
3. **Named imports; kill barrels & whole-library imports.** `import { debounce } from
   "lodash-es"` not `import _ from "lodash"`; `import { Search } from "lucide-react"`
   not `import * as Icons`. Avoid `export * from "./all-providers"` barrels that pull
   everything. → GUIDE: *Import Style*, *Barrel Files*, *Mistake 3*, *Mistake 5*.
4. **Code splitting via dynamic `import()`.** Move heavy/optional features (editors,
   charts, admin panels, large SDKs, AI tools) into lazy chunks so they leave the
   initial bundle. Keep the specifier static (`import("./Editor")`), not computed. →
   GUIDE: *Code Splitting*, *Dynamic Imports*.
5. **Dependency hygiene.** Fat deps (cloud SDKs, moment, full lodash, reflection-heavy
   frameworks) dominate size. Find the importer, swap for an ESM-native/smaller
   alternative, externalize, or gate it. → GUIDE: *External Dependencies*, *Measuring
   Bundle Size*, *Common Mistakes*.
6. **Modular package + `exports` design.** Split optional providers into separate
   packages / `exports` subpaths (`@vokda/adapter-openai`) so consumers import only
   what they use. Use `preserveModules` for libraries to keep boundaries in `dist`. →
   GUIDE: *Package Exports*, *Preserve Modules for Libraries*, *Vokda Package
   Recommendations*.
7. **Production build last: minify + `define` dead-branch elimination.** A production
   build with minification (esbuild/Terser/SWC) removes what tree shaking marked dead;
   `--define:process.env.NODE_ENV='"production"'` / `import.meta.env.DEV` /
   `__ENABLE_X__=false` makes dev-only and feature-flagged code unreachable so it gets
   dropped. Real, reliable cut — but it's the finishing pass, not the strategy. →
   GUIDE: *Minification*, *Dead Branch Elimination*, *Feature Flags*, *Pure
   Annotations*.

## Workflow — measure, diagnose, fix, verify

Never optimize blind. Size work is a loop:

1. **Baseline.** Build and record the number before touching anything. App:
   `npm run build && du -sh dist` (or the per-chunk sizes Vite prints). Lambda/library:
   `esbuild … --outfile=dist/x.js && ls -lh dist/x.js`. Keep it.
2. **Diagnose where the bytes are.** Generate a treemap and read it:
   `rollup-plugin-visualizer` (Vite/Rollup → `stats.html`), `esbuild --metafile` then
   `npx esbuild --analyze --metafile=meta.json`, or `source-map-explorer`. Find the
   importer with `npm ls <pkg>` / `pnpm why <pkg>`. → GUIDE: *Measuring Bundle Size*,
   *Debugging Tree Shaking*.
3. **Pick the lever** that matches the dominant cost (a fat cloud SDK in the client →
   code-split or externalize; an icon pack pulled whole → named imports; a barrel/
   index side effect pinning modules → `sideEffects` + explicit re-exports; dev-only
   code shipping → `define` replacement).
4. **Apply one change** so the delta is attributable.
5. **Re-measure.** Same build + size command, compare to baseline. State the delta in
   KB/% (gzip/brotli where it matters), not "should be smaller."
6. **Repeat** down the lever list until win-per-effort drops off.

Report results with real before/after numbers from step 5 — never claim a size win you
didn't measure.

## Release build commands (reliable baselines)

```bash
# App (this repo): Vite production build — Rollup tree-shakes, esbuild minifies
npm run build:web          # vokda: publish-catalog + vite build (static adapter)

# Library / CLI: ESM, split, tree-shaken, types emitted
tsup src/index.ts --format esm --dts --treeshake --splitting --minify --target es2022

# Node service bundled to one ESM file (smaller deploy, faster cold start)
esbuild src/server.ts --bundle --platform=node --target=node20 --format=esm \
  --packages=external --minify --tree-shaking=true --outfile=dist/server.js

# Lambda handler (esbuild, dead-branch elimination + minify)
esbuild src/handler.ts --bundle --platform=node --target=node20 --format=esm \
  --define:process.env.NODE_ENV='"production"' --minify --sourcemap \
  --outfile=dist/handler.mjs
```

Externalize (`--packages=external`, `external: [...]`) deps the runtime already
provides or that are huge/native — but externalized code is **not** tree-shaken inside
your bundle. → GUIDE: *Node.js Backend Bundling*, *External Dependencies*, *Recommended
App Config: Vite*, *Recommended Library Config: tsup*.

## Anti-patterns to catch (the usual size leaks)

- **CommonJS in a library** (`module.exports`, `require`) — defeats static analysis.
  Ship ESM (`"type": "module"`, `"module": "ESNext"`). → GUIDE: *Mistake 1*.
- **Whole-library / namespace imports** — `import _ from "lodash"`,
  `import * as Icons from "lucide-react"`. Use named/deep imports or the `-es` variant.
  → GUIDE: *Import Style*, *Mistake 3*.
- **Side effects in `index.ts` / barrels** — `registerEverything()` then
  `export *` pins every module. Re-export named symbols only; declare `sideEffects`.
  → GUIDE: *Mistake 4*, *Mistake 5*.
- **Import-time plugin registration** — `import "./providers/openai"` for the side
  effect drags all providers in. Prefer explicit `import { OpenAIProvider }`. → GUIDE:
  *Mistake 6*.
- **Broad/dynamic `import(userInput)`** — forces bundlers to include many files. Keep
  the specifier static. → GUIDE: *Dynamic Imports*.
- **Missing production mode / minification** — tree shaking marks dead code; the
  minifier removes it. Without production build it stays. → GUIDE: *Minification*.
- **Reflexive `/* @__PURE__ */`** — only annotate genuinely side-effect-free calls;
  you're promising the bundler it's safe to drop. → GUIDE: *Pure Annotations*.

## Designing tree-shakeable packages

When building (not just trimming), bias toward: ESM with named exports · `"sideEffects":
false` (explicit list for the few that aren't) · small modules with clear boundaries ·
`exports` subpaths so consumers deep-import (`@vokda/sdk/synthesis`) · `preserveModules`
for libs · optional/heavy provider adapters in **separate** packages so cloud SDKs
(`@aws-sdk/*`, Azure/GCP clients) and audio deps never enter every bundle · static
imports by default, dynamic `import()` for heavy optional features (SSML editor, admin,
audition studio) · feature flags via `define` replacement. → GUIDE: *Package Exports*,
*Preserve Modules for Libraries*, *Vokda Package Recommendations*, *Best Practices
Checklist*.

## Pre-ship checklist

- [ ] Baseline and post-change sizes recorded; deltas stated in real KB/% (gzip where
      it matters), not assumed.
- [ ] ESM everywhere; TS emits `"module": "ESNext"`; no CommonJS in shipped libs.
- [ ] `package.json` declares `sideEffects` (`false` or an explicit file list).
- [ ] No side effects / registration in `index.ts`; barrels re-export named symbols only.
- [ ] Named/deep imports; no whole-library or namespace imports of fat deps/icon packs.
- [ ] Heavy/optional features behind dynamic `import()`; specifiers are static.
- [ ] Production build with minification; dev-only/feature-flag code removed via `define`.
- [ ] Bundle analyzer treemap reviewed (`visualizer` / `esbuild --analyze`); win
      confirmed against the recorded baseline, not assumed.
