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

export function stopPreviewPlayback() {
  if (!browser || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
}
