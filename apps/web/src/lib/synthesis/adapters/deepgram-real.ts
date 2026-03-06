/**
 * Deepgram Aura TTS synthesis adapter.
 *
 * API docs: https://developers.deepgram.com/docs/text-to-speech
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';

function extractModel(sourceKey: string): string {
  // sourceKey: "deepgram:tts:aura-2-thalia-en" → "aura-2-thalia-en"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || 'aura-2-thalia-en';
}

export function createDeepgramAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'deepgram',
    canHandle: (variant) => variant.sourceKey.startsWith('deepgram:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const model = extractModel(request.variant.sourceKey);

      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${credential.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: request.input }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Deepgram TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'Deepgram',
        adapter: 'deepgram',
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
