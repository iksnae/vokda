import { createMockAdapter } from './mock-base';

export const elevenLabsAdapter = createMockAdapter('elevenlabs', (variant) =>
  variant.sourceKey.startsWith('elevenlabs:tts:')
);
