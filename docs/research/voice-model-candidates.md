# Voice Model Candidates — Research

**Status:** Research complete as of March 2026
**Current catalog:** 250 voices across 22 providers — all with audio

This doc covers what's not yet in the catalog, prioritized by significance and testability.

---

## Already In (recent additions — for reference)

| Provider | Voices | Notes |
|----------|--------|-------|
| Orpheus TTS | 8 | Canopy Labs, 3B model, Apache 2.0 |
| Chatterbox Turbo | 1 | Resemble AI, sub-200ms, MIT |
| Edge TTS | 47 | Microsoft, multilingual, free |
| Gemini TTS | 30 | Google DeepMind, 30 named voices |
| Dia | 3 | Nari Labs, 1.6B, Apache 2.0 |
| Bark | 13 | Suno, expressive/creative |
| KittenTTS | 8 | Local micro model |
| VoxCPM | 1 | 0.9B, Dec 2025 |
| Pocket TTS | 1 | 31.9M params, edge model |

---

## Priority 1 — Add Soon

### 🔴 Cartesia — Sonic-3

**Type:** Cloud API  
**Why it matters:** The hottest TTS player right now. Sub-80ms streaming latency, emotion/laughter support, voice cloning in 10 seconds. Widely used in voice agent stacks. The provider every developer compares everyone else against.  
**Voices:** Named character voices via API + custom clones  
**Languages:** 40+ languages  
**Pricing:** Pay-per-character, free tier available  
**API:** `POST https://api.cartesia.ai/tts/bytes` — REST, WebSocket streaming  
**Distinguishing features:**
- Real AI laughter and emotion (not just SSML tags)
- Instant voice cloning (10s reference audio)
- Pro Voice Cloning (fine-tuned for enterprise)
- SOC 2 Type II, HIPAA, PCI Level 1  
**HF/Docs:** https://cartesia.ai/sonic | https://docs.cartesia.ai  
**Auth needed:** API key (free tier available at cartesia.ai)  
**Integration path:** New `cartesia` provider in `providers.ts`, discovery script queries `GET /voices`, sample generation via `POST /tts/bytes`

---

### 🔴 Deepgram — Aura-2

**Type:** Cloud API  
**Why it matters:** 40+ named English voices (mythological names: Thalia, Odysseus, Harmonia, Theia, Electra, Arcas, Amalthea, Helena, Hyperion, Apollo, Luna...). Sub-200ms latency, domain-tuned pronunciation (healthcare, finance, legal). $0.030/1k chars. Enterprise-grade voice agent stack. Underrepresented in voice catalogs.  
**Voices:** 40+ English voices, localized accents (US, AU, PH)  
**Languages:** English (US, AU, PH), expanding  
**Pricing:** $0.030/1,000 chars (competitive)  
**API:** Standard REST TTS endpoint  
**Distinguishing features:**
- Domain-specific terminology accuracy (healthcare, finance, legal)
- Context-aware pacing and tone
- Sub-200ms streaming
- On-prem deployment option  
**HF/Docs:** https://developers.deepgram.com/docs/tts-models  
**Auth needed:** Deepgram API key  
**Integration path:** New `deepgram` provider, queries voice list endpoint, samples via TTS API

---

### 🟡 Fish Speech v1.5

**Type:** Open source (HuggingFace)  
**License:** CC-BY-NC-SA 4.0  
**Why it matters:** Trained on 1M+ hours of multilingual audio. One of the top zero-shot voice cloning models. 9 languages (EN, ZH, JA, DE, FR, ES, KO, AR, RU + NL). Very active in the HF community. Not agent-focused — excels at natural expressive speech.  
**Parameters:** Not disclosed (transformer-based)  
**Voices:** Zero-shot cloning — uses reference audio, so "voices" are reference personas  
**Languages:** 9 (English, Chinese, Japanese, German, French, Spanish, Korean, Arabic, Russian, Dutch)  
**HF:** `fishaudio/fish-speech-1.5`  
**Demo:** https://fish.audio  
**Integration path:** HuggingFace inference API or local via `fish-speech` pip package. Reference audio personas curated and saved as named voices.  
**Local on Apple Silicon:** No MLX port confirmed yet — runs on CPU/CUDA

---

### 🟡 Sesame CSM — Conversational Speech Model

**Type:** Open source (HuggingFace)  
**License:** Apache 2.0  
**Why it matters:** Built specifically for conversational AI — designed for realistic turn-taking, natural back-channels, and dialog flow. Unlike most TTS which is monologue-optimized, CSM sounds right in conversation. Released Feb 2025 by Sesame.  
**Parameters:** 1B  
**HF:** `sesame/csm-1b`  
**MLX port:** ✅ `mlx-community/csm-1b` — ready for local testing on Apple Silicon  
**Integration path:** Can test immediately with mlx-audio or the mlx-community port  
**Use case fit:** AI assistants, voice agents, conversational apps — unique angle for catalog

---

### 🟡 F5-TTS

**Type:** Open source  
**License:** MIT  
**Why it matters:** Flow-matching TTS, very fast and high quality. Large community, trending on HF. MLX port available for Apple Silicon. Fills the gap between Kokoro (tiny) and Orpheus (3B large).  
**HF:** `SWivid/F5-TTS`  
**MLX port:** ✅ `eamag/f5-tts-mlx-german` (German-focused) and base model  
**Integration path:** mlx-audio or community port for local testing

---

## Priority 2 — Queue Up

### PlayHT — 3.0 / Play Mini

**Type:** Cloud API  
**Why it matters:** Largest pre-built voice library of any cloud provider. Voice cloning API. Strong content creator adoption (audiobooks, podcasting). `play.ht` has a well-known consumer product that drives awareness.  
**Voices:** 800+ pre-built voices across 142 languages  
**License:** Commercial API  
**HF/Docs:** https://docs.play.ht  
**Auth needed:** PlayHT API key + User ID  
**Note:** Large volume makes selective curation important — pick the highlights

---

### Higgs Audio V2

**Type:** Open source  
**License:** Apache 2.0  
**Why it matters:** 5.77B parameter model from Boson AI (July 2025). Among the highest quality open-source TTS benchmarks as of mid-2025. Computationally heavy — needs GPU or cloud inference.  
**HF:** `bosonai/higgs-audio-v2`  
**Integration path:** HuggingFace Inference API or Replicate — not local-friendly due to size  
**Verdict for catalog:** Include 1-2 showcase voices via cloud inference; label clearly as "large model"

---

### Parler TTS

**Type:** Open source  
**License:** Apache 2.0  
**Why it matters:** Unique approach — voice is described in plain text ("a woman with a warm, enthusiastic voice speaking at a moderate pace in a clean studio"). No fixed voice IDs — generative voice design. Educational and creative use cases.  
**HF:** `parler-tts/parler-tts-large-v1`  
**Integration path:** HF Inference API or local; voice "personas" are text descriptions, not fixed IDs  
**Distinguishing feature:** Shows the direction of text-guided voice generation

---

### Hume AI — EVI (Empathic Voice Interface)

**Type:** Cloud API  
**Why it matters:** Emotional intelligence in voice. EVI detects user emotional state from audio and responds with appropriate vocal affect. Fundamentally different paradigm — not just TTS, it's conversational AI with emotional awareness.  
**Voices:** EVI voices (limited set, emotion-driven)  
**HF/Docs:** https://hume.ai  
**Note:** More of a voice platform than a voice catalog source — but worth tracking as an industry signal

---

### LMNT

**Type:** Cloud API  
**Why it matters:** Ultra-low latency streaming TTS, used by voice agent companies. Sub-100ms time-to-first-audio. Developer-focused. Named character voices with consistent personality.  
**Docs:** https://lmnt.com  
**Auth needed:** API key

---

### XTTS v2 — Coqui

**Type:** Open source  
**License:** CPML (non-commercial without agreement)  
**Why it matters:** Zero-shot voice cloning in 6 seconds of reference audio. 17 languages. Widely used in open-source voice projects. The Coqui project is community-maintained post-company shutdown.  
**HF:** `coqui/XTTS-v2`  
**Note:** License is restrictive (CPML). Flag clearly in catalog.

---

## Priority 3 — Track & Monitor

| Model | Org | Why track |
|-------|-----|-----------|
| StyleTTS2 | iSTFTNet | Zero-shot, high naturalness, LibriTTS trained |
| Matcha-TTS | Shivam Mehta | Flow-matching, fast, Czech academic |
| OuteTTS v2 | outeai | Already in catalog (v1). Watch for v2. |
| Resemble AI (cloud) | Resemble AI | Commercial version of Chatterbox, cloning API |
| Murf.ai | Murf | Studio/presentation voice market |
| Bark v2 | Suno | Successor to Bark — not released yet |
| Kokoro v1.5 | Hexgrad | Next Kokoro iteration (watch HF) |

---

## MLX-Ready Models (Test Locally Now)

All runnable on Apple Silicon with mlx-audio:

| MLX Model | Base Model | Size | Priority |
|-----------|-----------|------|---------|
| `mlx-community/csm-1b` | Sesame CSM | 2B | 🔴 High |
| `mlx-community/orpheus-3b-0.1-ft-4bit` | Orpheus | 3B 4bit | ✅ In catalog |
| `mlx-community/VoxCPM1.5-8bit` | VoxCPM | 0.3B | 🟡 Medium |
| `mlx-community/VoxCPM1.5-fp16` | VoxCPM | 0.9B | 🟡 Medium |
| `mlx-community/pocket-tts-4bit` | Pocket TTS | 32M | ✅ In catalog |
| `mlx-community/mlx_bark` | Bark | Large | ✅ In catalog |
| `mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16` | Qwen3 VoiceDesign | 2B | 🟡 Medium |

**Sesame CSM MLX is the top local priority** — unique conversational-first model not yet in catalog.

---

## Recommended Add Order

1. **Cartesia Sonic-3** — API key → discover voices → generate samples (cloud)
2. **Deepgram Aura-2** — API key → 40+ named voices → generate samples (cloud)
3. **Sesame CSM** — `mlx-community/csm-1b` → generate samples locally now
4. **Fish Speech v1.5** — HF inference API or pip install → curated personas
5. **PlayHT** — API key → curated selection from 800+ library
6. **F5-TTS** — mlx port → local generation
7. **Parler TTS** — HF inference → showcase text-guided generation
8. **Higgs Audio V2** — HF inference or Replicate → 1-2 showcase samples

---

## API Key Requirements

| Provider | Needed | Where to get |
|----------|--------|-------------|
| Cartesia | ✅ Required | cartesia.ai (free tier) |
| Deepgram | ✅ Required | console.deepgram.com (free $200 credit) |
| PlayHT | ✅ Required | play.ht |
| Hume | ✅ Required | hume.ai |
| LMNT | ✅ Required | lmnt.com |
| Fish Speech | ❌ Not needed | Run locally or HF Spaces |
| Sesame CSM | ❌ Not needed | MLX local |
| F5-TTS | ❌ Not needed | MLX local |
| Higgs Audio | ❌ Not needed | HF Inference API (free tier) |
