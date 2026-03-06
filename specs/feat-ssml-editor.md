# Feature: SSML Visual Editor

## Description

Replace the raw SSML textarea in the audition panel with a guided WYSIWYG-style editor that helps users compose SSML markup visually. The editor provides:

- **Tag toolbar** — insert SSML tags (break, emphasis, prosody, phoneme, say-as) with a click
- **Live preview** — styled rendering of the SSML tree showing tag boundaries visually
- **Validation** — real-time structural validation with inline error hints
- **Provider awareness** — toolbar buttons disabled/hidden when the selected provider doesn't support a given tag
- **Mode gating** — entire SSML tab disabled (with explanation) when the active variant has `supportsSsml: false`

### SSML tag support by provider

| Tag | AWS Polly | Azure Speech | GCP TTS | Edge TTS |
|-----|-----------|-------------|---------|----------|
| `<speak>` | ✓ | ✓ | ✓ | ✓ |
| `<break>` | ✓ | ✓ | ✓ | ✓ |
| `<emphasis>` | ✓ | ✓ | ✓ | ✓ |
| `<prosody>` | ✓ | ✓ | ✓ | ✓ |
| `<say-as>` | ✓ | ✓ | ✓ | ✓ |
| `<phoneme>` | ✓ | ✓ | ✓ | ✗ |
| `<sub>` | ✓ | ✓ | ✓ | ✓ |
| `<lang>` | ✓ | ✓ | ✗ | ✓ |
| `<mark>` | ✓ | ✓ | ✓ | ✗ |
| `<voice>` | ✗ | ✓ | ✗ | ✓ |
| `<mstts:*>` | ✗ | ✓ | ✗ | ✓ |
| `<amazon:*>` | ✓ | ✗ | ✗ | ✗ |

## PRD Alignment

- Phase 2 "Audition & Create" — enriches the synthesis authoring experience
- Supports the "power user" persona who needs prosody/emphasis control for production voice work

## Scope

- [x] New routes: none (embedded in voice detail audition panel)
- [x] New lib modules:
  - `apps/web/src/lib/ssml/tags.ts` — tag registry with provider compatibility matrix
  - `apps/web/src/lib/ssml/validate.ts` — structural SSML validator
  - `apps/web/src/lib/ssml/serialize.ts` — convert editor state ↔ raw SSML string
  - `apps/web/src/lib/components/SsmlEditor.svelte` — the editor component
  - `apps/web/src/lib/components/SsmlToolbar.svelte` — tag insertion toolbar
- [x] Type changes: none (uses existing `PreviewInputMode`, `VoiceVariant.supportsSsml`)
- [x] Amplify schema changes: none
- [x] API changes: none (server already accepts `mode: 'ssml'`)
- [x] Catalog data changes: none

## Implementation Steps

### 1. Create SSML tag registry (`apps/web/src/lib/ssml/tags.ts`)

Define all supported SSML tags with:
- Tag name, display label, description
- Attribute definitions (name, type, allowed values, default)
- Provider compatibility: `Record<string, boolean>` keyed by providerId
- Whether tag is self-closing (`<break/>`) or wraps content (`<emphasis>`)
- Category: flow control, prosody, pronunciation, identity

```ts
export type SsmlTagDef = {
  tag: string;
  label: string;
  description: string;
  category: 'flow' | 'prosody' | 'pronunciation' | 'identity';
  selfClosing: boolean;
  attributes: SsmlAttrDef[];
  providers: Record<string, boolean>; // providerId → supported
};

export type SsmlAttrDef = {
  name: string;
  label: string;
  type: 'select' | 'text' | 'number' | 'duration';
  options?: { value: string; label: string }[];
  default?: string;
  placeholder?: string;
  required?: boolean;
};
```

Core tags to implement in v1:

| Tag | Category | Attrs | Notes |
|-----|----------|-------|-------|
| `<break>` | flow | `time` (duration), `strength` (enum) | Self-closing. Most commonly used. |
| `<emphasis>` | prosody | `level` (strong/moderate/reduced/none) | Wraps text. |
| `<prosody>` | prosody | `rate`, `pitch`, `volume` | Wraps text. Most powerful control. |
| `<say-as>` | pronunciation | `interpret-as` (cardinal/ordinal/date/telephone/spell-out) | Wraps text. |
| `<phoneme>` | pronunciation | `alphabet` (ipa/x-sampa), `ph` (phoneme string) | Wraps text. |
| `<sub>` | pronunciation | `alias` | Wraps text. Substitution. |
| `<lang>` | identity | `xml:lang` | Wraps text. Language switch. |

### 2. Create SSML validator (`apps/web/src/lib/ssml/validate.ts`)

Lightweight structural validator:
- Verify `<speak>` root wrapper (auto-wrap if missing)
- Check matched open/close tags
- Validate known attributes against tag definitions
- Warn on tags unsupported by the selected provider
- Return `{ valid: boolean; errors: SsmlError[]; warnings: SsmlWarning[] }`

```ts
export type SsmlError = {
  type: 'error';
  message: string;
  offset?: number; // character offset in source
  line?: number;
};

export type SsmlWarning = {
  type: 'warning';
  message: string;
  tag?: string;
};

export function validateSsml(
  ssml: string,
  providerId: string
): { valid: boolean; errors: SsmlError[]; warnings: SsmlWarning[] };
```

Implementation: use `DOMParser` to parse the SSML as XML. Walk the resulting DOM tree and check:
1. Root element is `<speak>`
2. All element names are known SSML tags
3. All attributes are valid for their tag
4. Tags used are supported by the active provider

### 3. Create serializer (`apps/web/src/lib/ssml/serialize.ts`)

- `wrapSpeak(inner: string): string` — ensures `<speak>` wrapper
- `insertTag(source: string, selStart: number, selEnd: number, tag: SsmlTagDef, attrs: Record<string, string>): { text: string; cursorPos: number }` — inserts a tag at cursor/selection
- `stripAllSsml(ssml: string): string` — delegate to existing `stripSsml()`

### 4. Create SsmlToolbar component (`apps/web/src/lib/components/SsmlToolbar.svelte`)

Horizontal toolbar above the textarea:

```
[⏸ Break] [🔊 Prosody] [❗ Emphasis] [🗣 Say-as] [🔤 Phoneme] [↔ Sub] [🌐 Lang]
```

Each button:
- Disabled + tooltip if tag unsupported by active provider
- On click: opens a small popover/dropdown for attribute configuration
- On confirm: inserts the tag at textarea cursor position (wrapping selection if present)

Props:
- `providerId: string` — active provider for capability filtering
- `disabled: boolean` — full disable when SSML not supported
- Events: `dispatch('insert', { tag, attrs })` 

### 5. Create SsmlEditor component (`apps/web/src/lib/components/SsmlEditor.svelte`)

Composite component replacing the raw textarea when in SSML mode:

```svelte
<SsmlEditor
  bind:value={auditionText}
  {providerId}
  supportsSsml={variant.supportsSsml}
  maxChars={variant.maxInputChars}
  on:synthesize={runAudition}
/>
```

Contains:
- `SsmlToolbar` at top
- Textarea with SSML syntax highlighting (lightweight: color tags vs text)
- Validation status bar at bottom: "✓ Valid SSML" or "✗ 2 errors" with expandable detail
- Character count with limit indicator
- `Ctrl+Enter` / `Cmd+Enter` triggers synthesize event

When `supportsSsml` is false:
- Show disabled overlay: "SSML not supported by {provider}. Switch to a voice from AWS Polly, Azure Speech, or Google Cloud TTS."
- Toolbar buttons all disabled

Syntax highlighting approach: Use a `<div contenteditable>` overlay is complex; instead, use a simple colored-background approach:
- Textarea remains the input surface
- Below it, render a read-only div that colorizes tags for visual reference
- Or simpler: just use the validation bar + toolbar. No inline highlighting in v1.

### 6. Integrate into voice detail audition panel

In `apps/web/src/routes/voices/[id]/+page.svelte`:
- Replace the raw textarea + mode toggle with `SsmlEditor` when mode is 'ssml'
- Keep the plain textarea for 'text' mode (no change)
- Pass `providerId` and `supportsSsml` from the active variant

### 7. Add SSML quick-reference panel

Small collapsible "SSML Help" section below the editor:
- Common examples for each tag
- Link to provider-specific SSML documentation
- Copy-paste snippets

## Files Changed

### New files
- `apps/web/src/lib/ssml/tags.ts`
- `apps/web/src/lib/ssml/validate.ts`
- `apps/web/src/lib/ssml/serialize.ts`
- `apps/web/src/lib/components/SsmlEditor.svelte`
- `apps/web/src/lib/components/SsmlToolbar.svelte`

### Modified files
- `apps/web/src/routes/voices/[id]/+page.svelte` — swap textarea for SsmlEditor in SSML mode

## Testing

- Typecheck: `npm run check:web`
- Build: `npm run build:web`
- Manual verification:
  1. Navigate to any Azure Speech or AWS Polly voice detail page
  2. Switch audition mode to SSML → toolbar appears, validation bar shows
  3. Click "Break" → `<break time="500ms"/>` inserted at cursor
  4. Click "Prosody" → popover shows rate/pitch/volume controls, inserts `<prosody rate="slow">selected text</prosody>`
  5. Enter invalid SSML (mismatched tags) → validation bar shows error count
  6. Switch to an OpenAI voice → SSML tab shows disabled overlay
  7. Switch to a Cartesia voice → SSML tab disabled, tooltip explains why
  8. Synthesize valid SSML → plays audio correctly

## Report

**Completed:** March 6, 2026  
**Commit:** `91c1085`

### What was implemented

All 7 implementation steps from the plan were completed:

1. **Tag registry** (`ssml/tags.ts`) — 7 core SSML tags with full attribute definitions and provider compatibility matrix for 4 providers (aws-polly, azure-speech, gcp-tts, edge-tts). Helper functions: `getTagDef`, `getTagsForProvider`, `isTagSupportedByProvider`.

2. **Validator** (`ssml/validate.ts`) — Structural SSML validation using `DOMParser`. Auto-detects missing `<speak>` wrapper (warning), reports XML parse errors, validates known vs unknown tags, and flags tags unsupported by the active provider. Unknown tags are treated as warnings (not errors) to accommodate provider-specific extensions.

3. **Serializer** (`ssml/serialize.ts`) — `wrapSpeak()` for ensuring `<speak>` root, `insertTag()` for inserting self-closing or wrapping tags at cursor position with proper cursor repositioning.

4. **SsmlToolbar** (`SsmlToolbar.svelte`) — Horizontal toolbar with 7 tag buttons. Each button opens an attribute popover for configuration before insertion. Buttons are disabled/struck-through when the tag is unsupported by the active provider. Keyboard support: Enter to confirm, Escape to cancel.

5. **SsmlEditor** (`SsmlEditor.svelte`) — Composite component: toolbar + monospace textarea + validation status bar + character counter + collapsible SSML quick reference with copy-pasteable examples and provider documentation links. Disabled overlay with guidance when variant doesn't support SSML.

6. **Integration** — Voice detail page (`voices/[id]/+page.svelte`) now shows `SsmlEditor` when mode is 'ssml', plain textarea when mode is 'text'. Provider ID and SSML support passed from the active variant.

7. **Quick reference** — 6 common SSML examples with one-click insertion + links to AWS Polly, Azure, and Google Cloud SSML docs.

### Tests

41 new unit tests across 3 test files:
- `ssml/tags.test.ts` — 14 tests: registry completeness, provider filtering, attribute definitions
- `ssml/validate.test.ts` — 13 tests: valid SSML, structural errors, auto-wrap, provider warnings, unknown tags
- `ssml/serialize.test.ts` — 14 tests: wrapSpeak, insertTag for self-closing/wrapping, edge cases

All 178 tests pass (41 new + 137 existing).

### Issues & Resolutions

- **No issues encountered.** The plan was well-scoped. The DOMParser approach for validation worked cleanly in jsdom (vitest environment) and browser builds.

### Design decisions

- **Textarea over contenteditable** — Kept the textarea as the editing surface (per plan). Contenteditable would enable inline syntax highlighting but adds fragility. v1 prioritizes reliability.
- **Warnings over errors for unknown tags** — Provider-specific extensions (e.g. `<amazon:effect>`, `<mstts:express-as>`) shouldn't block synthesis. They're surfaced as warnings.
- **No inline highlighting in v1** — The validation bar + toolbar is sufficient feedback. Inline highlighting can be added as a follow-up.

## Risks

- **No breaking changes** — existing text mode is untouched; SSML mode is an enhancement
- **Provider compatibility drift** — tag support matrix may need updating as providers evolve; keep it data-driven in `tags.ts`
- **contenteditable complexity** — deliberately avoided in v1; textarea + toolbar is simpler and more reliable
- **Mobile UX** — toolbar may need horizontal scroll or collapsed menu on small screens
- **SSML validation false positives** — `DOMParser` may reject valid SSML with provider-specific extensions; treat unknown tags as warnings, not errors
