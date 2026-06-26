/**
 * OpenAI TTS synthesis adapter.
 *
 * Uses the user's API key to call OpenAI's TTS API.
 * Supports tts-1, tts-1-hd, and gpt-4o-mini-tts models.
 *
 * API docs: https://platform.openai.com/docs/api-reference/audio/createSpeech
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';

/**
 * OpenAI's newest TTS model. It renders all 13 built-in voices and is the most
 * natural/accurate, so every voice uses it (older tts-1/tts-1-hd only cover a
 * subset). Replaces a brittle per-voice substring heuristic.
 */
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini-tts';

export function extractVoiceId(sourceKey: string): string {
  // sourceKey format: "openai:tts:alloy" or "openai:voice:alloy"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || 'alloy';
}

export function resolveOpenAIModel(): string {
  return OPENAI_DEFAULT_MODEL;
}

export function createOpenAIAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'openai',
    canHandle: (variant) =>
      variant.sourceKey.startsWith('openai:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voiceId = extractVoiceId(request.variant.sourceKey);
      const model = resolveOpenAIModel();

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credential.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          voice: voiceId,
          input: request.input,
          response_format: 'mp3',
          ...(request.instructions?.trim() ? { instructions: request.instructions.trim() } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'OpenAI',
        adapter: 'openai',
        variantId: request.variant.id,
        sourceKey: request.variant.sourceKey,
        inputUsed: request.input,
        warnings: [],
        audioUrl,
        latencyMs: Date.now() - start,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}
