import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { CartItem, Collection, Voice, VoicePack } from '$lib/types';
import { auth } from '$lib/auth/store';

type AppState = {
  cart: CartItem[];
  collections: Collection[];
  favorites: string[];
};

const STORAGE_PREFIX = 'vokda.app.state.v2';

const defaultState: AppState = {
  cart: [],
  collections: [],
  favorites: []
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
      favorites: parsed.favorites ?? []
    };
  } catch {
    return defaultState;
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
  });
}

export const cartItems = derived(appState, ($state) => $state.cart);
export const collections = derived(appState, ($state) => $state.collections);
export const favorites = derived(appState, ($state) => $state.favorites);
export const cartCount = derived(cartItems, ($cart) => $cart.length);
export const favoritesCount = derived(favorites, ($favorites) => $favorites.length);

export function addToCart(voiceId: string, variantId: string) {
  appState.update((state) => {
    const exists = state.cart.some((item) => item.voiceId === voiceId && item.variantId === variantId);
    if (exists) return state;

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
}

export function removeFromCart(voiceId: string, variantId: string) {
  appState.update((state) => ({
    ...state,
    cart: state.cart.filter((item) => !(item.voiceId === voiceId && item.variantId === variantId))
  }));
}

export function clearCart() {
  appState.update((state) => ({ ...state, cart: [] }));
}

export function toggleFavorite(voiceId: string) {
  appState.update((state) => {
    if (state.favorites.includes(voiceId)) {
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
}

export function isFavoriteVoice(voiceId: string, favoriteIds: string[]): boolean {
  return favoriteIds.includes(voiceId);
}

export function createCollection(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  appState.update((state) => {
    const exists = state.collections.some((collection) => collection.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return state;

    return {
      ...state,
      collections: [
        ...state.collections,
        {
          id: crypto.randomUUID(),
          name: trimmed,
          voiceIds: [],
          notesByVoiceId: {},
          createdAt: new Date().toISOString()
        }
      ]
    };
  });
}

export function addVoiceToCollection(collectionId: string, voiceId: string) {
  appState.update((state) => ({
    ...state,
    collections: state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      if (collection.voiceIds.includes(voiceId)) return collection;

      return {
        ...collection,
        voiceIds: [...collection.voiceIds, voiceId]
      };
    })
  }));
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
}

export function deleteCollection(collectionId: string) {
  appState.update((state) => ({
    ...state,
    collections: state.collections.filter((collection) => collection.id !== collectionId)
  }));
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
