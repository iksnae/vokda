import { createMockAdapter } from './mock-base';

export const awsPollyAdapter = createMockAdapter('aws-polly', (variant) =>
  variant.sourceKey.startsWith('aws:polly:')
);
