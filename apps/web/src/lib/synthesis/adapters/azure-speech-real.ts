/**
 * Azure Speech TTS synthesis adapter.
 *
 * Uses REST API directly (no SDK dependency).
 * API docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { SubscriptionKeyCredential } from '../provider-auth';
import { getAccessTokenForProvider } from '../oauth';

function extractVoiceId(sourceKey: string): string {
  // sourceKey: "azure:tts:en-US-JennyNeural"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || 'en-US-JennyNeural';
}

export function createAzureSpeechAdapter(credential: SubscriptionKeyCredential): SynthesisAdapter {
  return {
    id: 'azure-speech',
    canHandle: (variant) => variant.sourceKey.startsWith('azure:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voiceName = extractVoiceId(request.variant.sourceKey);
      const lang = request.voice.languages[0] || 'en-US';

      // Build SSML
      const ssml = request.mode === 'ssml'
        ? request.input
        : `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>
  <voice name='${voiceName}'>${escapeXml(request.input)}</voice>
</speak>`;

      const endpoint = `https://${credential.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

      // Prefer OAuth token if available, fall back to subscription key
      const oauthToken = getAccessTokenForProvider('azure-speech');
      const authHeaders: Record<string, string> = oauthToken
        ? { 'Authorization': `Bearer ${oauthToken}` }
        : { 'Ocp-Apim-Subscription-Key': credential.subscriptionKey };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure Speech TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'Azure Speech',
        adapter: 'azure-speech',
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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
