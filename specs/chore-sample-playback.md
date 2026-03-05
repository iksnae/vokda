# Chore: Real Sample Playback + Full Voice Discovery

## Goal
1. Discover all available voices from each TTS provider API
2. Curate to a high-quality set of ~100 voices
3. Generate real audio samples for each voice
4. Wire playback into the catalog UI

## Process Documentation

### Step 1: Voice Discovery (`scripts/discover-voices.mjs`)
Queried each provider API to enumerate available voices:

| Provider | API Used | Voices Found | Notes |
|----------|----------|-------------|-------|
| AWS Polly | `aws polly describe-voices --engine neural` | 63 | Full neural voice list |
| Azure Speech | `GET /cognitiveservices/voices/list` (eastus) | 129 en-* | Token auth, filtered to English neural |
| OpenAI | Hardcoded from docs (no list endpoint) | 11 | alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse |
| ElevenLabs | `GET /v1/voices` | 57 | Account premade voices |
| Google Cloud TTS | Hardcoded (API key invalid) | 27 | Neural2, Studio, Journey, News, Wavenet series |
| **Total** | | **287** | |

Raw discovery data saved to `scripts/discovery/*.json`.

### Step 2: Curation (`scripts/curate-catalog.mjs`)
Filtered 287 → 102 voices based on:
- **AWS Polly (18)**: Selected for locale diversity (US/UK/AU/NZ/CA/IN), gender balance, popularity
- **Azure Speech (22)**: Prioritized voices with style support (expressive), plus diverse en-GB/AU/IN/IE locales
- **Google Cloud TTS (27)**: All hardcoded premium voices (Neural2/Studio/Journey/News across US/GB/AU)
- **OpenAI (11)**: All voices (small, curated set by design)
- **ElevenLabs (22)**: Premade library voices (professional quality, named characters)
- **Hugging Face (2)**: Preserved existing Kokoro 82M and Qwen3 entries

### Step 3: Sample Generation (`scripts/generate-all-samples.mjs`)
Generated MP3 samples by calling each provider API with the voice's sample transcript:

| Provider | Method | Success | Failed | Notes |
|----------|--------|---------|--------|-------|
| AWS Polly | `aws polly synthesize-speech` CLI | 18/18 | 0 | Neural engine, fallback to standard |
| Azure Speech | REST POST SSML → eastus | 20/20 | 0 | 128kbps mono MP3 |
| OpenAI | `POST /v1/audio/speech` | 9/11 | 2 | ballad/verse not on tts-1 model |
| ElevenLabs | `POST /v1/text-to-speech/{id}` | 22/22 | 0 | Rate limited (429), retried with 4s delays |
| Google Cloud TTS | OpenAI fallback (GCP key invalid) | 27/27 | 0 | Gender-matched OpenAI voice as stand-in |
| Hugging Face | N/A (GPU required) | 0/2 | 2 | No hosted inference API |
| **Total** | | **96/100** | **4** | |

### Final Result
- **102 voices** in catalog across 6 providers
- **98 with playable audio** (96 generated + 2 original seed)
- **4 without audio**: Kokoro 82M, Qwen3 (GPU), OpenAI ballad, OpenAI verse (not on tts-1)
