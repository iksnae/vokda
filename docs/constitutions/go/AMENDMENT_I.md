## Amendment I — Lint Compliance & Automated Code Quality Enforcement

**Ratified as binding extension to the Go Development Constitution**

---

### §1 — Purpose

Linting exists to **mechanically enforce professionalism**, eliminate preventable defects, and preserve long-term maintainability.

Lint compliance is **not stylistic preference** — it is an automated extension of engineering discipline aligned with:

* Clean Code principles (Robert C. Martin)
* The Programmer’s / Scribe’s Oath
* Idiomatic Go standards
* Long-term operational safety

Lint rules remove subjective debate from reviews so humans can focus on **architecture and intent**.

---

### §2 — Constitutional Requirement

All Go source code **MUST** pass lint validation before:

* commit acceptance
* pull request merge
* release build
* binary distribution

A build that fails lint **is considered broken**.

No exception.

---

### §3 — Single Source of Truth

Lint configuration **MUST** be centralized.

```
.golangci.yml
```

is the constitutional authority governing lint behavior.

Individual developers SHALL NOT override lint locally.

CI enforcement is final authority.

---

### §4 — Mandatory Tooling

The project SHALL standardize on:

* `golangci-lint` (aggregated enforcement layer)
* `go vet`
* `gofmt` or `gofumpt`

Minimum execution:

```bash
golangci-lint run ./...
```

CI pipelines MUST fail on non-zero exit.

---

### §5 — Required Linter Classes

#### Formatting & Syntax Integrity

Enforced automatically:

* `gofmt`
* `gofumpt`
* `goimports`

Purpose:

* eliminate formatting discussion
* enforce canonical Go layout

---

#### Correctness & Safety

MUST remain enabled:

* `govet`
* `errcheck`
* `staticcheck`
* `ineffassign`
* `typecheck`

These detect:

* ignored errors
* dead assignments
* unsafe constructs
* logic defects

Ignoring these violations constitutes negligence.

---

#### Code Quality & Maintainability

Required:

* `revive`
* `unused`
* `gosimple`
* `gocritic`

Goals:

* prevent entropy
* eliminate redundant abstraction
* enforce readability

---

#### Complexity Controls

Required safeguards:

* `cyclop`
* `gocognit`
* `funlen`

Limits SHALL exist to prevent procedural collapse.

Recommended defaults:

```
Cyclomatic Complexity ≤ 15
Function Length ≤ 80 lines
Cognitive Complexity ≤ 20
```

Violation indicates required refactoring.

---

### §6 — Error Discipline Enforcement

Lint SHALL enforce:

* errors are never silently ignored
* `_ = err` prohibited except explicitly justified
* wrapped errors preferred across boundaries

Example violation:

```go
result, _ := doThing()
```

Constitutional correction:

```go
result, err := doThing()
if err != nil {
    return fmt.Errorf("doThing failed: %w", err)
}
```

---

### §7 — Architectural Protection Rules

Lint configuration SHOULD prevent:

* import cycles
* forbidden dependency direction
* leakage of internal packages

Projects MAY define architectural guards such as:

```
domain → cannot import adapters
adapters → may import domain
```

Automation SHALL enforce boundaries where possible.

---

### §8 — Suppression Governance

Lint suppression is **allowed but regulated**.

Permitted only via:

```go
//nolint:<rule> // justification
```

Requirements:

1. Rule explicitly named.
2. Written justification required.
3. Blanket `//nolint` forbidden.
4. Suppressions reviewed during PR.

Unjustified suppression is treated as technical debt creation.

---

### §9 — CI Enforcement

CI SHALL execute:

```bash
go mod tidy
go fmt ./...
go vet ./...
golangci-lint run
go test ./...
```

Merge protection MUST block failure.

Developers SHALL experience failure locally before CI whenever possible.

---

### §10 — Legacy Code Exception Protocol

Existing violations MAY be grandfathered ONLY IF:

* baseline snapshot established
* new violations forbidden

Rule:

> Leave touched code cleaner than found.

Lint debt MUST trend downward over time.

---

### §11 — Review Doctrine

Code review SHALL NOT debate rules already enforced by lint.

Reviewers focus on:

* architecture
* correctness
* intent
* clarity
* domain modeling

Automation handles style.

Humans handle thinking.

---

### §12 — Cultural Principle

Lint compliance represents:

* respect for teammates
* respect for future maintainers
* respect for operational safety

Passing lint is the **minimum professional bar**, not an achievement.

---

### §13 — Constitutional Maxim

> If a machine can detect it, a human should not need to review it.

Automation preserves cognition for design.

---

✅ **Amendment Ratified**
Effective immediately upon inclusion in repository governance.
