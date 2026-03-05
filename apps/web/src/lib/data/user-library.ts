import { generateClient } from 'aws-amplify/api';
import { ensureAmplifyConfigured } from '$lib/auth/amplify-client';
import type { CartItem, Collection } from '$lib/types';

type FavoriteRecord = {
  id: string;
  voiceId: string;
  provider?: string | null;
  createdAtIso: string;
};

type CollectionRecord = {
  id: string;
  name: string;
  description?: string | null;
  visibility?: 'private' | 'team' | null;
  createdAtIso: string;
  updatedAtIso: string;
};

type CollectionVoiceRecord = {
  id: string;
  collectionId: string;
  voiceId: string;
  note?: string | null;
  position?: number | null;
  addedAtIso: string;
};

type CartItemRecord = {
  id: string;
  voiceId: string;
  variantId: string;
  createdAtIso: string;
};

const listFavoritesQuery = /* GraphQL */ `
  query ListFavorites($limit: Int, $nextToken: String) {
    listFavorites(limit: $limit, nextToken: $nextToken) {
      items {
        id
        voiceId
        provider
        createdAtIso
      }
      nextToken
    }
  }
`;

const listCollectionsQuery = /* GraphQL */ `
  query ListCollections($limit: Int, $nextToken: String) {
    listCollections(limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        description
        visibility
        createdAtIso
        updatedAtIso
      }
      nextToken
    }
  }
`;

const listCollectionVoicesQuery = /* GraphQL */ `
  query ListCollectionVoices($limit: Int, $nextToken: String) {
    listCollectionVoices(limit: $limit, nextToken: $nextToken) {
      items {
        id
        collectionId
        voiceId
        note
        position
        addedAtIso
      }
      nextToken
    }
  }
`;

const listCartItemsQuery = /* GraphQL */ `
  query ListCartItems($limit: Int, $nextToken: String) {
    listCartItems(limit: $limit, nextToken: $nextToken) {
      items {
        id
        voiceId
        variantId
        createdAtIso
      }
      nextToken
    }
  }
`;

const listFavoritesByVoiceQuery = /* GraphQL */ `
  query ListFavorites($filter: ModelFavoriteFilterInput, $limit: Int) {
    listFavorites(filter: $filter, limit: $limit) {
      items {
        id
        voiceId
      }
    }
  }
`;

const listCartItemsByVariantQuery = /* GraphQL */ `
  query ListCartItems($filter: ModelCartItemFilterInput, $limit: Int) {
    listCartItems(filter: $filter, limit: $limit) {
      items {
        id
      }
    }
  }
`;

const listCollectionVoicesByKeyQuery = /* GraphQL */ `
  query ListCollectionVoices($filter: ModelCollectionVoiceFilterInput, $limit: Int) {
    listCollectionVoices(filter: $filter, limit: $limit) {
      items {
        id
        note
      }
    }
  }
`;

const createFavoriteMutation = /* GraphQL */ `
  mutation CreateFavorite($input: CreateFavoriteInput!) {
    createFavorite(input: $input) {
      id
    }
  }
`;

const deleteFavoriteMutation = /* GraphQL */ `
  mutation DeleteFavorite($input: DeleteFavoriteInput!) {
    deleteFavorite(input: $input) {
      id
    }
  }
`;

const createCollectionMutation = /* GraphQL */ `
  mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
      id
    }
  }
`;

const updateCollectionMutation = /* GraphQL */ `
  mutation UpdateCollection($input: UpdateCollectionInput!) {
    updateCollection(input: $input) {
      id
    }
  }
`;

const deleteCollectionMutation = /* GraphQL */ `
  mutation DeleteCollection($input: DeleteCollectionInput!) {
    deleteCollection(input: $input) {
      id
    }
  }
`;

const createCollectionVoiceMutation = /* GraphQL */ `
  mutation CreateCollectionVoice($input: CreateCollectionVoiceInput!) {
    createCollectionVoice(input: $input) {
      id
    }
  }
`;

const updateCollectionVoiceMutation = /* GraphQL */ `
  mutation UpdateCollectionVoice($input: UpdateCollectionVoiceInput!) {
    updateCollectionVoice(input: $input) {
      id
    }
  }
`;

const deleteCollectionVoiceMutation = /* GraphQL */ `
  mutation DeleteCollectionVoice($input: DeleteCollectionVoiceInput!) {
    deleteCollectionVoice(input: $input) {
      id
    }
  }
`;

const createCartItemMutation = /* GraphQL */ `
  mutation CreateCartItem($input: CreateCartItemInput!) {
    createCartItem(input: $input) {
      id
    }
  }
`;

const deleteCartItemMutation = /* GraphQL */ `
  mutation DeleteCartItem($input: DeleteCartItemInput!) {
    deleteCartItem(input: $input) {
      id
    }
  }
`;

function client() {
  ensureAmplifyConfigured();
  return generateClient();
}

type PagedResponse<T> = {
  items?: Array<T | null> | null;
  nextToken?: string | null;
};

async function listAll<T>(
  query: string,
  dataKey: string
): Promise<T[]> {
  const gqlClient = client();
  const output: T[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const response = (await gqlClient.graphql({
      query,
      variables: { limit: 200, nextToken }
    })) as {
      data?: Record<string, PagedResponse<T>>;
    };

    const page = response.data?.[dataKey];
    const items = (page?.items ?? []).filter((item): item is T => Boolean(item));
    output.push(...items);
    nextToken = page?.nextToken;
  } while (nextToken);

  return output;
}

export async function fetchLibraryState(): Promise<{
  favorites: string[];
  collections: Collection[];
  cart: CartItem[];
}> {
  const [favoritesRaw, collectionsRaw, collectionVoicesRaw, cartRaw] = await Promise.all([
    listAll<FavoriteRecord>(listFavoritesQuery, 'listFavorites'),
    listAll<CollectionRecord>(listCollectionsQuery, 'listCollections'),
    listAll<CollectionVoiceRecord>(listCollectionVoicesQuery, 'listCollectionVoices'),
    listAll<CartItemRecord>(listCartItemsQuery, 'listCartItems')
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

  const cart: CartItem[] = cartRaw
    .map((item) => ({
      voiceId: item.voiceId,
      variantId: item.variantId,
      addedAt: item.createdAtIso
    }))
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));

  const favorites = favoritesRaw
    .sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso))
    .map((entry) => entry.voiceId);

  return {
    favorites,
    collections,
    cart
  };
}

export async function saveFavorite(voiceId: string) {
  const gqlClient = client();
  const existing = (await gqlClient.graphql({
    query: listFavoritesByVoiceQuery,
    variables: {
      limit: 1,
      filter: { voiceId: { eq: voiceId } }
    }
  })) as {
    data?: { listFavorites?: { items?: Array<{ id: string } | null> | null } };
  };

  const already = existing.data?.listFavorites?.items?.some(Boolean);
  if (already) return;

  await gqlClient.graphql({
    query: createFavoriteMutation,
    variables: {
      input: {
        voiceId,
        createdAtIso: new Date().toISOString()
      }
    }
  });
}

export async function removeFavorite(voiceId: string) {
  const gqlClient = client();
  const existing = (await gqlClient.graphql({
    query: listFavoritesByVoiceQuery,
    variables: {
      limit: 50,
      filter: { voiceId: { eq: voiceId } }
    }
  })) as {
    data?: { listFavorites?: { items?: Array<{ id: string } | null> | null } };
  };

  const items = (existing.data?.listFavorites?.items ?? []).filter(
    (item): item is { id: string } => Boolean(item)
  );

  await Promise.all(
    items.map((item) =>
      gqlClient.graphql({
        query: deleteFavoriteMutation,
        variables: {
          input: { id: item.id }
        }
      })
    )
  );
}

export async function saveCartItem(voiceId: string, variantId: string) {
  const gqlClient = client();
  const existing = (await gqlClient.graphql({
    query: listCartItemsByVariantQuery,
    variables: {
      limit: 1,
      filter: {
        and: [{ voiceId: { eq: voiceId } }, { variantId: { eq: variantId } }]
      }
    }
  })) as {
    data?: { listCartItems?: { items?: Array<{ id: string } | null> | null } };
  };

  const already = existing.data?.listCartItems?.items?.some(Boolean);
  if (already) return;

  await gqlClient.graphql({
    query: createCartItemMutation,
    variables: {
      input: {
        voiceId,
        variantId,
        createdAtIso: new Date().toISOString()
      }
    }
  });
}

export async function removeCartItem(voiceId: string, variantId: string) {
  const gqlClient = client();
  const existing = (await gqlClient.graphql({
    query: listCartItemsByVariantQuery,
    variables: {
      limit: 50,
      filter: {
        and: [{ voiceId: { eq: voiceId } }, { variantId: { eq: variantId } }]
      }
    }
  })) as {
    data?: { listCartItems?: { items?: Array<{ id: string } | null> | null } };
  };

  const items = (existing.data?.listCartItems?.items ?? []).filter(
    (item): item is { id: string } => Boolean(item)
  );

  await Promise.all(
    items.map((item) =>
      gqlClient.graphql({
        query: deleteCartItemMutation,
        variables: {
          input: { id: item.id }
        }
      })
    )
  );
}

export async function clearRemoteCart() {
  const gqlClient = client();
  const all = await listAll<CartItemRecord>(listCartItemsQuery, 'listCartItems');

  await Promise.all(
    all.map((item) =>
      gqlClient.graphql({
        query: deleteCartItemMutation,
        variables: {
          input: { id: item.id }
        }
      })
    )
  );
}

export async function saveCollection(collection: Collection) {
  const gqlClient = client();

  await gqlClient.graphql({
    query: createCollectionMutation,
    variables: {
      input: {
        id: collection.id,
        name: collection.name,
        visibility: 'private',
        createdAtIso: collection.createdAt,
        updatedAtIso: new Date().toISOString()
      }
    }
  });
}

export async function removeCollection(collectionId: string) {
  const gqlClient = client();

  const links = (await gqlClient.graphql({
    query: listCollectionVoicesByKeyQuery,
    variables: {
      limit: 200,
      filter: { collectionId: { eq: collectionId } }
    }
  })) as {
    data?: { listCollectionVoices?: { items?: Array<{ id: string } | null> | null } };
  };

  const linkedItems = (links.data?.listCollectionVoices?.items ?? []).filter(
    (item): item is { id: string } => Boolean(item)
  );

  await Promise.all(
    linkedItems.map((item) =>
      gqlClient.graphql({
        query: deleteCollectionVoiceMutation,
        variables: {
          input: { id: item.id }
        }
      })
    )
  );

  await gqlClient.graphql({
    query: deleteCollectionMutation,
    variables: {
      input: { id: collectionId }
    }
  });
}

async function touchCollection(collectionId: string) {
  const gqlClient = client();
  await gqlClient.graphql({
    query: updateCollectionMutation,
    variables: {
      input: {
        id: collectionId,
        updatedAtIso: new Date().toISOString()
      }
    }
  });
}

export async function addCollectionVoice(collectionId: string, voiceId: string) {
  const gqlClient = client();

  const existing = (await gqlClient.graphql({
    query: listCollectionVoicesByKeyQuery,
    variables: {
      limit: 1,
      filter: {
        and: [{ collectionId: { eq: collectionId } }, { voiceId: { eq: voiceId } }]
      }
    }
  })) as {
    data?: { listCollectionVoices?: { items?: Array<{ id: string } | null> | null } };
  };

  const already = existing.data?.listCollectionVoices?.items?.some(Boolean);
  if (already) return;

  const existingEntries = (await gqlClient.graphql({
    query: listCollectionVoicesByKeyQuery,
    variables: {
      limit: 200,
      filter: { collectionId: { eq: collectionId } }
    }
  })) as {
    data?: { listCollectionVoices?: { items?: Array<{ id: string } | null> | null } };
  };

  const position = (existingEntries.data?.listCollectionVoices?.items ?? []).filter(Boolean).length;

  await gqlClient.graphql({
    query: createCollectionVoiceMutation,
    variables: {
      input: {
        collectionId,
        voiceId,
        position,
        addedAtIso: new Date().toISOString()
      }
    }
  });

  await touchCollection(collectionId);
}

export async function removeCollectionVoice(collectionId: string, voiceId: string) {
  const gqlClient = client();

  const existing = (await gqlClient.graphql({
    query: listCollectionVoicesByKeyQuery,
    variables: {
      limit: 50,
      filter: {
        and: [{ collectionId: { eq: collectionId } }, { voiceId: { eq: voiceId } }]
      }
    }
  })) as {
    data?: { listCollectionVoices?: { items?: Array<{ id: string } | null> | null } };
  };

  const entries = (existing.data?.listCollectionVoices?.items ?? []).filter(
    (item): item is { id: string } => Boolean(item)
  );

  await Promise.all(
    entries.map((item) =>
      gqlClient.graphql({
        query: deleteCollectionVoiceMutation,
        variables: {
          input: { id: item.id }
        }
      })
    )
  );

  await touchCollection(collectionId);
}

export async function updateCollectionVoiceNote(collectionId: string, voiceId: string, note: string) {
  const gqlClient = client();

  const existing = (await gqlClient.graphql({
    query: listCollectionVoicesByKeyQuery,
    variables: {
      limit: 1,
      filter: {
        and: [{ collectionId: { eq: collectionId } }, { voiceId: { eq: voiceId } }]
      }
    }
  })) as {
    data?: { listCollectionVoices?: { items?: Array<{ id: string; note?: string | null } | null> | null } };
  };

  const entry = (existing.data?.listCollectionVoices?.items ?? []).find(Boolean) as
    | { id: string; note?: string | null }
    | undefined;

  if (!entry) return;

  await gqlClient.graphql({
    query: updateCollectionVoiceMutation,
    variables: {
      input: {
        id: entry.id,
        note
      }
    }
  });

  await touchCollection(collectionId);
}
