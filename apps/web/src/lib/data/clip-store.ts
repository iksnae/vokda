/**
 * Clip Store — IndexedDB-backed storage for synthesized audio clips.
 *
 * Each clip stores:
 * - Metadata (voice name, provider, input text, timestamps)
 * - Audio blob (the actual mp3/wav data)
 *
 * Uses a single IndexedDB database with one object store.
 * Owner-scoped: clips are keyed by the authenticated user's ID.
 */

export type AudioClip = {
  id: string;
  userId: string;
  voiceId: string;
  voiceName: string;
  provider: string;
  providerId: string;
  inputText: string;
  inputMode: 'text' | 'ssml';
  latencyMs: number;
  durationMs: number;
  adapter: string;
  createdAt: string;
};

type StoredClip = AudioClip & {
  audioBlob: Blob;
};

const DB_NAME = 'vokda-clips';
const DB_VERSION = 1;
const STORE_NAME = 'clips';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateClipId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `clip_${ts}_${rand}`;
}

/**
 * Save a synthesized audio clip to IndexedDB.
 */
export async function saveClip(
  userId: string,
  metadata: Omit<AudioClip, 'id' | 'userId' | 'createdAt'>,
  audioBlob: Blob
): Promise<AudioClip> {
  const db = await openDb();
  const clip: StoredClip = {
    ...metadata,
    id: generateClipId(),
    userId,
    createdAt: new Date().toISOString(),
    audioBlob,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(clip);

    request.onsuccess = () => {
      const { audioBlob: _blob, ...meta } = clip;
      resolve(meta);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * List all clips for a user (metadata only, no blobs).
 * Returns newest-first.
 */
export async function listClips(userId: string): Promise<AudioClip[]> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const rows = (request.result as StoredClip[])
        .map(({ audioBlob: _blob, ...meta }) => meta)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a clip's audio blob for playback or download.
 */
export async function getClipAudio(clipId: string): Promise<Blob | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(clipId);

    request.onsuccess = () => {
      const row = request.result as StoredClip | undefined;
      resolve(row?.audioBlob ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a clip from IndexedDB.
 */
export async function deleteClip(clipId: string): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(clipId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete all clips for a user (e.g., on account cleanup).
 */
export async function deleteAllClips(userId: string): Promise<number> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.openCursor(userId);
    let count = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        count++;
        cursor.continue();
      } else {
        resolve(count);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get total storage used by a user's clips (approximate bytes).
 */
export async function getStorageUsed(userId: string): Promise<number> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => {
      const rows = request.result as StoredClip[];
      const totalBytes = rows.reduce((sum, row) => sum + (row.audioBlob?.size ?? 0), 0);
      resolve(totalBytes);
    };
    request.onerror = () => reject(request.error);
  });
}
