import { createMockAdapter } from './mock-base';

export const selfHostedAdapter = createMockAdapter('self-hosted', (variant) =>
  variant.sourceKey.startsWith('self:') || variant.sourceType === 'self_hosted'
);
