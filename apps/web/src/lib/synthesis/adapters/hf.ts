import { createMockAdapter } from './mock-base';

export const huggingFaceAdapter = createMockAdapter('huggingface', (variant) =>
  variant.sourceKey.startsWith('hf:')
);
