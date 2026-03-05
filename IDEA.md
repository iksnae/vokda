the Below is a **drop-in spec + TypeScript implementation** for:

* `Voice`, `VoiceVariant`, `VoicePackExport`
* an **adapter registry** (plugin-style)
* **export generator** + **Ajv validation**
* adapter skeletons for: `aws-polly`, `azure-tts`, `hf-endpoint`, `hf-space-preview`

Everything is designed so you can add new sources (Qwen3-TTS, KittenTTS, etc.) by implementing one adapter.

---

## Suggested repo layout

```
voice-market/
  package.json
  tsconfig.json
  src/
    schemas/
      voice.schema.json
      voice-variant.schema.json
      voice-pack.schema.json
    domain/
      types.ts
      ids.ts
    adapters/
      index.ts
      base.ts
      aws-polly.ts
      azure-tts.ts
      hf-endpoint.ts
      hf-space-preview.ts
    export/
      buildVoicePack.ts
      snippets.ts
      validate.ts
    example/
      seed.ts
      run-export.ts
```

---

## 1) JSON Schemas

### `src/schemas/voice.schema.json`

```json
{
  "$id": "https://khaos.studio/schemas/voice.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Voice",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "voiceId",
    "displayName",
    "languages",
    "tags",
    "qualityTier",
    "variants",
    "licensing",
    "status",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "voiceId": { "type": "string", "minLength": 8 },
    "displayName": { "type": "string", "minLength": 1 },
    "description": { "type": "string" },

    "languages": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 2 }
    },

    "tags": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },

    "qualityTier": {
      "type": "string",
      "enum": ["standard", "neural", "studio", "open", "unknown"]
    },

    "featuredScore": { "type": "number", "minimum": 0, "maximum": 1 },

    "variants": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "voice-variant.schema.json" }
    },

    "licensing": {
      "type": "object",
      "additionalProperties": false,
      "required": ["allowedUse", "notes"],
      "properties": {
        "allowedUse": {
          "type": "string",
          "enum": ["personal", "commercial", "unknown"]
        },
        "notes": { "type": "string" },

        "modelLicense": { "type": "string" },
        "requiresConsentProof": { "type": "boolean" },
        "consentProofUrl": { "type": "string", "format": "uri" }
      }
    },

    "status": {
      "type": "string",
      "enum": ["active", "deprecated", "preview", "region-limited"]
    },

    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

### `src/schemas/voice-variant.schema.json`

```json
{
  "$id": "https://khaos.studio/schemas/voice-variant.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VoiceVariant",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "variantId",
    "source",
    "runnable",
    "capabilities",
    "defaults",
    "samples"
  ],
  "properties": {
    "variantId": { "type": "string", "minLength": 8 },

    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["sourceType", "sourceKey", "ref"],
      "properties": {
        "sourceType": {
          "type": "string",
          "enum": ["cloud_provider", "hf_model", "hf_space", "hf_endpoint", "self_hosted"]
        },
        "sourceKey": { "type": "string", "minLength": 1 },

        "ref": {
          "type": "object",
          "description": "Adapter-specific reference used to synthesize.",
          "additionalProperties": true
        }
      }
    },

    "runnable": { "type": "boolean" },

    "capabilities": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "supportsSSML",
        "supportsStreaming",
        "maxInputChars",
        "outputFormats",
        "controls"
      ],
      "properties": {
        "supportsSSML": { "type": "boolean" },
        "supportsStreaming": { "type": "boolean" },
        "maxInputChars": { "type": "integer", "minimum": 1 },

        "outputFormats": {
          "type": "array",
          "minItems": 1,
          "items": { "type": "string", "enum": ["mp3", "wav", "pcm"] }
        },

        "controls": {
          "type": "object",
          "additionalProperties": false,
          "required": ["rate", "pitch", "volume", "stylePresets"],
          "properties": {
            "rate": { "$ref": "#/$defs/rangeNullable" },
            "pitch": { "$ref": "#/$defs/rangeNullable" },
            "volume": { "$ref": "#/$defs/rangeNullable" },
            "stylePresets": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        },

        "languages": {
          "type": "array",
          "items": { "type": "string" }
        },

        "notes": { "type": "string" }
      }
    },

    "defaults": {
      "type": "object",
      "additionalProperties": false,
      "required": ["format", "settings"],
      "properties": {
        "format": { "type": "string", "enum": ["mp3", "wav", "pcm"] },
        "settings": {
          "type": "object",
          "description": "Adapter-specific default settings used when previewing or generating samples.",
          "additionalProperties": true
        }
      }
    },

    "samples": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["sampleId", "title", "transcript", "audioUrl", "settings"],
        "properties": {
          "sampleId": { "type": "string" },
          "title": { "type": "string" },
          "transcript": { "type": "string" },
          "ssml": { "type": "string" },
          "audioUrl": { "type": "string", "format": "uri" },
          "settings": { "type": "object", "additionalProperties": true },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  },
  "$defs": {
    "rangeNullable": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["min", "max", "default"],
      "properties": {
        "min": { "type": "number" },
        "max": { "type": "number" },
        "default": { "type": "number" }
      }
    }
  }
}
```

### `src/schemas/voice-pack.schema.json`

```json
{
  "$id": "https://khaos.studio/schemas/voice-pack.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VoicePackExport",
  "type": "object",
  "additionalProperties": false,
  "required": ["packId", "createdAt", "createdBy", "voices", "cart", "snippets"],
  "properties": {
    "packId": { "type": "string", "minLength": 8 },
    "createdAt": { "type": "string", "format": "date-time" },

    "createdBy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["app", "version"],
      "properties": {
        "app": { "type": "string" },
        "version": { "type": "string" }
      }
    },

    "voices": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "voice.schema.json" }
    },

    "cart": {
      "type": "object",
      "additionalProperties": false,
      "required": ["items"],
      "properties": {
        "items": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["voiceId", "variantId", "label"],
            "properties": {
              "voiceId": { "type": "string" },
              "variantId": { "type": "string" },
              "label": { "type": "string" }
            }
          }
        }
      }
    },

    "snippets": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "language", "content"],
        "properties": {
          "title": { "type": "string" },
          "language": { "type": "string", "enum": ["bash", "typescript", "json"] },
          "content": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 2) Domain types + IDs

### `src/domain/types.ts`

```ts
export type ULID = string;

export type VoiceQualityTier = "standard" | "neural" | "studio" | "open" | "unknown";
export type VoiceStatus = "active" | "deprecated" | "preview" | "region-limited";

export type VoiceSourceType =
  | "cloud_provider"
  | "hf_model"
  | "hf_space"
  | "hf_endpoint"
  | "self_hosted";

export type OutputFormat = "mp3" | "wav" | "pcm";

export interface VoiceSourceRef {
  sourceType: VoiceSourceType;
  sourceKey: string; // e.g. "aws_polly", "azure_tts", "hf"
  ref: Record<string, unknown>; // adapter-specific
}

export interface CapabilityRange {
  min: number;
  max: number;
  default: number;
}

export interface VoiceVariantCapabilities {
  supportsSSML: boolean;
  supportsStreaming: boolean;
  maxInputChars: number;
  outputFormats: OutputFormat[];
  controls: {
    rate: CapabilityRange | null;
    pitch: CapabilityRange | null;
    volume: CapabilityRange | null;
    stylePresets: string[];
  };
  languages?: string[];
  notes?: string;
}

export interface VoiceSample {
  sampleId: string;
  title: string;
  transcript: string;
  ssml?: string;
  audioUrl: string;
  settings: Record<string, unknown>;
  createdAt?: string;
}

export interface VoiceVariant {
  variantId: ULID;
  source: VoiceSourceRef;
  runnable: boolean;
  capabilities: VoiceVariantCapabilities;
  defaults: {
    format: OutputFormat;
    settings: Record<string, unknown>;
  };
  samples: VoiceSample[];
}

export interface Voice {
  voiceId: ULID;
  displayName: string;
  description?: string;

  languages: string[];
  tags: string[];
  qualityTier: VoiceQualityTier;
  featuredScore?: number;

  variants: VoiceVariant[];

  licensing: {
    allowedUse: "personal" | "commercial" | "unknown";
    notes: string;
    modelLicense?: string;
    requiresConsentProof?: boolean;
    consentProofUrl?: string;
  };

  status: VoiceStatus;

  createdAt: string;
  updatedAt: string;
}

export interface VoicePackCartItem {
  voiceId: ULID;
  variantId: ULID;
  label: string;
}

export interface VoicePackExport {
  packId: ULID;
  createdAt: string;
  createdBy: {
    app: string;
    version: string;
  };
  voices: Voice[];
  cart: { items: VoicePackCartItem[] };
  snippets: Array<{
    title: string;
    language: "bash" | "typescript" | "json";
    content: string;
  }>;
}
```

### `src/domain/ids.ts`

```ts
import { ulid } from "ulid";

export function newId(): string {
  return ulid();
}

export function nowIso(): string {
  return new Date().toISOString();
}
```

---

## 3) Adapter base + registry (plugin architecture)

### `src/adapters/base.ts`

```ts
import type { OutputFormat, VoiceSourceRef } from "../domain/types";

export type SynthInput =
  | { kind: "text"; text: string }
  | { kind: "ssml"; ssml: string };

export interface SynthesizeRequest {
  source: VoiceSourceRef;
  input: SynthInput;
  format: OutputFormat;
  settings: Record<string, unknown>;
}

export interface SynthesizeResponse {
  // You can choose to return bytes or an URL. URL is best for web apps.
  audioUrl?: string;
  audioBytesBase64?: string;

  contentType: string;
  meta?: Record<string, unknown>;
}

export interface AdapterConstraints {
  maxInputChars: number;
  supportsSSML: boolean;
  supportsStreaming: boolean;
  outputFormats: OutputFormat[];
}

export interface VoiceSourceAdapter {
  /** A stable key used in VoiceVariant.source.sourceKey */
  readonly sourceKey: string;

  /** Validate & normalize an adapter-specific ref object */
  normalizeRef(ref: Record<string, unknown>): Record<string, unknown>;

  /** Optional: return constraints at runtime (can depend on ref/region/model) */
  constraints(source: VoiceSourceRef): Promise<AdapterConstraints>;

  /** Synthesize audio */
  synthesize(req: SynthesizeRequest): Promise<SynthesizeResponse>;
}
```

### `src/adapters/index.ts`

```ts
import type { VoiceSourceAdapter } from "./base";
import { AwsPollyAdapter } from "./aws-polly";
import { AzureTtsAdapter } from "./azure-tts";
import { HfEndpointAdapter } from "./hf-endpoint";
import { HfSpacePreviewAdapter } from "./hf-space-preview";

export class AdapterRegistry {
  private readonly map = new Map<string, VoiceSourceAdapter>();

  register(adapter: VoiceSourceAdapter): void {
    if (this.map.has(adapter.sourceKey)) {
      throw new Error(`Adapter already registered: ${adapter.sourceKey}`);
    }
    this.map.set(adapter.sourceKey, adapter);
  }

  get(sourceKey: string): VoiceSourceAdapter {
    const a = this.map.get(sourceKey);
    if (!a) throw new Error(`No adapter registered for sourceKey=${sourceKey}`);
    return a;
  }
}

export function createDefaultRegistry(): AdapterRegistry {
  const r = new AdapterRegistry();
  r.register(new AwsPollyAdapter());
  r.register(new AzureTtsAdapter());
  r.register(new HfEndpointAdapter());
  r.register(new HfSpacePreviewAdapter());
  return r;
}
```

---

## 4) Adapter skeletons

### `src/adapters/aws-polly.ts`

```ts
import type { VoiceSourceAdapter, AdapterConstraints, SynthesizeRequest, SynthesizeResponse } from "./base";
import type { VoiceSourceRef } from "../domain/types";

/**
 * NOTE:
 * This is a skeleton. In production you’d use AWS SDK v3 (@aws-sdk/client-polly)
 * and sign requests using IAM credentials.
 */
export class AwsPollyAdapter implements VoiceSourceAdapter {
  public readonly sourceKey = "aws_polly";

  normalizeRef(ref: Record<string, unknown>): Record<string, unknown> {
    // Example expected ref:
    // { region: "us-east-1", voiceId: "Joanna", engine: "neural" }
    const region = String(ref.region ?? "");
    const voiceId = String(ref.voiceId ?? "");
    if (!region || !voiceId) throw new Error("aws_polly ref requires {region, voiceId}");
    return { region, voiceId, engine: String(ref.engine ?? "neural") };
  }

  async constraints(_source: VoiceSourceRef): Promise<AdapterConstraints> {
    return {
      maxInputChars: 3000,
      supportsSSML: true,
      supportsStreaming: false,
      outputFormats: ["mp3", "pcm", "wav"]
    };
  }

  async synthesize(req: SynthesizeRequest): Promise<SynthesizeResponse> {
    // Pseudo-implementation:
    // - map req.input to Polly TextType (text|ssml)
    // - call SynthesizeSpeech
    // - upload bytes to storage, return URL

    throw new Error("AwsPollyAdapter.synthesize not implemented (skeleton)");
  }
}
```

### `src/adapters/azure-tts.ts`

```ts
import type { VoiceSourceAdapter, AdapterConstraints, SynthesizeRequest, SynthesizeResponse } from "./base";
import type { VoiceSourceRef } from "../domain/types";

/**
 * NOTE:
 * Skeleton. Real implementation uses Azure Speech endpoint + subscription key
 * and posts SSML to /cognitiveservices/v1
 */
export class AzureTtsAdapter implements VoiceSourceAdapter {
  public readonly sourceKey = "azure_tts";

  normalizeRef(ref: Record<string, unknown>): Record<string, unknown> {
    // Example ref:
    // { region: "eastus", voiceName: "en-US-JennyNeural" }
    const region = String(ref.region ?? "");
    const voiceName = String(ref.voiceName ?? "");
    if (!region || !voiceName) throw new Error("azure_tts ref requires {region, voiceName}");
    return { region, voiceName };
  }

  async constraints(_source: VoiceSourceRef): Promise<AdapterConstraints> {
    return {
      maxInputChars: 10000,
      supportsSSML: true,
      supportsStreaming: false,
      outputFormats: ["mp3", "wav", "pcm"]
    };
  }

  async synthesize(_req: SynthesizeRequest): Promise<SynthesizeResponse> {
    throw new Error("AzureTtsAdapter.synthesize not implemented (skeleton)");
  }
}
```

### `src/adapters/hf-endpoint.ts`

```ts
import type { VoiceSourceAdapter, AdapterConstraints, SynthesizeRequest, SynthesizeResponse } from "./base";
import type { VoiceSourceRef } from "../domain/types";

/**
 * HF Endpoint Adapter:
 * This assumes you have a stable HTTPS inference endpoint that accepts some JSON payload
 * and returns audio bytes (or a URL). Payload varies per deployment.
 *
 * Good for "checkout/export" because it’s reliable and explicit.
 */
export class HfEndpointAdapter implements VoiceSourceAdapter {
  public readonly sourceKey = "hf_endpoint";

  normalizeRef(ref: Record<string, unknown>): Record<string, unknown> {
    // Example ref:
    // {
    //   endpointUrl: "https://<your-endpoint>.endpoints.huggingface.cloud",
    //   model: "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
    //   auth: { type: "hf_token_env", envVar: "HF_TOKEN" },
    //   protocol: "json_audio_base64",
    //   voicePreset: "default"
    // }
    const endpointUrl = String(ref.endpointUrl ?? "");
    if (!endpointUrl.startsWith("http")) throw new Error("hf_endpoint ref requires endpointUrl");
    return {
      endpointUrl,
      model: ref.model ? String(ref.model) : undefined,
      auth: (ref.auth as Record<string, unknown>) ?? { type: "hf_token_env", envVar: "HF_TOKEN" },
      protocol: String(ref.protocol ?? "json_audio_base64"),
      preset: ref.preset ? String(ref.preset) : "default"
    };
  }

  async constraints(_source: VoiceSourceRef): Promise<AdapterConstraints> {
    return {
      maxInputChars: 5000,
      supportsSSML: false, // most custom endpoints won’t accept SSML unless you implement it
      supportsStreaming: false,
      outputFormats: ["wav", "mp3"]
    };
  }

  async synthesize(req: SynthesizeRequest): Promise<SynthesizeResponse> {
    const ref = this.normalizeRef(req.source.ref);
    const endpointUrl = String(ref.endpointUrl);

    // Minimal example payload design (you control this on the endpoint):
    const payload = {
      input: req.input.kind === "ssml" ? req.input.ssml : req.input.text,
      inputType: req.input.kind,
      format: req.format,
      settings: req.settings,
      preset: ref.preset,
      model: ref.model
    };

    // Skeleton network call:
    // const token = process.env[(ref.auth as any).envVar]
    // const res = await fetch(endpointUrl, { method:"POST", headers:{...}, body: JSON.stringify(payload) })
    // return { audioBytesBase64: ..., contentType: ... }

    throw new Error(`HfEndpointAdapter.synthesize not implemented (skeleton). Would POST to ${endpointUrl}`);
  }
}
```

### `src/adapters/hf-space-preview.ts`

```ts
import type { VoiceSourceAdapter, AdapterConstraints, SynthesizeRequest, SynthesizeResponse } from "./base";
import type { VoiceSourceRef } from "../domain/types";

/**
 * HF Spaces vary wildly.
 * Treat as "preview-only" unless you control the Space API contract.
 */
export class HfSpacePreviewAdapter implements VoiceSourceAdapter {
  public readonly sourceKey = "hf_space_preview";

  normalizeRef(ref: Record<string, unknown>): Record<string, unknown> {
    // Example ref:
    // { spaceId: "Qwen/Qwen3-TTS", previewUrl: "https://qwen-qwen3-tts.hf.space" }
    const spaceId = String(ref.spaceId ?? "");
    if (!spaceId.includes("/")) throw new Error("hf_space_preview ref requires spaceId like 'org/space'");
    return {
      spaceId,
      previewUrl: ref.previewUrl ? String(ref.previewUrl) : undefined,
      notes: ref.notes ? String(ref.notes) : "Preview only"
    };
  }

  async constraints(_source: VoiceSourceRef): Promise<AdapterConstraints> {
    return {
      maxInputChars: 800,
      supportsSSML: false,
      supportsStreaming: false,
      outputFormats: ["wav", "mp3"]
    };
  }

  async synthesize(_req: SynthesizeRequest): Promise<SynthesizeResponse> {
    throw new Error("hf_space_preview is preview-only; do not rely on synthesize()");
  }
}
```

---

## 5) Validation with Ajv

### `src/export/validate.ts`

```ts
import Ajv from "ajv";
import addFormats from "ajv-formats";
import voiceSchema from "../schemas/voice.schema.json" assert { type: "json" };
import variantSchema from "../schemas/voice-variant.schema.json" assert { type: "json" };
import packSchema from "../schemas/voice-pack.schema.json" assert { type: "json" };
import type { Voice, VoicePackExport } from "../domain/types";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

ajv.addSchema(variantSchema);
ajv.addSchema(voiceSchema);
ajv.addSchema(packSchema);

const validateVoice = ajv.getSchema<Voice>("https://khaos.studio/schemas/voice.schema.json");
const validatePack = ajv.getSchema<VoicePackExport>("https://khaos.studio/schemas/voice-pack.schema.json");

export function assertValidVoice(v: unknown): asserts v is Voice {
  if (!validateVoice) throw new Error("Voice schema not registered");
  const ok = validateVoice(v);
  if (!ok) throw new Error(`Voice invalid: ${ajv.errorsText(validateVoice.errors, { separator: "\n" })}`);
}

export function assertValidVoicePack(p: unknown): asserts p is VoicePackExport {
  if (!validatePack) throw new Error("VoicePack schema not registered");
  const ok = validatePack(p);
  if (!ok) throw new Error(`VoicePack invalid: ${ajv.errorsText(validatePack.errors, { separator: "\n" })}`);
}
```

---

## 6) Snippet generation (export “checkout” artifacts)

### `src/export/snippets.ts`

```ts
import type { VoicePackExport, VoiceVariant } from "../domain/types";

function findVariant(pack: VoicePackExport, voiceId: string, variantId: string): VoiceVariant {
  const v = pack.voices.find(x => x.voiceId === voiceId);
  if (!v) throw new Error(`voiceId not found: ${voiceId}`);
  const vv = v.variants.find(x => x.variantId === variantId);
  if (!vv) throw new Error(`variantId not found: ${variantId}`);
  return vv;
}

export function buildSnippets(pack: VoicePackExport): VoicePackExport["snippets"] {
  const bashLines: string[] = [];
  const tsLines: string[] = [];

  bashLines.push(`# VoicePack ${pack.packId}`);
  bashLines.push(`# Generated at ${pack.createdAt}`);
  bashLines.push(``);
  bashLines.push(`# Items:`);

  tsLines.push(`// VoicePack ${pack.packId}`);
  tsLines.push(`// Generated at ${pack.createdAt}`);
  tsLines.push(``);
  tsLines.push(`export const voicePack = ${JSON.stringify(pack, null, 2)} as const;`);
  tsLines.push(``);

  for (const item of pack.cart.items) {
    const variant = findVariant(pack, item.voiceId, item.variantId);

    bashLines.push(`- ${item.label} :: ${variant.source.sourceKey}`);
    bashLines.push(`  sourceType=${variant.source.sourceType}`);
    bashLines.push(`  sourceRef='${JSON.stringify(variant.source.ref)}'`);
    bashLines.push(``);

    // Give a copy-paste-able "call template" per sourceKey (no secrets)
    tsLines.push(`// ${item.label}`);
    tsLines.push(`// sourceKey: ${variant.source.sourceKey}`);
    tsLines.push(`// sourceRef: ${JSON.stringify(variant.source.ref)}`);
    tsLines.push(``);
    tsLines.push(`// TODO: Route through your synthesis gateway using the adapter registry.`);
    tsLines.push(``);
  }

  return [
    { title: "voice-pack.json", language: "json", content: JSON.stringify(pack, null, 2) },
    { title: "cart-summary.sh", language: "bash", content: bashLines.join("\n") },
    { title: "voice-pack.ts", language: "typescript", content: tsLines.join("\n") }
  ];
}
```

---

## 7) Build the VoicePack export

### `src/export/buildVoicePack.ts`

```ts
import type { Voice, VoicePackCartItem, VoicePackExport } from "../domain/types";
import { newId, nowIso } from "../domain/ids";
import { buildSnippets } from "./snippets";
import { assertValidVoicePack } from "./validate";

export function buildVoicePack(args: {
  app: string;
  version: string;
  voices: Voice[];
  cartItems: VoicePackCartItem[];
}): VoicePackExport {
  const pack: VoicePackExport = {
    packId: newId(),
    createdAt: nowIso(),
    createdBy: { app: args.app, version: args.version },
    voices: args.voices,
    cart: { items: args.cartItems },
    snippets: [] // filled next
  };

  pack.snippets = buildSnippets(pack);

  // ensure we never export invalid bundles
  assertValidVoicePack(pack);

  return pack;
}
```

---

## 8) Example seed data (includes HF endpoint + Kitten/Qwen-like entries)

### `src/example/seed.ts`

```ts
import type { Voice } from "../domain/types";
import { newId, nowIso } from "../domain/ids";

export function seedVoices(): Voice[] {
  const t = nowIso();

  const qwenOpenVoice: Voice = {
    voiceId: newId(),
    displayName: "Qwen3 Open Narrator (Endpoint)",
    description: "Curated open-model narration profile routed via a dedicated HF Endpoint.",
    languages: ["en-US", "es-ES"],
    tags: ["narration", "clear", "open-model", "multilingual"],
    qualityTier: "open",
    variants: [
      {
        variantId: newId(),
        runnable: true,
        source: {
          sourceType: "hf_endpoint",
          sourceKey: "hf_endpoint",
          ref: {
            endpointUrl: "https://YOUR-ENDPOINT.endpoints.huggingface.cloud",
            model: "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
            auth: { type: "hf_token_env", envVar: "HF_TOKEN" },
            protocol: "json_audio_base64",
            preset: "narration_v1"
          }
        },
        capabilities: {
          supportsSSML: false,
          supportsStreaming: false,
          maxInputChars: 5000,
          outputFormats: ["wav", "mp3"],
          controls: { rate: null, pitch: null, volume: null, stylePresets: ["narration_v1"] },
          notes: "Endpoint contract-defined. SSML not supported by default."
        },
        defaults: { format: "wav", settings: { temperature: 0.7 } },
        samples: [
          {
            sampleId: "std-1",
            title: "Standard Narration",
            transcript: "When the city fell quiet, the smallest voices became the loudest.",
            audioUrl: "https://cdn.example.com/samples/qwen-open-narrator-std-1.wav",
            settings: { temperature: 0.7 },
            createdAt: t
          }
        ]
      }
    ],
    licensing: {
      allowedUse: "unknown",
      notes: "Verify model license and downstream commercial usage per model card.",
      modelLicense: "See model repository license"
    },
    status: "preview",
    createdAt: t,
    updatedAt: t
  };

  const kittenPreview: Voice = {
    voiceId: newId(),
    displayName: "KittenTTS (Space Preview)",
    description: "Preview-only listing sourced from a Hugging Face Space demo.",
    languages: ["en-US"],
    tags: ["preview", "open-model", "lightweight"],
    qualityTier: "open",
    variants: [
      {
        variantId: newId(),
        runnable: false,
        source: {
          sourceType: "hf_space",
          sourceKey: "hf_space_preview",
          ref: { spaceId: "KingNish/Kitten-TTS", previewUrl: "https://kingnish-kitten-tts.hf.space" }
        },
        capabilities: {
          supportsSSML: false,
          supportsStreaming: false,
          maxInputChars: 800,
          outputFormats: ["wav", "mp3"],
          controls: { rate: null, pitch: null, volume: null, stylePresets: [] },
          notes: "Space is not a stable API. Treat as audition/preview."
        },
        defaults: { format: "wav", settings: {} },
        samples: []
      }
    ],
    licensing: {
      allowedUse: "unknown",
      notes: "Preview listing. Check model/space license and usage terms before production."
    },
    status: "preview",
    createdAt: t,
    updatedAt: t
  };

  return [qwenOpenVoice, kittenPreview];
}
```

### `src/example/run-export.ts`

```ts
import { seedVoices } from "./seed";
import { buildVoicePack } from "../export/buildVoicePack";

const voices = seedVoices();

// “Checkout”: pick one variant per selected voice profile
const cartItems = [
  {
    voiceId: voices[0].voiceId,
    variantId: voices[0].variants[0].variantId,
    label: "Narration: Qwen3 Open Narrator"
  }
];

const pack = buildVoicePack({
  app: "voice-market",
  version: "0.1.0",
  voices,
  cartItems
});

console.log(JSON.stringify(pack, null, 2));
```

---

## 9) Minimal `package.json` (Node 20+) + `tsconfig`

```json
{
  "name": "voice-market",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:export": "node --loader ts-node/esm src/example/run-export.ts"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  }
}
```

---

## What you get from this foundation

* **Catalog = stable** (`Voice` / `VoiceVariant`)
* **New providers/models = cheap** (add one adapter)
* **Checkout/export = portable** (`VoicePackExport` + snippets)
* HF open models can be:

  * **metadata-only** (`hf_model`)
  * **preview-only** (`hf_space_preview`)
  * **runnable + exportable** (`hf_endpoint` / `self_hosted`)

---
