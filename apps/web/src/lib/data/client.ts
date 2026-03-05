import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { ensureAmplifyConfigured } from '$lib/auth/amplify-client';

let cachedClient: ReturnType<typeof generateClient<Schema>> | null = null;

export function dataClient() {
  ensureAmplifyConfigured();

  if (!cachedClient) {
    cachedClient = generateClient<Schema>();
  }

  return cachedClient;
}
