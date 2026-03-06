/**
 * Clips store — reactive state for user's synthesized audio clips.
 *
 * Backed by IndexedDB (clip-store.ts). Loads on auth change.
 */

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { auth, getAuthSnapshot } from '$lib/auth/store';
import {
  listClips,
  saveClip,
  deleteClip as deleteClipFromDb,
  getClipAudio,
  getStorageUsed,
  type AudioClip,
} from '$lib/data/clip-store';

type ClipState = {
  clips: AudioClip[];
  loading: boolean;
  loaded: boolean;
  storageBytes: number;
};

const clipState = writable<ClipState>({
  clips: [],
  loading: false,
  loaded: false,
  storageBytes: 0,
});

/**
 * Load clips from IndexedDB for the current user.
 */
async function loadClips() {
  if (!browser) return;
  const user = getAuthSnapshot().user;
  if (!user) return;

  clipState.update((s) => ({ ...s, loading: true }));

  try {
    const [clips, storageBytes] = await Promise.all([
      listClips(user.id),
      getStorageUsed(user.id),
    ]);
    clipState.set({ clips, loading: false, loaded: true, storageBytes });
  } catch (err) {
    console.warn('[clips] Failed to load clips:', err);
    clipState.update((s) => ({ ...s, loading: false }));
  }
}

// Auto-load on auth change
if (browser) {
  auth.subscribe(($auth) => {
    if ($auth.isAuthenticated && $auth.user) {
      void loadClips();
    } else {
      clipState.set({ clips: [], loading: false, loaded: false, storageBytes: 0 });
    }
  });
}

/**
 * Save a new clip after synthesis.
 */
export async function addClip(
  metadata: Omit<AudioClip, 'id' | 'userId' | 'createdAt'>,
  audioBlob: Blob
): Promise<AudioClip> {
  const user = getAuthSnapshot().user;
  if (!user) throw new Error('Sign in required to save clips.');

  const clip = await saveClip(user.id, metadata, audioBlob);

  clipState.update((s) => ({
    ...s,
    clips: [clip, ...s.clips],
    storageBytes: s.storageBytes + audioBlob.size,
  }));

  return clip;
}

/**
 * Delete a clip.
 */
export async function removeClip(clipId: string): Promise<void> {
  await deleteClipFromDb(clipId);

  clipState.update((s) => ({
    ...s,
    clips: s.clips.filter((c) => c.id !== clipId),
  }));

  // Recalculate storage in background
  const user = getAuthSnapshot().user;
  if (user) {
    getStorageUsed(user.id)
      .then((bytes) => clipState.update((s) => ({ ...s, storageBytes: bytes })))
      .catch(() => {});
  }
}

/**
 * Get audio blob for playback. Returns an object URL (caller must revoke).
 */
export async function getClipPlaybackUrl(clipId: string): Promise<string | null> {
  const blob = await getClipAudio(clipId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/**
 * Download a clip as a file.
 */
export async function downloadClip(clip: AudioClip): Promise<void> {
  const blob = await getClipAudio(clip.id);
  if (!blob) throw new Error('Audio not found.');

  const safeName = clip.voiceName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
  const filename = `${safeName}-${clip.id}.mp3`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Refresh clips from IndexedDB.
 */
export async function refreshClips(): Promise<void> {
  await loadClips();
}

// ─── Derived stores ───

export const clips = derived(clipState, ($s) => $s.clips);
export const clipsLoading = derived(clipState, ($s) => $s.loading);
export const clipsLoaded = derived(clipState, ($s) => $s.loaded);
export const clipCount = derived(clipState, ($s) => $s.clips.length);
export const storageBytes = derived(clipState, ($s) => $s.storageBytes);
