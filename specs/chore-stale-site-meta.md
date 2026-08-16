# Stale Site Meta — Catalog Counts

**Date:** 2026-08-16
**Status:** Open
**Origin:** Split out of `specs/chore-svelte5-vite-upgrade.md` (out of scope there — content drift, unrelated to the toolchain migration)

---

## Problem

`apps/web/src/app.html` advertises catalog counts that are wrong by a factor of three. These are the default meta served to every crawler and every social preview, and they are only overridden per-page via `svelte:head` where a page bothers to do so.

| Location | Says | Actual |
|---|---|---|
| `<meta name="description">` | "180 voices" | **550 voices** |
| `<meta name="description">` provider list | AWS Polly, Azure, Google, Gemini, OpenAI, ElevenLabs, local MLX | **25 providers** |
| `<meta property="og:description">` | "180 TTS voices across 19 providers" | 550 / **25** |
| `<meta name="twitter:description">` | "180 TTS voices across 19 providers" | 550 / **25** |

Source of truth is `apps/web/static/data/voices.json` — 550 voices, 25 providers, 53 languages.

## History

Flagged in `specs/chore-seo-audit.md` (2026-03-06), §1, as a 🟡 Medium finding: *"Stale voice/provider counts in meta — `app.html` default description says '180 voices' and '19 providers' … Home page OG says '15 providers'."* Still present five months later.

## Why It Recurs

The counts are hand-written string literals in `app.html`. Nothing ties them to `voices.json`, so every catalog addition silently widens the gap. A one-time correction will drift again on the next voice import.

## Considerations

- `scripts/publish-catalog.mjs` already reads `voices.json` and generates derived artifacts. Deriving the counts there — rather than restating them — is the DRY fix and the one that stops recurrence.
- `check:catalog` (`scripts/check-catalog-fresh.mjs`) already gates artifact freshness in CI. Whether meta accuracy joins that guard is worth deciding.
- The SEO audit lists adjacent unfixed items in the same file (missing canonical URLs on 10 of 13 pages, absent web app manifest). Whether this chore absorbs them or stays narrow is a scope call.

## Open Questions

1. Fix the literals only, or derive the counts from `voices.json` at publish time so they cannot drift again?
2. Does this chore stay scoped to the counts, or take the other open SEO-audit findings with it?
