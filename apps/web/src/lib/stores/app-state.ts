import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { CartItem, Collection, ProviderDefinition, Voice, VoicePack } from '$lib/types';
import { AUTH_MODE } from '$lib/auth/config';
import { auth, getAuthSnapshot } from '$lib/auth/store';
import { DEFAULT_PROVIDERS, normalizeProviderId } from '$lib/providers';
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
import { fetchCurationWorkspace, saveCurationWorkspace } from '$lib/data/curation-workspace';
import type { VoiceMetadataPatch } from '$lib/voice-catalog';

type AppState = {
  cart: CartItem[];
  collections: Collection[];
  favorites: string[];
  customVoices: Voice[];
  metadataOverrides: Record<string, VoiceMetadataPatch>;
  providerCatalog: ProviderDefinition[];
};

const STORAGE_PREFIX = 'vokda.app.state.v2';

const defaultState: AppState = {
  cart: [],
  collections: [],
  favorites: [],
  customVoices: [],
  metadataOverrides: {},
  providerCatalog: DEFAULT_PROVIDERS
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
      metadataOverrides: parsed.metadataOverrides ?? {},
      providerCatalog: parsed.providerCatalog ?? DEFAULT_PROVIDERS
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

function curationWriteEnabled(): boolean {
  if (!browser || AUTH_MODE !== 'amplify') return false;
  const roles = getAuthSnapshot().user?.roles ?? [];
  return roles.includes('curator') || roles.includes('admin');
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

async function hydrateCurationState() {
  if (!browser || AUTH_MODE !== 'amplify') return;

  try {
    const curation = await fetchCurationWorkspace();
    appState.update((state) => ({
      ...state,
      metadataOverrides: curation.metadataOverrides,
      customVoices: curation.customVoices,
      providerCatalog: curation.providerCatalog
    }));
  } catch (error) {
    reportSyncError('hydrateCuration', error);
  }
}

function getAppStateSnapshot(): AppState {
  let snapshot = defaultState;

  appState.subscribe((value) => {
    snapshot = value;
  })();

  return snapshot;
}

let curationSyncTimer: ReturnType<typeof setTimeout> | null = null;

function queueCurationSync() {
  if (!curationWriteEnabled()) return;

  if (curationSyncTimer) {
    clearTimeout(curationSyncTimer);
  }

  curationSyncTimer = setTimeout(() => {
    const snapshot = getAppStateSnapshot();
    void saveCurationWorkspace({
      metadataOverrides: snapshot.metadataOverrides,
      customVoices: snapshot.customVoices,
      providerCatalog: snapshot.providerCatalog
    }).catch((error) => {
      reportSyncError('saveCurationWorkspace', error);
      void hydrateCurationState();
    });
  }, 250);
}

let activeActorKey = 'visitor';
const appState = writable<AppState>(loadState(activeActorKey));

if (browser) {
  if (AUTH_MODE === 'amplify') {
    void hydrateCurationState();
  }

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

    if (AUTH_MODE === 'amplify') {
      void hydrateCurationState();
    }
  });
}

export const cartItems = derived(appState, ($state) => $state.cart);
export const collections = derived(appState, ($state) => $state.collections);
export const favorites = derived(appState, ($state) => $state.favorites);
export const customVoices = derived(appState, ($state) => $state.customVoices);
export const metadataOverrides = derived(appState, ($state) => $state.metadataOverrides);
export const providerCatalog = derived(appState, ($state) => $state.providerCatalog);
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

  queueCurationSync();
}

export function addCustomVoice(voice: Voice) {
  appState.update((state) => {
    if (state.customVoices.some((entry) => entry.id === voice.id)) return state;
    return {
      ...state,
      customVoices: [...state.customVoices, voice]
    };
  });

  queueCurationSync();
}

export function addProvider(definition: Omit<ProviderDefinition, 'id'> & { id?: string }): boolean {
  const roles = getAuthSnapshot().user?.roles ?? [];
  if (!roles.includes('admin')) return false;

  const normalizedId = normalizeProviderId(definition.id ?? definition.name);
  if (!normalizedId) return false;

  let added = false;

  appState.update((state) => {
    if (state.providerCatalog.some((provider) => provider.id === normalizedId)) return state;
    added = true;

    return {
      ...state,
      providerCatalog: [
        ...state.providerCatalog,
        {
          id: normalizedId,
          name: definition.name.trim(),
          type: definition.type,
          websiteUrl: definition.websiteUrl?.trim() || undefined,
          createdBy: 'admin',
          createdAt: new Date().toISOString()
        }
      ]
    };
  });

  if (added) {
    queueCurationSync();
  }

  return added;
}

export function updateProvider(
  providerId: string,
  patch: {
    name: string;
    type: ProviderDefinition['type'];
    websiteUrl?: string;
  }
): boolean {
  const roles = getAuthSnapshot().user?.roles ?? [];
  if (!roles.includes('admin')) return false;

  const targetId = normalizeProviderId(providerId);
  if (!targetId || !patch.name.trim()) return false;

  let updated = false;

  appState.update((state) => {
    const nextProviders = state.providerCatalog.map((provider) => {
      if (provider.id !== targetId) return provider;
      updated = true;
      return {
        ...provider,
        name: patch.name.trim(),
        type: patch.type,
        websiteUrl: patch.websiteUrl?.trim() || undefined
      };
    });

    if (!updated) return state;
    return { ...state, providerCatalog: nextProviders };
  });

  if (updated) {
    queueCurationSync();
  }

  return updated;
}

export function removeProvider(providerId: string): boolean {
  const roles = getAuthSnapshot().user?.roles ?? [];
  if (!roles.includes('admin')) return false;

  const targetId = normalizeProviderId(providerId);
  if (!targetId) return false;

  let removed = false;

  appState.update((state) => {
    if (state.providerCatalog.length <= 1) return state;

    const nextProviders = state.providerCatalog.filter((provider) => provider.id !== targetId);
    if (nextProviders.length === state.providerCatalog.length) return state;

    removed = true;
    return { ...state, providerCatalog: nextProviders };
  });

  if (removed) {
    queueCurationSync();
  }

  return removed;
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

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTimeCrockford(time: number): string {
  let value = time;
  let output = '';

  for (let i = 0; i < 10; i += 1) {
    output = CROCKFORD[value % 32] + output;
    value = Math.floor(value / 32);
  }

  return output;
}

function randomCrockford(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => CROCKFORD[byte % 32])
    .join('');
}

function generateVoiceProfileId(): string {
  return `vp_${encodeTimeCrockford(Date.now())}${randomCrockford(16)}`;
}

function deriveProviderVoiceId(sourceKey: string): string {
  const parts = sourceKey.split(':').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? sourceKey;
}

function normalizeProvider(provider: string): string {
  return normalizeProviderId(provider);
}

export function buildVoicePack(voices: Voice[], items: CartItem[]): VoicePack {
  const selected = items
    .map((item) => {
      const voice = voices.find((entry) => entry.id === item.voiceId);
      if (!voice) return null;

      const variant = voice.variants.find((entry) => entry.id === item.variantId);
      if (!variant) return null;

      return { item, voice, variant };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const profileByKey = new Map<
    string,
    {
      id: string;
      name: string;
      description?: string;
      language: string;
      gender?: string;
      ageRange?: string;
      tone?: string;
      accent?: string;
      personalityTags?: string[];
      emotionalRange?: string[];
      voiceQuality?: string;
      previewUrl?: string;
      recommendedFor?: string[];
      sampleCount: number;
      provider?: string;
      providerVoiceId?: string;
      seed?: boolean;
      createdAt: string;
      updatedAt: string;
    }
  >();

  const entries = selected.map(({ voice, variant }) => {
    const provider = normalizeProvider(voice.providerId ?? voice.provider);
    const providerVoiceId = voice.providerVoiceId ?? deriveProviderVoiceId(variant.sourceKey);
    const language = voice.languages[0] ?? 'en-US';
    const profileKey = `${provider}::${providerVoiceId}::${language}`;

    if (!profileByKey.has(profileKey)) {
      const now = new Date().toISOString();

      profileByKey.set(profileKey, {
        id: generateVoiceProfileId(),
        name: voice.name,
        description: voice.description,
        language,
        gender: voice.metadata.genderPresentation,
        ageRange: voice.metadata.agePresentation,
        tone: voice.metadata.speakingStyle,
        accent: voice.metadata.accent,
        personalityTags: voice.metadata.machineTags,
        emotionalRange: voice.metadata.toneTags,
        voiceQuality: voice.qualityTier,
        previewUrl: voice.samples.find((sample) => Boolean(sample.audioUrl))?.audioUrl,
        recommendedFor: voice.metadata.useCases,
        sampleCount: voice.samples.length,
        provider,
        providerVoiceId,
        seed: !voice.id.startsWith('custom-'),
        createdAt: now,
        updatedAt: now
      });
    }

    const profile = profileByKey.get(profileKey);
    if (!profile) {
      throw new Error('Failed to build voice profile map.');
    }

    return {
      voiceId: voice.id,
      voiceName: voice.name,
      variantId: variant.id,
      sourceType: variant.sourceType,
      sourceKey: variant.sourceKey,
      runnable: variant.runnable,
      supportsSsml: variant.supportsSsml,
      outputFormats: variant.outputFormats,
      licenseNotes: voice.licenseNotes,
      voiceProfileId: profile.id
    };
  });

  const voiceProfiles = Array.from(profileByKey.values());

  return {
    version: '1.1.0',
    createdAt: new Date().toISOString(),
    format: 'vokda.voice-catalog.v1',
    voiceProfiles,
    catalogHints: {
      castingHints: entries.map((entry) => ({
        voiceProfileId: entry.voiceProfileId,
        voiceProfileName: entry.voiceName,
        manualOverride: true
      }))
    },
    items: entries.map(({ voiceProfileId, ...entry }) => entry)
  };
}
