# Code Judo

Status: canonical pattern reference. Cited by
[`skills/code-quality-review/SKILL.md`](../skills/code-quality-review/SKILL.md)
and (where the pattern applies) the milestone-grinder Phase 1
DoD discipline.

## Definition

Code judo is the act of *restructuring* an implementation so
that whole categories of complexity disappear — branches,
helpers, modes, conditionals, layers — rather than polishing
the existing shape. The implementation's behavior is preserved;
its surface area shrinks.

Adopted from the Cursor team-kit's
`thermo-nuclear-code-quality-review` skill, which named the
pattern explicitly. Recurring in loswfx work under different
names (the M83 unify, the M104 SNS-not-EventBridge default,
the M101 SQLite-not-DynamoDB choice). This doc gives the
pattern one name across reviewers and review skills.

## The shape

A code-judo move has three signs:

1. **Behavior is preserved.** The change is not a feature
   change; outputs match across the cut.
2. **Surface area shrinks.** Lines of code go down, or
   conceptual count goes down — fewer modes, fewer
   conditionals, fewer helpers.
3. **Reasoning effort drops.** A future reader needs to
   understand fewer moving parts to be correct about the
   code.

A change that adds an abstraction without retiring one is
not code judo; it is just architecture. A change that
deletes lines without preserving behavior is not code judo;
it is a feature removal. The pattern is specifically the
intersection.

## Worked examples from loswfx

### M83 — `.loswf/` → `.loswfx/` unification

The pre-M81 workspace had two parallel directories that
served similar concerns. M83's `loswfx workspace unify`
deleted the parallelism — one tree, one set of paths, one
schema convention. Behavior preserved (everything that
worked before works after); two directory roots collapsed
into one; readers no longer have to remember which root owns
which artifact.

### M101 — SQLite + Litestream replaces DynamoDB

The first cloud-ledger sketch carried a DynamoDB read index
parallel to the S3 source-of-truth. M101 deleted DynamoDB
entirely and reused the SQLite shape the kernel already runs
locally; Litestream streams the WAL to S3 for durability.
Same read latency, same durability guarantees, one fewer
service in the architecture, one fewer schema language to
maintain.

### M104 — SNS replaces EventBridge by default

EventBridge was the first sketch's pub/sub. SNS with filter
policies fills the same role for our subscriber pattern at
50% of the cost and no rules engine to maintain. The
"rules engine for dynamic subscribers" capability stays
available as `cfg.Ledger.PubSub.Backend = "eventbridge"` —
the option exists, the default is the simpler shape.

### M61–M64 — Operator grinder loop becomes a kernel
command

The operator's manual milestone-grinder pattern — invoke
the agent, wait, approve, advance — became `loswfx
milestone grind --cycles N` in four milestones. Five layers
of operator decisions collapsed into one. The behavior the
operator was producing by hand is the behavior the kernel
now produces by command. Five files of decision logic
deleted by the act of naming the pattern in code.

## Why naming the pattern matters

Reviewers and authors converge on the same vocabulary.
"This feels like code judo is available — can we delete the
mode rather than parameterize it?" reads cleanly. The
alternatives — "is there a cleaner way?", "could we
simplify?" — leave the reviewer's intent ambiguous and the
author with no specific path to investigate. A named
pattern is a workable spec.

## When code judo is the wrong move

Three cases where the move is right-shape but
wrong-timing:

1. **Behavior is in flux.** A code-judo restructuring during
   a feature change conflates two diffs; reviewers can't
   tell which lines preserved behavior and which changed
   it. Ship the feature, then restructure.
2. **Tests are thin.** The pattern preserves behavior only
   when behavior is observable. If the test coverage
   doesn't pin the contract, the cut may delete a working
   case the author didn't know existed. Add tests first.
3. **Timing matters.** A restructuring that lands mid-arc
   forces every parallel work stream to rebase. The
   workspace-modernization arc (M81→M85) waited until M77
   closed the SUT round-2 gaps; the modernization didn't
   compete with operational fixes.

## Code judo vs refactoring

| Move | Surface area | Behavior | Reader cost |
|---|---|---|---|
| Refactoring | Same or larger | Preserved | Same |
| Polish | Same | Preserved | Slightly lower |
| **Code judo** | **Smaller** | **Preserved** | **Significantly lower** |
| Feature change | Same or larger | Changes | Variable |

A refactoring rename does not qualify. Splitting one large
file into three smaller files only qualifies when the three
smaller files together have less code than the original (or
fewer reasoning steps per file). Mechanical extraction
without reduction is just movement.

## How review skills use this pattern

Two review skills cite this doc:

- [`pr-review`](../skills/pr-review/SKILL.md) — the
  conservative, document-as-deliverable review. Cites code
  judo as an optional finding category when a clearly
  available move is being passed up.
- [`code-quality-review`](../skills/code-quality-review/SKILL.md)
  — the maximalist review. Cites code judo as a
  presumptive blocker when the move is available and the
  PR passes over it.

The same vocabulary; different bars for when missing the
move blocks merge.

## See also

- [`skills/code-quality-review/SKILL.md`](../skills/code-quality-review/SKILL.md)
  — the maximalist review skill.
- [`skills/pr-review/SKILL.md`](../skills/pr-review/SKILL.md)
  — the conservative review skill.
- [`docs/SHADOW-AS-PROJECT-BRAIN.md`](./SHADOW-AS-PROJECT-BRAIN.md)
  — the strategic frame; deletion-over-addition shows up
  there as the brain-body axis at a different scale.
