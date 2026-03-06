<script lang="ts">
  import { onDestroy } from 'svelte';
  import { isAuthenticated } from '$lib/auth/store';
  import {
    clips,
    clipsLoading,
    clipCount,
    totalBytes,
    removeClip,
    downloadClip,
    getClipPlaybackUrl,
    refreshClips,
    type Clip,
  } from '$lib/stores/clips';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';

  // ─── Playback state ───
  let playingClipId: string | null = null;
  let audioEl: HTMLAudioElement | null = null;
  let currentTime = 0;
  let duration = 0;

  $: progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function formatTime(s: number): string {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trim() + '…';
  }

  function playClip(clip: Clip) {
    // Stop current playback
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
    }

    // If clicking same clip, just stop
    if (playingClipId === clip.id) {
      playingClipId = null;
      return;
    }

    const url = getClipPlaybackUrl(clip);
    if (!url) {
      addToast('Audio not available.', 'error');
      return;
    }

    playingClipId = clip.id;
    currentTime = 0;
    duration = 0;

    // Set source and play after binding
    requestAnimationFrame(() => {
      if (audioEl) {
        audioEl.src = url;
        void audioEl.play();
      }
    });
  }

  async function handleDownload(clip: Clip) {
    try {
      await downloadClip(clip);
      addToast('Download started.');
    } catch {
      addToast('Download failed.', 'error');
    }
  }

  async function handleDelete(clip: Clip) {
    if (!confirm(`Delete this clip from "${clip.voiceName}"?`)) return;

    if (playingClipId === clip.id) {
      if (audioEl) audioEl.pause();
      playingClipId = null;
    }

    try {
      await removeClip(clip.id);
      addToast('Clip deleted.');
    } catch {
      addToast('Delete failed.', 'error');
    }
  }

  function handleSeek(e: MouseEvent) {
    if (!audioEl || !duration) return;
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = pct * duration;
  }

  onDestroy(() => {
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
    }
  });
</script>

<svelte:head>
  <title>Audio Clips | Vokda</title>
</svelte:head>

<main>
  <header class="page-header">
    <a href="/account" class="back"><Icon name="arrow-left" size={14} /> Account</a>
    <h1>Audio Clips</h1>
    <p class="subtitle">Manage your synthesized voice clips.</p>
  </header>

  {#if !$isAuthenticated}
    <div class="auth-gate">
      <Icon name="user" size={28} />
      <p>Sign in to view your audio clips.</p>
      <a href="/account?intent=signin" class="btn primary">Sign In</a>
    </div>
  {:else}
    <div class="stats-bar">
      <span><strong>{$clipCount}</strong> clip{$clipCount !== 1 ? 's' : ''}</span>
      <span class="storage">{formatBytes($totalBytes)}</span>
      <button class="btn ghost sm" on:click={refreshClips} disabled={$clipsLoading}>
        {$clipsLoading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    {#if $clipsLoading && $clips.length === 0}
      <div class="empty-state">
        <p>Loading clips…</p>
      </div>
    {:else if $clips.length === 0}
      <div class="empty-state">
        <Icon name="waveform" size={32} />
        <p>No clips yet.</p>
        <p class="hint">Use the <strong>Audition</strong> panel on any voice page to synthesize and save clips.</p>
        <a href="/" class="btn primary">Browse Voices</a>
      </div>
    {:else}
      <audio
        bind:this={audioEl}
        on:timeupdate={() => { if (audioEl) currentTime = audioEl.currentTime; }}
        on:loadedmetadata={() => { if (audioEl) duration = audioEl.duration; }}
        on:ended={() => { playingClipId = null; currentTime = 0; }}
        preload="auto"
      ></audio>

      <div class="clip-list">
        {#each $clips as clip (clip.id)}
          {@const isPlaying = playingClipId === clip.id}
          <article class="clip-card" class:playing={isPlaying}>
            <button
              class="play-btn"
              on:click={() => playClip(clip)}
              aria-label={isPlaying ? 'Stop' : 'Play'}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
            </button>

            <div class="clip-info">
              <div class="clip-top-row">
                {#if clip.voiceId}
                  <a class="clip-voice" href="/voices/{clip.voiceId}">{clip.voiceName}</a>
                {:else}
                  <span class="clip-voice">{clip.voiceName}</span>
                {/if}
                <span class="clip-provider">{clip.provider}</span>
                <span class="clip-date">{formatDate(clip.createdAt)}</span>
              </div>

              <p class="clip-text">"{truncateText(clip.inputText, 120)}"</p>

              {#if isPlaying}
                <div class="clip-player">
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div class="clip-progress" on:click={handleSeek}>
                    <div class="clip-progress-fill" style="width:{progressPct}%"></div>
                  </div>
                  <span class="clip-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              {:else}
                <div class="clip-meta">
                  {#if clip.latencyMs > 0}<span>{clip.latencyMs}ms</span><span>·</span>{/if}
                  {#if clip.fileSizeBytes > 0}<span>{formatBytes(clip.fileSizeBytes)}</span>{/if}
                </div>
              {/if}
            </div>

            <div class="clip-actions">
              <button
                class="icon-btn"
                on:click={() => handleDownload(clip)}
                title="Download"
                aria-label="Download clip"
              >
                <Icon name="export" size={16} />
              </button>
              <button
                class="icon-btn danger"
                on:click={() => handleDelete(clip)}
                title="Delete"
                aria-label="Delete clip"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 780px;
    margin: 0 auto;
    padding: 0 1rem 3rem;
  }

  .page-header { margin-bottom: 1rem; }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--brand-600);
    font-size: var(--text-small);
    font-weight: 620;
    text-decoration: none;
    margin-bottom: 0.25rem;
  }
  .back:hover { text-decoration: underline; }

  h1 { margin: 0; font-size: var(--text-display); }

  .subtitle {
    margin: 0.25rem 0 0;
    color: #4a6a82;
    font-size: var(--text-body);
  }

  .auth-gate {
    text-align: center;
    padding: 3rem 1rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 16px;
    background: #f8fbfd;
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: #3e5972;
  }

  .stats-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.85rem;
    border: 1px solid #e4edf3;
    border-radius: 12px;
    background: #f8fbfd;
    font-size: var(--text-small);
    color: #3e5972;
    margin-bottom: 0.75rem;
  }
  .stats-bar strong { color: var(--brand-700); }
  .storage { color: #6a8ea6; margin-left: auto; }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 16px;
    background: #f8fbfd;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #4a6a82;
  }
  .empty-state .hint { font-size: var(--text-small); color: #6a8ea6; }

  .btn {
    border: none;
    border-radius: 10px;
    padding: 0.5rem 0.9rem;
    font-weight: 660;
    font-size: var(--text-small);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: inherit;
    text-decoration: none;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn.primary {
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }
  .btn.ghost {
    background: #f3f7fa;
    color: #2c4b60;
    border: 1px solid #c3d1de;
  }
  .btn.ghost.sm { padding: 0.35rem 0.65rem; }

  .clip-list { display: grid; gap: 0.5rem; }

  .clip-card {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .clip-card:hover { border-color: #b6c8d6; }
  .clip-card.playing {
    border-color: var(--brand-600);
    box-shadow: 0 0 0 1px var(--brand-600), 0 4px 16px rgba(20, 94, 121, 0.12);
  }

  .play-btn {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    border: none;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 0.15rem;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
    transition: transform 100ms;
  }
  .play-btn:hover { transform: scale(1.06); }
  .clip-card.playing .play-btn {
    background: linear-gradient(154deg, #c62828, #b71c1c);
    box-shadow: 0 4px 12px rgba(198, 40, 40, 0.2);
  }

  .clip-info {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.25rem;
  }

  .clip-top-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .clip-voice {
    font-weight: 680;
    font-size: var(--text-body);
    color: var(--brand-700);
    text-decoration: none;
  }
  a.clip-voice:hover { text-decoration: underline; }

  .clip-provider {
    font-size: var(--text-xs);
    font-weight: 660;
    color: #5a7a90;
    background: #eef4f8;
    border-radius: 999px;
    padding: 0.08rem 0.4rem;
  }

  .clip-date {
    font-size: var(--text-xs);
    color: #8a9fb2;
    margin-left: auto;
  }

  .clip-text {
    margin: 0;
    font-size: var(--text-small);
    color: #3e5972;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .clip-meta {
    display: flex;
    gap: 0.3rem;
    font-size: var(--text-xs);
    color: #8a9fb2;
    font-weight: 600;
  }

  .clip-player {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.15rem;
  }

  .clip-progress {
    flex: 1;
    height: 5px;
    background: #d5e0e9;
    border-radius: 3px;
    cursor: pointer;
    overflow: hidden;
  }

  .clip-progress-fill {
    height: 100%;
    background: var(--brand-600);
    border-radius: 3px;
    transition: width 100ms linear;
  }

  .clip-time {
    font-size: var(--text-xs);
    color: #5a7a90;
    font-weight: 620;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .clip-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
    margin-top: 0.15rem;
  }

  .icon-btn {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 8px;
    border: 1px solid #d6e2ec;
    background: #fff;
    color: #5a7a90;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 120ms;
  }
  .icon-btn:hover { border-color: #9eb6c8; background: #f7fafc; }
  .icon-btn.danger:hover { color: #c62828; border-color: #ef9a9a; background: #fff5f5; }
</style>
