# Go Development Constitution

*A professional engineering standard for Go codebases, aligned with Clean Architecture and the Scribe’s Oath.*

---

## 0) The Oath We Build Under

We adopt the Scribe’s / Programmer’s Oath as an engineering bar: don’t ship harmful code; don’t let defective behavior/structure accumulate; ship repeatable proofs; ship small, frequent releases. ([blog.cleancoder.com][1])

---

## 1) Non-Negotiables

**MUST**

* **Format:** `gofmt` (or `gofumpt` if team-standard), no exceptions.
* **Build discipline:** `go test ./...` must pass locally and in CI for every change.
* **Static analysis in CI:** at minimum `go vet`; preferably a curated linter runner (e.g., `golangci-lint`) with a stable config. ([Go][2])
* **Small PRs + small releases** to reduce risk and improve review quality. ([blog.cleancoder.com][1])
* **No panic in production paths** (return errors; let callers decide). ([GitHub][3])

**SHOULD**

* Enforce “definition of done”: tests + lint + review + clear docs for public APIs.
* Prefer standard library first; add deps only with clear ROI and exit strategy.

---

## 2) Naming Constitution (Clarity > Cleverness)

Go naming is *semantic* (exported vs unexported), and idioms matter. ([Go][4])

**MUST**

* **Package names:** short, lower-case, no underscores; avoid stutter (`http.HttpClient` is a smell). Use Go’s guidance and standard library patterns. ([Go][5])
* **Receiver names:** short, type-derived (e.g., `c *Client`), consistent; **never** `this/self/me`. ([Go][6])
* **Exported identifiers:** only when truly part of your package API; doc comments for exported symbols.

**SHOULD**

* **Interfaces:** keep small; name single-method interfaces with `-er` where natural (`Reader`, `Writer`). ([go-proverbs.github.io][7])
* Prefer concrete types; introduce interfaces at the *consumer boundary*.

---

## 3) Package & Module Architecture (Clean Boundaries)

**MUST**

* Design packages around **cohesion** (one reason to change).
* Keep `main` thin: wiring + configuration + lifecycle only.
* Use `internal/` to enforce boundaries for non-public code. ([Go][8])

**SHOULD**

* Separate **domain** (pure business rules) from **adapters** (DB/HTTP/CLI) and **frameworks** (routers, drivers).
* Dependency direction: outer layers depend on inner; inner never imports outer (Clean Architecture principle).

---

## 4) Error Handling & Reliability

Go’s posture: **errors are values**; treat them as first-class, shapeable data. ([Go][9])

**MUST**

* Return `(T, error)` and handle errors explicitly at boundaries.
* Wrap with context using `%w` when propagating across layers; use `errors.Is/As` for inspection. ([Go][10])
* Don’t log-and-return the same error repeatedly across layers (choose one place to own logging).

**SHOULD**

* Use sentinel errors sparingly; prefer typed errors when callers need behavior.
* Include actionable context in wraps (what failed + key identifiers).

**MALPRACTICES**

* `panic` for normal failures (reserve for programmer errors / truly unrecoverable states). ([GitHub][3])
* Returning a **typed nil** as an `error` (classic “nil != nil” trap). ([Go][11])

---

## 5) Concurrency, Context, and Cancellation

**MUST**

* Use `context.Context` for request-scoped cancellation, deadlines, and propagation across goroutines. ([Go][12])
* Call `cancel()` as soon as the work is done to release resources. ([Go Packages][13])
* Prefer channels for orchestration; mutexes for protection (know which problem you’re solving). ([go-proverbs.github.io][7])

**MALPRACTICES**

* Storing `context` in structs long-term (tends to leak scope and lifecycle ownership).
* Spawning goroutines without a cancellation plan (goroutine leaks).

**Gotcha (Versioned)**

* **Loop variable capture changed in Go 1.22.** Know which Go version your CI/build uses and what semantics you rely on. ([Go][14])

---

## 6) Testing as “Proof”

The oath requires “quick, sure, repeatable proof.” Tests are that proof. ([blog.cleancoder.com][1])

**MUST**

* Table-driven tests for behavior surfaces; clear case naming.
* Deterministic tests (no sleeps for correctness).

**SHOULD**

* Use subtests for structure and selective runs. ([Go][15])
* Put integration tests behind build tags or separate packages; keep unit tests fast.

---

## 7) Go-Specific Patterns We Prefer

**Prefer**

* **Small interfaces** (“the bigger the interface, the weaker the abstraction”). ([go-proverbs.github.io][7])
* **Zero-value usability** where reasonable (“make the zero value useful”). ([go-proverbs.github.io][7])
* Explicit constructors only when invariants require them.
* Dependency injection via parameters (not global singletons).

---

## 8) Go-Specific Gotchas (Required Knowledge)

Engineers **MUST** be able to explain and avoid:

* **Interface typed-nil traps** (`var e *MyErr = nil; return e` as `error` ≠ `nil`). ([Go][11])
* **`defer` in loops** (resource buildup; prefer scoped funcs).
* **Map iteration order is randomized** (never rely on it).
* **`range` copy semantics** and pointer-to-loop-variable mistakes (especially in pre-1.22 mental models). ([Go][14])
* **`context` misuse** (values vs params; cancellation ownership). ([Go][12])

---

## 9) Review & Change Control

**MUST**

* Reviews enforce: naming, boundaries, error handling, tests, and simplicity (idiomatic Go).
* “No broken windows”: if you touch a file, leave it cleaner than you found it (structure + behavior).

**SHOULD**

* Prefer boring solutions; novelty must justify itself in maintenance cost.

---

## 10) Enforcement

This constitution is enforced through:

* CI gates: format + test + vet + lint ([Go][2])
* Code review using Go’s canonical review guidance ([Go][6])
* Periodic refactoring to prevent structural decay (explicitly required by the oath). ([blog.cleancoder.com][1])

---