<script lang="ts">
  import { slide } from 'svelte/transition';
  import {
    addVoiceToCollection,
    collections,
    createCollection,
    favorites,
    toggleFavorite,
    removeVoiceFromCollection
  } from '$lib/stores/app-state';

  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import { isAuthenticated } from '$lib/auth/store';
  import { isProviderConnected } from '$lib/stores/credentials';
  import { synthesizePreview, canSynthesizeReal, getSynthesisProvider, stopPreviewPlayback, humanizeSynthesisError } from '$lib/synthesis/service';
  import { addClip } from '$lib/stores/clips';
  import type { SynthesisPreview, PreviewInputMode } from '$lib/synthesis/types';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voice: Voice | null; voiceId: string };

  $: voice = data.voice;
  $: colors = voice ? getProviderColor(voice.providerId ?? voice.provider) : null;

  /** Audio player state */
  let audioEl: HTMLAudioElement | null = null;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  let audioReady = false;

  $: sampleAudioUrl = voice?.samples[0]?.audioUrl ?? voice?.audioUrl ?? null;
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

  function handleFavorite() {
    if (!voice) return;
    const wasFav = $favorites.includes(voice.id);
    toggleFavorite(voice.id);
    addToast(wasFav ? 'Removed from favorites.' : 'Added to favorites.');
  }

  function handlePin() {
    if (!voice) return;
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

  // ─── Audition / Synthesis ───
  let auditionText = 'Hello! This is a preview of this voice. How does it sound to you?';
  let auditionMode: PreviewInputMode = 'text';
  let auditionLoading = false;
  let auditionResult: SynthesisPreview | null = null;
  let auditionError = '';
  let auditionAudioEl: HTMLAudioElement | null = null;
  let auditionPlaying = false;
  let auditionTime = 0;
  let auditionDuration = 0;
  let auditionReady = false;

  $: auditionProvider = variant ? getSynthesisProvider(variant) : null;
  $: auditionHasRealAdapter = variant ? canSynthesizeReal(variant) : false;
  $: auditionProviderConnected = auditionProvider ? isProviderConnected(auditionProvider) : false;
  $: auditionProgressPct = auditionDuration > 0 ? (auditionTime / auditionDuration) * 100 : 0;

  async function runAudition() {
    if (!voice || !variant || !auditionText.trim()) return;

    auditionLoading = true;
    auditionError = '';
    auditionResult = null;
    auditionReady = false;
    stopPreviewPlayback();

    try {
      auditionResult = await synthesizePreview({
        voice,
        variant,
        input: auditionText,
        mode: auditionMode
      });

      if (auditionResult.warnings.length > 0) {
        addToast(auditionResult.warnings.join(' '), 'info');
      }

      // Save clip to IndexedDB if audio was returned
      if (auditionResult.audioUrl) {
        try {
          const resp = await fetch(auditionResult.audioUrl);
          const blob = await resp.blob();
          await addClip({
            voiceId: voice.id,
            voiceName: voice.name,
            provider: voice.provider,
            providerId: voice.providerId ?? voice.provider,
            inputText: auditionText,
            inputMode: auditionMode,
            latencyMs: auditionResult.latencyMs,
            durationMs: 0,
            adapter: auditionResult.adapter,
          }, blob);
          addToast('Clip saved.');
        } catch (saveErr) {
          console.warn('[audition] Failed to save clip:', saveErr);
        }
      }
    } catch (err) {
      auditionError = humanizeSynthesisError(err);
      addToast(auditionError, 'error');
    } finally {
      auditionLoading = false;
    }
  }

  function toggleAuditionPlay() {
    if (!auditionAudioEl) return;
    if (auditionPlaying) {
      auditionAudioEl.pause();
    } else {
      void auditionAudioEl.play();
    }
  }

  function handleAuditionSeek(e: MouseEvent) {
    if (!auditionAudioEl || !auditionDuration) return;
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    auditionAudioEl.currentTime = pct * auditionDuration;
  }
</script>

<svelte:head>
  <title>{voice ? `${voice.name} — ${voice.provider} | Vokda` : 'Voice | Vokda'}</title>
  {#if voice}
    {@const baseUrl = 'https://vokda.iksnae.com'}
    {@const voiceUrl = `${baseUrl}/voices/${voice.id}`}
    {@const ogImage = `${baseUrl}/og/voices/${voice.id}.jpg`}
    {@const ogDesc = `${voice.metadata.shortLabel ? voice.metadata.shortLabel + ' · ' : ''}${voice.description}`}

    <!-- Canonical & description -->
    <link rel="canonical" href={voiceUrl} />
    <meta name="description" content={ogDesc} />

    <!-- Open Graph -->
    <meta property="og:type" content="music.song" />
    <meta property="og:title" content="{voice.name} — {voice.provider} | Vokda" />
    <meta property="og:description" content={ogDesc} />
    <meta property="og:url" content={voiceUrl} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Voice card for {voice.name} by {voice.provider}" />
    {#if sampleAudioUrl}
      <meta property="og:audio" content="{baseUrl}{sampleAudioUrl}" />
      <meta property="og:audio:type" content="audio/mpeg" />
    {/if}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{voice.name} — {voice.provider} | Vokda" />
    <meta name="twitter:description" content={ogDesc} />
    <meta name="twitter:image" content={ogImage} />
    <meta name="twitter:image:alt" content="Voice card for {voice.name} by {voice.provider}" />

    <!-- Structured data (JSON-LD) -->
    {@html `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AudioObject",
      "name": voice.name,
      "description": voice.description,
      "provider": { "@type": "Organization", "name": voice.provider },
      "inLanguage": voice.languages[0] || "en",
      ...(sampleAudioUrl ? { "contentUrl": `${baseUrl}${sampleAudioUrl}`, "encodingFormat": "audio/mpeg" } : {}),
      "url": voiceUrl,
      "image": ogImage,
      "keywords": voice.tags.join(", "),
      "license": voice.modelCard?.licenseUrl || voice.licenseNotes
    })}</script>`}
  {/if}
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
        <div class="hero-top-row">
          <!-- Voice profile image -->
          {#if voice.imageUrl}
            <img
              class="voice-avatar"
              src={voice.imageUrl}
              alt="{voice.name} voice profile"
              width="88"
              height="88"
              loading="eager"
            />
          {/if}

          <div class="hero-title-block">
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
          </div>
        </div>
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
          <button class="action-btn" on:click|stopPropagation={handlePin}>
            <Icon name="pin" size={18} />
            Save to collection
            <Icon name="chevron-down" size={14} />
          </button>

          {#if pinOpen}
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <div class="pin-popover" on:click|stopPropagation>
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

    <!-- ─── Audition / Live Synthesis ─── -->
    <section class="audition-section">
      <div class="audition-card">
        <div class="audition-header">
          <Icon name="waveform" size={20} />
          <h2>Audition</h2>
          {#if $isAuthenticated && auditionHasRealAdapter}
            <span class="audition-label">
              <span class="adapter-badge real"><Icon name="lightning" size={11} /> Live</span>
            </span>
          {/if}
        </div>

        {#if !$isAuthenticated}
          <div class="audition-gate">
            <Icon name="user" size={22} />
            <p>Sign in to audition this voice with custom text.</p>
            <a href="/account?intent=signin" class="audition-signin-btn">Sign In</a>
          </div>
        {:else if !auditionHasRealAdapter}
          <div class="audition-gate">
            <Icon name="key" size={22} />
            {#if auditionProvider}
              <p>Connect your <strong>{auditionProvider}</strong> API key to synthesize this voice.</p>
              <a href="/account/providers" class="audition-signin-btn">
                <Icon name="key" size={14} />
                Add Provider Key
              </a>
            {:else}
              <p>No synthesis adapter available for this voice.</p>
            {/if}
            <p class="audition-gate-hint">Audition uses your own provider API keys to generate speech in real time.</p>
          </div>
        {:else}
          <div class="audition-body">
            <div class="audition-input-row">
              <div class="audition-mode-toggle">
                <button
                  class="mode-btn"
                  class:active={auditionMode === 'text'}
                  on:click={() => auditionMode = 'text'}
                >Text</button>
                <button
                  class="mode-btn"
                  class:active={auditionMode === 'ssml'}
                  on:click={() => auditionMode = 'ssml'}
                >SSML</button>
              </div>

              <span class="provider-badge-inline">
                <Icon name="lightning" size={11} />
                {auditionProvider}
              </span>
            </div>

            <textarea
              class="audition-textarea"
              bind:value={auditionText}
              placeholder={auditionMode === 'ssml' ? '<speak>Enter SSML here…</speak>' : 'Type any text to hear this voice speak it…'}
              rows="3"
              on:keydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runAudition(); } }}
            ></textarea>

            <div class="audition-actions">
              <button
                class="synthesize-btn"
                on:click={runAudition}
                disabled={auditionLoading || !auditionText.trim()}
              >
                {#if auditionLoading}
                  <span class="spinner"></span>
                  Synthesizing…
                {:else}
                  <Icon name="play" size={16} />
                  Synthesize
                {/if}
              </button>

              {#if auditionResult}
                <span class="latency-info">
                  {auditionResult.latencyMs}ms · {auditionResult.adapter}
                </span>
              {/if}
            </div>

            {#if auditionError}
              <div class="audition-error">
                <Icon name="x" size={14} />
                {auditionError}
              </div>
            {/if}

            {#if auditionResult?.audioUrl}
              <div class="audition-player">
                <button
                  class="play-btn-small"
                  on:click={toggleAuditionPlay}
                  disabled={!auditionReady}
                  aria-label={auditionPlaying ? 'Pause' : 'Play'}
                >
                  <Icon name={auditionPlaying ? 'pause' : 'play'} size={16} />
                </button>

                <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                <div class="audition-progress" on:click={handleAuditionSeek}>
                  <div class="audition-progress-fill" style="width:{auditionProgressPct}%"></div>
                </div>

                <span class="audition-time">{formatTime(auditionTime)} / {formatTime(auditionDuration)}</span>

                <audio
                  bind:this={auditionAudioEl}
                  src={auditionResult.audioUrl}
                  on:timeupdate={() => { if (auditionAudioEl) auditionTime = auditionAudioEl.currentTime; }}
                  on:loadedmetadata={() => { if (auditionAudioEl) { auditionDuration = auditionAudioEl.duration; auditionReady = true; } }}
                  on:play={() => auditionPlaying = true}
                  on:pause={() => auditionPlaying = false}
                  on:ended={() => { auditionPlaying = false; auditionTime = 0; }}
                  preload="auto"
                ></audio>
              </div>
            {:else if auditionResult && !auditionResult.audioUrl}
              <div class="audition-error">
                <Icon name="info" size={14} />
                No audio returned. Check your API key configuration.
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </section>

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

    <!-- ─── Model Card ─── -->
    {#if voice.modelCard}
      {@const mc = voice.modelCard}
      <section class="model-card-section">
        <h2 class="section-title">
          <Icon name="info" size={20} />
          Model card
        </h2>

        <div class="mc-grid">
          <!-- Provider & Model -->
          <div class="mc-block">
            <h3 class="mc-block-title">Provider</h3>
            <table class="mc-table">
              <tr><td>Provider</td><td>
                {#if mc.providerUrl}
                  <a href={mc.providerUrl} target="_blank" rel="noopener">{mc.providerName}</a>
                {:else}
                  {mc.providerName}
                {/if}
              </td></tr>
              <tr><td>Type</td><td>
                <span class="mc-type-badge" class:mc-cloud={mc.providerType === 'cloud_api'} class:mc-local={mc.providerType === 'local_mlx'}>
                  {mc.providerType === 'cloud_api' ? 'Cloud API' : mc.providerType === 'local_mlx' ? 'Local · MLX' : mc.providerType}
                </span>
              </td></tr>
              {#if mc.modelFamily}<tr><td>Family</td><td>{mc.modelFamily}</td></tr>{/if}
              {#if mc.modelName}<tr><td>Model</td><td>{mc.modelName}</td></tr>{/if}
              {#if mc.modelSize}<tr><td>Parameters</td><td>{mc.modelSize}</td></tr>{/if}
              {#if mc.architecture}<tr><td>Architecture</td><td>{mc.architecture}</td></tr>{/if}
              {#if mc.baseModel}<tr><td>Base model</td><td>{mc.baseModel}</td></tr>{/if}
              {#if mc.modelUrl}
                <tr><td>Model page</td><td><a href={mc.modelUrl} target="_blank" rel="noopener">{mc.modelUrl.replace('https://huggingface.co/', '🤗 ')}</a></td></tr>
              {/if}
              {#if mc.apiEndpoint}<tr><td>API endpoint</td><td><code>{mc.apiEndpoint}</code></td></tr>{/if}
            </table>
          </div>

          <!-- Capabilities -->
          <div class="mc-block">
            <h3 class="mc-block-title">Capabilities</h3>
            <div class="mc-caps">
              <span class="mc-cap" class:mc-cap-yes={mc.multilingual} class:mc-cap-no={!mc.multilingual}>
                {mc.multilingual ? '✓' : '✗'} Multilingual
              </span>
              <span class="mc-cap" class:mc-cap-yes={mc.ssmlSupport} class:mc-cap-no={!mc.ssmlSupport}>
                {mc.ssmlSupport ? '✓' : '✗'} SSML
              </span>
              <span class="mc-cap" class:mc-cap-yes={mc.streamingSupport} class:mc-cap-no={!mc.streamingSupport}>
                {mc.streamingSupport ? '✓' : '✗'} Streaming
              </span>
              <span class="mc-cap" class:mc-cap-yes={mc.voiceCloning} class:mc-cap-no={!mc.voiceCloning}>
                {mc.voiceCloning ? '✓' : '✗'} Voice cloning
              </span>
              <span class="mc-cap" class:mc-cap-yes={mc.emotionControl} class:mc-cap-no={!mc.emotionControl}>
                {mc.emotionControl ? '✓' : '✗'} Emotion control
              </span>
              <span class="mc-cap" class:mc-cap-yes={mc.wordTimestamps} class:mc-cap-no={!mc.wordTimestamps}>
                {mc.wordTimestamps ? '✓' : '✗'} Word timestamps
              </span>
            </div>
            {#if mc.supportedStyles && mc.supportedStyles.length > 0}
              <div class="mc-sub">
                <span class="mc-sub-label">Styles</span>
                <div class="mc-chip-list">
                  {#each mc.supportedStyles as style}
                    <span class="mc-chip">{style}</span>
                  {/each}
                </div>
              </div>
            {/if}
            {#if mc.supportedLanguages && mc.supportedLanguages.length > 0}
              <div class="mc-sub">
                <span class="mc-sub-label">Languages</span>
                <div class="mc-chip-list">
                  {#each mc.supportedLanguages as lang}
                    <span class="mc-chip">{lang}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- Audio / Performance -->
          <div class="mc-block">
            <h3 class="mc-block-title">Audio & performance</h3>
            <table class="mc-table">
              {#if mc.sampleRate}<tr><td>Sample rate</td><td>{(mc.sampleRate / 1000).toFixed(0)} kHz</td></tr>{/if}
              {#if mc.channels}<tr><td>Channels</td><td>{mc.channels === 1 ? 'Mono' : 'Stereo'}</td></tr>{/if}
              {#if mc.maxInputLength}<tr><td>Max input</td><td>{mc.maxInputLength.toLocaleString()} characters</td></tr>{/if}
              {#if mc.latencyMs}<tr><td>Latency</td><td>{mc.latencyMs}</td></tr>{/if}
              {#if mc.realtimeFactor}<tr><td>Speed</td><td>{mc.realtimeFactor}</td></tr>{/if}
            </table>
          </div>

          <!-- Runtime (local models) -->
          {#if mc.providerType === 'local_mlx'}
            <div class="mc-block">
              <h3 class="mc-block-title">Runtime</h3>
              <table class="mc-table">
                {#if mc.runtime}<tr><td>Engine</td><td>{mc.runtime}</td></tr>{/if}
                {#if mc.quantization}<tr><td>Quantization</td><td>{mc.quantization}</td></tr>{/if}
                {#if mc.diskSize}<tr><td>Disk size</td><td>{mc.diskSize}</td></tr>{/if}
                {#if mc.memoryRequired}<tr><td>Memory</td><td>{mc.memoryRequired}</td></tr>{/if}
                {#if mc.hardwareRequirements}<tr><td>Hardware</td><td>{mc.hardwareRequirements}</td></tr>{/if}
              </table>
            </div>
          {/if}

          <!-- License -->
          <div class="mc-block mc-license-block">
            <h3 class="mc-block-title">License & compliance</h3>
            <table class="mc-table">
              <tr><td>License</td><td>
                {#if mc.licenseUrl}
                  <a href={mc.licenseUrl} target="_blank" rel="noopener">{mc.license || 'View license'}</a>
                {:else}
                  {mc.license || voice.licenseNotes}
                {/if}
              </td></tr>
              <tr><td>Commercial use</td><td>
                <span class="mc-cap" class:mc-cap-yes={mc.commercialUse} class:mc-cap-no={mc.commercialUse === false}>
                  {mc.commercialUse ? '✓ Allowed' : '✗ Not allowed'}
                </span>
              </td></tr>
              {#if mc.attributionRequired !== undefined}
                <tr><td>Attribution</td><td>{mc.attributionRequired ? 'Required' : 'Not required'}</td></tr>
              {/if}
              {#if mc.dataRetention}<tr><td>Data retention</td><td>{mc.dataRetention}</td></tr>{/if}
              {#if mc.gdprCompliant !== undefined}
                <tr><td>GDPR</td><td>{mc.gdprCompliant ? 'Compliant' : 'Check with provider'}</td></tr>
              {/if}
            </table>
          </div>

          <!-- Known Limitations -->
          {#if mc.knownLimitations && mc.knownLimitations.length > 0}
            <div class="mc-block mc-full-width">
              <h3 class="mc-block-title">Known limitations</h3>
              <ul class="mc-limitations">
                {#each mc.knownLimitations as lim}
                  <li>{lim}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- References -->
          {#if mc.paperUrl || mc.releaseDate}
            <div class="mc-block mc-full-width">
              <h3 class="mc-block-title">References</h3>
              <table class="mc-table">
                {#if mc.releaseDate}<tr><td>Released</td><td>{mc.releaseDate}</td></tr>{/if}
                {#if mc.paperUrl}<tr><td>Paper</td><td><a href={mc.paperUrl} target="_blank" rel="noopener">{mc.paperUrl}</a></td></tr>{/if}
              </table>
            </div>
          {/if}
        </div>

        <!-- IDs -->
        <div class="mc-ids">
          <div class="meta-id">
            <span>Voice ID</span>
            <code>{voice.id}</code>
          </div>
          {#if voice.providerVoiceId}
            <div class="meta-id">
              <span>Provider Voice ID</span>
              <code>{voice.providerVoiceId}</code>
            </div>
          {/if}
          {#if variant}
            <div class="meta-id">
              <span>Source key</span>
              <code>{variant.sourceKey}</code>
            </div>
          {/if}
        </div>
      </section>
    {/if}
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

  .hero-top-row {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
  }

  .voice-avatar {
    width: 88px;
    height: 88px;
    border-radius: 16px;
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    border: 2px solid #ffffff20;
  }

  .hero-title-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
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

  /* ─── Audition ─── */
  .audition-section {
    margin-top: 1.2rem;
  }

  .audition-card {
    border: 1px solid var(--stroke-soft);
    border-radius: 20px;
    background: linear-gradient(180deg, #fff 0%, #f9fcfe 100%);
    padding: 1rem 1.15rem;
    box-shadow: 0 10px 22px rgba(17, 39, 57, 0.06);
  }

  .audition-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.75rem;
  }

  .audition-header h2 {
    font-size: var(--text-heading);
    font-weight: 700;
    margin: 0;
    flex: 1;
  }

  .audition-label {
    font-size: var(--text-xs);
  }

  .adapter-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    font-weight: 700;
    font-size: var(--text-xs);
    border: 1px solid;
  }

  .adapter-badge.real {
    color: #2e7d32;
    background: #e8f5e9;
    border-color: #a5d6a7;
  }

  .audition-gate-hint {
    font-size: var(--text-xs);
    color: #6a8ea6;
    margin-top: 0.15rem;
  }

  .provider-badge-inline {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: var(--text-xs);
    font-weight: 680;
    color: #2e7d32;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 999px;
    padding: 0.12rem 0.45rem;
  }

  .audition-gate {
    text-align: center;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #4a6a82;
    font-size: var(--text-body);
  }

  .audition-signin-btn {
    display: inline-block;
    text-decoration: none;
    border-radius: 10px;
    padding: 0.45rem 0.9rem;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    font-weight: 680;
    font-size: var(--text-small);
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .audition-body {
    display: grid;
    gap: 0.55rem;
  }

  .audition-input-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .audition-mode-toggle {
    display: inline-flex;
    border: 1px solid #c5d5e2;
    border-radius: 8px;
    overflow: hidden;
  }

  .mode-btn {
    border: none;
    background: #f3f7fa;
    padding: 0.3rem 0.65rem;
    font-size: var(--text-xs);
    font-weight: 660;
    color: #5a7a90;
    cursor: pointer;
    transition: all 120ms;
  }

  .mode-btn.active {
    background: var(--brand-600);
    color: #fff;
  }

  .audition-textarea {
    width: 100%;
    border: 1px solid #bfd0de;
    border-radius: 12px;
    padding: 0.6rem 0.75rem;
    font-size: var(--text-body);
    font-family: inherit;
    resize: vertical;
    min-height: 72px;
    background: #fff;
    box-sizing: border-box;
  }

  .audition-textarea:focus {
    outline: 2px solid var(--brand-600);
    outline-offset: -1px;
  }

  .audition-actions {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .synthesize-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: none;
    border-radius: 11px;
    padding: 0.55rem 1rem;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    font-weight: 680;
    font-size: var(--text-small);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
    transition: box-shadow 120ms;
  }

  .synthesize-btn:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3);
  }

  .synthesize-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .latency-info {
    font-size: var(--text-xs);
    color: #5a7a90;
    font-weight: 620;
  }

  .audition-error {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.65rem;
    border-radius: 10px;
    background: #fff5f5;
    border: 1px solid #ef9a9a;
    color: #c62828;
    font-size: var(--text-small);
  }

  .audition-player {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.55rem 0.65rem;
    border-radius: 12px;
    background: #f0f5f9;
    border: 1px solid #d5e0e9;
  }

  .play-btn-small {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: none;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .play-btn-small:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .audition-progress {
    flex: 1;
    height: 6px;
    background: #d5e0e9;
    border-radius: 3px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .audition-progress-fill {
    height: 100%;
    background: var(--brand-600);
    border-radius: 3px;
    transition: width 100ms linear;
  }

  .audition-time {
    font-size: var(--text-xs);
    color: #5a7a90;
    font-weight: 620;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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

  h3 { font-size: var(--text-body); color: #1a3347; }

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

  /* ─── Model Card ─── */
  .model-card-section {
    margin-top: 1.5rem;
  }

  .model-card-section .section-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.75rem;
  }

  .mc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .mc-block {
    background: #fff;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    padding: 0.85rem 1rem;
  }

  .mc-full-width {
    grid-column: 1 / -1;
  }

  .mc-block-title {
    font-size: var(--text-small);
    font-weight: 750;
    color: #1a3347;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.55rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid #eaf0f5;
  }

  .mc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-small);
  }

  .mc-table tr + tr td { padding-top: 0.3rem; }

  .mc-table td:first-child {
    color: #6a8ea6;
    font-weight: 620;
    white-space: nowrap;
    padding-right: 0.75rem;
    width: 1%;
    vertical-align: top;
  }

  .mc-table td:last-child {
    color: #1a3347;
    word-break: break-word;
  }

  .mc-table a {
    color: var(--brand-600);
    text-decoration: none;
    font-weight: 600;
  }

  .mc-table a:hover { text-decoration: underline; }

  .mc-table code {
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: var(--text-xs);
    color: #5a7a90;
    background: #eef4f8;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }

  /* Capability badges */
  .mc-caps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.5rem;
  }

  .mc-cap {
    font-size: var(--text-xs);
    font-weight: 650;
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
    border: 1px solid;
    white-space: nowrap;
  }

  .mc-cap-yes {
    color: #1f5a30;
    background: #e8f5e9;
    border-color: #a5d6a7;
  }

  .mc-cap-no {
    color: #78909c;
    background: #f5f5f5;
    border-color: #e0e0e0;
  }

  .mc-sub {
    margin-top: 0.45rem;
  }

  .mc-sub-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: #6a8ea6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    display: block;
    margin-bottom: 0.25rem;
  }

  .mc-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .mc-chip {
    font-size: var(--text-xs);
    background: #eef4f8;
    border: 1px solid #d6e2ec;
    border-radius: 999px;
    padding: 0.1rem 0.4rem;
    color: #37546d;
    font-weight: 600;
  }

  .mc-type-badge {
    font-size: var(--text-xs);
    font-weight: 700;
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
  }

  .mc-cloud {
    color: #1565c0;
    background: #e3f2fd;
    border: 1px solid #90caf9;
  }

  .mc-local {
    color: #2e7d32;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
  }

  .mc-license-block {
    background: #fffdf5;
    border-color: #eedcb0;
  }

  .mc-limitations {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.3rem;
  }

  .mc-limitations li {
    font-size: var(--text-small);
    color: #5a4a20;
    padding: 0.3rem 0.55rem;
    background: #fefbe8;
    border-radius: 8px;
    border-left: 3px solid #f0c36e;
    line-height: 1.4;
  }

  .mc-ids {
    margin-top: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    padding: 0.65rem 0.85rem;
    background: #f7fafc;
    border-radius: 10px;
    border: 1px solid #e4edf3;
  }

  @media (max-width: 640px) {
    .mc-grid {
      grid-template-columns: 1fr;
    }
    .mc-ids {
      flex-direction: column;
      gap: 0.3rem;
    }
  }
</style>
