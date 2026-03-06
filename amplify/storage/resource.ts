import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'vokdaAudio',
  access: (allow) => ({
    'catalog/*': [
      allow.guest.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete'])
    ],
    'users/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ]
  })
});
