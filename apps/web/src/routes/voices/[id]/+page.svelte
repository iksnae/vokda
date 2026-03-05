<script lang="ts">
  import { slide } from 'svelte/transition';
  import {
    customVoices,
    addVoiceToCollection,
    collections,
    createCollection,
    favorites,
    metadataOverrides,
    toggleFavorite,
    removeVoiceFromCollection
  } from '$lib/stores/app-state';
  import { buildEffectiveCatalog } from '$lib/voice-catalog';
  import { roleFlags } from '$lib/auth/store';
  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voices: Voice[]; voiceId: string };

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);
  $: voice = effectiveVoices.find((entry) => entry.id === data.voiceId) ?? null;
  $: colors = voice ? getProviderColor(voice.providerId ?? voice.provider) : null;

  /** Audio player state */
  let audioEl: HTMLAudioElement | null = null;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  let audioReady = false;

  $: sampleAudioUrl = voice?.samples[0]?.audioUrl ?? null;
  $: sampleTranscript = voice?.samples[0]?.transcript ?? '';

  function togglePlay() {
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
    } else {
      audioEl.play();
    }
  }

  function handleTimeUpdate() {
    if (audioEl) currentTime = audioEl.currentTime;
  }

  function handleLoaded() {
    if (audioEl) {
      duration = audioEl.duration;
      audioReady = true;
    }
  }

  function handleSeek(e: MouseEvent) {
    if (!audioEl || !duration) return;
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = pct * duration;
  }

  function formatTime(s: number): string {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  $: progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  /** Collection pin popover */
  let pinOpen = false;
  let newCollectionName = '';

  $: isFav = voice ? $favorites.includes(voice.id) : false;

  /** Collapsible sections */
  let techOpen = false;

  function sourceLabel(sourceType: VoiceVariant['sourceType']) {
    switch (sourceType) {
      case 'cloud_provider': return 'Cloud Provider';
      case 'local_model': return 'Local Model';
      case 'hf_model': return 'Open Model';
      case 'hf_space': return 'HF Space';
      case 'hf_endpoint': return 'HF Endpoint';
      case 'self_hosted': return 'Self Hosted';
      default: return sourceType;
    }
  }

  function handleFavorite() {
    if (!voice) return;
    if (!$roleFlags.isGuest) {
      addToast('Sign in to save voices.', 'info');
      return;
    }
    const wasFav = $favorites.includes(voice.id);
    toggleFavorite(voice.id);
    addToast(wasFav ? 'Removed from favorites.' : 'Added to favorites.');
  }

  function handlePin() {
    if (!voice || !$roleFlags.isGuest) {
      addToast('Sign in to save voices.', 'info');
      return;
    }
    pinOpen = !pinOpen;
  }

  function toggleInCollection(collectionId: string) {
    if (!voice) return;
    const col = $collections.find((c) => c.id === collectionId);
    if (!col) return;
    if (col.voiceIds.includes(voice.id)) {
      removeVoiceFromCollection(collectionId, voice.id);
      addToast(`Removed from ${col.name}.`);
    } else {
      addVoiceToCollection(collectionId, voice.id);
      addToast(`Added to ${col.name}.`);
    }
  }

  function createAndAdd() {
    if (!voice) return;
    const name = newCollectionName.trim();
    if (!name) return;
    createCollection(name);
    const created = $collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!created) return;
    addVoiceToCollection(created.id, voice.id);
    newCollectionName = '';
    pinOpen = false;
    addToast(`Created "${created.name}" and added voice.`);
  }

  /** Metadata helpers */
  $: voiceTraits = voice ? buildTraits(voice) : [];

  function buildTraits(v: Voice): { label: string; value: string; icon: string }[] {
    const traits: { label: string; value: string; icon: string }[] = [];
    if (v.metadata.genderPresentation && v.metadata.genderPresentation !== 'unknown') {
      traits.push({ label: 'Gender', value: capitalize(v.metadata.genderPresentation), icon: 'user' });
    }
    if (v.metadata.agePresentation) {
      traits.push({ label: 'Age', value: capitalize(v.metadata.agePresentation), icon: 'users' });
    }
    if (v.metadata.accent) {
      traits.push({ label: 'Accent', value: capitalize(v.metadata.accent), icon: 'globe' });
    }
    if (v.languages.length > 0) {
      traits.push({ label: 'Language', value: v.languages.join(', '), icon: 'chat' });
    }
    if (v.metadata.speakingStyle) {
      traits.push({ label: 'Style', value: capitalize(v.metadata.speakingStyle), icon: 'microphone' });
    }
    if (v.qualityTier) {
      traits.push({ label: 'Quality', value: capitalize(v.qualityTier), icon: 'star' });
    }
    return traits;
  }

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  $: variant = voice?.variants[0] ?? null;
</script>

<svelte:head>
  <title>{voice ? `${voice.name} | Vokda` : 'Voice | Vokda'}</title>
</svelte:head>

<main>
  {#if !voice}
    <p class="muted">Voice not found in current curated catalog.</p>
  {:else}
    <!-- Breadcrumb -->
    <nav class="breadcrumb">
      <a href="/">
        <Icon name="arrow-left" size={16} />
        Explore
      </a>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{voice.name}</span>
    </nav>

    <!-- ─── Hero ─── -->
    <section class="hero">
      <div class="hero-left">
        <!-- Provider badge row -->
        <div class="badge-row">
          <span
            class="provider-badge"
            style="background:{colors?.bg};border-color:{colors?.border};color:{colors?.text}"
          >{voice.provider}</span>
          <span class="tier-badge">{voice.qualityTier}</span>
          {#if variant?.sourceType === 'local_model'}
            <span class="tier-badge local-badge">
              <Icon name="desktop" size={12} />
              local
            </span>
          {/if}
        </div>

        <h1>{voice.name}</h1>
        <p class="subtitle">{voice.metadata.shortLabel}</p>
        <p class="description">{voice.description}</p>

        <!-- Tags -->
        <div class="tag-row">
          {#each voice.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      </div>

      <!-- Actions column -->
      <div class="hero-actions">
        <button
          class="action-btn fav-btn"
          class:active={isFav}
          on:click={handleFavorite}
        >
          <Icon name={isFav ? 'heart-filled' : 'heart'} size={18} />
          {isFav ? 'Favorited' : 'Favorite'}
        </button>

        <div class="pin-wrapper">
          <button class="action-btn" on:click={handlePin}>
            <Icon name="pin" size={18} />
            Save to collection
            <Icon name="chevron-down" size={14} />
          </button>

          {#if pinOpen}
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <div class="pin-popover" on:click|stopPropagation>
              {#if !$roleFlags.isGuest}
                <p class="popover-note">Sign in to organize voices into collections.</p>
              {:else}
                <div class="popover-list">
                  {#each $collections as collection}
                    <label class="popover-item">
                      <input
                        type="checkbox"
                        checked={collection.voiceIds.includes(voice.id)}
                        on:change={() => toggleInCollection(collection.id)}
                      />
                      {collection.name}
                    </label>
                  {/each}
                </div>
                <div class="popover-create">
                  <input
                    bind:value={newCollectionName}
                    placeholder="New collection..."
                    on:keydown={(e) => { if (e.key === 'Enter') createAndAdd(); }}
                  />
                  <button class="popover-create-btn" on:click={createAndAdd}>
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </section>

    <!-- ─── Audio Player ─── -->
    {#if sampleAudioUrl}
      <section class="player-section">
        <div class="player-card">
          <div class="player-header">
            <Icon name="speaker" size={20} />
            <h2>Listen</h2>
            <span class="player-label">Sample</span>
          </div>

          <div class="player-controls">
            <button
              class="play-btn-large"
              on:click={togglePlay}
              disabled={!audioReady}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {#if isPlaying}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              {:else}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4.5v15a.5.5 0 00.77.42l12-7.5a.5.5 0 000-.84l-12-7.5A.5.5 0 007 4.5z" />
                </svg>
              {/if}
            </button>

            <div class="player-track-area">
              <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
              <div class="progress-bar" on:click={handleSeek}>
                <div class="progress-fill" style="width:{progressPct}%"></div>
                <div class="progress-knob" style="left:{progressPct}%"></div>
              </div>
              <div class="time-row">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {#if sampleTranscript}
            <div class="transcript-box">
              <p class="transcript-label">Transcript</p>
              <p class="transcript-text">"{sampleTranscript}"</p>
            </div>
          {/if}

          <audio
            bind:this={audioEl}
            src={sampleAudioUrl}
            on:timeupdate={handleTimeUpdate}
            on:loadedmetadata={handleLoaded}
            on:play={() => (isPlaying = true)}
            on:pause={() => (isPlaying = false)}
            on:ended={() => { isPlaying = false; currentTime = 0; }}
            preload="metadata"
          ></audio>
        </div>
      </section>
    {:else}
      <section class="player-section">
        <div class="player-card no-audio">
          <Icon name="speaker" size={20} />
          <p>No audio sample available for this voice yet.</p>
        </div>
      </section>
    {/if}

    <!-- ─── Voice Profile Grid ─── -->
    <section class="profile-section">
      <h2 class="section-title">Voice profile</h2>
      <div class="traits-grid">
        {#each voiceTraits as trait}
          <div class="trait-card">
            <div class="trait-icon">
              <Icon name={trait.icon} size={18} />
            </div>
            <div class="trait-info">
              <span class="trait-label">{trait.label}</span>
              <span class="trait-value">{trait.value}</span>
            </div>
          </div>
        {/each}
      </div>

      {#if voice.metadata.toneTags.length > 0}
        <div class="tone-row">
          <span class="tone-label">Tone:</span>
          {#each voice.metadata.toneTags as tone}
            <span class="tone-chip">{tone}</span>
          {/each}
        </div>
      {/if}

      {#if voice.metadata.useCases.length > 0}
        <div class="tone-row">
          <span class="tone-label">Best for:</span>
          {#each voice.metadata.useCases as uc}
            <span class="usecase-chip">{uc}</span>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ─── License ─── -->
    <section class="license-section">
      <div class="license-card">
        <Icon name="info" size={16} />
        <div>
          <p class="license-heading">License & usage</p>
          <p class="license-text">{voice.licenseNotes}</p>
        </div>
      </div>
    </section>

    <!-- ─── Technical Details — collapsible ─── -->
    <section class="collapsible-section">
      <button class="section-toggle" on:click={() => (techOpen = !techOpen)} aria-expanded={techOpen}>
        <Icon name={techOpen ? 'chevron-down' : 'chevron-right'} size={16} />
        Technical details
      </button>
      {#if techOpen}
        <div class="section-content" transition:slide|local>
          <ul class="variants-list">
            {#each voice.variants as v}
              <li class="variant-item">
                <div class="variant-header">
                  <h3>{sourceLabel(v.sourceType)}</h3>
                  <code class="source-key">{v.sourceKey}</code>
                </div>
                <div class="variant-badges">
                  <span class={v.runnable ? 'badge-ok' : 'badge-warn'}>
                    {v.runnable ? 'Live preview' : 'Preview-only'}
                  </span>
                  <span class={v.supportsSsml ? 'badge-ok' : 'badge-muted'}>
                    {v.supportsSsml ? 'SSML supported' : 'Plain text only'}
                  </span>
                  <span class="badge-neutral">
                    {v.outputFormats.join(', ')}
                  </span>
                  <span class="badge-neutral">
                    Max {v.maxInputChars.toLocaleString()} chars
                  </span>
                </div>
              </li>
            {/each}
          </ul>

          <div class="meta-id">
            <span>Voice ID</span>
            <code>{voice.id}</code>
          </div>
          <div class="meta-id">
            <span>Provider Voice ID</span>
            <code>{voice.providerVoiceId}</code>
          </div>
        </div>
      {/if}
    </section>
  {/if}
</main>

<svelte:window on:click={() => { pinOpen = false; }} />

<style>
  main {
    max-width: 860px;
    margin: 0 auto;
    padding: 0.5rem 1rem 4rem;
  }

  h1, h2, h3, p { margin: 0; }

  /* ─── Breadcrumb ─── */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: var(--text-small);
  }

  .breadcrumb a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--brand-600);
    font-weight: 680;
    text-decoration: none;
  }

  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb-sep { color: #a0b4c4; }
  .breadcrumb-current { color: #5a7a90; font-weight: 600; }

  /* ─── Hero ─── */
  .hero {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    border-radius: 20px;
    background: linear-gradient(145deg, #f7fbff 0%, #edf4fa 100%);
    border: 1px solid #c6d4e1;
    box-shadow: 0 2px 12px rgba(15, 35, 54, 0.06);
  }

  .hero-left {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .provider-badge {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.14rem 0.55rem;
    border: 1px solid;
  }

  .tier-badge {
    font-size: var(--text-xs);
    border-radius: 999px;
    padding: 0.14rem 0.5rem;
    background: #e4f2f8;
    color: #234c63;
    font-weight: 720;
  }

  .local-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #a5d6a7;
  }

  h1 {
    font-size: var(--text-display);
    line-height: 1.15;
    color: #1a3347;
  }

  .subtitle {
    font-size: var(--text-subhead);
    color: #2f4e66;
    font-weight: 620;
  }

  .description {
    font-size: var(--text-body);
    color: #4a6a82;
    line-height: 1.55;
    margin-top: 0.2rem;
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.35rem;
  }

  .tag {
    border-radius: 999px;
    border: 1px solid #cfdeeb;
    background: #eaf2fa;
    padding: 0.14rem 0.48rem;
    font-size: var(--text-xs);
    font-weight: 600;
    color: #2f4d68;
  }

  /* ─── Hero Actions ─── */
  .hero-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
    align-self: flex-start;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid #c5d5e2;
    background: #fff;
    border-radius: 12px;
    padding: 0.55rem 0.9rem;
    font-weight: 680;
    font-size: var(--text-small);
    color: #325067;
    cursor: pointer;
    transition: all 150ms;
    white-space: nowrap;
  }

  .action-btn:hover {
    border-color: #9eb6c8;
    background: #f6f9fc;
  }

  .fav-btn.active {
    color: #c0392b;
    border-color: #e5b4ab;
    background: #fef0ee;
  }

  /* ─── Pin popover ─── */
  .pin-wrapper { position: relative; }

  .pin-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 260px;
    background: #fff;
    border: 1px solid #c9d7e3;
    border-radius: 14px;
    padding: 0.65rem;
    box-shadow: 0 12px 32px rgba(15, 35, 54, 0.16);
    z-index: 30;
    animation: popIn 180ms ease;
  }

  .popover-note { font-size: var(--text-small); color: #4f667d; padding: 0.3rem; }

  .popover-list {
    display: grid;
    gap: 0.2rem;
    max-height: 180px;
    overflow-y: auto;
  }

  .popover-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: var(--text-small);
    font-weight: 500;
    color: #2e4b61;
    cursor: pointer;
    padding: 0.25rem 0.3rem;
    border-radius: 8px;
  }

  .popover-item:hover { background: #f2f6f9; }
  .popover-item input[type="checkbox"] { accent-color: var(--brand-600); width: auto; padding: 0; }

  .popover-create {
    margin-top: 0.4rem;
    display: flex;
    gap: 0.3rem;
    border-top: 1px solid #e8eff4;
    padding-top: 0.4rem;
  }

  .popover-create input {
    flex: 1;
    border: 1px solid #c0d1df;
    border-radius: 10px;
    padding: 0.35rem 0.5rem;
    font-size: var(--text-small);
  }

  .popover-create-btn {
    border: 1px solid #c0d1df;
    background: #f4f8fb;
    border-radius: 10px;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #325067;
    padding: 0;
  }

  .popover-create-btn:hover { background: #e8f0f6; color: var(--brand-600); }

  /* ─── Audio Player ─── */
  .player-section {
    margin-top: 1.2rem;
  }

  .player-card {
    border: 1px solid #c4d2df;
    border-radius: 20px;
    background: #fff;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 2px 12px rgba(15, 35, 54, 0.04);
  }

  .player-card.no-audio {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #7a96aa;
    font-size: var(--text-body);
    padding: 1.2rem 1.5rem;
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 1rem;
    color: #1a3347;
  }

  .player-header h2 {
    font-size: var(--text-heading);
    flex: 1;
  }

  .player-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: #6a8ea6;
    background: #eef4f8;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
  }

  .player-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .play-btn-large {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(152deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(20, 94, 121, 0.25);
    transition: transform 100ms, box-shadow 100ms;
  }

  .play-btn-large:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(20, 94, 121, 0.35);
  }

  .play-btn-large:active:not(:disabled) {
    transform: scale(0.97);
  }

  .play-btn-large:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .player-track-area {
    flex: 1;
    min-width: 0;
  }

  .progress-bar {
    position: relative;
    height: 6px;
    background: #e0eaf1;
    border-radius: 3px;
    cursor: pointer;
    margin-bottom: 0.35rem;
  }

  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, var(--brand-500), var(--brand-600));
    border-radius: 3px;
    transition: width 80ms linear;
  }

  .progress-knob {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    background: var(--brand-600);
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    transition: left 80ms linear;
  }

  .time-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: #7a96aa;
    font-variant-numeric: tabular-nums;
  }

  .transcript-box {
    margin-top: 1rem;
    padding: 0.85rem 1rem;
    background: #f7fafc;
    border-radius: 12px;
    border: 1px solid #e4edf3;
  }

  .transcript-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: #7a96aa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .transcript-text {
    font-size: var(--text-body);
    color: #3e5972;
    line-height: 1.55;
    font-style: italic;
  }

  /* ─── Voice Profile ─── */
  .profile-section {
    margin-top: 1.2rem;
  }

  .section-title {
    font-size: var(--text-heading);
    color: #1a3347;
    margin-bottom: 0.75rem;
  }

  .traits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.65rem;
  }

  .trait-card {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem 0.85rem;
    background: #fff;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
  }

  .trait-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #eef4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--brand-600);
    flex-shrink: 0;
  }

  .trait-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .trait-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: #7a96aa;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .trait-value {
    font-size: var(--text-body);
    font-weight: 650;
    color: #1a3347;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tone-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.65rem;
    flex-wrap: wrap;
  }

  .tone-label {
    font-size: var(--text-small);
    font-weight: 660;
    color: #5a7a90;
  }

  .tone-chip {
    background: #e9f0f6;
    border: 1px solid #d0dce6;
    border-radius: 999px;
    padding: 0.12rem 0.5rem;
    font-size: var(--text-xs);
    font-weight: 620;
    color: #37546d;
  }

  .usecase-chip {
    background: #edf5ee;
    border: 1px solid #d4e4d8;
    border-radius: 999px;
    padding: 0.12rem 0.5rem;
    font-size: var(--text-xs);
    font-weight: 620;
    color: #41633e;
  }

  /* ─── License ─── */
  .license-section {
    margin-top: 1rem;
  }

  .license-card {
    display: flex;
    gap: 0.65rem;
    padding: 0.85rem 1rem;
    background: #fffbf0;
    border: 1px solid #eedcb0;
    border-radius: 14px;
    color: #6f4d1b;
    align-items: flex-start;
  }

  .license-heading {
    font-size: var(--text-small);
    font-weight: 720;
    margin-bottom: 0.15rem;
  }

  .license-text {
    font-size: var(--text-small);
    line-height: 1.45;
  }

  /* ─── Collapsible Technical ─── */
  .collapsible-section {
    margin-top: 0.8rem;
    border: 1px solid #c4d2df;
    border-radius: 16px;
    background: #fff;
    overflow: hidden;
  }

  .section-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.85rem 1rem;
    background: none;
    border: none;
    font-size: var(--text-body);
    font-weight: 680;
    color: #284f69;
    cursor: pointer;
    text-align: left;
  }

  .section-toggle:hover { background: #f6f9fc; }

  .section-content {
    padding: 0 1rem 1rem;
    display: grid;
    gap: 0.65rem;
    animation: slideDown 200ms ease;
  }

  .variants-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.55rem;
  }

  .variant-item {
    border: 1px solid #dce5ec;
    border-radius: 12px;
    padding: 0.75rem 0.85rem;
    background: #fafcfe;
  }

  .variant-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  h3 { font-size: var(--text-body); color: #1a3347; }

  .source-key {
    font-size: var(--text-xs);
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    color: #5a7a90;
    background: #eef4f8;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
  }

  .variant-badges {
    margin-top: 0.45rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .variant-badges span {
    border-radius: 999px;
    padding: 0.14rem 0.48rem;
    font-size: var(--text-xs);
    font-weight: 620;
  }

  .badge-ok { color: #1f5a30; background: #d8f2dd; border: 1px solid #bfe3c7; }
  .badge-warn { color: #744c17; background: #f7e8d2; border: 1px solid #eed7b7; }
  .badge-muted { color: #5a7a90; background: #eef4f8; border: 1px solid #d6e2ec; }
  .badge-neutral { color: #2d4861; background: #eaf1f8; border: 1px solid #d3e0eb; }

  .meta-id {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-small);
    color: #5a7a90;
  }

  .meta-id code {
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: var(--text-xs);
    color: #37546d;
    background: #eef4f8;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
  }

  /* ─── General ─── */
  .muted {
    color: #4f667d;
    border: 1px dashed #bccad8;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
  }

  audio { display: none; }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes popIn {
    from { opacity: 0; transform: translateY(4px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 640px) {
    .hero {
      flex-direction: column;
      gap: 1rem;
    }

    .hero-actions {
      flex-direction: row;
      width: 100%;
    }

    .action-btn {
      flex: 1;
      justify-content: center;
    }

    .traits-grid {
      grid-template-columns: 1fr 1fr;
    }

    .player-controls {
      gap: 0.75rem;
    }

    .play-btn-large {
      width: 48px;
      height: 48px;
    }
  }
</style>
