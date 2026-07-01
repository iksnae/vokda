# Voice Discovery & Curation Process

## Overview

Vokda's voice catalog is built by querying provider APIs, curating the best voices, and generating real audio samples. The catalog spans 25 providers.

## Provider Summary

| Provider | Type | Voices | Audio | API/Method |
|----------|------|--------|-------|------------|
| AWS Polly | Cloud | 18 | 18 ✓ | `aws polly describe-voices` + `synthesize-speech` |
| Azure Speech | Cloud | 22 | 22 ✓ | REST token auth → voice list + SSML synthesis |
| Google Cloud TTS | Cloud | 27 | 27 ✓ | Hardcoded list (API key invalid); OpenAI fallback audio |
| OpenAI | Cloud | 11 | 9 ✓ | Hardcoded from docs; `POST /v1/audio/speech` |
| ElevenLabs | Cloud | 22 | 22 ✓ | `GET /v1/voices` + `POST /v1/text-to-speech/{id}` |
| Kokoro 82M | Local | 24 | 24 ✓ | mlx-audio (`mlx-community/Kokoro-82M-bf16`) |
| Qwen3 TTS | Local | 6 | 6 ✓ | mlx-audio (`mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit`) |
| **Total** | | **550** | **550** | |

## Scripts

### `scripts/discover-voices.mjs`
Queries all cloud provider APIs to enumerate available voices. Saves raw API responses to `scripts/discovery/*.json` for reference.

```bash
node scripts/discover-voices.mjs
```

**Environment variables**: AWS creds, `AZURE_SPEECH_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `GOOGLE_CLOUD_API_KEY`

### `scripts/curate-catalog.mjs`
Filters discovered voices to a high-quality set based on:
- Locale/accent diversity (US, UK, AU, NZ, CA, IN, IE)
- Expressiveness (Azure voices with style support)
- Gender balance
- Named character voices (ElevenLabs premade library)

```bash
node scripts/curate-catalog.mjs
```

### `scripts/generate-all-samples.mjs`
Generates MP3 audio samples for cloud provider voices by calling each API.

```bash
node scripts/generate-all-samples.mjs
```

### `scripts/generate-local-samples.py`
Generates samples for local open-model voices using mlx-audio. Requires Python 3.12 venv with mlx-audio dependencies.

```bash
python3.12 -m venv /tmp/mlx-tts-venv12
source /tmp/mlx-tts-venv12/bin/activate
pip install mlx mlx-audio misaki num2words spacy phonemizer espeakng_loader soundfile numpy
python scripts/generate-local-samples.py
```

**Prerequisites**: Apple Silicon Mac, espeak-ng (`brew install espeak-ng`), ffmpeg

## Local Model Setup (LM Studio + mlx-audio)

### LM Studio
LM Studio v0.4.5 downloads and manages MLX-quantized model files, but its runtime (mlx-llm v1.3.0) does not yet support TTS model architectures (`kitten_tts`, `qwen3_tts`). Models are stored at `~/.lmstudio/models/mlx-community/`.

### mlx-audio (recommended)
The `mlx-audio` Python package provides direct inference for TTS models on Apple Silicon:

**Supported models discovered locally:**
- `mlx-community/Kokoro-82M-bf16` — 256 MB, 54 voices (24 English selected)
- `mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit` — 2.4 GB, 9 voices (6 English selected)

**Known issues:**
- `misaki` (Kokoro dependency) has a version conflict with `phonemizer` — requires patching `espeak.py` to use `data_path` property instead of `set_data_path()` method
- System `espeak-ng` library needed: `brew install espeak-ng`
- Python 3.14 incompatible with spacy (use Python 3.12)

### Kokoro 82M Voice Naming Convention
```
{lang}{gender}_{name}.safetensors
  a = American    f = female
  b = British     m = male
  e = Spanish
  f = French
  j = Japanese
  z = Chinese
```

Example: `af_bella` = American Female "Bella", `bm_george` = British Male "George"

### Qwen3-TTS Speakers
Built-in custom voices: `serena`, `vivian`, `uncle_fu`, `ryan`, `aiden`, `ono_anna`, `sohee`, `eric`, `dylan`

## Catalog Schema

Each voice entry in `apps/web/static/data/voices.json`:

```jsonc
{
  "id": "ULID",
  "name": "Display Name",
  "provider": "Provider Display Name",
  "providerId": "provider-slug",           // matches provider-colors.ts
  "providerVoiceId": "api-voice-id",
  "description": "Human-readable description",
  "tags": ["female", "american", "open-model"],
  "languages": ["en-US"],
  "qualityTier": "premium",
  "licenseNotes": "License terms summary",
  "metadata": {
    "metadataQuality": "editorial|curated|sparse",
    "genderPresentation": "male|female|neutral",
    "accent": "american|british|...",
    "toneTags": ["natural", "warm"],
    // ...
  },
  "samples": [{
    "id": "ULID",
    "transcript": "The text spoken in the sample",
    "audioUrl": "/audio/samples/{voiceId}.mp3"   // optional
  }],
  "variants": [{
    "sourceType": "cloud_provider|local_model",
    "sourceKey": "provider:model:voiceId",
    // ...
  }]
}
```

## Adding New Voices

1. **Cloud provider**: Add voice ID to the picks set in `curate-catalog.mjs`, re-run discovery + generation
2. **Local model**: Add voice definition to `KOKORO_ENGLISH_VOICES` or `QWEN3_VOICES` in `generate-local-samples.py`, run with mlx-audio venv
3. **New provider**: Add provider definition to `providers.ts`, color to `provider-colors.ts`, synthesis function to generation scripts
