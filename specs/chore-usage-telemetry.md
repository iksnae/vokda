# Usage Telemetry — There Is None

**Date:** 2026-08-16
**Status:** Open
**Origin:** Split out of `specs/chore-svelte5-vite-upgrade.md` §5.4, where the absence of telemetry blocked an evidence-based decision

---

## Problem

vokda.iksnae.com has no usage instrumentation of any kind. No page views, no browser/version distribution, no feature usage, no funnel.

This surfaced concretely: the Svelte 5 / Vite 8 chore needed to decide a browser support floor (raising to Chrome 111 / Safari 16.4 drops older-iOS visitors). AGENTS.md says *"Measure before optimizing and validate assumptions with evidence."* There was no evidence to consult, so the decision was made on judgement instead.

## Verified Absent

| Source | Result |
|---|---|
| Client analytics in `apps/web/src` + `app.html` | ❌ None. Grepped GA/gtag/GTM, Plausible, Umami, PostHog, Amplitude, Mixpanel, Fathom, Segment, CloudWatch RUM, `@aws-amplify/analytics` — zero matches. |
| Amplify Analytics category | ❌ Not present in `amplify/`. |
| Amplify hosting access logs | ❌ `aws amplify generate-access-logs --app-id d2k1odilh9xpem --domain-name vokda.iksnae.com` → `NotFoundException: Domain vokda.iksnae.com not found` |

Checked against AWS account **997901679385** (`personal` profile), Amplify app `d2k1odilh9xpem`.

> Not exhaustively ruled out: whether a CloudFront distribution fronting the custom domain has access logging to S3 independently of Amplify's own log export. Worth one check before choosing an approach — it may already be capturing user-agent data that just needs querying.

## Cost of the Gap

- Browser support decisions are guesses (this already happened).
- No way to know which of 550 voices, 25 providers, or 11 filters are used.
- No signal on whether the SSML editor, collections, clips, or BYOK credentials get real usage.
- Roadmap prioritisation has no usage input.
- No baseline to detect regression after the Svelte 5 / Vite 8 migration ships.

## Considerations

- AGENTS.md: *"Protect user data and secrets, applying least-privilege access wherever possible."* Favours a privacy-respecting, cookieless approach over third-party trackers, and self-hosted or AWS-native over shipping visitor data to a vendor.
- AGENTS.md infrastructure preference is AWS serverless — CloudWatch RUM and CloudFront access logs into S3 + Athena both fit natively and avoid a new vendor.
- The frontend is a static SvelteKit build on Amplify; server-side log analysis needs no client code and collects no PII beyond what CloudFront already records.
- *"Avoid unnecessary abstraction, complexity, dependencies"* — log-based analysis adds zero runtime dependencies to the app.

## Open Questions

1. Server-side (CloudFront/Amplify logs → Athena) or client-side (CloudWatch RUM / privacy-focused analytics)? The first answers the browser-floor question with no app changes; the second answers feature-usage questions the logs cannot.
2. What decisions must this actually inform? That sets the minimum viable instrumentation and prevents over-building.
3. Is a usage baseline wanted *before* the Svelte 5 / Vite 8 migration ships, to detect regression against?
