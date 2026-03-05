<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import {
    addVoiceToCollection,
    collections,
    createCollection,
    customVoices,
    favorites,
    metadataOverrides,
    removeVoiceFromCollection,
    toggleFavorite
  } from '$lib/stores/app-state';
  import { buildEffectiveCatalog } from '$lib/voice-catalog';
  import { roleFlags } from '$lib/auth/store';
  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voices: Voice[] };

  let query = '';
  let selectedLanguage = 'all';
  let selectedSource = 'all';
  let selectedProvider = 'all';
  let runnableOnly = false;
  let ssmlOnly = false;
  let onlyFavorites = false;

  /** Collapsible filter panel — collapsed by default */
  let filtersOpen = false;

  /** Pin popover: tracks which card's popover is open */
  let pinOpenForId = '';
  let newCollectionName = '';

  /** Audio playback state */
  let playingVoiceId = '';
  let audioElement: HTMLAudioElement | null = null;

  function togglePlay(voiceId: string, audioUrl: string | undefined) {
    if (!audioUrl) return;

    // If same voice is playing, pause it
    if (playingVoiceId === voiceId && audioElement) {
      audioElement.pause();
      playingVoiceId = '';
      return;
    }

    // Stop any current playback
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }

    audioElement = new Audio(audioUrl);
    playingVoiceId = voiceId;

    audioElement.addEventListener('ended', () => {
      playingVoiceId = '';
      audioElement = null;
    });

    audioElement.addEventListener('error', () => {
      addToast('Could not play sample audio.', 'error');
      playingVoiceId = '';
      audioElement = null;
    });

    audioElement.play().catch(() => {
      playingVoiceId = '';
      audioElement = null;
    });
  }

  onMount(() => {
    if (!browser) return;
    onlyFavorites = new URLSearchParams(window.location.search).get('favorites') === '1';

    // Cleanup on unmount
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
    };
  });

  const typeLabels: Record<VoiceVariant['sourceType'], string> = {
    cloud_provider: 'Cloud provider',
    local_model: 'Local model',
    hf_model: 'Open model',
    hf_space: 'HF Space',
    hf_endpoint: 'HF Endpoint',
    self_hosted: 'Self-hosted'
  };

  function typeLabel(source: string) {
    return typeLabels[source as VoiceVariant['sourceType']] ?? source;
  }

  function togglePinPopover(voiceId: string) {
    pinOpenForId = pinOpenForId === voiceId ? '' : voiceId;
    newCollectionName = '';
  }

  function closePinPopover() {
    pinOpenForId = '';
  }

  function handleFavorite(voiceId: string) {
    if (!$roleFlags.isGuest) {
      addToast('Sign in to save voices.', 'info');
      return;
    }
    const wasFav = $favorites.includes(voiceId);
    toggleFavorite(voiceId);
    addToast(wasFav ? 'Removed from favorites.' : 'Added to favorites.');
  }

  function handlePin(voiceId: string) {
    if (!$roleFlags.isGuest) {
      addToast('Sign in to save voices.', 'info');
      return;
    }

    if ($collections.length === 0) {
      createCollection('Saved');
      const created = $collections.find((c) => c.name === 'Saved');
      if (created) {
        addVoiceToCollection(created.id, voiceId);
        addToast('Created "Saved" and pinned voice.');
      }
      return;
    }

    togglePinPopover(voiceId);
  }

  function inCollection(collectionId: string, voiceId: string): boolean {
    const collection = $collections.find((c) => c.id === collectionId);
    return collection?.voiceIds.includes(voiceId) ?? false;
  }

  function toggleCollection(voiceId: string, collectionId: string) {
    if (inCollection(collectionId, voiceId)) {
      removeVoiceFromCollection(collectionId, voiceId);
      addToast('Removed from collection.');
      return;
    }
    addVoiceToCollection(collectionId, voiceId);
    const collection = $collections.find((c) => c.id === collectionId);
    addToast(collection ? `Pinned to ${collection.name}.` : 'Pinned to collection.');
  }

  function createAndPin(voiceId: string) {
    const name = newCollectionName.trim();
    if (!name) return;
    createCollection(name);
    const created = $collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!created) return;
    addVoiceToCollection(created.id, voiceId);
    newCollectionName = '';
    addToast(`Created "${created.name}" and pinned voice.`);
    closePinPopover();
  }

  /** Count active filters for badge */
  $: activeFilterCount = [
    selectedProvider !== 'all',
    selectedLanguage !== 'all',
    selectedSource !== 'all',
    runnableOnly,
    ssmlOnly,
    onlyFavorites
  ].filter(Boolean).length;

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  $: availableLanguages = Array.from(new Set(effectiveVoices.flatMap((v) => v.languages))).sort();
  $: availableSources = Array.from(
    new Set(effectiveVoices.flatMap((v) => v.variants.map((vr) => vr.sourceType)))
  ).sort();
  $: availableProviders = Array.from(new Set(effectiveVoices.map((v) => v.provider))).sort();

  $: filtered = effectiveVoices.filter((voice) => {
    const q = query.trim().toLowerCase();

    const matchesQuery =
      !q ||
      voice.name.toLowerCase().includes(q) ||
      voice.metadata.shortLabel.toLowerCase().includes(q) ||
      voice.provider.toLowerCase().includes(q) ||
      voice.description.toLowerCase().includes(q) ||
      voice.metadata.machineTags.some((t) => t.toLowerCase().includes(q)) ||
      voice.metadata.useCases.some((u) => u.toLowerCase().includes(q)) ||
      voice.metadata.audienceTags.some((a) => a.toLowerCase().includes(q)) ||
      voice.metadata.toneTags.some((t) => t.toLowerCase().includes(q)) ||
      voice.tags.some((t) => t.toLowerCase().includes(q));

    const matchesLanguage = selectedLanguage === 'all' || voice.languages.includes(selectedLanguage);
    const matchesSource =
      selectedSource === 'all' ||
      voice.variants.some((vr) => vr.sourceType === selectedSource);
    const matchesProvider = selectedProvider === 'all' || voice.provider === selectedProvider;
    const matchesRunnable = !runnableOnly || voice.variants.some((vr) => vr.runnable);
    const matchesSsml = !ssmlOnly || voice.variants.some((vr) => vr.supportsSsml);
    const matchesFavorite = !onlyFavorites || $favorites.includes(voice.id);

    return (
      matchesQuery &&
      matchesLanguage &&
      matchesSource &&
      matchesProvider &&
      matchesRunnable &&
      matchesSsml &&
      matchesFavorite
    );
  });
</script>

<svelte:head>
  <title>Discover Voices | Vokda</title>
  <link rel="canonical" href="https://vokda.iksnae.com" />
  <meta property="og:url" content="https://vokda.iksnae.com" />
  <meta property="og:title" content="Discover Voices | Vokda" />
  <meta property="og:description" content="Browse {effectiveVoices.length} TTS voices across 15 providers. Audition samples, compare model cards, and curate collections." />
  <meta property="og:image" content="https://vokda.iksnae.com/og-image.png" />
  <meta name="twitter:title" content="Discover Voices | Vokda" />
  <meta name="twitter:description" content="Browse {effectiveVoices.length} TTS voices across 15 providers. Audition samples, compare model cards, and curate collections." />
  <meta name="twitter:image" content="https://vokda.iksnae.com/og-image.png" />
</svelte:head>

<main>
  <section class="hero">
    <div>
      <h1>Discover voices for every project</h1>
      <p class="summary">Browse TTS voices across providers, listen instantly, and build your perfect voice set.</p>
      <div class="search-shell">
        <Icon name="search" size={18} />
        <input bind:value={query} placeholder="Search by name, style, or use case..." />
      </div>
    </div>
  </section>

  <div class="filter-bar">
    <button
      class="filter-toggle"
      class:active={filtersOpen || activeFilterCount > 0}
      on:click={() => (filtersOpen = !filtersOpen)}
      aria-expanded={filtersOpen}
    >
      <Icon name="sliders" size={16} />
      Filters
      {#if activeFilterCount > 0}
        <span class="filter-count">{activeFilterCount}</span>
      {/if}
      <Icon name={filtersOpen ? 'chevron-down' : 'chevron-right'} size={14} />
    </button>

    <label class="toggle-inline">
      <input type="checkbox" bind:checked={onlyFavorites} />
      <Icon name="heart" size={14} />
      Favorites
    </label>
  </div>

  {#if filtersOpen}
    <section class="filters" transition:slide|local>
      <label>
        Provider
        <select bind:value={selectedProvider}>
          <option value="all">All providers</option>
          {#each availableProviders as provider}
            <option value={provider}>{provider}</option>
          {/each}
        </select>
      </label>

      <label>
        Language
        <select bind:value={selectedLanguage}>
          <option value="all">All languages</option>
          {#each availableLanguages as language}
            <option value={language}>{language}</option>
          {/each}
        </select>
      </label>

      <label>
        Type
        <select bind:value={selectedSource}>
          <option value="all">All types</option>
          {#each availableSources as source}
            <option value={source}>{typeLabel(source)}</option>
          {/each}
        </select>
      </label>

      <label class="toggle">
        <input type="checkbox" bind:checked={runnableOnly} /> Live preview
      </label>

      <label class="toggle">
        <input type="checkbox" bind:checked={ssmlOnly} /> SSML
      </label>
    </section>
  {/if}

  <p class="results">{filtered.length} voice{filtered.length !== 1 ? 's' : ''}</p>

  <section class="grid">
    {#each filtered as voice (voice.id)}
      {@const colors = getProviderColor(voice.providerId ?? voice.provider)}
      {@const isFav = $favorites.includes(voice.id)}
      {@const sampleUrl = voice.samples[0]?.audioUrl}
      {@const isPlaying = playingVoiceId === voice.id}
      <article>
        <!-- Play button hero area -->
        <div class="play-area" style={voice.imageUrl ? `background-image:url(${voice.imageUrl})` : ''}>
          <button
            class="play-btn"
            class:playing={isPlaying}
            aria-label={isPlaying ? `Pause ${voice.name}` : `Play sample for ${voice.name}`}
            title={sampleUrl ? (isPlaying ? 'Pause' : 'Play sample') : 'No sample available'}
            disabled={!sampleUrl}
            on:click|stopPropagation={() => togglePlay(voice.id, sampleUrl)}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={22} weight="fill" />
          </button>
        </div>

        <!-- Card body — clicks navigate to detail -->
        <a class="card-body" href="/voices/{voice.id}">
          <h2>{voice.name}</h2>
          <p class="short-label">{voice.metadata.shortLabel}</p>
          <p class="compact-meta">
            <span
              class="provider-badge"
              style="background:{colors.bg};border-color:{colors.border};color:{colors.text}"
            >{voice.provider}</span>
            <span class="sep">·</span>
            <span>{voice.languages[0] ?? ''}</span>
            <span class="sep">·</span>
            <span>{voice.qualityTier}</span>
          </p>
          <div class="chips">
            {#each voice.tags.slice(0, 3) as tag}
              <span class="chip">{tag}</span>
            {/each}
            {#if voice.metadata.toneTags.length > 0}
              <span class="chip tone-chip">{voice.metadata.toneTags[0]}</span>
            {/if}
          </div>
        </a>

        <!-- Save actions -->
        <div class="card-actions">
          <button
            class="icon-btn"
            class:active={isFav}
            on:click={() => handleFavorite(voice.id)}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            title={$roleFlags.isGuest ? (isFav ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to save voices'}
          >
            <Icon name={isFav ? 'heart-filled' : 'heart'} size={18} />
          </button>

          <div class="pin-wrapper">
            <button
              class="icon-btn"
              on:click={() => handlePin(voice.id)}
              aria-label="Pin to collection"
              title={$roleFlags.isGuest ? 'Pin to collection' : 'Sign in to save voices'}
            >
              <Icon name="pin" size={18} />
            </button>

            {#if pinOpenForId === voice.id}
              <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
              <div class="pin-popover" on:click|stopPropagation>
                <p class="popover-label">Pin to collection</p>
                <div class="popover-list">
                  {#each $collections as collection}
                    <label class="popover-item">
                      <input
                        type="checkbox"
                        checked={inCollection(collection.id, voice.id)}
                        on:change={() => toggleCollection(voice.id, collection.id)}
                      />
                      {collection.name}
                    </label>
                  {/each}
                </div>
                <div class="popover-create">
                  <input
                    bind:value={newCollectionName}
                    placeholder="New collection"
                    on:keydown={(e) => { if (e.key === 'Enter') createAndPin(voice.id); }}
                  />
                  <button class="popover-create-btn" on:click={() => createAndPin(voice.id)}>
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </article>
    {:else}
      <p class="empty">No voices found. Try different filters or search terms.</p>
    {/each}
  </section>
</main>

<!-- Close pin popover when clicking outside -->
<svelte:window on:click={closePinPopover} />

<style>
  main {
    max-width: 1120px;
    margin: 0 auto 2.4rem;
    padding: 0.7rem 1rem 3.2rem;
    animation: rise 360ms ease;
  }

  .hero {
    position: relative;
    overflow: hidden;
    padding: 1.35rem;
    border-radius: 26px;
    border: 1px solid var(--stroke-soft);
    background:
      radial-gradient(circle at 85% 12%, #dff0f7 0%, transparent 32%),
      radial-gradient(circle at 12% 100%, #f5e8d1 0%, transparent 34%),
      linear-gradient(152deg, #f8fbfd 0%, #eef5f9 50%, #e8eff4 100%);
    box-shadow: var(--elev-1);
    display: block;
  }

  h1 {
    margin: 0;
    font-size: var(--text-display);
    line-height: 1.2;
    max-width: 18ch;
  }

  .summary {
    margin: 0.55rem 0 0;
    color: #395367;
    max-width: 44ch;
    line-height: 1.45;
    font-size: var(--text-body);
  }

  .search-shell {
    margin-top: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #b4c9d8;
    border-radius: 14px;
    padding: 0 0.82rem;
    background: #fff;
    color: #7a96aa;
  }

  .search-shell:focus-within {
    border-color: var(--brand-600);
    box-shadow: 0 0 0 3px rgba(23, 112, 137, 0.12);
  }

  .search-shell input {
    flex: 1;
    border: none;
    padding: 0.7rem 0;
    background: transparent;
    font-size: 1rem;
    color: #173046;
    outline: none;
  }

  /* Filter bar */
  .filter-bar {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .filter-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--stroke-soft);
    background: #ffffffd6;
    border-radius: 999px;
    padding: 0.4rem 0.75rem;
    font-size: var(--text-small);
    font-weight: 670;
    color: #284f69;
    cursor: pointer;
    transition: border-color 180ms ease, background 180ms ease;
  }

  .filter-toggle:hover,
  .filter-toggle.active {
    border-color: #9eb6c8;
    background: #fff;
  }

  .filter-count {
    background: var(--brand-100);
    color: var(--brand-700);
    font-size: 0.7rem;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.05rem 0.35rem;
    min-width: 1.1rem;
    text-align: center;
  }

  .toggle-inline {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--text-small);
    font-weight: 620;
    color: #446078;
    cursor: pointer;
  }

  .toggle-inline input {
    accent-color: var(--brand-600);
  }

  .filters {
    margin-top: 0.6rem;
    padding: 0.82rem;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.6rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 18px;
    background: rgba(248, 252, 254, 0.86);
    animation: slideDown 200ms ease;
  }

  .results {
    margin: 0.7rem 0 0;
    color: #47657d;
    font-size: var(--text-small);
    font-weight: 620;
  }

  label {
    display: grid;
    gap: 0.32rem;
    font-size: var(--text-xs);
    font-weight: 650;
    color: #446078;
  }

  input,
  select {
    border: 1px solid #bfd0dd;
    border-radius: 12px;
    padding: 0.55rem 0.7rem;
    background: #fff;
    font-size: var(--text-body);
    color: #173046;
  }

  .toggle {
    align-self: end;
    display: flex;
    align-items: center;
    gap: 0.42rem;
    font-size: 0.78rem;
    padding-bottom: 0.32rem;
  }

  .grid {
    margin-top: 1.2rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.86rem;
  }

  article {
    border: 1px solid #c9d7e3;
    border-radius: 18px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfdfe 100%);
    padding: 0;
    display: grid;
    grid-template-rows: auto 1fr auto;
    box-shadow: 0 10px 24px rgba(17, 38, 56, 0.08);
    transition: transform 180ms ease, box-shadow 180ms ease;
    animation: cardIn 420ms ease both;
    overflow: hidden;
  }

  article:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 30px rgba(15, 39, 58, 0.12);
  }

  article:nth-child(2) { animation-delay: 60ms; }
  article:nth-child(3) { animation-delay: 120ms; }
  article:nth-child(4) { animation-delay: 180ms; }

  /* Play area */
  .play-area {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.2rem 1rem 0.6rem;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 18px 18px 0 0;
    min-height: 120px;
  }

  .play-btn {
    width: 52px;
    height: 52px;
    border-radius: 999px;
    border: 2px solid #d0dce6;
    background: linear-gradient(180deg, #f8fbfd 0%, #eef5f9 100%);
    color: var(--brand-700);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
    box-shadow: 0 4px 12px rgba(17, 38, 56, 0.08);
    padding: 0;
  }

  .play-btn:hover:not(:disabled) {
    transform: scale(1.08);
    border-color: var(--brand-600);
    box-shadow: 0 6px 18px rgba(23, 112, 137, 0.18);
  }

  .play-btn.playing {
    border-color: var(--brand-600);
    background: linear-gradient(180deg, #e0f2f7 0%, #d0eaf2 100%);
    color: var(--brand-600);
    animation: pulseRing 1.5s ease-in-out infinite;
  }

  .play-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Card body — clickable link */
  .card-body {
    text-decoration: none;
    color: inherit;
    padding: 0 1rem;
    display: grid;
    gap: 0.35rem;
  }

  .card-body:hover h2 {
    color: var(--brand-600);
  }

  h2 {
    margin: 0;
    font-size: var(--text-subhead);
    transition: color 150ms;
  }

  .short-label {
    margin: 0;
    font-size: var(--text-small);
    color: #2f4e66;
    font-weight: 620;
  }

  .compact-meta {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.32rem;
    flex-wrap: wrap;
    font-size: var(--text-xs);
    color: #547087;
  }

  .provider-badge {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.12rem 0.45rem;
    border: 1px solid;
  }

  .sep {
    color: #b6c8d6;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.15rem;
  }

  .chip {
    background: #edf5ee;
    border: 1px solid #d4e4d8;
    border-radius: 999px;
    padding: 0.12rem 0.42rem;
    font-size: 0.7rem;
    font-weight: 620;
    color: #41633e;
  }

  .tone-chip {
    background: #fff2e3;
    border-color: #f0dcbf;
    color: #8d5c16;
  }

  /* Card actions */
  .card-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.3rem;
    padding: 0.55rem 1rem 0.75rem;
  }

  .icon-btn {
    border: 1px solid #d0dce6;
    background: #fff;
    color: #547087;
    border-radius: 999px;
    width: 2.1rem;
    height: 2.1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: transform 150ms, border-color 150ms, color 150ms, background 150ms;
  }

  .icon-btn:hover {
    transform: translateY(-1px);
    border-color: #9eb6c8;
    color: var(--brand-700);
  }

  .icon-btn.active {
    color: #c0392b;
    border-color: #e5b4ab;
    background: #fef0ee;
  }

  /* Pin popover */
  .pin-wrapper {
    position: relative;
  }

  .pin-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    background: #fff;
    border: 1px solid #c9d7e3;
    border-radius: 14px;
    padding: 0.65rem;
    box-shadow: 0 12px 32px rgba(15, 35, 54, 0.16);
    z-index: 30;
    animation: popIn 180ms ease;
  }

  .popover-label {
    margin: 0 0 0.4rem;
    font-size: var(--text-small);
    font-weight: 680;
    color: #284f69;
  }

  .popover-list {
    display: grid;
    gap: 0.25rem;
    max-height: 160px;
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

  .popover-item:hover {
    background: #f2f6f9;
  }

  .popover-item input[type="checkbox"] {
    accent-color: var(--brand-600);
    width: auto;
    padding: 0;
  }

  .popover-create {
    margin-top: 0.45rem;
    display: flex;
    gap: 0.3rem;
    border-top: 1px solid #e8eff4;
    padding-top: 0.45rem;
  }

  .popover-create input {
    flex: 1;
    border: 1px solid #c0d1df;
    border-radius: 10px;
    padding: 0.35rem 0.5rem;
    font-size: var(--text-small);
    min-width: 0;
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

  .popover-create-btn:hover {
    background: #e8f0f6;
    border-color: var(--brand-600);
    color: var(--brand-600);
  }

  .empty {
    grid-column: 1 / -1;
    margin: 0;
    border: 1px dashed #b8cad7;
    border-radius: 14px;
    background: #ffffff88;
    padding: 1.5rem;
    color: #4a6279;
    text-align: center;
    font-size: var(--text-body);
  }

  @media (max-width: 980px) {
    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .filters {
      grid-template-columns: 1fr;
    }
  }

  @keyframes rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes popIn {
    from { opacity: 0; transform: translateY(4px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes pulseRing {
    0%, 100% { box-shadow: 0 0 0 0 rgba(23, 112, 137, 0.25); }
    50% { box-shadow: 0 0 0 6px rgba(23, 112, 137, 0); }
  }
</style>
