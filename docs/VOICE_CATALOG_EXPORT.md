# Voice Catalog Export (Import-Oriented)

The cart export now emits a voice catalog import bundle designed for downstream profile-based systems.

## File name

- `voice-catalog-import-YYYY-MM-DD.json`

## Top-level format

```json
{
  "version": "1.1.0",
  "format": "vokda.voice-catalog.v1",
  "createdAt": "2026-03-05T00:00:00.000Z",
  "voiceProfiles": [],
  "catalogHints": {
    "castingHints": []
  },
  "items": []
}
```

## `voiceProfiles`

Each selected cart voice/variant is normalized into robust profile fields:

- `id` (`vp_` prefixed ID)
- `name`, `description`
- `language`
- `gender`, `ageRange`, `tone`, `accent`
- `personalityTags`, `emotionalRange`
- `voiceQuality`, `previewUrl`, `recommendedFor`, `sampleCount`
- `provider`, `providerVoiceId`
- `seed`, `createdAt`, `updatedAt`

## `items`

Checkout detail entries preserved for Vokda UX and compatibility:

- `voiceId`, `voiceName`, `variantId`
- `sourceType`, `sourceKey`
- `runnable`, `supportsSsml`
- `outputFormats`, `licenseNotes`

## `catalogHints.castingHints` (optional)

Non-binding hints that can help downstream casting systems:

- `voiceProfileId`
- `voiceProfileName`
- `manualOverride`

Vokda does not require a casting model to consume this export.
