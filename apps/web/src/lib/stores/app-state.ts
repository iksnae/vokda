import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { Collection, CurationShelf, ProviderDefinition, Voice, VoicePack } from '$lib/types';
import { AUTH_MODE } from '$lib/auth/config';
import { auth, getAuthSnapshot } from '$lib/auth/store';
import { DEFAULT_PROVIDERS, normalizeProviderId } from '$lib/providers';
import {
  addCollectionVoice,
  fetchLibraryState,
  removeCollection,
  removeCollectionVoice,
  removeFavorite,
  renameCollection as renameCollectionRemote,
  reorderCollectionVoices as reorderCollectionVoicesRemote,
  saveCollection,
  saveFavorite,
  updateCollectionVoiceNote as updateCollectionVoiceNoteRemote
} from '$lib/data/user-library';
import {
  deleteShelf as deleteShelfRemote,
  fetchCurationWorkspace,
  fetchShelves,
  saveCurationWorkspace,
  saveShelf as saveShelfRemote
} from '$lib/data/curation-workspace';
import { logAuditEvent } from '$lib/data/audit';
import type { VoiceMetadataPatch } from '$lib/voice-catalog';

type AppState = {
  collections: Collection[];
  favorites: string[];
  customVoices: Voice[];
  metadataOverrides: Record<string, VoiceMetadataPatch>;
  providerCatalog: ProviderDefinition[];
  shelves: CurationShelf[];
};

const STORAGE_PREFIX = 'vokda.app.state.v2';

const defaultState: AppState = {
  collections: [],
  favorites: [],
  customVoices: [],
  metadataOverrides: {},
  providerCatalog: DEFAULT_PROVIDERS,
  shelves: []
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
      collections: parsed.collections ?? [],
      favorites: parsed.favorites ?? [],
      customVoices: parsed.customVoices ?? [],
      metadataOverrides: parsed.metadataOverrides ?? {},
      providerCatalog: parsed.providerCatalog ?? DEFAULT_PROVIDERS,
      shelves: parsed.shelves ?? []
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
      collections: cloud.collections
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

async function hydrateShelves() {
  if (!browser || AUTH_MODE !== 'amplify') return;

  try {
    const shelves = await fetchShelves();
    appState.update((state) => ({ ...state, shelves }));
  } catch (error) {
    reportSyncError('hydrateShelves', error);
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
    void hydrateShelves();
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
      void hydrateShelves();
    }
  });
}

export const collections = derived(appState, ($state) => $state.collections);
export const favorites = derived(appState, ($state) => $state.favorites);
export const customVoices = derived(appState, ($state) => $state.customVoices);
export const metadataOverrides = derived(appState, ($state) => $state.metadataOverrides);
export const providerCatalog = derived(appState, ($state) => $state.providerCatalog);
export const shelves = derived(appState, ($state) => $state.shelves);
export const favoritesCount = derived(favorites, ($favorites) => $favorites.length);

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
    if (cloudEnabled()) {
      void logAuditEvent('provider.create', 'provider', normalizedId, { name: definition.name });
    }
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
    if (cloudEnabled()) {
      void logAuditEvent('provider.update', 'provider', targetId, { name: patch.name });
    }
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
    if (cloudEnabled()) {
      void logAuditEvent('provider.delete', 'provider', targetId);
    }
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

export function renameCollection(collectionId: string, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed) return;

  appState.update((state) => ({
    ...state,
    collections: state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      return { ...collection, name: trimmed };
    })
  }));

  if (!cloudEnabled()) return;

  void renameCollectionRemote(collectionId, trimmed).catch((error) => {
    reportSyncError('renameCollection', error);
    void hydrateCloudState();
  });
}

export function reorderCollectionVoices(collectionId: string, voiceIds: string[]) {
  appState.update((state) => ({
    ...state,
    collections: state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      return { ...collection, voiceIds };
    })
  }));

  if (!cloudEnabled()) return;

  void reorderCollectionVoicesRemote(collectionId, voiceIds).catch((error) => {
    reportSyncError('reorderCollectionVoices', error);
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

// ─── Curation shelves ───

function slugifyShelfKey(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || crypto.randomUUID();
}

export function createShelf(title: string, voiceIds: string[] = []) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const shelf: CurationShelf = {
    id: crypto.randomUUID(),
    key: slugifyShelfKey(trimmed),
    title: trimmed,
    description: '',
    voiceIds: [...voiceIds],
    published: false,
    updatedAt: new Date().toISOString()
  };

  appState.update((state) => ({
    ...state,
    shelves: [...state.shelves, shelf]
  }));

  if (!curationWriteEnabled()) return;

  // saveShelf does not return the server-assigned id, so reconcile by
  // refetching after the create succeeds.
  void saveShelfRemote(shelf)
    .then(() => hydrateShelves())
    .catch((error) => {
      reportSyncError('createShelf', error);
      void hydrateShelves();
    });
}

export function updateShelf(
  shelfId: string,
  patch: Partial<Pick<CurationShelf, 'title' | 'description' | 'voiceIds' | 'published'>>
) {
  let next: CurationShelf | null = null;

  appState.update((state) => ({
    ...state,
    shelves: state.shelves.map((shelf) => {
      if (shelf.id !== shelfId) return shelf;

      const title = patch.title !== undefined ? patch.title.trim() || shelf.title : shelf.title;
      next = {
        ...shelf,
        title,
        description: patch.description ?? shelf.description,
        voiceIds: patch.voiceIds ?? shelf.voiceIds,
        published: patch.published ?? shelf.published,
        updatedAt: new Date().toISOString()
      };
      return next;
    })
  }));

  if (!next || !curationWriteEnabled()) return;

  void saveShelfRemote(next).catch((error) => {
    reportSyncError('updateShelf', error);
    void hydrateShelves();
  });
}

export function deleteShelf(shelfId: string) {
  appState.update((state) => ({
    ...state,
    shelves: state.shelves.filter((shelf) => shelf.id !== shelfId)
  }));

  if (!curationWriteEnabled()) return;

  void deleteShelfRemote(shelfId).catch((error) => {
    reportSyncError('deleteShelf', error);
    void hydrateShelves();
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

export function buildVoicePack(
  collectionName: string,
  voices: Voice[],
  voiceIds: string[]
): VoicePack {
  const selected = voiceIds
    .map((id) => voices.find((entry) => entry.id === id))
    .filter((entry): entry is Voice => Boolean(entry));

  const now = new Date().toISOString();

  const voiceProfiles = selected.map((voice) => {
    const variant = voice.variants[0];
    const provider = normalizeProvider(voice.providerId ?? voice.provider);
    const providerVoiceId =
      voice.providerVoiceId ?? (variant ? deriveProviderVoiceId(variant.sourceKey) : voice.name);

    return {
      id: generateVoiceProfileId(),
      name: voice.name,
      description: voice.description,
      language: voice.languages[0] ?? 'en-US',
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
    };
  });

  return {
    version: '2.0.0',
    createdAt: now,
    collectionName,
    format: 'vokda.voice-collection.v1',
    voiceProfiles,
    catalogHints: {
      castingHints: voiceProfiles.map((profile) => ({
        voiceProfileId: profile.id,
        voiceProfileName: profile.name,
        manualOverride: true
      }))
    }
  };
}
