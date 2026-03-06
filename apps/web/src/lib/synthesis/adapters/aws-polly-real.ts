/**
 * AWS Polly TTS synthesis adapter.
 *
 * Uses the REST API with AWS Signature V4.
 * Since we're in the browser and can't use the full AWS SDK,
 * we proxy through the admin API which has IAM credentials.
 *
 * For direct browser calls, the user would need IAM credentials
 * which is handled via the proxy approach.
 */

import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';
import type { AwsCredentials } from '../provider-auth';

function extractVoiceId(sourceKey: string): string {
  // sourceKey: "aws-polly:tts:Joanna" → "Joanna"
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || 'Joanna';
}

function resolveEngine(sourceKey: string): string {
  // Neural voices use "neural" engine, standard use "standard"
  // Most Polly voices in our catalog are neural
  if (sourceKey.includes('standard')) return 'standard';
  return 'neural';
}

/**
 * Create an AWS Polly adapter.
 *
 * NOTE: AWS Polly requires SigV4 authentication which is complex in-browser.
 * This adapter uses the Vokda proxy API to forward synthesis requests.
 * The user's AWS credentials are sent to the proxy, which signs the request.
 */
export function createAwsPollyAdapter(credential: AwsCredentials): SynthesisAdapter {
  return {
    id: 'aws-polly',
    canHandle: (variant) => variant.sourceKey.startsWith('aws-polly:'),
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const start = Date.now();
      const voiceId = extractVoiceId(request.variant.sourceKey);
      const engine = resolveEngine(request.variant.sourceKey);

      // AWS Polly requires SigV4 — use proxy
      const proxyUrl = (import.meta.env.PUBLIC_SYNTH_GATEWAY_URL as string) || 'http://127.0.0.1:8787';

      const response = await fetch(`${proxyUrl}/v1/synthesize/aws-polly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          engine,
          text: request.input,
          textType: request.mode === 'ssml' ? 'ssml' : 'text',
          outputFormat: 'mp3',
          credentials: {
            accessKeyId: credential.accessKeyId,
            secretAccessKey: credential.secretAccessKey,
            region: credential.region,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AWS Polly TTS failed (${response.status}): ${error}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      return {
        provider: 'AWS Polly',
        adapter: 'aws-polly',
        variantId: request.variant.id,
        sourceKey: request.variant.sourceKey,
        inputUsed: request.input,
        warnings: ['Synthesis proxied through Vokda API (AWS SigV4 required)'],
        audioUrl,
        latencyMs: Date.now() - start,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}
