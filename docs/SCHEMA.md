# Data Schema Baseline

## Voice

- `id` (ULID)
- `name`
- `description`
- `tags[]`
- `languages[]` (BCP-47)
- `qualityTier` (`basic|standard|premium`)
- `licenseNotes`
- `variants[]` (VoiceVariant)

## VoiceVariant

- `id` (ULID)
- `sourceType` (`cloud_provider|hf_model|hf_space|hf_endpoint|self_hosted`)
- `sourceKey`
- `runnable` (boolean)
- `supportsSsml` (boolean)
- `outputFormats[]` (`mp3|wav|pcm`)
- `maxInputChars` (number)
- `previewOnly` (boolean)

## VoiceSample

- `id` (ULID)
- `voiceId`
- `variantId`
- `scriptKey`
- `audioUrl`
- `durationSec`

## CartItem

- `voiceId`
- `variantId`
- `warnings[]`

## VoicePack

- `version`
- `createdAt`
- `items[]` (selected variants)
- `snippets` (template references)
