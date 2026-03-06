/**
 * Clips store — reactive state for user's synthesized audio clips.
 *
 * Backed by the Vokda Synthesis API (/v1/jobs).
 */

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { auth, getAuthSnapshot } from '$lib/auth/store';

const API_BASE = (import.meta.env.PUBLIC_SYNTHESIS_API_URL as string | undefined) ?? '';

export type Clip = {
  id: string;
  voiceId: string;
  voiceName: string;
  provider: string;
  inputText: string;
  inputMode: 'text' | 'ssml';
  latencyMs: number;
  durationMs: number;
  fileSizeBytes: number;
  audioUrl: string;
  createdAt: string;
  errorMessage?: string | null;
};

type ClipState = {
  clips: Clip[];
  loading: boolean;
  loaded: boolean;
};

const clipState = writable<ClipState>({
  clips: [],
  loading: false,
  loaded: false,
});

function getAuthHeader(): string {
  const snap = getAuthSnapshot();
  const token = snap.idToken ?? snap.accessToken;
  return token ? `Bearer ${token}` : '';
}

type ApiJob = {
  jobId: string;
  voiceId: string;
  voiceName: string | null;
  provider: string;
  status: string;
  inputText: string;
  inputMode: string;
  audioUrl: string | null;
  fileSizeBytes: number | null;
  durationMs: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  createdAt: string;
};

function apiJobToClip(job: ApiJob): Clip {
  return {
    id: job.jobId,
    voiceId: job.voiceId || '',
    voiceName: job.voiceName || job.provider,
    provider: job.provider,
    inputText: job.inputText,
    inputMode: (job.inputMode as 'text' | 'ssml') || 'text',
    latencyMs: job.latencyMs ?? 0,
    durationMs: job.durationMs ?? 0,
    fileSizeBytes: job.fileSizeBytes ?? 0,
    audioUrl: job.audioUrl ?? '',
    createdAt: job.createdAt,
    errorMessage: job.errorMessage,
  };
}

async function loadClips() {
  if (!browser || !API_BASE) return;
  const header = getAuthHeader();
  if (!header) return;

  clipState.update((s) => ({ ...s, loading: true }));

  try {
    const resp = await fetch(`${API_BASE}/v1/jobs`, {
      headers: { Authorization: header },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = (await resp.json()) as { jobs: ApiJob[] };
    const clips = data.jobs
      .filter((j) => j.status === 'completed' && j.audioUrl)
      .map(apiJobToClip);

    clipState.set({ clips, loading: false, loaded: true });
  } catch (err) {
    console.warn('[clips] Failed to load:', err);
    clipState.update((s) => ({ ...s, loading: false }));
  }
}

// Auto-load on auth change
if (browser) {
  auth.subscribe(($auth) => {
    if ($auth.isAuthenticated && $auth.user) {
      void loadClips();
    } else {
      clipState.set({ clips: [], loading: false, loaded: false });
    }
  });
}

/**
 * Delete a clip (server-side).
 */
export async function removeClip(clipId: string): Promise<void> {
  const header = getAuthHeader();
  if (!header || !API_BASE) throw new Error('Not authenticated');

  const resp = await fetch(`${API_BASE}/v1/jobs/${clipId}`, {
    method: 'DELETE',
    headers: { Authorization: header },
  });
  if (!resp.ok) throw new Error(`Failed to delete clip: HTTP ${resp.status}`);

  clipState.update((s) => ({
    ...s,
    clips: s.clips.filter((c) => c.id !== clipId),
  }));
}

/**
 * Get audio URL for playback.
 */
export function getClipPlaybackUrl(clip: Clip): string | null {
  return clip.audioUrl || null;
}

/**
 * Download a clip as a file.
 */
export async function downloadClip(clip: Clip): Promise<void> {
  if (!clip.audioUrl) throw new Error('No audio URL.');

  const resp = await fetch(clip.audioUrl);
  if (!resp.ok) throw new Error('Failed to download audio.');
  const blob = await resp.blob();

  const safeName = (clip.voiceName || 'clip').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
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
 * Refresh clips from API.
 */
export async function refreshClips(): Promise<void> {
  await loadClips();
}

// ─── Derived stores ───

export const clips = derived(clipState, ($s) => $s.clips);
export const clipsLoading = derived(clipState, ($s) => $s.loading);
export const clipsLoaded = derived(clipState, ($s) => $s.loaded);
export const clipCount = derived(clipState, ($s) => $s.clips.length);
export const totalBytes = derived(clipState, ($s) =>
  $s.clips.reduce((sum, c) => sum + c.fileSizeBytes, 0)
);
