import { createMockAdapter } from './mock-base';

export const gcpTtsAdapter = createMockAdapter('gcp-tts', (variant) =>
  variant.sourceKey.startsWith('gcp:tts:')
);
