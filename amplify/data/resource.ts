import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Favorite: a
    .model({
      voiceId: a.string().required(),
      provider: a.string(),
      createdAtIso: a.string().required()
    })
    .authorization((allow) => [allow.owner()]),

  Collection: a
    .model({
      name: a.string().required(),
      description: a.string(),
      visibility: a.enum(['private', 'team']),
      createdAtIso: a.string().required(),
      updatedAtIso: a.string().required()
    })
    .authorization((allow) => [allow.owner(), allow.groups(['curator', 'admin'])]),

  CollectionVoice: a
    .model({
      collectionId: a.id().required(),
      voiceId: a.string().required(),
      note: a.string(),
      position: a.integer().default(0),
      addedAtIso: a.string().required()
    })
    .authorization((allow) => [allow.owner(), allow.groups(['curator', 'admin'])]),

  CartItem: a
    .model({
      voiceId: a.string().required(),
      variantId: a.string().required(),
      createdAtIso: a.string().required()
    })
    .authorization((allow) => [allow.owner()]),

  CurationShelf: a
    .model({
      key: a.string().required(),
      title: a.string().required(),
      description: a.string(),
      voiceIds: a.string().array().required(),
      published: a.boolean().default(false),
      updatedAtIso: a.string().required()
    })
    .authorization((allow) => [
      allow.groups(['curator', 'admin']),
      allow.publicApiKey().to(['read'])
    ]),

  CurationWorkspace: a
    .model({
      key: a.string().required(),
      metadataOverrides: a.json().required(),
      customVoices: a.json().required(),
      updatedAtIso: a.string().required(),
      published: a.boolean().default(false)
    })
    .authorization((allow) => [allow.groups(['curator', 'admin']), allow.publicApiKey().to(['read'])]),

  AdminAuditEvent: a
    .model({
      action: a.string().required(),
      targetType: a.string().required(),
      targetId: a.string().required(),
      payload: a.json(),
      createdAtIso: a.string().required()
    })
    .authorization((allow) => [allow.groups(['admin'])])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  }
});
