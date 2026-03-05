import type { SynthesisAdapter, SynthesisRequest, SynthesisPreview } from '../types';

export function createMockAdapter(
  id: string,
  canHandle: SynthesisAdapter['canHandle']
): SynthesisAdapter {
  return {
    id,
    canHandle,
    async synthesizePreview(request: SynthesisRequest): Promise<SynthesisPreview> {
      const latencyMs = 180 + Math.floor(Math.random() * 240);
      await new Promise((resolve) => setTimeout(resolve, latencyMs));

      return {
        provider: request.voice.provider,
        adapter: id,
        variantId: request.variant.id,
        sourceKey: request.variant.sourceKey,
        inputUsed: request.input,
        warnings: [],
        latencyMs,
        generatedAt: new Date().toISOString()
      };
    }
  };
}
