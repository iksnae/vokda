# Chore: Real Sample Playback

## Goal
Generate real audio samples for all 12 seed voices and wire them into the catalog so the play buttons and audition sections work with actual audio.

## Approach
1. Write a Node.js generation script (`scripts/generate-samples.mjs`) that calls each provider API to synthesize the sample transcript for each voice
2. Save MP3 files to `apps/web/static/audio/samples/<voiceId>.mp3`
3. Update `voices.json` to add `audioUrl` fields pointing to `/audio/samples/<voiceId>.mp3`
4. Wire the inline play button on catalog cards to play/pause the sample audio
5. Ensure the voice detail page audio elements also work

## Provider coverage
- **AWS Polly** (Joanna, Matthew) — `@aws-sdk/client-polly`
- **Azure Speech** (JennyNeural, RyanNeural) — REST API
- **Google Cloud TTS** (Neural2-J, News-N) — REST API
- **ElevenLabs** (Mark) — REST API
- **OpenAI** (alloy, nova, onyx) — REST API
- **Hugging Face** (Kokoro 82M, Qwen3) — Skip (requires GPU inference, no hosted API for these specific models)

## Fallback
For providers where API keys are unavailable or models require GPU, use placeholder silent/beep audio or skip. The UI should gracefully handle missing audio.
