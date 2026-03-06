# Chore: Restore Curation + Add Synthesis Interface

## Summary

Two tasks:
1. **Restore curation/data moderation** — Ensure admin+curator roles can access curation workspace and admin pages via navigation. Add nav links visible to appropriate roles.
2. **Add Synthesis interface** — Add a synthesis/audition panel on the voice detail page for authenticated users to type custom text and hear it spoken in that voice.

## Current State

### Curation/Admin
- `/curation` page exists and works — role-gated to curators
- `/admin` page exists and works — role-gated to admins
- **Problem**: These pages are only accessible via the user menu dropdown. There are links in the avatar dropdown menu, but no prominent nav links. The nav bar only has "Collections". Users need clearer access.

### Synthesis
- Full adapter registry exists (`lib/synthesis/`) with mock + real adapters for 9+ providers
- Credential store (`lib/stores/credentials.ts`) loads BYOK keys and registers real adapters
- `synthesizePreview()` service ready — handles mock, BYOK, and gateway modes
- Provider keys page exists at `/account/providers`
- Vokda API keys page exists at `/account/api-keys`
- **Missing**: No audition UI on voice detail page. User can only listen to pre-generated samples.

## Plan

### Task 1: Restore Curation & Admin Nav

1. Add "Curation" and "Admin" links to the header `<nav>` (role-gated)
2. Keep existing user menu links too (they're useful on mobile)

### Task 2: Add Synthesis Audition Panel

Add an "Audition" section on the voice detail page (`/voices/[id]`) below the audio player:

**UI:**
- Text input (textarea) with placeholder sample text
- Mode toggle: Text / SSML
- "Synthesize" button
- Audio player for result
- Status indicators: loading, error, provider info
- Auth gate: show "Sign in to audition" for unauthenticated visitors
- Provider key prompt if no credential available for this voice's provider

**Flow:**
1. User types text → clicks Synthesize
2. `synthesizePreview()` is called with voice, variant, text, mode
3. If real adapter available (BYOK key stored) → real synthesis
4. If no key → mock adapter (simulated delay + browser speechSynthesis fallback)
5. If gateway mode → calls synthesis API endpoint
6. Result rendered in audio player with latency/provider info

## Files Changed

- `apps/web/src/routes/+layout.svelte` — Add nav links for Curation/Admin
- `apps/web/src/routes/voices/[id]/+page.svelte` — Add audition panel
