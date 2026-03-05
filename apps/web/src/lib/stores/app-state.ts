import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { CartItem, Collection, Voice, VoicePack } from '$lib/types';
import { AUTH_MODE } from '$lib/auth/config';
import { auth, getAuthSnapshot } from '$lib/auth/store';
import {
  addCollectionVoice,
  clearRemoteCart,
  fetchLibraryState,
  removeCartItem as removeRemoteCartItem,
  removeCollection,
  removeCollectionVoice,
  removeFavorite,
  saveCartItem,
  saveCollection,
  saveFavorite,
  updateCollectionVoiceNote as updateCollectionVoiceNoteRemote
} from '$lib/data/user-library';
import type { VoiceMetadataPatch } from '$lib/voice-catalog';

type AppState = {
  cart: CartItem[];
  collections: Collection[];
  favorites: string[];
  customVoices: Voice[];
  metadataOverrides: Record<string, VoiceMetadataPatch>;
};

const STORAGE_PREFIX = 'vokda.app.state.v2';

const defaultState: AppState = {
  cart: [],
  collections: [],
  favorites: [],
  customVoices: [],
  metadataOverrides: {}
};

function makeStorageKey(actorKey: string): string {
  return `${STORAGE_PREFIX}.${actorKey}`;
}

function loadState(actorKey: string): AppState {
  if (!browser) return defaultState;

  try {
    const raw = localStorage.getItem(makeStorageKey(actorKey));
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw) as AppState;
    return {
      cart: parsed.cart ?? [],
      collections: parsed.collections ?? [],
      favorites: parsed.favorites ?? [],
      customVoices: parsed.customVoices ?? [],
      metadataOverrides: parsed.metadataOverrides ?? {}
    };
  } catch {
    return defaultState;
  }
}

function cloudEnabled(): boolean {
  if (!browser || AUTH_MODE !== 'amplify') return false;
  const snapshot = getAuthSnapshot();
  return Boolean(snapshot.user);
}

function reportSyncError(operation: string, error: unknown) {
  console.warn(`[vokda:data] ${operation} failed`, error);
}

async function hydrateCloudState() {
  if (!cloudEnabled()) return;

  const snapshot = getAuthSnapshot();
  const actorKey = snapshot.user ? `guest:${snapshot.user.id}` : 'visitor';

  try {
    const cloud = await fetchLibraryState();
    if (actorKey !== activeActorKey) return;

    appState.update((state) => ({
      ...state,
      favorites: cloud.favorites,
      collections: cloud.collections,
      cart: cloud.cart
    }));
  } catch (error) {
    reportSyncError('hydrate', error);
  }
}

let activeActorKey = 'visitor';
const appState = writable<AppState>(loadState(activeActorKey));

if (browser) {
  appState.subscribe((value) => {
    localStorage.setItem(makeStorageKey(activeActorKey), JSON.stringify(value));
  });

  auth.subscribe(($auth) => {
    const nextActorKey = $auth.user ? `guest:${$auth.user.id}` : 'visitor';
    if (nextActorKey === activeActorKey) return;

    activeActorKey = nextActorKey;
    appState.set(loadState(activeActorKey));

    if ($auth.user && AUTH_MODE === 'amplify') {
      void hydrateCloudState();
    }
  });
}

export const cartItems = derived(appState, ($state) => $state.cart);
export const collections = derived(appState, ($state) => $state.collections);
export const favorites = derived(appState, ($state) => $state.favorites);
export const customVoices = derived(appState, ($state) => $state.customVoices);
export const metadataOverrides = derived(appState, ($state) => $state.metadataOverrides);
export const cartCount = derived(cartItems, ($cart) => $cart.length);
export const favoritesCount = derived(favorites, ($favorites) => $favorites.length);

export function addToCart(voiceId: string, variantId: string) {
  let created = false;

  appState.update((state) => {
    const exists = state.cart.some((item) => item.voiceId === voiceId && item.variantId === variantId);
    if (exists) return state;

    created = true;

    return {
      ...state,
      cart: [
        ...state.cart,
        {
          voiceId,
          variantId,
          addedAt: new Date().toISOString()
        }
      ]
    };
  });

  if (!created || !cloudEnabled()) return;

  void saveCartItem(voiceId, variantId).catch((error) => {
    reportSyncError('addToCart', error);
    void hydrateCloudState();
  });
}

export function removeFromCart(voiceId: string, variantId: string) {
  appState.update((state) => ({
    ...state,
    cart: state.cart.filter((item) => !(item.voiceId === voiceId && item.variantId === variantId))
  }));

  if (!cloudEnabled()) return;

  void removeRemoteCartItem(voiceId, variantId).catch((error) => {
    reportSyncError('removeFromCart', error);
    void hydrateCloudState();
  });
}

export function clearCart() {
  appState.update((state) => ({ ...state, cart: [] }));

  if (!cloudEnabled()) return;

  void clearRemoteCart().catch((error) => {
    reportSyncError('clearCart', error);
    void hydrateCloudState();
  });
}

export function toggleFavorite(voiceId: string) {
  let removing = false;

  appState.update((state) => {
    if (state.favorites.includes(voiceId)) {
      removing = true;
      return {
        ...state,
        favorites: state.favorites.filter((id) => id !== voiceId)
      };
    }

    return {
      ...state,
      favorites: [...state.favorites, voiceId]
    };
  });

  if (!cloudEnabled()) return;

  const op = removing ? removeFavorite(voiceId) : saveFavorite(voiceId);
  void op.catch((error) => {
    reportSyncError('toggleFavorite', error);
    void hydrateCloudState();
  });
}

export function isFavoriteVoice(voiceId: string, favoriteIds: string[]): boolean {
  return favoriteIds.includes(voiceId);
}

export function upsertMetadataOverride(voiceId: string, patch: VoiceMetadataPatch) {
  appState.update((state) => ({
    ...state,
    metadataOverrides: {
      ...state.metadataOverrides,
      [voiceId]: {
        ...(state.metadataOverrides[voiceId] ?? {}),
        ...patch
      }
    }
  }));
}

export function addCustomVoice(voice: Voice) {
  appState.update((state) => {
    if (state.customVoices.some((entry) => entry.id === voice.id)) return state;
    return {
      ...state,
      customVoices: [...state.customVoices, voice]
    };
  });
}

export function createCollection(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const collection: Collection = {
    id: crypto.randomUUID(),
    name: trimmed,
    voiceIds: [],
    notesByVoiceId: {},
    createdAt: new Date().toISOString()
  };

  let created = false;

  appState.update((state) => {
    const exists = state.collections.some((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return state;

    created = true;

    return {
      ...state,
      collections: [...state.collections, collection]
    };
  });

  if (!created || !cloudEnabled()) return;

  void saveCollection(collection).catch((error) => {
    reportSyncError('createCollection', error);
    void hydrateCloudState();
  });
}

export function addVoiceToCollection(collectionId: string, voiceId: string) {
  let added = false;

  appState.update((state) => ({
    ...state,
    collections: state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      if (collection.voiceIds.includes(voiceId)) return collection;

      added = true;

      return {
        ...collection,
        voiceIds: [...collection.voiceIds, voiceId]
      };
    })
  }));

  if (!added || !cloudEnabled()) return;

  void addCollectionVoice(collectionId, voiceId).catch((error) => {
    reportSyncError('addVoiceToCollection', error);
    void hydrateCloudState();
  });
}

export function removeVoiceFromCollection(collectionId: string, voiceId: string) {
  appState.update((state) => ({
    ...state,
    collections: state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection;

      const notesByVoiceId = { ...collection.notesByVoiceId };
      delete notesByVoiceId[voiceId];

      return {
        ...collection,
        voiceIds: collection.voiceIds.filter((id) => id !== voiceId),
        notesByVoiceId
      };
    })
  }));

  if (!cloudEnabled()) return;

  void removeCollectionVoice(collectionId, voiceId).catch((error) => {
    reportSyncError('removeVoiceFromCollection', error);
    void hydrateCloudState();
  });
}

export function updateCollectionVoiceNote(collectionId: string, voiceId: string, note: string) {
  appState.update((state) => ({
    ...state,
    collections: state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      if (!collection.voiceIds.includes(voiceId)) return collection;

      return {
        ...collection,
        notesByVoiceId: {
          ...collection.notesByVoiceId,
          [voiceId]: note
        }
      };
    })
  }));

  if (!cloudEnabled()) return;

  void updateCollectionVoiceNoteRemote(collectionId, voiceId, note).catch((error) => {
    reportSyncError('updateCollectionVoiceNote', error);
    void hydrateCloudState();
  });
}

export function deleteCollection(collectionId: string) {
  appState.update((state) => ({
    ...state,
    collections: state.collections.filter((collection) => collection.id !== collectionId)
  }));

  if (!cloudEnabled()) return;

  void removeCollection(collectionId).catch((error) => {
    reportSyncError('deleteCollection', error);
    void hydrateCloudState();
  });
}

export function buildVoicePack(voices: Voice[], items: CartItem[]): VoicePack {
  const entries = items
    .map((item) => {
      const voice = voices.find((entry) => entry.id === item.voiceId);
      if (!voice) return null;

      const variant = voice.variants.find((entry) => entry.id === item.variantId);
      if (!variant) return null;

      return {
        voiceId: voice.id,
        voiceName: voice.name,
        variantId: variant.id,
        sourceType: variant.sourceType,
        sourceKey: variant.sourceKey,
        runnable: variant.runnable,
        supportsSsml: variant.supportsSsml,
        outputFormats: variant.outputFormats,
        licenseNotes: voice.licenseNotes
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    items: entries
  };
}
