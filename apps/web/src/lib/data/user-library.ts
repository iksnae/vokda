import type { Collection } from '$lib/types';
import { dataClient } from '$lib/data/client';

type FavoriteRecord = {
  id: string;
  voiceId: string;
  createdAtIso: string;
};

type CollectionRecord = {
  id: string;
  name: string;
  createdAtIso: string;
};

type CollectionVoiceRecord = {
  id: string;
  collectionId: string;
  voiceId: string;
  note?: string | null;
  position?: number | null;
  addedAtIso: string;
};

type ListPage<T> = {
  data: T[];
  nextToken?: string | null;
  errors?: unknown;
};

function assertNoErrors(errors: unknown) {
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error('Amplify data request failed.');
  }
}

async function listAll<T>(
  fetchPage: (nextToken?: string) => Promise<ListPage<T>>
): Promise<T[]> {
  const output: T[] = [];
  let nextToken: string | undefined;

  do {
    const page = await fetchPage(nextToken);
    assertNoErrors(page.errors);
    output.push(...page.data);
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);

  return output;
}

export async function fetchLibraryState(): Promise<{
  favorites: string[];
  collections: Collection[];
}> {
  const client = dataClient();

  const [favoritesRaw, collectionsRaw, collectionVoicesRaw] = await Promise.all([
    listAll<FavoriteRecord>(async (nextToken) => {
      const response = await client.models.Favorite.list({ limit: 200, nextToken });
      return response as ListPage<FavoriteRecord>;
    }),
    listAll<CollectionRecord>(async (nextToken) => {
      const response = await client.models.Collection.list({ limit: 200, nextToken });
      return response as ListPage<CollectionRecord>;
    }),
    listAll<CollectionVoiceRecord>(async (nextToken) => {
      const response = await client.models.CollectionVoice.list({ limit: 200, nextToken });
      return response as ListPage<CollectionVoiceRecord>;
    })
  ]);

  const collectionVoiceMap = new Map<string, CollectionVoiceRecord[]>();
  for (const link of collectionVoicesRaw) {
    const list = collectionVoiceMap.get(link.collectionId) ?? [];
    list.push(link);
    collectionVoiceMap.set(link.collectionId, list);
  }

  const collections: Collection[] = collectionsRaw
    .map((collection) => {
      const links = (collectionVoiceMap.get(collection.id) ?? []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      );

      const notesByVoiceId = Object.fromEntries(
        links
          .filter((link) => typeof link.note === 'string' && link.note.length > 0)
          .map((link) => [link.voiceId, link.note ?? ''])
      );

      return {
        id: collection.id,
        name: collection.name,
        voiceIds: links.map((link) => link.voiceId),
        notesByVoiceId,
        createdAt: collection.createdAtIso
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const favorites = favoritesRaw
    .sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso))
    .map((entry) => entry.voiceId);

  return { favorites, collections };
}

export async function saveFavorite(voiceId: string) {
  const client = dataClient();
  const existing = (await client.models.Favorite.list({
    limit: 1,
    filter: { voiceId: { eq: voiceId } }
  })) as ListPage<FavoriteRecord>;

  assertNoErrors(existing.errors);
  if (existing.data.length > 0) return;

  const created = await client.models.Favorite.create({
    voiceId,
    createdAtIso: new Date().toISOString()
  });
  assertNoErrors(created.errors);
}

export async function removeFavorite(voiceId: string) {
  const client = dataClient();
  const entries = await listAll<FavoriteRecord>(async (nextToken) => {
    const response = await client.models.Favorite.list({
      limit: 200,
      nextToken,
      filter: { voiceId: { eq: voiceId } }
    });
    return response as ListPage<FavoriteRecord>;
  });

  await Promise.all(
    entries
      .filter((entry) => Boolean(entry.id))
      .map(async (entry) => {
        const deleted = await client.models.Favorite.delete({ id: entry.id });
        assertNoErrors(deleted.errors);
      })
  );
}

export async function saveCollection(collection: Collection) {
  const client = dataClient();
  const created = await client.models.Collection.create({
    id: collection.id,
    name: collection.name,
    visibility: 'private',
    createdAtIso: collection.createdAt,
    updatedAtIso: new Date().toISOString()
  });
  assertNoErrors(created.errors);
}

export async function renameCollection(collectionId: string, newName: string) {
  const client = dataClient();
  const updated = await client.models.Collection.update({
    id: collectionId,
    name: newName,
    updatedAtIso: new Date().toISOString()
  });
  assertNoErrors(updated.errors);
}

export async function removeCollection(collectionId: string) {
  const client = dataClient();

  const links = await listAll<CollectionVoiceRecord>(async (nextToken) => {
    const response = await client.models.CollectionVoice.list({
      limit: 200,
      nextToken,
      filter: { collectionId: { eq: collectionId } }
    });
    return response as ListPage<CollectionVoiceRecord>;
  });

  await Promise.all(
    links
      .filter((entry) => Boolean(entry.id))
      .map(async (entry) => {
        const deleted = await client.models.CollectionVoice.delete({ id: entry.id });
        assertNoErrors(deleted.errors);
      })
  );

  const deleted = await client.models.Collection.delete({ id: collectionId });
  assertNoErrors(deleted.errors);
}

async function touchCollection(collectionId: string) {
  const client = dataClient();
  const updated = await client.models.Collection.update({
    id: collectionId,
    updatedAtIso: new Date().toISOString()
  });
  assertNoErrors(updated.errors);
}

export async function addCollectionVoice(collectionId: string, voiceId: string) {
  const client = dataClient();

  const existing = (await client.models.CollectionVoice.list({
    limit: 1,
    filter: {
      and: [{ collectionId: { eq: collectionId } }, { voiceId: { eq: voiceId } }]
    }
  })) as ListPage<CollectionVoiceRecord>;
  assertNoErrors(existing.errors);

  if (existing.data.length > 0) return;

  const existingEntries = await listAll<CollectionVoiceRecord>(async (nextToken) => {
    const response = await client.models.CollectionVoice.list({
      limit: 200,
      nextToken,
      filter: { collectionId: { eq: collectionId } }
    });
    return response as ListPage<CollectionVoiceRecord>;
  });

  const created = await client.models.CollectionVoice.create({
    collectionId,
    voiceId,
    position: existingEntries.length,
    addedAtIso: new Date().toISOString()
  });
  assertNoErrors(created.errors);

  await touchCollection(collectionId);
}

export async function removeCollectionVoice(collectionId: string, voiceId: string) {
  const client = dataClient();

  const entries = await listAll<CollectionVoiceRecord>(async (nextToken) => {
    const response = await client.models.CollectionVoice.list({
      limit: 200,
      nextToken,
      filter: {
        and: [{ collectionId: { eq: collectionId } }, { voiceId: { eq: voiceId } }]
      }
    });
    return response as ListPage<CollectionVoiceRecord>;
  });

  await Promise.all(
    entries
      .filter((entry) => Boolean(entry.id))
      .map(async (entry) => {
        const deleted = await client.models.CollectionVoice.delete({ id: entry.id });
        assertNoErrors(deleted.errors);
      })
  );

  await touchCollection(collectionId);
}

export async function updateCollectionVoiceNote(collectionId: string, voiceId: string, note: string) {
  const client = dataClient();
  const existing = (await client.models.CollectionVoice.list({
    limit: 1,
    filter: {
      and: [{ collectionId: { eq: collectionId } }, { voiceId: { eq: voiceId } }]
    }
  })) as ListPage<CollectionVoiceRecord>;
  assertNoErrors(existing.errors);

  const entry = existing.data.find(Boolean);
  if (!entry?.id) return;

  const updated = await client.models.CollectionVoice.update({
    id: entry.id,
    note
  });
  assertNoErrors(updated.errors);

  await touchCollection(collectionId);
}
