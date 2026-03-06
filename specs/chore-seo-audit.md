# SEO Audit — vokda.iksnae.com

**Date:** 2026-03-06
**Audited by:** Automated crawl + manual inspection

---

## Executive Summary

| Category | Score | Notes |
|----------|-------|-------|
| **Crawlability** | 🟢 Good | robots.txt, sitemap.xml, valid HTML |
| **Meta Tags (static pages)** | 🟡 Partial | Titles ✓, descriptions generic, OG/canonical missing on most |
| **Meta Tags (dynamic pages)** | 🔴 Poor | 550 voice pages not prerendered — SPA shell served to crawlers |
| **Structured Data** | 🟡 Partial | JSON-LD on voice detail pages only (client-rendered) |
| **Performance** | 🟢 Good | Brotli compression, CloudFront CDN, fast TTFB |
| **Mobile** | 🟢 Good | Viewport meta, responsive design |
| **Security Headers** | 🔴 Missing | No HSTS, CSP, X-Frame-Options, Referrer-Policy |
| **Content Richness** | 🟡 Mixed | Home page empty to crawlers; docs pages fully prerendered |

**Overall: C+** — Strong foundation but critical gaps in prerendering and per-page meta.

---

## 1. Crawlability & Indexing

### ✅ What's Working
- **robots.txt** — Clean `Allow: /` with sitemap reference
- **sitemap.xml** — 553 URLs (7 static pages + 2 docs + 550 voices + `/docs/sdk`)
- **HTTPS redirect** — `http://` → `https://` via CloudFront 301
- **Brotli compression** — Enabled site-wide
- **HTML lang** — `lang="en"` on all prerendered pages
- **Viewport meta** — Present on all prerendered pages
- **OG image** — `og-image.png` exists (89KB), proper dimensions (1200×630)
- **Per-voice OG images** — 550 voice-specific OG images generated

### ❌ Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| **Home page not prerendered** | 🔴 Critical | Googlebot sees empty SPA shell — no `<title>`, no `<h1>`, no content. The most important page has zero crawlable text. |
| **550 voice detail pages not prerendered** | 🔴 Critical | `prerender = false` on `/voices/[id]`. All voice pages in sitemap return the SPA fallback (3.4KB shell). Crawlers see generic default meta, not voice-specific OG/description/JSON-LD. |
| **No canonical URLs** on 10 of 13 pages | 🟡 Medium | Only `/`, `/collections`, `/voices/[id]` set canonical. All docs pages, about, account pages missing canonical. |
| **Stale voice/provider counts in meta** | 🟡 Medium | `app.html` default description says "180 voices" and "19 providers" — actual count is **550 voices** across **25 providers**. Home page OG says "15 providers". |
| **No web app manifest** | 🟡 Low | `/manifest.json` and `/site.webmanifest` return 404. PWA metadata missing. |

---

## 2. Meta Tags — Per-Page Audit

### Static Pages (Prerendered)

| Page | Title | Description | OG | Canonical | H1 | JSON-LD |
|------|-------|-------------|----|-----------|----|---------|
| `/` (home) | ❌ Missing (shell only) | ❌ Default only | ❌ Not rendered | ❌ Not rendered | ❌ None | ❌ |
| `/about` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/docs` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/docs/getting-started` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/docs/providers` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/docs/ssml` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/docs/api` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/docs/sdk` | ✅ Unique | ✅ Custom | ❌ Default OG | ❌ Missing | ✅ 1 | ❌ |
| `/collections` | ✅ Unique | ❌ Default | ✅ Custom | ✅ Set | ✅ 1 | ❌ |
| `/account` | ✅ Unique | ❌ Default | ❌ Default | ❌ Missing | ? | ❌ |
| `/admin` | ✅ Unique | ❌ Default | ❌ Default | ❌ Missing | ? | ❌ |
| `/curation` | ✅ Unique | ❌ Default | ❌ Default | ❌ Missing | ? | ❌ |

### Dynamic Pages (Client-Rendered — NOT Prerendered)

| Page | Title | Description | OG | Canonical | JSON-LD |
|------|-------|-------------|----|-----------| --------|
| `/voices/[id]` (×550) | ✅ Unique (client) | ✅ Custom (client) | ✅ Full OG (client) | ✅ Set (client) | ✅ AudioObject (client) |

**Problem:** Voice detail pages have excellent SEO markup — but it's **all client-rendered**. Crawlers and social media scrapers see only the default `app.html` shell. The per-voice titles, descriptions, OG tags, and JSON-LD are invisible to search engines.

---

## 3. Content & Heading Structure

### ✅ Good
- All prerendered pages have exactly 1 `<h1>` (correct)
- Heading hierarchy is clean (h1 → h2 → h3)
- Semantic HTML used throughout

### ❌ Issues
- **Home page has no `<h1>`** — renders client-side only
- **No alt text audit** — unable to assess from server-side HTML (client-rendered content)

---

## 4. Structured Data

| Type | Page | Status |
|------|------|--------|
| JSON-LD `AudioObject` | `/voices/[id]` | ✅ Implemented but **client-rendered only** |
| JSON-LD `WebSite` | `/` (home) | ❌ Missing |
| JSON-LD `Organization` | `/about` | ❌ Missing |
| JSON-LD `BreadcrumbList` | All pages | ❌ Missing |
| JSON-LD `SoftwareApplication` | `/docs/sdk` | ❌ Missing |
| JSON-LD `WebAPI` | `/docs/api` | ❌ Missing |

---

## 5. Performance (Server-Side)

| Metric | Value | Rating |
|--------|-------|--------|
| TTFB (home) | 111ms | 🟢 |
| TTFB (docs) | 131ms | 🟢 |
| TTFB (about) | 194ms | 🟢 |
| Compression | Brotli | 🟢 |
| CDN | CloudFront | 🟢 |
| Cache | `s-maxage=31536000` | 🟢 |
| HTTPS | ✅ + HTTP→HTTPS redirect | 🟢 |

---

## 6. Security Headers

| Header | Status |
|--------|--------|
| `Strict-Transport-Security` (HSTS) | ❌ Missing |
| `Content-Security-Policy` | ❌ Missing |
| `X-Content-Type-Options` | ❌ Missing |
| `X-Frame-Options` | ❌ Missing |
| `Referrer-Policy` | ❌ Missing |
| `Permissions-Policy` | ❌ Missing |

**Note:** These don't directly affect SEO rankings but affect site trust signals and Google's security assessment.

---

## 7. Social Sharing

- **OG image** — Generic site-wide image used on all pages (except voice detail, which is client-only)
- **Twitter card** — `summary_large_image` set in defaults ✅
- **Per-page OG override** — Only implemented in client-rendered voice detail pages
- **og:url** — Hardcoded to `https://vokda.iksnae.com` on all pages (should be page-specific)

---

## 8. Sitemap Quality

```
553 total URLs:
  - 7 static pages (/, /about, /docs, /collections, /account, /admin, /curation)
  - 6 docs pages (/docs/*, /docs/sdk)
  - 550 voice detail pages (/voices/[id])
  - Missing: /account/clips, /account/providers, /account/api-keys
```

**Issues:**
- Sitemap lists 550 voice pages that serve SPA shell to crawlers
- Priority `0.8` on all voice pages — appropriate
- `lastmod` dates are all `2026-03-06` (today) — should reflect actual last modification
- Missing: account sub-pages (but these are auth-gated, so omission may be intentional)
- Auth-gated pages (`/admin`, `/curation`, `/account`) are in sitemap but probably shouldn't be

---

## Prioritized Recommendations

### P0 — Critical (Directly Impacts Indexing)

1. **Enable prerendering for voice detail pages**
   - Remove `export const prerender = false` from `/voices/[id]/+page.ts`
   - Or use `entries()` to enumerate all voice IDs at build time
   - This unlocks SEO for 550 pages with excellent OG/JSON-LD already written

2. **Fix home page prerendering**
   - The home page SPA shell means crawlers see no title, no h1, no content
   - Ensure the catalog `load()` function resolves at build time
   - Or at minimum, add a static fallback title/h1/description

3. **Update stale voice/provider counts**
   - `app.html` default description: "180 voices" → "550 voices"
   - `app.html` default description: "19 providers" → "25 providers"
   - Home page OG: "15 providers" → "25 providers"

### P1 — Important (Improves Ranking Signals)

4. **Add canonical URLs to all public pages**
   - Every prerendered page should have `<link rel="canonical" href="..." />`
   - Prevents duplicate content issues

5. **Add per-page OG tags to docs pages**
   - Each docs page has a unique title and description but inherits the generic OG
   - Should override `og:title`, `og:description`, `og:url` per page

6. **Add JSON-LD structured data**
   - Home: `WebSite` with `SearchAction` (for sitelinks search box)
   - About: `Organization`
   - Voice detail: Already has `AudioObject` ✅ (just needs prerendering)

7. **Remove auth-gated pages from sitemap**
   - `/admin`, `/curation`, `/account` are behind auth — crawlers can't access them
   - Either remove from sitemap or ensure they have useful public content

### P2 — Nice to Have

8. **Add security headers** via Amplify custom headers config
9. **Create web app manifest** for PWA support
10. **Add breadcrumb JSON-LD** to docs pages and voice detail
11. **Add `og:locale`** meta tag
12. **Dynamic `lastmod` in sitemap** based on actual content changes

---

## Quick Win: Stale Counts Fix

The fastest fix with immediate impact:

```
app.html description: "180 voices" → "550 voices", "19 providers" → "25 providers"
Home page OG: "15 providers" → "25 providers"  
Home page OG: voice count should use actual catalog size
```
