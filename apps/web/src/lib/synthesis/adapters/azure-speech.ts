import { createMockAdapter } from './mock-base';

export const azureSpeechAdapter = createMockAdapter('azure-speech', (variant) =>
  variant.sourceKey.startsWith('azure:speech:')
);
