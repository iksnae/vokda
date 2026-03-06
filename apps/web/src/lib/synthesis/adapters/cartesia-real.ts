/**
 * Cartesia Sonic TTS synthesis adapter.
 *
 * API docs: https://docs.cartesia.ai/api-reference/tts/bytes
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';

function extractVoiceId(sourceKey: string): string {
  // sourceKey: "cartesia:tts:a0e99841-438c-4a64-b679-ae501e7d6091"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || '';
}

export function createCartesiaAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'cartesia',
    canHandle: (variant) => variant.sourceKey.startsWith('cartesia:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voiceId = extractVoiceId(request.variant.sourceKey);

      const response = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
          'X-API-Key': credential.apiKey,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-2',
          transcript: request.input,
          voice: {
            mode: 'id',
            id: voiceId,
          },
          output_format: {
            container: 'mp3',
            bit_rate: 128000,
            sample_rate: 44100,
          },
          language: request.voice.languages[0] || 'en',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cartesia TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'Cartesia',
        adapter: 'cartesia',
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
