/**
 * Google Cloud TTS synthesis adapter.
 *
 * API docs: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';

function extractVoiceInfo(sourceKey: string): { name: string; lang: string } {
  // sourceKey: "gcp:tts:en-US-Wavenet-D" or "gcp:tts:en-US-Neural2-A"
  const parts = sourceKey.split(':');
  const voiceName = parts[parts.length - 1] || 'en-US-Wavenet-D';
  // Extract language code from voice name (e.g., "en-US" from "en-US-Wavenet-D")
  const langParts = voiceName.split('-');
  const lang = langParts.length >= 2 ? `${langParts[0]}-${langParts[1]}` : 'en-US';
  return { name: voiceName, lang };
}

export function createGcpTtsAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'gcp-tts',
    canHandle: (variant) => variant.sourceKey.startsWith('gcp:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const { name, lang } = extractVoiceInfo(request.variant.sourceKey);

      const body = {
        input: request.mode === 'ssml'
          ? { ssml: request.input }
          : { text: request.input },
        voice: {
          languageCode: lang,
          name,
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      };

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${credential.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Cloud TTS failed (${response.status}): ${error}`);
      }

      const result = (await response.json()) as { audioContent: string };

      // Google returns base64-encoded audio
      const binaryString = atob(result.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'Google Cloud TTS',
        adapter: 'gcp-tts',
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
