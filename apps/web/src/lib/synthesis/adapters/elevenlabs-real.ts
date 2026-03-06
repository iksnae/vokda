/**
 * ElevenLabs TTS synthesis adapter.
 *
 * API docs: https://docs.elevenlabs.io/api-reference/text-to-speech
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';

function extractVoiceId(sourceKey: string): string {
  // sourceKey: "elevenlabs:tts:21m00Tcm4TlvDq8ikWAM"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || '';
}

export function createElevenLabsAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'elevenlabs',
    canHandle: (variant) => variant.sourceKey.startsWith('elevenlabs:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voiceId = extractVoiceId(request.variant.sourceKey);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': credential.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: request.input,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'ElevenLabs',
        adapter: 'elevenlabs',
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
