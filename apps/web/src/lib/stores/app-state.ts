import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { CartItem, Collection, Voice, VoicePack } from '$lib/types';

type AppState = {
  cart: CartItem[];
  collections: Collection[];
};

const STORAGE_KEY = 'vokda.app.state.v1';

const defaultState: AppState = {
  cart: [],
  collections: []
};

function loadInitialState(): AppState {
  if (!browser) return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw) as AppState;
    return {
      cart: parsed.cart ?? [],
      collections: parsed.collections ?? []
    };
  } catch {
    return defaultState;
  }
}

const appState = writable<AppState>(loadInitialState());

if (browser) {
  appState.subscribe((value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });
}

export const cartItems = derived(appState, ($state) => $state.cart);
export const collections = derived(appState, ($state) => $state.collections);
export const cartCount = derived(cartItems, ($cart) => $cart.length);

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
