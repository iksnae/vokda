#!/usr/bin/env python3
"""Fix LMNT samples: decode base64 audio from JSON wrapper to actual MP3 files."""

import json
import base64
import os

VOICES_PATH = "apps/web/static/data/voices.json"
AUDIO_DIR = "apps/web/static/audio/samples"

with open(VOICES_PATH) as f:
    catalog = json.load(f)

lmnt_voices = [v for v in catalog["voices"] if v["providerId"] == "lmnt"]
fixed = 0

for voice in lmnt_voices:
    for sample in voice.get("samples", []):
        url = sample.get("audioUrl", "")
        if not url.startswith("/"):
            continue
        path = os.path.join("apps/web/static", url.lstrip("/"))
        if not os.path.exists(path):
            continue

        with open(path, "rb") as f:
            header = f.read(2)

        if header != b'{"':
            continue  # Already valid audio

        with open(path) as f:
            data = json.load(f)

        if "audio" not in data:
            print(f"  SKIP (no audio field): {path}")
            continue

        audio_bytes = base64.b64decode(data["audio"])
        with open(path, "wb") as f:
            f.write(audio_bytes)

        fixed += 1
        print(f"  Fixed: {voice['name']} — {len(audio_bytes)} bytes")

print(f"\n✅ Fixed {fixed} LMNT samples")
