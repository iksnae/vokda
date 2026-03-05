# Chore: Per-Voice Profile Images

## Goal
Generate a unique, metadata-driven profile image (800×800 PNG) for each of the 138 voices using ImageMagick. Images serve as visual identity on the catalog card, voice detail hero, and OG cards.

## Design Template

Each image is a square (800×800) composed of:

1. **Background**: Smooth gradient using the provider's accent color palette (dark → medium). Direction varies by gender (↘ female, ↙ male, ↓ neutral).
2. **Waveform motif**: Abstract audio waveform drawn as bezier curves. Shape parameters (amplitude, frequency, position) are derived from a hash of the voice name, giving each voice a unique but deterministic pattern. Stroke color is a lighter tint of the provider accent.
3. **Provider initial**: Large semi-transparent letter (first char of provider name) positioned bottom-right as a watermark.
4. **Voice initial**: Bold white letter (first char of voice name) in a circle, top-left quadrant.
5. **Tone strip**: Thin horizontal accent bar at the bottom, color-mapped from the primary tone tag.

### Metadata → Visual Mapping

| Metadata | Visual Effect |
|----------|--------------|
| `providerId` | Background gradient hue, waveform stroke color |
| `genderPresentation` | Gradient direction (female=warm shift, male=cool shift, neutral=straight) |
| `toneTags[0]` | Bottom accent bar color (warm→amber, calm→blue, energetic→orange, etc.) |
| `agePresentation` | Waveform amplitude (young=tall waves, adult=medium, old=gentle) |
| `speakingStyle` | Waveform frequency (animated=dense, steady=sparse, broadcast=even) |
| `qualityTier` | Subtle corner badge (premium=star, standard=none) |
| Voice name hash | Waveform seed (unique curve shape per voice) |

### Tone-to-Color Map
- warm/friendly/cheerful → #f59e0b (amber)
- calm/measured/steady → #3b82f6 (blue)
- energetic/animated/excited → #f97316 (orange)
- confident/authoritative/assertive → #8b5cf6 (purple)
- clear/professional/neutral → #06b6d4 (cyan)
- dramatic/expressive/vivid → #ec4899 (pink)
- sad/empathetic/fearful → #6366f1 (indigo)
- angry/serious → #ef4444 (red)
- natural → #10b981 (green)

## Output
- `apps/web/static/images/voices/{voiceId}.png` (800×800)
- `apps/web/static/images/voices/placeholder.png` (fallback)

## Integration
- Add `imageUrl?: string` to `Voice` type
- Populate in voices.json with `/images/voices/{id}.png`
- Display on voice detail hero and catalog cards
- Update OG image script to composite the voice image

## Script
`scripts/generate-voice-images.mjs` — deterministic, re-runnable, skips existing.
