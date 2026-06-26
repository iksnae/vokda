# Voice Discovery Guide

> Vokda is your destination for discovering, auditioning, and organizing TTS voices across every major provider and open-source model.

**Live at:** https://vokda.iksnae.com

---

## Browse the Catalog

The home page presents **550 voices across 25 providers** in a Pinterest-style grid. Every card shows the voice name, provider, language, quality tier, and key tags. Click the play button to hear a pre-generated audio sample without signing in.

### Search

The search bar matches across:
- Voice name and short label
- Provider name and ID
- Description
- Tags (use-case, tone, audience, machine-generated)
- Gender, speaking style, accent

**Example queries:** `narration`, `female`, `british`, `whisper`, `openai`, `neural`

### Filters

Expand the **Filters** panel for fine-grained control:

| Filter | Options |
|--------|---------|
| **Provider** | All 25 providers (Cartesia, Deepgram, OpenAI, ElevenLabs, etc.) |
| **Language** | 50+ language codes (en-US, fr-FR, de-DE, ja-JP, etc.) |
| **Gender** | Female, Male, Neutral, Variable |
| **Quality** | Premium, Standard |
| **Age** | Child, Young, Young adult, Adult, Middle-aged, Mature, Senior |
| **Style** | Chat, Newscast, Balanced, Conversation, Cheerful, and more |
| **Type** | Cloud provider, Local model, Open model, HF Space, Self-hosted |
| **Sort** | Name A–Z, Provider, Newest first |

**Toggle filters:**
- ✅ **SSML enabled** — show only voices supporting Speech Synthesis Markup Language (114 voices)
- ✅ **Live preview** — voices with real-time synthesis available
- ✅ **Has audio sample** — voices with pre-generated samples
- ❤️ **Favorites** — your saved favorites (requires sign-in)

All filters sync to URL parameters — bookmark or share any filtered view:
```
https://vokda.iksnae.com/?ssml=1&gender=female&quality=premium&provider=Azure+Speech
```

### Voice Cards

Each card shows:
- **Play button** — instant sample playback
- **Provider badge** — color-coded by provider
- **Language** and **gender**
- **Quality tier** — premium or standard
- **SSML badge** — green indicator for SSML-capable voices
- **Tags** — up to 3 catalog tags + speaking style or tone
- **♥ Favorite** and **📌 Pin** buttons

---

## Voice Detail Pages

Click any card to open the full voice detail page at `/voices/{id}`.

### Audio Samples

Pre-generated audio samples play in a custom player with seek, time display, and keyboard support.

### Model Card

Technical metadata in collapsible sections:
- Model name, version, family, architecture
- Provider info with links to docs
- Capabilities: streaming, voice cloning, emotion control, SSML, word timestamps
- Supported languages, styles, emotions
- Performance: sample rate, bit depth, channels
- Licensing notes

### Audition Panel

**Live synthesis** lets you type custom text and hear it spoken by the voice in real-time. This is a member-only feature requiring your own provider API keys (BYOK — Bring Your Own Key).

**Three states:**
1. **Not signed in** → sign-in prompt
2. **Signed in, no key** → setup guide with step-by-step instructions for the specific provider
3. **Signed in + key connected** → full audition UI

**Audition features:**
- **Text mode** — type any text, hit Synthesize (or Ctrl+Enter)
- **SSML mode** — visual editor with tag toolbar, attribute popovers, real-time validation, and quick reference (see [SSML Guide](#ssml-editor) below)
- **Direction (steering)** — for voices that support it, a control to shape *how* the line is delivered, surfaced automatically per voice:
  - **OpenAI** — a free-text **Direction** box (e.g. "cheerful and upbeat; speak slowly and clearly")
  - **ElevenLabs** — expressivity sliders (stability, similarity, style, speed); on `eleven_v3` you can also drop inline audio tags like `[whispers]` or `[excited]` right in the text
  - **AWS Polly** (Matthew, Joanna, Lupe, Amy) — a **Newscaster** style toggle
  - Voices without steering simply don't show the control. Each voice advertises its capability in the API via the `steering` field (see [API reference](./SYNTHESIS_API.md#voice-capabilities)).
- **Playback** — inline player with a **waveform** (seek + time display); clips render their waveform too
- **Clip saving** — every synthesis is saved as a clip in your library

### Provider Setup Guide

For voices without synthesis available (local models, free providers without browser support), the audition panel shows contextual guidance:
- **API providers** (OpenAI, ElevenLabs, etc.) — 3-step walkthrough with links
- **Free providers** (Edge TTS) — explanation of availability
- **Local models** (Kokoro, Bark, etc.) — install and run commands

---

## SSML Editor

When you switch to SSML mode in the audition panel, a visual editor replaces the plain textarea:

### Tag Toolbar

Seven tag buttons with per-provider availability:

| Tag | Purpose | Supported by |
|-----|---------|-------------|
| `<break>` | Insert pause | All SSML providers |
| `<prosody>` | Rate, pitch, volume | All SSML providers |
| `<emphasis>` | Stress words | All SSML providers |
| `<say-as>` | Number/date interpretation | All SSML providers |
| `<phoneme>` | Exact pronunciation (IPA) | AWS Polly, Azure, GCP |
| `<sub>` | Spoken substitution | All SSML providers |
| `<lang>` | Language switching | AWS Polly, Azure, Edge TTS |

Click a button → configure attributes in the popover → Insert at cursor.

### Validation

A status bar below the textarea shows:
- ✓ **Valid SSML** (green)
- ⚠ **Warnings** (yellow) — unsupported tags for this provider, missing `<speak>` wrapper
- ✗ **Errors** (red) — malformed XML, mismatched tags

### Quick Reference

Expand "Show SSML Quick Reference" for themed examples with one-click insertion:
- Each tag has 2–5 variant examples
- All examples use speech-generation-industry themes
- Click **+** to insert any example at cursor position
- Links to AWS Polly, Azure, and Google Cloud SSML documentation

### SSML-Capable Providers

| Provider | Voices | SSML tags |
|----------|--------|-----------|
| Edge TTS | 47 | break, emphasis, prosody, say-as, sub, lang |
| Google Cloud TTS | 27 | break, emphasis, prosody, say-as, phoneme, sub |
| Azure Speech | 22 | All tags + Microsoft extensions |
| AWS Polly | 18 | All tags + Amazon extensions |

---

## Collections

Pin voices to collections to organize and compare candidates.

### Creating Collections

1. Click the 📌 pin icon on any voice card
2. Select an existing collection or create a new one
3. Voices can belong to multiple collections

### Managing Collections

Visit `/collections` to see all your collections. Each collection shows:
- Voice count and list
- Remove individual voices
- Export as **Voice Pack JSON** — a portable format for voice pipeline integration

---

## Audio Clips

Every synthesis generates a clip saved to your library at `/account/clips`.

### Clip Management

| Action | How |
|--------|-----|
| **Play** | Click the play button on any clip |
| **Edit** | Click the edit icon → set name, description, comma-separated tags |
| **Re-synthesize** | Click ⚡ → navigates to voice page with text pre-filled for editing |
| **Download** | Click export icon → saves as MP3 |
| **Delete** | Click trash icon → confirm to remove |
| **Search** | Filter by name, voice, text content, tags, or provider |

### Clip Metadata

Each clip records:
- Voice name and provider
- Input text and mode (text or SSML)
- Custom name, description, and tags (editable)
- Synthesis latency and file size
- Creation timestamp

---

## Accounts & Authentication

### Signing Up

1. Visit `/account` → Sign Up
2. Enter email and password
3. Confirm email with verification code
4. You're in as a **guest** — can favorite, pin, and browse

### Role Hierarchy

| Role | Capabilities |
|------|-------------|
| **Visitor** | Browse catalog, play samples |
| **Guest** | + Favorites, collections, account settings |
| **Curator** | + Curation workspace, metadata editing |
| **Admin** | + User management, provider CRUD |

### Provider Keys (BYOK)

Vokda uses Bring Your Own Key for synthesis. Your API keys are stored encrypted in DynamoDB with owner-only access.

1. Go to `/account/providers`
2. Select a provider (OpenAI, ElevenLabs, Gemini, Cartesia, etc.)
3. Enter your API key
4. Test the connection
5. Once active, audition panels for that provider's voices unlock

### Vokda API Keys

For programmatic access to the Synthesis API:

1. Go to `/account/api-keys`
2. Create a key (labeled for your use case)
3. Copy the `vk_live_...` key — it's shown only once
4. Use it in `Authorization: Bearer vk_live_...` headers

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Synthesize in audition panel |
| `Escape` | Close SSML toolbar popover |
| `Enter` | Confirm SSML tag insertion |
