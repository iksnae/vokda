#!/usr/bin/env python3
"""
Generate audio samples using local MLX TTS models via mlx-audio.
Models: Kokoro 82M, Qwen3-TTS-12Hz-1.7B-CustomVoice

Requires: mlx-audio venv at /tmp/mlx-tts-venv12
Usage: source /tmp/mlx-tts-venv12/bin/activate && python scripts/generate-local-samples.py
"""

import json
import os
import time
import numpy as np
import soundfile as sf
from pathlib import Path

VOICES_PATH = Path(__file__).parent.parent / "apps/web/static/data/voices.json"
AUDIO_DIR = Path(__file__).parent.parent / "apps/web/static/audio/samples"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ─── Voice definitions for local models ───────────────────────

# Kokoro 82M voice naming: {lang_prefix}{gender}_{name}.safetensors
# a=American, b=British, e=Spanish, f=French, h=Hindi, i=Italian, j=Japanese, p=Portuguese, z=Chinese
# f=female, m=male
KOKORO_ENGLISH_VOICES = {
    # American Female
    "af_alloy": {"name": "Alloy", "gender": "Female", "accent": "american", "desc": "Neutral, balanced American female voice."},
    "af_bella": {"name": "Bella", "gender": "Female", "accent": "american", "desc": "Warm, expressive American female voice."},
    "af_heart": {"name": "Heart", "gender": "Female", "accent": "american", "desc": "Heartfelt, emotional American female voice."},
    "af_jessica": {"name": "Jessica", "gender": "Female", "accent": "american", "desc": "Clear, professional American female voice."},
    "af_kore": {"name": "Kore", "gender": "Female", "accent": "american", "desc": "Modern, dynamic American female voice."},
    "af_nicole": {"name": "Nicole", "gender": "Female", "accent": "american", "desc": "Friendly, approachable American female voice."},
    "af_nova": {"name": "Nova", "gender": "Female", "accent": "american", "desc": "Bright, energetic American female voice."},
    "af_river": {"name": "River", "gender": "Female", "accent": "american", "desc": "Calm, flowing American female voice."},
    "af_sarah": {"name": "Sarah", "gender": "Female", "accent": "american", "desc": "Mature, reassuring American female voice."},
    "af_sky": {"name": "Sky", "gender": "Female", "accent": "american", "desc": "Light, airy American female voice."},
    # American Male
    "am_adam": {"name": "Adam", "gender": "Male", "accent": "american", "desc": "Strong, confident American male voice."},
    "am_echo": {"name": "Echo", "gender": "Male", "accent": "american", "desc": "Smooth, resonant American male voice."},
    "am_eric": {"name": "Eric", "gender": "Male", "accent": "american", "desc": "Steady, reliable American male voice."},
    "am_liam": {"name": "Liam", "gender": "Male", "accent": "american", "desc": "Young, energetic American male voice."},
    "am_michael": {"name": "Michael", "gender": "Male", "accent": "american", "desc": "Warm, authoritative American male voice."},
    "am_onyx": {"name": "Onyx", "gender": "Male", "accent": "american", "desc": "Deep, grounded American male voice."},
    # British Female
    "bf_alice": {"name": "Alice", "gender": "Female", "accent": "british", "desc": "Clear, articulate British female voice."},
    "bf_emma": {"name": "Emma", "gender": "Female", "accent": "british", "desc": "Elegant, polished British female voice."},
    "bf_isabella": {"name": "Isabella", "gender": "Female", "accent": "british", "desc": "Refined, sophisticated British female voice."},
    "bf_lily": {"name": "Lily", "gender": "Female", "accent": "british", "desc": "Soft, gentle British female voice."},
    # British Male
    "bm_daniel": {"name": "Daniel", "gender": "Male", "accent": "british", "desc": "Authoritative, steady British male voice."},
    "bm_fable": {"name": "Fable", "gender": "Male", "accent": "british", "desc": "Expressive, storytelling British male voice."},
    "bm_george": {"name": "George", "gender": "Male", "accent": "british", "desc": "Warm, captivating British male voice."},
    "bm_lewis": {"name": "Lewis", "gender": "Male", "accent": "british", "desc": "Clear, professional British male voice."},
}

QWEN3_VOICES = {
    "serena": {"name": "Serena", "gender": "Female", "desc": "Natural, expressive female voice with warm tone."},
    "vivian": {"name": "Vivian", "gender": "Female", "desc": "Clear, confident female voice."},
    "ryan": {"name": "Ryan", "gender": "Male", "desc": "Steady, professional male voice."},
    "aiden": {"name": "Aiden", "gender": "Male", "desc": "Young, dynamic male voice."},
    "eric": {"name": "Eric", "gender": "Male", "desc": "Smooth, trustworthy male voice."},
    "dylan": {"name": "Dylan", "gender": "Male", "desc": "Casual, friendly male voice."},
}

SAMPLE_TRANSCRIPTS = [
    "This release adds multilingual voice routing and higher reliability across all synthesis adapters.",
    "At dawn, the shipping port becomes a choreography of steel, light, and timing.",
    "I can guide you through setup now, then send a summary to your team workspace.",
    "Before we begin, make sure your workspace has one admin and at least two contributors.",
    "All regional pipelines are now synchronized and latency remains below target thresholds.",
    "Global adoption of AI voice tools accelerated this quarter, led by multilingual deployments.",
    "Introducing a faster way to produce multilingual voice content from a single script.",
    "In the valley of Eldoria, the old observatory watched the stars like a patient clockmaker.",
]

# ULID generation
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
def ulid():
    import random
    t = int(time.time() * 1000)
    ts = ""
    for _ in range(10):
        ts = CROCKFORD[t % 32] + ts
        t //= 32
    rs = "".join(random.choice(CROCKFORD) for _ in range(16))
    return ts + rs


def build_voice_entry(voice_key, meta, provider_id, provider_name, model_name):
    vid = ulid()
    sid = ulid()
    varid = ulid()
    
    transcript_idx = hash(voice_key) % len(SAMPLE_TRANSCRIPTS)
    transcript = SAMPLE_TRANSCRIPTS[transcript_idx]
    
    gender_map = {"Male": "male", "Female": "female"}
    gp = gender_map.get(meta["gender"], "unknown")
    
    tags = [gp]
    if meta.get("accent"):
        tags.append(meta["accent"])
    tags.append("open-model")
    tags.append("local")
    
    return {
        "id": vid,
        "name": f"{meta['name']} ({model_name})",
        "provider": provider_name,
        "providerId": provider_id,
        "providerVoiceId": voice_key,
        "description": meta["desc"] + f" Runs locally via {model_name} on Apple Silicon.",
        "tags": tags,
        "languages": ["en-US"] if meta.get("accent") == "american" else ["en-GB"] if meta.get("accent") == "british" else ["en-US"],
        "qualityTier": "premium",
        "licenseNotes": f"Open model ({model_name}). Apache 2.0 license. Free for commercial use.",
        "metadata": {
            "shortLabel": f"{meta.get('accent', 'en').title()} {gp} voice",
            "searchDescription": meta["desc"],
            "machineTags": tags,
            "useCases": [],
            "toneTags": ["natural"],
            "audienceTags": [],
            "accent": meta.get("accent"),
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
            "sourceKey": f"mlx:{model_name}:{voice_key}",
            "runnable": True,
            "supportsSsml": False,
            "outputFormats": ["wav", "mp3"],
            "maxInputChars": 5000,
            "previewOnly": False,
        }],
        "_transcript": transcript,
        "_voice_key": voice_key,
    }


def main():
    from mlx_audio.tts import load_model
    
    catalog = json.loads(VOICES_PATH.read_text())
    
    # Remove old HuggingFace placeholder entries
    catalog["voices"] = [v for v in catalog["voices"] if v["providerId"] != "huggingface"]
    
    # Track existing local model entries to avoid duplicates
    existing_keys = {v["providerVoiceId"] for v in catalog["voices"] if v["providerId"] in ("kokoro", "qwen3-tts")}
    
    new_voices = []
    
    # ─── Kokoro 82M ───────────────────────────────────────────
    print("\n═══ Kokoro 82M — Loading model ═══")
    t0 = time.time()
    kokoro = load_model("mlx-community/Kokoro-82M-bf16")
    print(f"Loaded in {time.time()-t0:.1f}s")
    
    for voice_key, meta in KOKORO_ENGLISH_VOICES.items():
        if voice_key in existing_keys:
            print(f"  Skip (exists): {voice_key}")
            continue
        
        entry = build_voice_entry(voice_key, meta, "kokoro", "Kokoro", "Kokoro-82M")
        transcript = entry.pop("_transcript")
        vk = entry.pop("_voice_key")
        
        out_path = AUDIO_DIR / f"{entry['id']}.mp3"
        wav_path = f"/tmp/kokoro-{vk}.wav"
        
        print(f"  Generating: {meta['name']} ({vk})...", end=" ", flush=True)
        t0 = time.time()
        
        try:
            lang = "en-gb" if meta.get("accent") == "british" else "en-us"
            chunks = []
            for result in kokoro.generate(transcript, voice=vk, lang_code=lang):
                if hasattr(result, "audio") and result.audio is not None:
                    chunks.append(np.array(result.audio))
            
            if chunks:
                audio = np.concatenate(chunks).flatten()
                # Save as WAV first
                sf.write(wav_path, audio, 24000)
                # Convert to MP3 using ffmpeg
                os.system(f'ffmpeg -y -i "{wav_path}" -codec:a libmp3lame -b:a 128k "{out_path}" -loglevel error 2>/dev/null')
                
                if out_path.exists():
                    entry["samples"][0]["audioUrl"] = f"/audio/samples/{entry['id']}.mp3"
                    print(f"✓ {time.time()-t0:.1f}s")
                else:
                    # Fallback: keep WAV
                    import shutil
                    wav_final = AUDIO_DIR / f"{entry['id']}.wav"
                    shutil.copy(wav_path, wav_final)
                    entry["samples"][0]["audioUrl"] = f"/audio/samples/{entry['id']}.wav"
                    print(f"✓ (wav) {time.time()-t0:.1f}s")
            else:
                print("✗ no audio")
        except Exception as e:
            print(f"✗ {e}")
        
        new_voices.append(entry)
    
    # ─── Qwen3-TTS ────────────────────────────────────────────
    print("\n═══ Qwen3-TTS — Loading model ═══")
    t0 = time.time()
    qwen3 = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit")
    print(f"Loaded in {time.time()-t0:.1f}s")
    
    for voice_key, meta in QWEN3_VOICES.items():
        if voice_key in existing_keys:
            print(f"  Skip (exists): {voice_key}")
            continue
        
        entry = build_voice_entry(voice_key, meta, "qwen3-tts", "Qwen3 TTS", "Qwen3-TTS-1.7B")
        transcript = entry.pop("_transcript")
        vk = entry.pop("_voice_key")
        
        out_path = AUDIO_DIR / f"{entry['id']}.mp3"
        wav_path = f"/tmp/qwen3-{vk}.wav"
        
        print(f"  Generating: {meta['name']} ({vk})...", end=" ", flush=True)
        t0 = time.time()
        
        try:
            chunks = []
            for result in qwen3.generate(transcript, voice=vk):
                if hasattr(result, "audio") and result.audio is not None:
                    chunks.append(np.array(result.audio))
            
            if chunks:
                audio = np.concatenate(chunks).flatten()
                sf.write(wav_path, audio, 24000)
                os.system(f'ffmpeg -y -i "{wav_path}" -codec:a libmp3lame -b:a 128k "{out_path}" -loglevel error 2>/dev/null')
                
                if out_path.exists():
                    entry["samples"][0]["audioUrl"] = f"/audio/samples/{entry['id']}.mp3"
                    print(f"✓ {time.time()-t0:.1f}s")
                else:
                    import shutil
                    wav_final = AUDIO_DIR / f"{entry['id']}.wav"
                    shutil.copy(wav_path, wav_final)
                    entry["samples"][0]["audioUrl"] = f"/audio/samples/{entry['id']}.wav"
                    print(f"✓ (wav) {time.time()-t0:.1f}s")
            else:
                print("✗ no audio")
        except Exception as e:
            print(f"✗ {e}")
        
        new_voices.append(entry)
    
    # ─── Merge into catalog ───────────────────────────────────
    catalog["voices"].extend(new_voices)
    
    # Sort
    def sort_key(v):
        q = {"editorial": 0, "curated": 1}.get(v.get("metadata", {}).get("metadataQuality"), 2)
        return (q, v.get("provider", ""), v.get("name", ""))
    
    catalog["voices"].sort(key=sort_key)
    VOICES_PATH.write_text(json.dumps(catalog, indent=2) + "\n")
    
    # Summary
    by_provider = {}
    with_audio = 0
    for v in catalog["voices"]:
        by_provider[v["provider"]] = by_provider.get(v["provider"], 0) + 1
        if v.get("samples", [{}])[0].get("audioUrl"):
            with_audio += 1
    
    print(f"\n═══ Catalog updated ═══")
    print(f"  Total: {len(catalog['voices'])} voices")
    print(f"  With audio: {with_audio}")
    print(f"  New local voices: {len(new_voices)}")
    print(f"\n  By provider:")
    for p, c in sorted(by_provider.items(), key=lambda x: -x[1]):
        print(f"    {p}: {c}")


if __name__ == "__main__":
    main()
