# TypeScript/JavaScript Development Constitution (2026)

## Preamble

We are professional software engineers. Our work can materially help or harm people. Therefore, we adopt an ethics-first, cleanliness-first constitution inspired by Robert C. Martin’s call for a shared professional oath (“The Scribe’s Oath”). ([gotopia.tech][1])

## The Scribe’s Oath (operationalized)

We commit to these behaviors on every change:

1. **Do no harm in code.** Prefer correctness and clarity over cleverness. ([gotopia.tech][1])
2. **Best work, every time.** If we can’t do it right now, we reduce scope instead of shipping defects. ([blog.cleancoder.com][2])
3. **No defect debt.** We do not knowingly allow defective behavior *or structure* to accumulate. ([gotopia.tech][1])
4. **Proof with every release.** Each release includes a quick, sure, repeatable proof (tests + CI). ([gotopia.tech][1])
5. **Small, frequent releases.** We don’t block others with giant, risky merges. ([gotopia.tech][1])
6. **Protect team productivity.** Our code must be easy for others to extend, debug, and own. ([Medium][3])

---

## Article I — Core engineering values

* **Clean code is a feature.** Readability, coherence, and predictability are part of “done.”
* **Explicit boundaries.** Separate domain logic from I/O, frameworks, UI, and persistence (Clean Architecture mindset).
* **Local reasoning.** Prefer small functions, small modules, obvious data flow.
* **Constraints over heroics.** Strong defaults (lint, strict TS, tests) prevent “clever” failure modes.

---

## Article II — TypeScript policy

### 1) Strictness is mandatory

* All TS projects enable `strict` (and do not casually disable strict-family flags). The TypeScript team documents what `strict` implies and why it increases correctness guarantees. ([TypeScript][4])
* Exceptions must be documented with a concrete bug-risk justification.

### 2) No “type theater”

* **Types don’t exist at runtime.** If it comes from outside the process (HTTP, DB, file, env), validate at runtime (schema validation / type guards). (Common gotcha: assuming TS types “protect” runtime.) ([Reddit][5])
* Prefer **`unknown` over `any`** for untrusted values; narrow with guards. ([DEV Community][6])

### 3) Prefer safer expressiveness

* Use discriminated unions for state machines and variant modeling.
* Use `satisfies` when you want conformance without losing inference. ([DEV Community][7])
* Avoid `as SomeType` assertions as a shortcut; if you must assert, isolate it and justify it.

---

## Article III — JavaScript correctness rules

### 1) Equality and coercion

* Default to **strict equality** (`===` / `!==`) to avoid coercion surprises. MDN is explicit about strict equality’s behavior vs loose equality. ([MDN Web Docs][8])

### 2) Exceptions and errors are first-class

* Never swallow errors (`catch(() => {})` or empty `catch`) without a deliberate, logged decision and a compensating control. (Swallowed errors create “silent failure.”) ([Medium][9])

### 3) Async must be structured

* No “floating” promises in production paths: every promise is awaited, returned, or intentionally handled.
* Treat unhandled rejections as defects; they create silent or late failures and are difficult to debug. ([Stack Overflow][10])

---

## Article IV — Architecture rules (Clean Architecture-compatible)

### 1) Dependency direction

* Domain is pure: no imports from UI, frameworks, DB clients, network clients.
* Adapters translate between domain models and external representations (DTOs).
* Use dependency inversion: domain defines interfaces; infrastructure implements.

### 2) Modules and boundaries

* Public API of a module is small and intentional.
* Avoid “reach-through” imports across layers (no bypassing boundaries “because it’s faster”).

---

## Article V — Naming constitution

We choose conventions that reduce cognitive load and match widely-used guides.

### 1) General naming

* Names are **descriptive to a new reader**; avoid ambiguous abbreviations. ([Google GitHub][11])
* Don’t encode type info in names (“userString”, “isBool”)—TypeScript already carries that signal. ([ts.dev][12])

### 2) Case conventions

* **camelCase**: variables, functions, methods. ([Airbnb JavaScript Style Guide][13])
* **PascalCase**: classes, types, interfaces, enums. ([Google GitHub][11])
* **UPPER_SNAKE_CASE**: true constants (compile-time-ish invariants). ([AWS Documentation][14])
* Booleans start with **is/has/can/should**.

### 3) Files and folders

* Use consistent file naming; many teams standardize on **kebab-case** for files/folders to avoid cross-platform case issues. ([Stack Overflow][15])

---

## Article VI — TypeScript/Node module system policy

* Prefer **ESM** for new Node projects unless interoperability constraints force CJS. Node documents ESM support and interop behavior. ([Node.js][16])
* Be explicit about module boundaries and export surfaces; avoid “barrel” exports that hide dependency direction unless carefully curated.

---

## Article VII — Tooling is part of the constitution

### 1) Linting

* ESLint is mandatory. TypeScript requires `typescript-eslint` to lint TS syntax and enable type-aware rules. ([typescript-eslint.io][17])
* Prefer “signal over noise”: start with bug-finding rules, add strictness incrementally, and let formatters handle formatting concerns. ([DEV Community][18])
* In TS code, prefer `@typescript-eslint/*` rules where applicable (ESLint notes the TS-specific equivalents, e.g., `@typescript-eslint/no-unused-vars`). ([ESLint][19])

### 2) Formatting

* Use an auto-formatter (team standard) and do not bike-shed style in reviews.

### 3) CI gates

* CI must run: typecheck (`tsc --noEmit`), lint, tests. (Type safety enforced in CI is a common large-codebase best practice.) ([DEV Community][20])

---

## Article VIII — Malpractices (explicitly forbidden)

* Disabling `strict` “temporarily” and never restoring it. ([TypeScript][4])
* Using `any` as an escape hatch instead of modeling or validating data. ([DEV Community][6])
* Type assertions (`as X`) to silence the compiler without proof. ([Reddit][5])
* Floating promises / unhandled rejections / swallowed errors. ([Stack Overflow][10])
* Loose equality in business logic without a written reason. ([MDN Web Docs][21])
* God modules, cyclic dependencies, and cross-layer imports that violate boundary direction.

---

## Article IX — Review checklist (what “done” means)

* Types are strict, intentional, and narrow; no unexplained assertions.
* External inputs validated at runtime.
* Errors handled meaningfully; no silent failures.
* Async is awaited/returned/handled; no floating promises.
* Names communicate intent; public APIs minimal.
* Tests cover critical behavior; CI gates are green.
* Change is small enough to review with confidence (or broken into slices). ([gotopia.tech][1])

---

## Article X — Icons

### 1) Phosphor icons only

* Use `@phosphor-icons/vue` for all visual icons — no emoji characters, no Unicode symbols (✓✗×★⚠🔒📊), no inline `<svg>` elements.
* Import icons individually for tree-shaking: `import { PhCheck, PhX } from '@phosphor-icons/vue'`

### 2) Sizing and weight

* Use the `:size` prop for icon dimensions — do not override with CSS `width`/`height` on the icon element itself.
* Weight variants: `regular` (default), `bold` for emphasis, `fill` for active/selected states, `light`/`thin`/`duotone` sparingly.

### 3) Standard icon mapping

| Concept | Icon | Weight |
|---------|------|--------|
| Success / confirm | `PhCheck` | regular |
| Close / dismiss | `PhX` | regular |
| Warning | `PhWarning` | regular |
| Error | `PhXCircle` | regular |
| Star / recommended | `PhStar` | fill |
| Lock / blocked | `PhLock` | regular |
| Info / default | `PhCircle` | fill |

---

## Article XI — Amendments

* Any team member may propose an amendment.
* Amendments must include: rationale, examples, enforcement mechanism (lint/test), and migration plan.
* The constitution is living, but defaults remain strict: loosen only with evidence.

If you want, I can also draft a **“Lint Compliance Amendment”** (like you did for Go) that standardizes: ESLint flat config + `typescript-eslint` configs, a minimal rule set (bug-preventing first), and CI enforcement. ([typescript-eslint.io][22])

[1]: https://gotopia.tech/sessions/143/keynote-the-scribes-oath?utm_source=chatgpt.com "Keynote: The Scribe's Oath"
[2]: https://blog.cleancoder.com/uncle-bob/2015/11/27/OathDiscussion.html?utm_source=chatgpt.com "Prelude to a Profession - The Clean Code Blog"
[3]: https://andreas-loizou.medium.com/the-scribes-oath-ac964c96a6b9?utm_source=chatgpt.com "The Scribe's Oath - Andreas Loizou"
[4]: https://www.typescriptlang.org/tsconfig/?utm_source=chatgpt.com "TSConfig Reference - Docs on every TSConfig option"
[5]: https://www.reddit.com/r/typescript/comments/1kikhsa/typescript_gotchas/?utm_source=chatgpt.com "TypeScript Gotchas"
[6]: https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb?utm_source=chatgpt.com "TypeScript Best Practices in 2025"
[7]: https://dev.to/lingodotdev/beyond-the-basics-21-typescript-features-you-might-not-know-about-1dbn?utm_source=chatgpt.com "21 TypeScript features you might not know about"
[8]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality?utm_source=chatgpt.com "Strict equality (===) - JavaScript - MDN - Mozilla"
[9]: https://medium.com/breadth-cloud/the-silent-threat-unhandled-promise-rejections-in-javascript-ef26a2512d89?utm_source=chatgpt.com "The Silent Threat: Unhandled Promise Rejections in ..."
[10]: https://stackoverflow.com/questions/40500490/what-is-an-unhandled-promise-rejection?utm_source=chatgpt.com "What is an unhandled promise rejection? - javascript"
[11]: https://google.github.io/styleguide/tsguide.html?utm_source=chatgpt.com "Google TypeScript Style Guide"
[12]: https://ts.dev/style/?utm_source=chatgpt.com "TypeScript style guide"
[13]: https://javascript.airbnb.tech/?utm_source=chatgpt.com "Airbnb JavaScript Style Guide()"
[14]: https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-cdk-typescript-iac/typescript-best-practices.html?utm_source=chatgpt.com "Follow TypeScript best practices"
[15]: https://stackoverflow.com/questions/18927298/node-js-project-naming-conventions-for-files-folders?utm_source=chatgpt.com "Node.js project naming conventions for files & folders"
[16]: https://nodejs.org/api/esm.html?utm_source=chatgpt.com "ECMAScript modules | Node.js v25.2.1 Documentation"
[17]: https://typescript-eslint.io/?utm_source=chatgpt.com "typescript-eslint"
[18]: https://dev.to/tarunmj6/setting-up-typescript-eslint-rules-teams-actually-follow-4121?utm_source=chatgpt.com "Setting Up TypeScript ESLint Rules Teams Actually Follow"
[19]: https://eslint.org/blog/2025/01/differences-between-eslint-and-typescript/?utm_source=chatgpt.com "Differences between ESLint and TypeScript"
[20]: https://dev.to/anmshpndy/typescript-expert-revision-handbook-466f?utm_source=chatgpt.com "TypeScript Expert Revision Handbook"
[21]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality?utm_source=chatgpt.com "Equality (==) - JavaScript | MDN - Mozilla"
[22]: https://typescript-eslint.io/getting-started/?utm_source=chatgpt.com "Getting Started"
