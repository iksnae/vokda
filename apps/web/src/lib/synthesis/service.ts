/**
 * Synthesis service — orchestrates synthesis preview requests.
 *
 * Handles both BYOK (real) and mock synthesis, plus gateway mode.
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
 * 1. Gateway mode (if PUBLIC_SYNTH_MODE=gateway)
 * 2. BYOK real adapter (if user has credentials for this provider)
 * 3. Mock adapter (fallback with simulated response)
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

  if (SYNTH_MODE === 'gateway') {
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
export function canSynthesizeReal(variant: VoiceVariant): boolean {
  if (SYNTH_MODE === 'gateway') return true;
  return hasRealAdapter(variant);
}

/**
 * Get the provider ID for a variant (for checking credential status).
 */
export function getSynthesisProvider(variant: VoiceVariant): string | null {
  return getProviderForVariant(variant);
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

  // Extract status code from "{Provider} TTS failed (NNN): ..."
  const statusMatch = raw.match(/failed \((\d{3})\)/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;

  // Extract provider name
  const providerMatch = raw.match(/^(\w[\w\s-]*?) TTS failed/);
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
