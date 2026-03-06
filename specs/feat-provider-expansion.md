# Provider Expansion Plan

**Status**: Active roadmap  
**Last updated**: March 5, 2026

## Current State

250 voices across 22 providers. 73 local/MLX-tagged voices.

| Provider | Voices | Type | API Key? | Status |
|----------|--------|------|----------|--------|
| Edge TTS | 47 | cloud | **None** | ✅ Done |
| Gemini TTS | 30 | cloud | Yes | ✅ Done |
| Google Cloud TTS | 27 | cloud | Yes | ✅ Done |
| Kokoro | 24 | cloud | None (local) | ✅ Done |
| Azure Speech | 22 | cloud | Yes | ✅ Done |
| ElevenLabs | 22 | cloud | Yes | ✅ Done |
| AWS Polly | 18 | cloud | Yes | ✅ Done |
| Bark | 13 | local | None | ✅ Done |
| OpenAI | 11 | cloud | Yes | ✅ Done |
| Orpheus TTS | 8 | local | None | ✅ Done |
| KittenTTS | 8 | local | None | ✅ Done |
| Qwen3 TTS | 7 | local | None | ✅ Done |
| Dia | 3 | local | None | ✅ Done |
| Marvis | 2 | local | None | ✅ Done |
| Chatterbox | 1 | local | None | ✅ Done |
| Chatterbox Turbo | 1 | local | None | ✅ Done |
| OuteTTS | 1 | local | None | ✅ Done |
| Pocket TTS | 1 | local | None | ✅ Done |
| Soprano | 1 | local | None | ✅ Done |
| Spark TTS | 1 | local | None | ✅ Done |
| VoxCPM | 1 | local | None | ✅ Done |
| VibeVoice | 1 | local | None | ✅ Done |

---

## Tier 1 — High-value, ready to add

### Edge TTS Non-English (275 more voices)

- **What**: 275 additional Edge TTS voices across 90+ locales (Spanish, French, German, Japanese, Chinese, Arabic, Hindi, etc.)
- **Effort**: Low — same `edge-tts` Python library, same generation pattern
- **API key**: None
- **Value**: Massive catalog expansion for multilingual use, all free
- **Action**: Run generation script with locale filter expanded beyond `en-*`
- **Impact**: 250 → 525 voices

### Deepgram Aura TTS (11 voices)

- **What**: Low-latency streaming TTS voices — Asteria, Luna, Stella, Athena (female); Orion, Arcas, Perseus, Angus, Orpheus, Helios, Zeus (male)
- **Effort**: Medium — needs API key, REST API is straightforward
- **API key**: Yes (BYOK)
- **Value**: Very fast inference (~250ms), competitive quality
- **Pricing**: Pay-per-character, competitive
- **Action**: Add adapter + curate 11 voices

### Cartesia Sonic (80+ voices)

- **What**: High-quality, ultra-fast TTS with voice design capabilities
- **Effort**: Medium — REST API, voice library queryable
- **API key**: Yes (BYOK)
- **Value**: Voice design (describe characteristics → generate voice), very low latency
- **Pricing**: Pay-per-character
- **Action**: Add adapter, query voice library, curate top voices

### Qwen3-TTS 0.6B (7 voices, faster variant)

- **What**: Smaller, faster version of existing Qwen3-TTS with same 7 speakers
- **Effort**: Low — same mlx-audio API, just different model ID
- **Value**: Faster local inference for users with less RAM
- **Action**: Add as "Qwen3 TTS Lite" variant entries

### Qwen3-TTS VoiceDesign (1 voice)

- **What**: Describe voice characteristics in natural language → generates matching voice
- **Effort**: Low — same mlx-audio API with prompt-based voice design
- **Value**: Unique capability for voice prototyping
- **Action**: Add single entry with voice-design documentation

---

## Tier 2 — Good value, moderate effort

### PlayHT / PlayAI (600+ voices)

- **What**: Massive voice library with Play3.0 engine
- **Effort**: High — large catalog requires curation strategy, REST API
- **API key**: Yes (BYOK)
- **Value**: Huge voice diversity, good quality
- **Action**: Query API for top English voices, curate 30-50 representative voices

### LMNT (20+ voices)

- **What**: Fast streaming TTS, voice cloning
- **Effort**: Medium — REST API
- **API key**: Yes (BYOK)  
- **Value**: Very fast, good quality
- **Action**: Add adapter, curate available preset voices

### F5-TTS (1-3 voices)

- **What**: State-of-the-art zero-shot voice cloning TTS (800K+ downloads)
- **Effort**: High — separate `f5-tts-mlx` library (not in mlx-audio), requires own integration
- **API key**: None (local)
- **Value**: Excellent voice cloning quality
- **Blocked by**: Not in mlx-audio model registry, needs separate Python package

### Piper TTS (150+ voices)

- **What**: Lightweight ONNX-based TTS, 150+ voices across 30+ languages
- **Effort**: Medium — needs ONNX runtime, different from mlx-audio pipeline
- **API key**: None (local)
- **Value**: Very fast CPU inference, massive language coverage
- **Action**: Requires piper-tts Python package or ONNX runtime integration

### Coqui XTTS-v2 (voice cloning)

- **What**: 8M+ downloads, state-of-the-art voice cloning (discontinued but model available)
- **Effort**: High — requires TTS Python package with specific dependencies
- **API key**: None (local)
- **Value**: Best open-source voice cloning, multilingual
- **Action**: Investigate Python package compatibility

---

## Tier 3 — Future / BYOK-dependent

### IBM Watson TTS

- **What**: Enterprise TTS service
- **Effort**: Medium — REST API
- **API key**: Yes (BYOK)
- **Timeline**: After BYOK M3

### Resemble AI

- **What**: Voice cloning and custom voice creation
- **Effort**: Medium — REST API
- **API key**: Yes (BYOK)
- **Timeline**: After BYOK M3

### WellSaid Labs

- **What**: Studio-quality voices for enterprise
- **Effort**: Medium — REST API
- **API key**: Yes (BYOK)
- **Timeline**: After BYOK M3

### Murf AI

- **What**: AI voice-over platform with 120+ voices
- **Effort**: Medium — REST API
- **API key**: Yes (BYOK)
- **Timeline**: After BYOK M3

---

## Blocked — Known Issues

| Model | Issue | Status |
|-------|-------|--------|
| IndexTTS 1.5 | `ModelArgs.__init__() missing tokenizer_name` in mlx-audio 0.3.1 | Waiting for mlx-audio fix |
| VibeVoice 4-bit/8-bit | Weight shape mismatch `(151936, 896)` vs `(151936, 112)` | fp16 works, quantized broken |
| LLaMA TTS | Architecture in mlx-audio but no published MLX weights on HuggingFace | Waiting for weights |
| Marvis read_speech | Prompts are in sesame/csm-1b only, not Marvis-AI repo | 404 on voice presets |
| F5-TTS | Not in mlx-audio model registry | Separate Python package needed |

---

## Implementation Pattern

For each new provider:

1. **Curate**: Research available voices, select representative set
2. **Catalog**: Add entries to `voices.json` via expansion script
3. **Samples**: Generate audio samples (local models: mlx-audio/edge-tts; cloud: API calls)
4. **Assets**: Generate profile images + OG images via existing scripts
5. **Provider**: Add to `providers.ts` + `provider-colors.ts`
6. **Publish**: Run `publish-catalog.mjs` to regenerate static API
7. **Verify**: Tests pass, typecheck clean, build < 50MB

### Sample Generation Commands

```bash
# Edge TTS (free, no API key)
/tmp/mlx-tts-venv12/bin/python3 scripts/generate-edge-tts-samples.py

# Orpheus / Chatterbox Turbo (local MLX)
/tmp/mlx-tts-venv12/bin/python3 scripts/generate-orpheus-samples.py

# Profile + OG images (ImageMagick)
node scripts/generate-voice-images.mjs
node scripts/generate-og-images.mjs

# Publish static API
node scripts/publish-catalog.mjs

# Verify
npm run check:web && npm test && npm run build:web
```

---

## Metrics Target

| Milestone | Voices | Providers | Languages |
|-----------|--------|-----------|-----------|
| Current | 250 | 22 | ~15 |
| +Edge non-English | 525 | 22 | 90+ |
| +Tier 1 cloud | 625 | 25 | 90+ |
| +Tier 2 | 800+ | 30+ | 90+ |
| Full catalog | 1000+ | 35+ | 90+ |
