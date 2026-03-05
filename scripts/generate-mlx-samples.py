#!/usr/bin/env python3
"""
Generate audio samples for MLX-compatible open TTS models via mlx-audio.

Tested models (all Apple Silicon / MLX):
  ✓ Kokoro-82M — 24 English voices, ~1s/sample
  ✓ Qwen3-TTS-1.7B-CustomVoice — 6 voices, ~2s/sample
  ✓ Soprano-80M — single voice, ~0.7s
  ✓ Chatterbox-Turbo — single voice (voice clone capable), ~1s
  ✓ Dia-1.6B — multi-speaker dialogue model, ~7s
  ✓ OuteTTS-1.0-1B — single voice, ~19s
  ✓ Pocket-TTS — ultra-light single voice, ~1.2s
  ✓ Spark-TTS-0.5B — single voice (voice clone capable), ~1.5s
  ✓ Qwen3-TTS-0.6B-Base — zero-shot voice, ~1.7s
  ✓ VoxCPM-1.5 — single voice (Chinese + English), ~1.1s
  ✗ VibeVoice — weight shape mismatch in 8bit quant
  ✗ Kitten-TTS — architecture not supported by mlx-audio

Usage:
  source /tmp/mlx-tts-venv12/bin/activate
  python scripts/generate-mlx-samples.py
"""

import json, os, time, random
import numpy as np
import soundfile as sf
from pathlib import Path

VOICES_PATH = Path(__file__).parent.parent / "apps/web/static/data/voices.json"
AUDIO_DIR = Path(__file__).parent.parent / "apps/web/static/audio/samples"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
def ulid():
    t = int(time.time() * 1000)
    ts = ""
    for _ in range(10):
        ts = CROCKFORD[t % 32] + ts
        t //= 32
    return ts + "".join(random.choice(CROCKFORD) for _ in range(16))

TRANSCRIPTS = [
    "This release adds multilingual voice routing and higher reliability across all synthesis adapters.",
    "At dawn, the shipping port becomes a choreography of steel, light, and timing.",
    "I can guide you through setup now, then send a summary to your team workspace.",
    "Before we begin, make sure your workspace has one admin and at least two contributors.",
    "All regional pipelines are now synchronized and latency remains below target thresholds.",
    "Global adoption of AI voice tools accelerated this quarter, led by multilingual deployments.",
    "Introducing a faster way to produce multilingual voice content from a single script.",
    "In the valley of Eldoria, the old observatory watched the stars like a patient clockmaker.",
]

# ─── Model definitions ────────────────────────────────────────
# Each model produces one or more voices in the catalog.
# Single-voice models get one entry; multi-voice models get one per voice.

NEW_MODELS = [
    {
        "model_id": "mlx-community/Soprano-80M-bf16",
        "provider_id": "soprano",
        "provider_name": "Soprano",
        "voices": [
            {"key": "default", "name": "Soprano", "gender": "Female", "desc": "Ultra-light 80M parameter TTS. Fast, natural female voice with clean articulation.", "size": "80M"},
        ],
    },
    {
        "model_id": "mlx-community/Chatterbox-Turbo-TTS-4bit",
        "provider_id": "chatterbox",
        "provider_name": "Chatterbox",
        "voices": [
            {"key": "default", "name": "Chatterbox Turbo", "gender": "Male", "desc": "Expressive voice-clone-capable TTS. Natural conversational style with emotion control.", "size": "368M"},
        ],
    },
    {
        "model_id": "mlx-community/Dia-1.6B",
        "provider_id": "dia",
        "provider_name": "Dia",
        "voices": [
            {"key": "default", "name": "Dia", "gender": "Female", "desc": "Nari Labs dialogue model. Generates natural multi-speaker speech with nonverbal cues.", "size": "1.6B"},
        ],
    },
    {
        "model_id": "mlx-community/Llama-OuteTTS-1.0-1B-8bit",
        "provider_id": "outetts",
        "provider_name": "OuteTTS",
        "voices": [
            {"key": "default", "name": "OuteTTS 1.0", "gender": "Neutral", "desc": "Llama-based text-to-speech. 1B parameter model with clear, articulate output.", "size": "1B"},
        ],
    },
    {
        "model_id": "mlx-community/pocket-tts",
        "provider_id": "pocket-tts",
        "provider_name": "Pocket TTS",
        "voices": [
            {"key": "default", "name": "Pocket TTS", "gender": "Female", "desc": "Ultra-compact TTS designed for edge devices. Remarkably natural for its tiny size.", "size": "~50M"},
        ],
    },
    {
        "model_id": "mlx-community/Spark-TTS-0.5B-bf16",
        "provider_id": "spark-tts",
        "provider_name": "Spark TTS",
        "voices": [
            {"key": "default", "name": "Spark TTS", "gender": "Female", "desc": "SparkAudio voice-clone-capable TTS. Supports zero-shot speaker adaptation.", "size": "500M"},
        ],
    },
    {
        "model_id": "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit",
        "provider_id": "qwen3-tts",
        "provider_name": "Qwen3 TTS",
        "voices": [
            {"key": "default", "name": "Qwen3 TTS 0.6B", "gender": "Neutral", "desc": "Compact 0.6B Qwen3 TTS base model. Multilingual with natural prosody.", "size": "0.6B"},
        ],
    },
    {
        "model_id": "mlx-community/VoxCPM1.5-8bit",
        "provider_id": "voxcpm",
        "provider_name": "VoxCPM",
        "voices": [
            {"key": "default", "name": "VoxCPM 1.5", "gender": "Female", "desc": "Chinese-first bilingual TTS with natural English output. Strong prosody and rhythm.", "size": "~900M"},
        ],
    },
]


def generate_audio(model, voice_key, transcript):
    """Generate audio from a loaded model. Returns numpy array or None."""
    kwargs = {"text": transcript}
    if voice_key != "default":
        kwargs["voice"] = voice_key

    chunks = []
    for r in model.generate(**kwargs):
        if hasattr(r, "audio") and r.audio is not None:
            chunks.append(np.array(r.audio))

    if chunks:
        return np.concatenate(chunks).flatten()
    return None


def build_entry(voice_def, model_def, transcript):
    vid = ulid()
    sid = ulid()
    varid = ulid()

    gender_map = {"Male": "male", "Female": "female", "Neutral": "neutral"}
    gp = gender_map.get(voice_def["gender"], "unknown")

    tags = [gp, "open-model", "local", "mlx"]

    return {
        "id": vid,
        "name": voice_def["name"],
        "provider": model_def["provider_name"],
        "providerId": model_def["provider_id"],
        "providerVoiceId": voice_def["key"],
        "description": voice_def["desc"] + " Runs locally on Apple Silicon via MLX.",
        "tags": tags,
        "languages": ["en-US"],
        "qualityTier": "premium",
        "licenseNotes": f"Open model ({voice_def.get('size', '?')} params). Check model card for license terms.",
        "metadata": {
            "shortLabel": f"MLX · {voice_def.get('size', '?')} · {gp}",
            "searchDescription": voice_def["desc"],
            "machineTags": tags,
            "useCases": [],
            "toneTags": ["natural"],
            "audienceTags": [],
            "genderPresentation": gp,
            "agePresentation": "adult",
            "metadataQuality": "curated",
        },
        "samples": [{
            "id": sid,
            "scriptKey": "default",
            "label": "Default",
            "transcript": transcript,
        }],
        "variants": [{
            "id": varid,
            "sourceType": "local_model",
            "sourceKey": f"mlx:{model_def['provider_id']}:{voice_def['key']}",
            "runnable": True,
            "supportsSsml": False,
            "outputFormats": ["wav", "mp3"],
            "maxInputChars": 5000,
            "previewOnly": False,
        }],
    }


def main():
    from mlx_audio.tts import load_model

    catalog = json.loads(VOICES_PATH.read_text())

    # Get existing provider IDs to avoid dupes
    existing = {(v["providerId"], v["providerVoiceId"]) for v in catalog["voices"]}
    new_voices = []

    for model_def in NEW_MODELS:
        model_id = model_def["model_id"]

        # Skip voices that already exist
        voices_to_gen = [
            v for v in model_def["voices"]
            if (model_def["provider_id"], v["key"]) not in existing
        ]

        if not voices_to_gen:
            print(f"\n  Skip {model_def['provider_name']} — already in catalog")
            continue

        print(f"\n{'═'*50}")
        print(f"Loading {model_id}...")
        print(f"{'═'*50}")

        try:
            t0 = time.time()
            result = load_model(model_id)
            model = result[0] if isinstance(result, tuple) else result
            print(f"  Loaded in {time.time()-t0:.1f}s")
        except Exception as e:
            print(f"  ✗ Load failed: {str(e)[:150]}")
            continue

        for voice_def in voices_to_gen:
            transcript = TRANSCRIPTS[hash(voice_def["key"]) % len(TRANSCRIPTS)]
            entry = build_entry(voice_def, model_def, transcript)

            out_mp3 = AUDIO_DIR / f"{entry['id']}.mp3"
            out_wav = f"/tmp/mlx-gen-{model_def['provider_id']}-{voice_def['key']}.wav"

            print(f"  Generating: {voice_def['name']}...", end=" ", flush=True)

            try:
                t0 = time.time()
                audio = generate_audio(model, voice_def["key"], transcript)

                if audio is not None and len(audio) > 0:
                    sf.write(out_wav, audio, 24000)
                    os.system(f'ffmpeg -y -i "{out_wav}" -codec:a libmp3lame -b:a 128k "{out_mp3}" -loglevel error 2>/dev/null')

                    if out_mp3.exists():
                        entry["samples"][0]["audioUrl"] = f"/audio/samples/{entry['id']}.mp3"
                        print(f"✓ {time.time()-t0:.1f}s ({len(audio)} samples)")
                    else:
                        print(f"✗ ffmpeg failed")
                else:
                    print(f"✗ no audio")
            except Exception as e:
                print(f"✗ {str(e)[:120]}")

            new_voices.append(entry)

    # Merge into catalog
    catalog["voices"].extend(new_voices)

    # Sort
    def sort_key(v):
        q = {"editorial": 0, "curated": 1}.get(v.get("metadata", {}).get("metadataQuality"), 2)
        return (q, v.get("provider", ""), v.get("name", ""))

    catalog["voices"].sort(key=sort_key)
    VOICES_PATH.write_text(json.dumps(catalog, indent=2) + "\n")

    by_provider = {}
    with_audio = 0
    for v in catalog["voices"]:
        by_provider[v["provider"]] = by_provider.get(v["provider"], 0) + 1
        if v.get("samples", [{}])[0].get("audioUrl"):
            with_audio += 1

    print(f"\n{'═'*50}")
    print(f"Catalog updated")
    print(f"{'═'*50}")
    print(f"  Total: {len(catalog['voices'])} voices")
    print(f"  With audio: {with_audio}")
    print(f"  New: {len(new_voices)}")
    print(f"\n  By provider:")
    for p, c in sorted(by_provider.items(), key=lambda x: -x[1]):
        print(f"    {p}: {c}")


if __name__ == "__main__":
    main()
