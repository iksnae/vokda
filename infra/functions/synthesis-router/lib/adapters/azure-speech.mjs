/**
 * Azure Speech TTS adapter (server-side).
 * POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
 */

import { extractVoiceId } from './types.mjs';

export const id = 'azure-speech';

export async function synthesize(credential, params) {
  const voiceName = params.providerVoiceId || extractVoiceId(params.voiceId) || 'en-US-JennyNeural';
  const region = credential.region || 'eastus';
  const lang = voiceName.split('-').slice(0, 2).join('-') || 'en-US';

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
  <voice name="${voiceName}">${escapeXml(params.text)}</voice>
</speak>`;

  const resp = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': credential.subscriptionKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Azure Speech TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());

  return {
    audio,
    contentType: 'audio/mpeg',
    metadata: { voiceName, region },
  };
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
