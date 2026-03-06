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
      providerCatalog: a.json().required(),
      updatedAtIso: a.string().required(),
      published: a.boolean().default(false)
    })
    .authorization((allow) => [allow.groups(['curator', 'admin']), allow.publicApiKey().to(['read'])]),

  VoiceRecord: a
    .model({
      name: a.string().required(),
      provider: a.string().required(),
      providerId: a.string().required(),
      providerVoiceId: a.string(),
      description: a.string().required(),
      tags: a.string().array().required(),
      languages: a.string().array().required(),
      qualityTier: a.enum(['basic', 'standard', 'premium']),
      licenseNotes: a.string(),
      metadata: a.json().required(),
      modelCard: a.json(),
      imageUrl: a.string(),
      audioUrl: a.string(),
      samples: a.json(),
      variants: a.json(),
      status: a.enum(['draft', 'published', 'archived']),
      createdAtIso: a.string().required(),
      updatedAtIso: a.string().required()
    })
    .authorization((allow) => [
      allow.groups(['curator', 'admin']).to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['read'])
    ]),

  ProviderRecord: a
    .model({
      name: a.string().required(),
      slug: a.string().required(),
      type: a.enum(['cloud_provider', 'open_model', 'self_hosted', 'other']),
      websiteUrl: a.string(),
      description: a.string(),
      colorHex: a.string(),
      voiceCount: a.integer().default(0),
      status: a.enum(['active', 'inactive']),
      createdAtIso: a.string().required(),
      updatedAtIso: a.string().required()
    })
    .authorization((allow) => [
      allow.groups(['curator', 'admin']).to(['create', 'read', 'update', 'delete']),
      allow.publicApiKey().to(['read'])
    ]),

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
