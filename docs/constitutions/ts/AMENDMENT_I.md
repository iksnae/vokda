# Amendment I — Lint Compliance & Automated Code Integrity

## Purpose

Linting exists to **prevent defects before execution**, enforce professional consistency, and protect long-term maintainability.

Lint rules are **not stylistic preferences**.
They are **automated enforcement of engineering discipline** aligned with Clean Code principles and the Scribe’s Oath.

Lint compliance is therefore **mandatory**, automated, and non-negotiable.

---

## Article I — Constitutional Principle

> Any code that cannot pass automated static analysis cannot be considered professional work.

Linting SHALL:

* Prevent known JavaScript/TypeScript failure modes
* Enforce architectural boundaries
* Eliminate ambiguity
* Reduce cognitive load
* Detect unsafe runtime behavior early

Linting SHALL NOT:

* Exist merely for formatting debates
* Be bypassed for convenience
* Be selectively enforced

---

## Article II — Required Toolchain

All TypeScript/JavaScript projects SHALL include:

### Mandatory

* **ESLint (Flat Config)**
* **typescript-eslint**
* **TypeScript compiler (`tsc`)**
* **Automated formatter (Prettier or equivalent)**

### Execution Layers

| Layer      | Responsibility           |
| ---------- | ------------------------ |
| Formatter  | whitespace & layout      |
| ESLint     | correctness & discipline |
| TypeScript | type safety              |
| CI         | enforcement              |

Formatting concerns MUST NOT appear in ESLint rules.

---

## Article III — Enforcement Levels

Rules are classified into constitutional tiers.

---

### Tier 1 — Safety Rules (ERROR)

**Cannot be disabled locally.**

These prevent real production defects.

Examples:

* No unused variables
* No implicit `any`
* No floating promises
* No unsafe assignments
* No ignored async results
* No shadowed variables
* No fallthrough switch cases
* No empty catch blocks
* Explicit return consistency

Required rules:

```js
"@typescript-eslint/no-unused-vars": "error",
"@typescript-eslint/no-explicit-any": "error",
"@typescript-eslint/no-floating-promises": "error",
"@typescript-eslint/no-unsafe-assignment": "error",
"@typescript-eslint/no-misused-promises": "error",
"no-empty": ["error", { "allowEmptyCatch": false }],
"eqeqeq": ["error", "always"]
```

---

### Tier 2 — Professional Discipline (ERROR)

Protects maintainability and readability.

Examples:

* Explicit module boundaries
* Predictable imports
* Consistent type imports
* No circular dependencies
* No default exports in shared libraries

Example rules:

```js
"import/no-cycle": "error",
"import/no-default-export": "error",
"@typescript-eslint/consistent-type-imports": "error"
```

---

### Tier 3 — Guidance Rules (WARN)

Encourage improvement without blocking delivery.

Examples:

* function complexity
* file length
* naming suggestions

Warnings MAY exist temporarily but MUST trend toward resolution.

---

## Article IV — Forbidden Practices

The following actions violate constitutional compliance:

### ❌ Disabling lint globally

```ts
/* eslint-disable */
```

### ❌ Blanket suppression

```ts
// eslint-disable-next-line
```

### ❌ Permanent suppression comments

### ❌ Turning rules off to ship faster

---

## Article V — Authorized Exception Protocol

Exceptions are allowed ONLY when:

1. A technical limitation exists
2. The behavior is proven safe
3. Documentation exists

Required format:

```ts
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// SAFE: validated via runtime schema (Zod.parse)
```

All suppressions MUST include justification.

Unjustified suppressions are defects.

---

## Article VI — CI Enforcement

Lint compliance SHALL be enforced automatically.

### Required CI Gates

```bash
npm run typecheck
npm run lint
npm run test
```

Failure of ANY gate SHALL block:

* merge
* release
* deployment

No manual override permitted.

---

## Article VII — Developer Workflow

### Local Development Contract

Before commit:

```bash
npm run lint --fix
npm run typecheck
```

Recommended automation:

* pre-commit hook
* pre-push verification

Developers SHOULD never encounter lint failures in CI.

---

## Article VIII — Architectural Linting

Linting SHALL enforce architectural intent where possible.

Examples:

* domain layer cannot import infrastructure
* UI cannot access persistence directly
* adapters isolate framework code

Example restriction:

```
domain/*
  ❌ cannot import from infrastructure/*
```

Architecture violations are **engineering defects**, not stylistic issues.

---

## Article IX — TypeScript-Specific Guarantees

Linting SHALL reinforce TypeScript correctness:

### Required Practices

* Prefer `unknown` over `any`
* Promise results handled explicitly
* Exhaustive switch handling for unions
* Explicit async boundaries

Recommended rules:

```js
"@typescript-eslint/switch-exhaustiveness-check": "error",
"@typescript-eslint/await-thenable": "error"
```

---

## Article X — Ownership & Responsibility

Every engineer is responsible for:

* Leaving code cleaner than found
* Removing obsolete suppressions
* Improving lint coverage over time

Lint debt is technical debt.

Unchecked lint debt is professional negligence.

---

## Article XI — Amendment Evolution

Lint configuration SHALL evolve as:

* language features mature
* ecosystem risks emerge
* team scale increases

New rules MUST include:

* rationale
* defect class prevented
* migration strategy

---

## Constitutional Principle of Automation

> Discipline enforced automatically becomes culture.

Linting is not about style.

It is the **automated conscience of the codebase**.
