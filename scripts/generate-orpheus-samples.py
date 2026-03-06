#!/usr/bin/env python3
"""Generate audio samples for Orpheus TTS and Chatterbox Turbo voices."""
import json
import os
import subprocess
import sys

VOICES_PATH = 'apps/web/static/data/voices.json'
AUDIO_DIR = 'apps/web/static/audio/samples'

def generate_orpheus(voice_id, speaker, text, out_path):
    """Generate audio using mlx-audio's orpheus/llama model."""
    code = f"""
import os
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
from mlx_audio.tts.generate import generate_audio
generate_audio(
    model='mlx-community/orpheus-3b-0.1-ft-4bit',
    text='{text}',
    voice='{speaker}',
    verbose=True
)
# It saves to audio_000.wav automatically
"""
    result = subprocess.run(
        [sys.executable, '-c', code],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0:
        print(f'  stderr: {result.stderr[-200:]}')
        return False

    # Find the output file
    wav_path = 'audio_000.wav'
    if not os.path.exists(wav_path):
        print(f'  no output file found')
        return False

    # Convert to mp3
    subprocess.run(
        ['ffmpeg', '-y', '-i', wav_path, '-b:a', '128k', out_path],
        capture_output=True, timeout=30
    )
    os.remove(wav_path)
    return os.path.exists(out_path)


def generate_chatterbox_turbo(voice_id, text, out_path):
    """Generate audio using mlx-audio's chatterbox_turbo model."""
    code = f"""
import os
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
from mlx_audio.tts.generate import generate_audio
generate_audio(
    model='mlx-community/Chatterbox-Turbo-TTS-4bit',
    text='{text}',
    verbose=True
)
"""
    result = subprocess.run(
        [sys.executable, '-c', code],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0:
        print(f'  stderr: {result.stderr[-200:]}')
        return False

    wav_path = 'audio_000.wav'
    if not os.path.exists(wav_path):
        print(f'  no output file found')
        return False

    subprocess.run(
        ['ffmpeg', '-y', '-i', wav_path, '-b:a', '128k', out_path],
        capture_output=True, timeout=30
    )
    os.remove(wav_path)
    return os.path.exists(out_path)


def main():
    with open(VOICES_PATH) as f:
        data = json.load(f)

    os.makedirs(AUDIO_DIR, exist_ok=True)

    # Orpheus voices
    orpheus_voices = [v for v in data['voices'] if v['providerId'] == 'orpheus']
    print(f'=== Orpheus TTS: {len(orpheus_voices)} voices ===')

    for i, voice in enumerate(orpheus_voices):
        voice_id = voice['id']
        speaker = voice.get('providerVoiceId', 'tara')
        out_path = os.path.join(AUDIO_DIR, f'{voice_id}.mp3')

        if os.path.exists(out_path):
            print(f'  [{i+1}/{len(orpheus_voices)}] skip: {voice["name"]} (exists)')
            continue

        text = voice['samples'][0]['text'] if voice.get('samples') else \
            f"Hello, I am {voice['name']}. This is a preview of my voice."

        # Escape single quotes for Python string
        text = text.replace("'", "\\'")

        print(f'  [{i+1}/{len(orpheus_voices)}] generating: {voice["name"]} ({speaker})...')
        ok = generate_orpheus(voice_id, speaker, text, out_path)
        if ok:
            size = os.path.getsize(out_path)
            print(f'  [{i+1}/{len(orpheus_voices)}] ✓ {voice["name"]:20} → {size:>6} bytes')
        else:
            print(f'  [{i+1}/{len(orpheus_voices)}] ✗ {voice["name"]:20} FAILED')

    # Chatterbox Turbo
    ct_voices = [v for v in data['voices'] if v['providerId'] == 'chatterbox-turbo']
    print(f'\n=== Chatterbox Turbo: {len(ct_voices)} voices ===')

    for i, voice in enumerate(ct_voices):
        voice_id = voice['id']
        out_path = os.path.join(AUDIO_DIR, f'{voice_id}.mp3')

        if os.path.exists(out_path):
            print(f'  [{i+1}/{len(ct_voices)}] skip: {voice["name"]} (exists)')
            continue

        text = voice['samples'][0]['text'] if voice.get('samples') else \
            "Hello! This is Chatterbox Turbo, a fast speech synthesis model."
        text = text.replace("'", "\\'")

        print(f'  [{i+1}/{len(ct_voices)}] generating: {voice["name"]}...')
        ok = generate_chatterbox_turbo(voice_id, text, out_path)
        if ok:
            size = os.path.getsize(out_path)
            print(f'  [{i+1}/{len(ct_voices)}] ✓ {voice["name"]:20} → {size:>6} bytes')
        else:
            print(f'  [{i+1}/{len(ct_voices)}] ✗ {voice["name"]:20} FAILED')

    print('\nDone!')


if __name__ == '__main__':
    main()
