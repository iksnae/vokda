#!/usr/bin/env python3
"""Generate audio samples for all Edge TTS voices in the catalog."""
import asyncio
import json
import os
import edge_tts

VOICES_PATH = 'apps/web/static/data/voices.json'
AUDIO_DIR = 'apps/web/static/audio/samples'

async def main():
    with open(VOICES_PATH) as f:
        data = json.load(f)

    edge_voices = [v for v in data['voices'] if v['providerId'] == 'edge-tts']
    print(f'Found {len(edge_voices)} Edge TTS voices')

    os.makedirs(AUDIO_DIR, exist_ok=True)

    for i, voice in enumerate(edge_voices):
        voice_id = voice['id']
        short_name = voice.get('providerVoiceId', '')
        out_path = os.path.join(AUDIO_DIR, f'{voice_id}.mp3')

        if os.path.exists(out_path):
            print(f'  [{i+1}/{len(edge_voices)}] skip: {voice["name"]} (exists)')
            continue

        sample_text = voice['samples'][0]['text'] if voice.get('samples') else \
            f"Hello! I'm {voice['name']}, speaking English. This is a preview of how I sound."

        try:
            comm = edge_tts.Communicate(sample_text, short_name)
            await comm.save(out_path)
            size = os.path.getsize(out_path)
            print(f'  [{i+1}/{len(edge_voices)}] ✓ {voice["name"]:30} → {size:>6} bytes')
        except Exception as e:
            print(f'  [{i+1}/{len(edge_voices)}] ✗ {voice["name"]:30} → {e}')

    print('\nDone!')

asyncio.run(main())
