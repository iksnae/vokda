/**
 * Synthesis service — orchestrates synthesis preview requests.
 *
 * Modes:
 * 1. API mode (default when PUBLIC_SYNTHESIS_API_URL is set):
 *    Calls the Vokda Synthesis API server-side. The API uses the
 *    user's stored provider credentials (BYOK) in DynamoDB.
 * 2. Gateway mode (PUBLIC_SYNTH_MODE=gateway):
 *    Legacy — calls PUBLIC_SYNTH_GATEWAY_URL directly.
 * 3. Browser adapter mode (fallback):
 *    Uses in-browser adapters from the registry.
 */

import { browser } from '$app/environment';
import { normalizePreviewInput } from './constraints';
import { resolveAdapter, hasRealAdapter, getProviderForVariant } from './registry';
import type { SynthesisPreview, SynthesisRequest } from './types';
import { getAuthSnapshot } from '$lib/auth/store';
import { AUTH_MODE } from '$lib/auth/config';
import type { VoiceVariant } from '$lib/types';

const SYNTH_MODE = (import.meta.env.PUBLIC_SYNTH_MODE as string | undefined) ?? 'mock';
const SYNTH_GATEWAY_URL = (import.meta.env.PUBLIC_SYNTH_GATEWAY_URL as string | undefined) ?? '';
const SYNTHESIS_API_URL = (import.meta.env.PUBLIC_SYNTHESIS_API_URL as string | undefined) || 'https://api.vokda.iksnae.com';

/**
 * Call the Vokda Synthesis API (/v1/synthesize) with the user's auth token.
 * The API looks up the user's stored provider credentials server-side.
 */
async function runApiSynthesis(request: SynthesisRequest): Promise<SynthesisPreview> {
  const authSnapshot = getAuthSnapshot();
  const token = authSnapshot.idToken || authSnapshot.accessToken;

  if (!token) {
    throw new Error('Sign in is required for synthesis.');
  }

  const provider = getProviderForVariant(request.variant, request.voice.providerId);
  if (!provider) {
    throw new Error(`Cannot determine provider for voice "${request.voice.name}".`);
  }

  const start = Date.now();

  // Collect provider-steering facets into one options object. Each adapter reads
  // only the keys it understands (OpenAI: instructions; ElevenLabs: stability/
  // style/speed/similarity_boost/model_id; Polly: speakingStyle).
  const options: Record<string, unknown> = {
    ...(request.settings ?? {}),
    ...(request.instructions?.trim() ? { instructions: request.instructions.trim() } : {}),
    ...(request.style ? { speakingStyle: request.style } : {}),
    ...(request.model ? { model_id: request.model } : {}),
  };

  const response = await fetch(`${SYNTHESIS_API_URL}/v1/synthesize`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: request.input,
      provider,
      voiceId: request.voice.id,
      voiceName: request.voice.name,
      providerVoiceId: request.voice.providerVoiceId || request.variant.sourceKey || request.variant.id,
      mode: request.mode ?? 'text',
      ...(Object.keys(options).length > 0 ? { options } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    const msg = (body as { message?: string; error?: string }).message
      ?? (body as { error?: string }).error
      ?? `HTTP ${response.status}`;
    throw new Error(`${provider} TTS failed (${response.status}): ${msg}`);
  }

  const data = await response.json() as {
    audioUrl: string;
    fileSizeBytes: number;
    durationMs: number | null;
    latencyMs: number;
    provider: string;
  };

  return {
    provider,
    adapter: `api:${data.provider}`,
    variantId: request.variant.id,
    sourceKey: request.variant.sourceKey,
    inputUsed: request.input,
    warnings: [],
    audioUrl: data.audioUrl,
    latencyMs: data.latencyMs ?? (Date.now() - start),
    generatedAt: new Date().toISOString(),
  };
}

async function runGatewayPreview(request: SynthesisRequest): Promise<SynthesisPreview> {
  if (!SYNTH_GATEWAY_URL) {
    throw new Error('Gateway mode requires PUBLIC_SYNTH_GATEWAY_URL.');
  }

  const authSnapshot = getAuthSnapshot();
  const token = authSnapshot.accessToken || authSnapshot.idToken;

  if (AUTH_MODE === 'amplify' && !token) {
    throw new Error('Sign in is required before calling synthesis gateway.');
  }

  const response = await fetch(SYNTH_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      sourceKey: request.variant.sourceKey,
      variantId: request.variant.id,
      input: request.input,
      mode: request.mode
    })
  });

  if (!response.ok) {
    throw new Error(`Synthesis gateway failed with status ${response.status}.`);
  }

  return (await response.json()) as SynthesisPreview;
}

function optionalBrowserPlayback(preview: SynthesisPreview, lang: string) {
  if (!browser || preview.audioUrl) return;
  if (!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(preview.inputUsed);
  utterance.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

/**
 * Synthesize a preview using the best available method.
 *
 * Priority:
 * 1. API mode (if PUBLIC_SYNTHESIS_API_URL is set and user is authenticated)
 * 2. Gateway mode (if PUBLIC_SYNTH_MODE=gateway)
 * 3. BYOK real adapter (if user has credentials for this provider)
 * 4. Mock adapter (fallback with simulated response)
 */
export async function synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
  const constrained = normalizePreviewInput(request.input, request.mode, request.variant);

  if (!constrained.text) {
    throw new Error('Preview input is empty after applying variant constraints.');
  }

  const prepared: SynthesisRequest = {
    ...request,
    input: constrained.text
  };

  let preview: SynthesisPreview;

  // Prefer API mode when available (authenticated + API URL configured)
  const authSnapshot = getAuthSnapshot();
  const hasApiUrl = Boolean(SYNTHESIS_API_URL);
  const hasToken = Boolean(authSnapshot.idToken || authSnapshot.accessToken);

  if (hasApiUrl && hasToken) {
    preview = await runApiSynthesis(prepared);
  } else if (SYNTH_MODE === 'gateway') {
    preview = await runGatewayPreview(prepared);
  } else {
    const adapter = resolveAdapter(request.variant);
    if (!adapter) {
      throw new Error(`No synthesis adapter found for sourceKey ${request.variant.sourceKey}.`);
    }

    preview = await adapter.synthesizePreview(prepared);
  }

  preview = {
    ...preview,
    warnings: [...constrained.warnings, ...(preview.warnings ?? [])]
  };

  optionalBrowserPlayback(preview, request.voice.languages[0] ?? 'en-US');
  return preview;
}

/**
 * Check if real (non-mock) synthesis is available for a variant.
 */
export function canSynthesizeReal(variant: VoiceVariant, providerId?: string): boolean {
  // Check if this provider has a server-side adapter
  const provider = getProviderForVariant(variant, providerId);
  if (provider && SERVER_SYNTH_PROVIDERS.has(provider)) {
    if (SYNTHESIS_API_URL) return true;
  }
  if (SYNTH_MODE === 'gateway') return true;
  return hasRealAdapter(variant, providerId);
}

/** Providers that have server-side synthesis adapters on the Vokda API. */
const SERVER_SYNTH_PROVIDERS = new Set([
  'openai', 'elevenlabs', 'deepgram', 'gemini-tts',
  'cartesia', 'lmnt', 'gcp-tts', 'azure-speech', 'aws-polly',
]);

/**
 * Get the provider ID for a variant (for checking credential status).
 */
export function getSynthesisProvider(variant: VoiceVariant, providerId?: string): string | null {
  return getProviderForVariant(variant, providerId);
}

/**
 * Check if a provider has server-side synthesis support.
 */
export function hasServerSynthesis(providerId: string): boolean {
  return SERVER_SYNTH_PROVIDERS.has(providerId);
}

/**
 * Parse a raw adapter error into a user-friendly message.
 *
 * Extracts the HTTP status and provider name from the standard
 * adapter error format: "{Provider} TTS failed ({status}): {body}"
 * then maps to actionable guidance.
 */
export function humanizeSynthesisError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Extract status code from various error formats:
  //   "{Provider} TTS {NNN}: ..."     (adapter format)
  //   "{Provider} TTS failed (NNN):"  (legacy format)
  //   "HTTP {NNN}"                    (generic)
  const statusMatch = raw.match(/TTS (\d{3}):/) || raw.match(/failed \((\d{3})\)/) || raw.match(/HTTP (\d{3})/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;

  // Extract provider name from "{Provider} TTS ..." or "{Provider} error"
  const providerMatch = raw.match(/^(\w[\w\s-]*?) TTS /) || raw.match(/^(\w[\w\s-]*?) (?:error|returned)/);
  const provider = providerMatch ? providerMatch[1] : 'Provider';

  if (status === 401 || status === 403) {
    // Log full detail for debugging
    console.warn('[synthesis] Auth error from provider:', raw);
    return `${provider} rejected your API key. Check your key at Account → Provider Keys, or upgrade your plan if on a free tier.`;
  }

  if (status === 429) {
    return `${provider} rate limit reached. Wait a moment and try again, or check your plan's usage quota.`;
  }

  if (status === 402) {
    return `${provider} requires payment. Your account may have exceeded its free quota.`;
  }

  if (status >= 500) {
    return `${provider} is experiencing issues (${status}). Try again in a moment.`;
  }

  if (status === 400) {
    return `${provider} rejected the request. The input text may be too long or contain unsupported characters.`;
  }

  // Network / fetch errors
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('net::')) {
    return `Could not reach ${provider}. Check your internet connection or try again.`;
  }

  // Fallback: truncate to something reasonable
  if (raw.length > 160) {
    return raw.slice(0, 150).trim() + '…';
  }

  return raw;
}

export function stopPreviewPlayback() {
  if (!browser || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
}
