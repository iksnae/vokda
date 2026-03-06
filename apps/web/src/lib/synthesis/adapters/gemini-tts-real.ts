/**
 * Gemini TTS synthesis adapter.
 *
 * Uses Gemini 2.5 Flash with audio generation.
 * API docs: https://ai.google.dev/gemini-api/docs/speech-generation
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { ApiKeyCredential } from '../provider-auth';
import { getAccessTokenForProvider } from '../oauth';

function extractVoiceId(sourceKey: string): string {
  // sourceKey: "gemini:tts:Kore" → "Kore"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || 'Kore';
}

export function createGeminiTtsAdapter(credential: ApiKeyCredential): SynthesisAdapter {
  return {
    id: 'gemini-tts',
    canHandle: (variant) => variant.sourceKey.startsWith('gemini:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voiceId = extractVoiceId(request.variant.sourceKey);

      // Prefer OAuth token if available, fall back to API key
      const oauthToken = getAccessTokenForProvider('gemini-tts');
      const url = oauthToken
        ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent'
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${credential.apiKey}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (oauthToken) {
        headers['Authorization'] = `Bearer ${oauthToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: request.input }],
              },
            ],
            generationConfig: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: voiceId,
                  },
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini TTS failed (${response.status}): ${error}`);
      }

      const result = (await response.json()) as {
        candidates: Array<{
          content: {
            parts: Array<{
              inlineData?: { mimeType: string; data: string };
            }>;
          };
        }>;
      };

      const audioPart = result.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.mimeType?.startsWith('audio/')
      );

      if (!audioPart?.inlineData) {
        throw new Error('Gemini TTS returned no audio data');
      }

      const binaryString = atob(audioPart.inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: audioPart.inlineData.mimeType });
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'Gemini TTS',
        adapter: 'gemini-tts',
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
