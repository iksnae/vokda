/**
 * LMNT TTS synthesis adapter.
 *
 * API docs: https://docs.lmnt.com/api-reference/speech/synthesize-speech
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';

function extractVoiceId(sourceKey: string): string {
  // sourceKey: "lmnt:tts:lily"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || '';
}

export function createLmntAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'lmnt',
    canHandle: (variant) => variant.sourceKey.startsWith('lmnt:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voice = extractVoiceId(request.variant.sourceKey);

      // LMNT uses form data
      const formData = new FormData();
      formData.append('voice', voice);
      formData.append('text', request.input);
      formData.append('format', 'mp3');

      const response = await fetch('https://api.lmnt.com/v1/ai/speech', {
        method: 'POST',
        headers: {
          'X-API-Key': credential.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LMNT TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'LMNT',
        adapter: 'lmnt',
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
