<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
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
  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import { roleFlags } from '$lib/auth/store';
  import {
    buildLanguageOptions,
    buildAccentOptions,
    voiceMatchesLanguage,
    voiceMatchesAccent,
  } from '$lib/language-utils';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voices: Voice[] };

  let query = '';

  /** Multi-select filter sets */
  let selectedProviders: Set<string> = new Set();
  /**
   * Tier-1 language filter: stores BCP-47 base language codes ('en', 'de', …).
   * Previously stored raw locale tags — the URL mount handler below migrates
   * legacy ?lang=en-US bookmarks to the new format automatically.
   */
  let selectedLanguageBases: Set<string> = new Set();
  /**
   * Tier-2 accent filter: stores full BCP-47 locales ('en-US', 'en-GB', …).
   * Only active when selectedLanguageBases is non-empty.
   */
  let selectedAccents: Set<string> = new Set();
  let selectedSources: Set<string> = new Set();

  let selectedGenders: Set<string> = new Set();
  let selectedAges: Set<string> = new Set();
  let selectedTones: Set<string> = new Set();
  let selectedTiers: Set<string> = new Set();

  let runnableOnly = false;
  let ssmlOnly = false;
  let hasAudioOnly = false;
  let onlyFavorites = false;
  /** Whether we've finished reading initial URL params (prevents sync-back on first load) */
  let urlInitialized = false;

  /** Mobile: filter drawer open */
  let filtersOpen = false;

  /** Desktop: filter panel collapsed */
  let panelCollapsed = false;

  /** Sort order */
  let sortOrder: 'alphabetical' | 'newest' | 'provider' = 'alphabetical';

  /** Pin popover: tracks which row's popover is open */
  let pinOpenForId = '';
  let newCollectionName = '';

  /** Audio playback state */
  let playingVoiceId = '';
  let audioElement: HTMLAudioElement | null = null;

  function togglePlay(voiceId: string, audioUrl: string | undefined) {
    if (!audioUrl) return;

    if (playingVoiceId === voiceId && audioElement) {
      audioElement.pause();
      playingVoiceId = '';
      return;
    }

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

  /** Toggle a value in a Set (for chip multi-select) */
  function toggleSetValue(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  }

  /** Read filter state from URL search params on mount */
  onMount(() => {
    if (!browser) return;

    const params = new URLSearchParams(window.location.search);
    query = params.get('q') ?? '';

    const providerParam = params.get('provider');
    if (providerParam) selectedProviders = new Set(providerParam.split(',').filter(Boolean));

    const langParam = params.get('lang');
    if (langParam) {
      const rawValues = langParam.split(',').filter(Boolean);
      // Backward-compat: legacy URLs stored full locales (e.g. "en-US").
      // Detect and split them: base goes into selectedLanguageBases,
      // the full locale goes into selectedAccents.
      const bases = new Set<string>();
      const accents = new Set<string>();
      for (const value of rawValues) {
        if (value.includes('-')) {
          bases.add(value.split('-')[0]);
          accents.add(value);
        } else {
          bases.add(value);
        }
      }
      selectedLanguageBases = bases;
      if (accents.size > 0) selectedAccents = accents;
    }

    const accentParam = params.get('accent');
    if (accentParam) selectedAccents = new Set(accentParam.split(',').filter(Boolean));

    const typeParam = params.get('type');
    if (typeParam) selectedSources = new Set(typeParam.split(',').filter(Boolean));

    const genderParam = params.get('gender');
    if (genderParam) selectedGenders = new Set(genderParam.split(',').filter(Boolean));
    const ageParam = params.get('age');
    if (ageParam) selectedAges = new Set(ageParam.split(',').filter(Boolean));
    const toneParam = params.get('tone');
    if (toneParam) selectedTones = new Set(toneParam.split(',').filter(Boolean));
    const tierParam = params.get('tier');
    if (tierParam) selectedTiers = new Set(tierParam.split(',').filter(Boolean));

    runnableOnly = params.get('runnable') === '1';
    ssmlOnly = params.get('ssml') === '1';
    hasAudioOnly = params.get('audio') === '1';
    onlyFavorites = params.get('favorites') === '1';
    const sortParam = params.get('sort');
    sortOrder = sortParam === 'provider' ? 'provider' : sortParam === 'newest' ? 'newest' : 'alphabetical';

    // Auto-open filters panel if any filter is active from URL
    if (selectedProviders.size > 0 || selectedLanguageBases.size > 0 ||
        selectedAccents.size > 0 || selectedSources.size > 0 ||
        selectedGenders.size > 0 || selectedAges.size > 0 || selectedTones.size > 0 ||
        selectedTiers.size > 0 ||
        runnableOnly || ssmlOnly || hasAudioOnly) {
      filtersOpen = true;
    }

    requestAnimationFrame(() => { urlInitialized = true; });

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
    };
  });

  /** Sync filter state back to URL (shallow, no navigation) */
  $: if (browser && urlInitialized) {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedProviders.size > 0) params.set('provider', Array.from(selectedProviders).join(','));
    if (selectedLanguageBases.size > 0) params.set('lang', Array.from(selectedLanguageBases).join(','));
    if (selectedAccents.size > 0) params.set('accent', Array.from(selectedAccents).join(','));
    if (selectedSources.size > 0) params.set('type', Array.from(selectedSources).join(','));
    if (selectedGenders.size > 0) params.set('gender', Array.from(selectedGenders).join(','));
    if (selectedAges.size > 0) params.set('age', Array.from(selectedAges).join(','));
    if (selectedTones.size > 0) params.set('tone', Array.from(selectedTones).join(','));
    if (selectedTiers.size > 0) params.set('tier', Array.from(selectedTiers).join(','));
    if (runnableOnly) params.set('runnable', '1');
    if (ssmlOnly) params.set('ssml', '1');
    if (hasAudioOnly) params.set('audio', '1');
    if (onlyFavorites) params.set('favorites', '1');
    if (sortOrder !== 'alphabetical') params.set('sort', sortOrder);

    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;

    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      goto(newUrl, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  const typeLabels: Record<VoiceVariant['sourceType'], string> = {
    cloud_provider: 'Cloud',
    local_model: 'Local',
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
    const wasFav = $favorites.includes(voiceId);
    toggleFavorite(voiceId);
    addToast(wasFav ? 'Removed from favorites.' : 'Added to favorites.');
  }

  function handlePin(voiceId: string) {
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

  function clearAllFilters() {
    query = '';
    selectedProviders = new Set();
    selectedLanguageBases = new Set();
    selectedAccents = new Set();
    selectedSources = new Set();
    selectedGenders = new Set();
    selectedAges = new Set();
    selectedTones = new Set();
    selectedTiers = new Set();
    runnableOnly = false;
    ssmlOnly = false;
    hasAudioOnly = false;
    onlyFavorites = false;
    sortOrder = 'alphabetical';
  }

  $: activeFilterCount = [
    selectedProviders.size > 0,
    selectedLanguageBases.size > 0,   // Language and accent count as one filter group
    selectedSources.size > 0,
    selectedGenders.size > 0,
    selectedAges.size > 0,
    selectedTones.size > 0,
    selectedTiers.size > 0,
    runnableOnly,
    ssmlOnly,
    hasAudioOnly,
    onlyFavorites
  ].filter(Boolean).length;

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  $: languageOptions = buildLanguageOptions(effectiveVoices);
  $: accentOptions = buildAccentOptions(effectiveVoices, selectedLanguageBases);
  $: availableSources = Array.from(
    new Set(effectiveVoices.flatMap((v) => (v.variants ?? []).map((vr) => vr.sourceType)))
  ).sort();
  $: availableProviders = Array.from(new Set(effectiveVoices.map((v) => v.provider))).sort();
  const genderOrder = ['female', 'male', 'neutral', 'variable', 'unknown'];
  const ageOrder = ['child', 'young', 'young adult', 'adult', 'middle_aged', 'mature', 'old', 'variable'];

  const tierOrder = ['premium', 'standard', 'basic'];
  $: availableTiers = Array.from(
    new Set(effectiveVoices.map((v) => v.qualityTier).filter(Boolean))
  ).sort((a, b) => {
    const ai = tierOrder.indexOf(a), bi = tierOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const tierLabels: Record<string, string> = {
    premium: 'Premium',
    standard: 'Standard',
    basic: 'Basic',
  };

  $: availableGenders = Array.from(
    new Set(effectiveVoices.map((v) => v.metadata?.genderPresentation ?? '').filter(Boolean))
  ).sort((a, b) => {
    const ai = genderOrder.indexOf(a), bi = genderOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  $: availableAges = Array.from(
    new Set(effectiveVoices.map((v) => v.metadata?.agePresentation ?? '').filter(Boolean))
  ).sort((a, b) => {
    const ai = ageOrder.indexOf(a), bi = ageOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  $: availableStyles = Array.from(
    new Set(effectiveVoices.map((v) => v.metadata?.speakingStyle ?? '').filter(Boolean))
  ).sort();

  /** Top tones by frequency across the catalog, normalized and alphabetically sorted. */
  $: availableTones = (() => {
    const counts = new Map<string, number>();
    for (const v of effectiveVoices) {
      for (const t of v.metadata?.toneTags ?? []) {
        const norm = t.trim().toLowerCase();
        counts.set(norm, (counts.get(norm) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag)
      .sort();
  })();

  const genderLabels: Record<string, string> = {
    female: 'Female',
    male: 'Male',
    neutral: 'Neutral',
    variable: 'Variable',
    unknown: 'Unknown',
  };

  const ageLabels: Record<string, string> = {
    child: 'Child',
    young: 'Young',
    'young adult': 'Young adult',
    adult: 'Adult',
    middle_aged: 'Middle-aged',
    mature: 'Mature',
    old: 'Senior',
    variable: 'Variable',
  };

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  $: filtered = effectiveVoices.filter((voice) => {
    const q = query.trim().toLowerCase();

    const meta = voice.metadata ?? {};
    const tags = voice.tags ?? [];
    const variants = voice.variants ?? [];

    const matchesQuery =
      !q ||
      voice.name.toLowerCase().includes(q) ||
      (meta.shortLabel ?? '').toLowerCase().includes(q) ||
      voice.provider.toLowerCase().includes(q) ||
      (voice.providerId ?? '').toLowerCase().includes(q) ||
      (voice.description ?? '').toLowerCase().includes(q) ||
      (meta.genderPresentation ?? '').toLowerCase().includes(q) ||
      (meta.speakingStyle ?? '').toLowerCase().includes(q) ||
      (meta.accent ?? '').toLowerCase().includes(q) ||
      (meta.machineTags ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
      (meta.useCases ?? []).some((u: string) => u.toLowerCase().includes(q)) ||
      (meta.audienceTags ?? []).some((a: string) => a.toLowerCase().includes(q)) ||
      (meta.toneTags ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
      tags.some((t: string) => t.toLowerCase().includes(q));

    const matchesLanguage = voiceMatchesLanguage(voice, selectedLanguageBases);
    const matchesAccent = voiceMatchesAccent(voice, selectedAccents);
    const matchesSource =
      selectedSources.size === 0 ||
      (voice.variants ?? []).some((vr) => selectedSources.has(vr.sourceType));
    const matchesProvider = selectedProviders.size === 0 || selectedProviders.has(voice.provider);
    const matchesGender =
      selectedGenders.size === 0 || selectedGenders.has(meta.genderPresentation ?? '');
    const matchesAge =
      selectedAges.size === 0 || selectedAges.has(meta.agePresentation ?? '');
    const normalizedVoiceTones = (meta.toneTags ?? []).map((t: string) => t.trim().toLowerCase());
    const matchesTone =
      selectedTones.size === 0 ||
      normalizedVoiceTones.some((t: string) => selectedTones.has(t));
    const matchesTier =
      selectedTiers.size === 0 || selectedTiers.has(voice.qualityTier);
    const matchesRunnable = !runnableOnly || (voice.variants ?? []).some((vr) => vr.runnable);
    const matchesSsml = !ssmlOnly || (voice.variants ?? []).some((vr) => vr.supportsSsml);
    const matchesAudio = !hasAudioOnly || Boolean((voice.samples ?? [])[0]?.audioUrl ?? voice.audioUrl);
    const matchesFavorite = !onlyFavorites || $favorites.includes(voice.id);

    return (
      matchesQuery &&
      matchesLanguage &&
      matchesAccent &&
      matchesSource &&
      matchesProvider &&
      matchesGender &&
      matchesAge &&
      matchesTone &&
      matchesTier &&
      matchesRunnable &&
      matchesSsml &&
      matchesAudio &&
      matchesFavorite
    );
  });

  $: sorted = (() => {
    const list = [...filtered];
    if (sortOrder === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'provider') {
      list.sort((a, b) => {
        const p = a.provider.localeCompare(b.provider);
        return p !== 0 ? p : a.name.localeCompare(b.name);
      });
    } else if (sortOrder === 'newest') {
      list.sort((a, b) => (a.id > b.id ? -1 : 1));
    }
    return list;
  })();
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

<main class="page-layout" class:panel-collapsed={panelCollapsed}>
  <!-- Filter panel (left) -->
  <aside class="filter-panel" class:open={filtersOpen} class:collapsed={panelCollapsed}>
    <div class="panel-header">
      <button
        class="panel-toggle"
        on:click={() => { panelCollapsed = !panelCollapsed; }}
        aria-label={panelCollapsed ? 'Expand filters' : 'Collapse filters'}
      >
        <Icon name={panelCollapsed ? 'sliders' : 'x'} size={16} />
      </button>
      {#if !panelCollapsed}
        <h2 class="panel-title">Filters</h2>
        {#if activeFilterCount > 0}
          <span class="filter-badge">{activeFilterCount}</span>
          <button class="clear-btn" on:click={clearAllFilters}>Clear all</button>
        {/if}
      {/if}
    </div>

    {#if !panelCollapsed}
      <nav class="filter-sections" aria-label="Filter voices">
        <!-- 1. Language chips (Tier 1) — hardest constraint, eliminates the most non-matches -->
        <div class="filter-section">
          <span class="section-label">Language</span>
          <div class="chip-group">
            {#each languageOptions as option (option.base)}
              <button
                class="filter-chip"
                class:active={selectedLanguageBases.has(option.base)}
                on:click={() => {
                  selectedLanguageBases = toggleSetValue(selectedLanguageBases, option.base);
                  // Clear any accents for this base when deselecting the language
                  if (!selectedLanguageBases.has(option.base)) {
                    const next = new Set(selectedAccents);
                    for (const accent of next) {
                      if (accent.split('-')[0] === option.base) next.delete(accent);
                    }
                    selectedAccents = next;
                  }
                }}
              >
                {option.displayName}
                <span class="chip-count">{option.count}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Accent / Region chips (Tier 2) — only shown when ≥2 locales exist for the selection -->
        {#if accentOptions.length > 0}
          <div class="filter-section filter-section--accent">
            <span class="section-label">
              {selectedLanguageBases.size === 1 && selectedLanguageBases.has('en') ? 'Accent' : 'Region'}
            </span>
            <div class="chip-group">
              {#each accentOptions as option (option.locale)}
                <button
                  class="filter-chip"
                  class:active={selectedAccents.has(option.locale)}
                  on:click={() => { selectedAccents = toggleSetValue(selectedAccents, option.locale); }}
                >
                  {option.label}
                  <span class="chip-count">{option.count}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 2. Gender — first creative character decision -->
        {#if availableGenders.length > 0}
          <div class="filter-section">
            <span class="section-label">Gender</span>
            <div class="chip-group">
              {#each availableGenders as gender}
                <button
                  class="filter-chip"
                  class:active={selectedGenders.has(gender)}
                  on:click={() => { selectedGenders = toggleSetValue(selectedGenders, gender); }}
                >
                  {genderLabels[gender] ?? capitalize(gender)}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 3. Age — second character trait, pairs naturally with gender -->
        {#if availableAges.length > 0}
          <div class="filter-section">
            <span class="section-label">Age</span>
            <div class="chip-group">
              {#each availableAges as age}
                <button
                  class="filter-chip"
                  class:active={selectedAges.has(age)}
                  on:click={() => { selectedAges = toggleSetValue(selectedAges, age); }}
                >
                  {ageLabels[age] ?? capitalize(age)}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 4. Tone — personality/feel, refines character after gender + age -->
        {#if availableTones.length > 0}
          <div class="filter-section">
            <span class="section-label">Tone</span>
            <div class="chip-group">
              {#each availableTones as tone}
                <button
                  class="filter-chip"
                  class:active={selectedTones.has(tone)}
                  on:click={() => { selectedTones = toggleSetValue(selectedTones, tone); }}
                >
                  {capitalize(tone)}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 5. Quality — practical constraint after character selection -->
        {#if availableTiers.length > 1}
          <div class="filter-section">
            <span class="section-label">Quality</span>
            <div class="chip-group">
              {#each availableTiers as tier}
                <button
                  class="filter-chip"
                  class:active={selectedTiers.has(tier)}
                  on:click={() => { selectedTiers = toggleSetValue(selectedTiers, tier); }}
                >
                  {tierLabels[tier] ?? capitalize(tier)}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 6. Provider — commercial/technical preference, power users -->
        <div class="filter-section">
          <span class="section-label">Provider</span>
          <div class="chip-group">
            {#each availableProviders as provider}
              {@const colors = getProviderColor(provider)}
              {@const isActive = selectedProviders.has(provider)}
              <button
                class="filter-chip"
                class:active={isActive}
                style={isActive ? `background:${colors.bg};border-color:${colors.border};color:${colors.text}` : ''}
                on:click={() => { selectedProviders = toggleSetValue(selectedProviders, provider); }}
              >
                {provider}
              </button>
            {/each}
          </div>
        </div>

        <!-- 7. Type — deployment concern, power users only -->
        <div class="filter-section">
          <span class="section-label">Type</span>
          <div class="chip-group">
            {#each availableSources as source}
              <button
                class="filter-chip"
                class:active={selectedSources.has(source)}
                on:click={() => { selectedSources = toggleSetValue(selectedSources, source); }}
              >
                {typeLabel(source)}
              </button>
            {/each}
          </div>
        </div>

        <!-- 8. Capabilities — narrowest, most technical filters last -->
        <div class="filter-section">
          <span class="section-label">Capabilities</span>
          <div class="chip-group">
            <button
              class="filter-chip"
              class:active={runnableOnly}
              on:click={() => { runnableOnly = !runnableOnly; }}
            >
              Live preview
            </button>
            <button
              class="filter-chip"
              class:active={ssmlOnly}
              on:click={() => { ssmlOnly = !ssmlOnly; }}
            >
              SSML
            </button>
            <button
              class="filter-chip"
              class:active={onlyFavorites}
              on:click={() => { onlyFavorites = !onlyFavorites; }}
            >
              <Icon name="heart" size={12} />
              Favorites
            </button>
          </div>
        </div>
      </nav>
    {/if}
  </aside>

  <!-- Mobile: overlay when filter panel open -->
  {#if filtersOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="panel-overlay" on:click={() => (filtersOpen = false)} aria-hidden="true" />
  {/if}

  <!-- Main content -->
  <div class="content">
    <!-- Mobile filter toggle -->
    <button
      class="filter-drawer-toggle"
      on:click={() => (filtersOpen = !filtersOpen)}
      aria-expanded={filtersOpen}
      aria-label="Toggle filters"
    >
      <Icon name="sliders" size={16} />
      Filters
      {#if activeFilterCount > 0}
        <span class="filter-badge">{activeFilterCount}</span>
      {/if}
    </button>

    <!-- Search bar -->
    <div class="search-bar">
      <Icon name="search" size={18} />
      <input bind:value={query} placeholder="Search voices..." />
      {#if query}
        <button class="search-clear" on:click={() => { query = ''; }} aria-label="Clear search">
          <Icon name="x" size={14} />
        </button>
      {/if}
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <p class="results">{filtered.length} of {effectiveVoices.length} voice{effectiveVoices.length !== 1 ? 's' : ''}</p>
      <select bind:value={sortOrder} class="sort-select" aria-label="Sort by">
        <option value="alphabetical">Alphabetical</option>
        <option value="newest">Newest</option>
        <option value="provider">By provider</option>
      </select>
    </div>

    <!-- Voice rows -->
    <section class="voice-list" aria-label="Voice results">
      {#each sorted as voice (voice.id)}
        {@const colors = getProviderColor(voice.providerId ?? voice.provider)}
        {@const isFav = $favorites.includes(voice.id)}
        {@const sampleUrl = (voice.samples ?? [])[0]?.audioUrl ?? voice.audioUrl}
        {@const isPlaying = playingVoiceId === voice.id}
        {@const topTag = (voice.metadata?.toneTags ?? [])[0] ?? (voice.tags ?? [])[0] ?? ''}
        <article class="voice-row" class:playing={isPlaying}>
          <button
            class="play-btn"
            class:playing={isPlaying}
            aria-label={isPlaying ? `Pause ${voice.name}` : `Play sample for ${voice.name}`}
            title={sampleUrl ? (isPlaying ? 'Pause' : 'Play sample') : 'No sample available'}
            disabled={!sampleUrl}
            on:click|stopPropagation={() => togglePlay(voice.id, sampleUrl)}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={14} weight="fill" />
          </button>

          <a class="voice-name" href="/voices/{voice.id}">{voice.name}</a>

          <span
            class="provider-pill"
            style="background:{colors.bg};border-color:{colors.border};color:{colors.text}"
          >{voice.provider}</span>

          <span class="voice-lang">{(voice.languages ?? [])[0] ?? ''}</span>
          <span class="voice-tier">{voice.qualityTier}</span>

          {#if topTag}
            <span class="voice-tag">{topTag}</span>
          {:else}
            <span class="voice-tag-empty"></span>
          {/if}

          <div class="row-actions">
            <button
              class="action-btn"
              class:fav-active={isFav}
              on:click={() => handleFavorite(voice.id)}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              title={$roleFlags.isGuest ? (isFav ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to save voices'}
            >
              <Icon name={isFav ? 'heart-filled' : 'heart'} size={16} />
            </button>

            <div class="pin-wrapper">
              <button
                class="action-btn"
                on:click={() => handlePin(voice.id)}
                aria-label="Pin to collection"
                title={$roleFlags.isGuest ? 'Pin to collection' : 'Sign in to save voices'}
              >
                <Icon name="pin" size={16} />
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
  </div>
</main>

<svelte:window
  on:click={closePinPopover}
  on:keydown={(e) => {
    if (e.key === 'Escape' && filtersOpen) {
      filtersOpen = false;
    }
  }}
/>

<style>
  /* ── Layout ── */
  .page-layout {
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0.5rem 1rem 3rem;
    gap: 1rem;
    animation: rise 300ms ease;
    position: relative;
  }

  /* ── Filter Panel ── */
  .filter-panel {
    width: 260px;
    flex-shrink: 0;
    padding: 0.75rem;
    border: 1px solid var(--stroke-soft, #d0dce6);
    border-radius: var(--radius-md, 12px);
    background: rgba(248, 252, 254, 0.95);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    align-self: flex-start;
    position: sticky;
    top: 5.5rem;
    max-height: calc(100vh - 6.5rem);
    overflow-y: auto;
    transition: width 200ms ease;
  }

  .filter-panel.collapsed {
    width: 44px;
    padding: 0.5rem;
    align-items: center;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .panel-toggle {
    border: 1px solid #d0dce6;
    background: #fff;
    color: #547087;
    border-radius: 8px;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: border-color 150ms, color 150ms;
  }

  .panel-toggle:hover {
    border-color: var(--brand-600, #177089);
    color: var(--brand-700, #0e5568);
  }

  .panel-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: #284f69;
  }

  .filter-badge {
    background: var(--brand-100, #d4f0f7);
    color: var(--brand-700, #0e5568);
    font-size: 0.65rem;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.05rem 0.32rem;
    min-width: 1rem;
    text-align: center;
  }

  .clear-btn {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--brand-600, #177089);
    font-size: 0.72rem;
    font-weight: 620;
    cursor: pointer;
    padding: 0.15rem 0.3rem;
    border-radius: 4px;
  }

  .clear-btn:hover {
    background: var(--brand-100, #d4f0f7);
  }

  .filter-sections {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .section-label {
    font-size: 0.7rem;
    font-weight: 680;
    color: #446078;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .filter-chip {
    border: 1px solid #c9d7e3;
    background: #fff;
    color: #446078;
    border-radius: 999px;
    padding: 0.2rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 120ms, border-color 120ms, color 120ms;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
  }

  .filter-chip:hover {
    border-color: #9eb6c8;
    background: #f4f8fb;
  }

  .filter-chip.active {
    background: var(--brand-100, #d4f0f7);
    border-color: var(--brand-600, #177089);
    color: var(--brand-700, #0e5568);
    font-weight: 680;
  }

  .chip-count {
    font-size: 0.62rem;
    font-weight: 500;
    color: #7a96aa;
    margin-left: 0.1rem;
  }

  .filter-chip.active .chip-count {
    color: var(--brand-600, #177089);
    opacity: 0.8;
  }

  /* Accent section gets a subtle left indent to signal hierarchy */
  .filter-section--accent {
    padding-left: 0.6rem;
    border-left: 2px solid var(--brand-200, #a8dcea);
    margin-left: 0.1rem;
  }

  /* ── Main Content ── */
  .content {
    flex: 1;
    min-width: 0;
  }

  .filter-drawer-toggle {
    display: none;
  }

  .panel-overlay {
    display: none;
  }

  /* ── Search Bar ── */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #b4c9d8;
    border-radius: 12px;
    padding: 0 0.75rem;
    background: #fff;
    color: #7a96aa;
    margin-bottom: 0.6rem;
  }

  .search-bar:focus-within {
    border-color: var(--brand-600, #177089);
    box-shadow: 0 0 0 2px rgba(23, 112, 137, 0.12);
  }

  .search-bar input {
    flex: 1;
    border: none;
    padding: 0.55rem 0;
    background: transparent;
    font-size: 0.92rem;
    color: #173046;
    outline: none;
  }

  .search-clear {
    border: none;
    background: none;
    color: #7a96aa;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
  }

  .search-clear:hover {
    color: #284f69;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.4rem;
    padding: 0 0.1rem;
  }

  .results {
    margin: 0;
    color: #47657d;
    font-size: 0.78rem;
    font-weight: 620;
  }

  .sort-select {
    border: 1px solid #bfd0dd;
    border-radius: 8px;
    padding: 0.3rem 0.5rem;
    background: #fff;
    font-size: 0.78rem;
    color: #173046;
  }

  /* ── Voice Rows ── */
  .voice-list {
    display: flex;
    flex-direction: column;
  }

  .voice-row {
    display: grid;
    grid-template-columns: 32px 1fr auto auto auto auto auto;
    align-items: center;
    gap: 0 0.65rem;
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid #edf2f6;
    transition: background 100ms;
    border-left: 3px solid transparent;
  }

  .voice-row:first-child {
    border-top: 1px solid #edf2f6;
  }

  .voice-row:hover {
    background: #f6f9fb;
  }

  .voice-row.playing {
    border-left-color: var(--brand-600, #177089);
    background: #f0f8fa;
  }

  .play-btn {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid #d0dce6;
    background: #fff;
    color: var(--brand-700, #0e5568);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: transform 100ms, border-color 100ms, background 100ms;
  }

  .play-btn:hover:not(:disabled) {
    transform: scale(1.08);
    border-color: var(--brand-600, #177089);
    background: var(--brand-100, #d4f0f7);
  }

  .play-btn.playing {
    border-color: var(--brand-600, #177089);
    background: var(--brand-100, #d4f0f7);
    color: var(--brand-600, #177089);
    animation: pulseRing 1.5s ease-in-out infinite;
  }

  .play-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .voice-name {
    font-size: 0.9rem;
    font-weight: 650;
    color: #173046;
    text-decoration: none;
    transition: color 120ms;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .voice-name:hover {
    color: var(--brand-600, #177089);
  }

  .provider-pill {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.1rem 0.4rem;
    border: 1px solid;
    white-space: nowrap;
  }

  .voice-lang {
    font-size: 0.75rem;
    color: #547087;
    white-space: nowrap;
  }

  .voice-tier {
    font-size: 0.72rem;
    color: #6b8a9e;
    white-space: nowrap;
  }

  .voice-tag {
    font-size: 0.68rem;
    font-weight: 600;
    color: #5a7a5e;
    background: #edf5ee;
    border: 1px solid #d4e4d8;
    border-radius: 999px;
    padding: 0.08rem 0.38rem;
    white-space: nowrap;
    max-width: 10ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .voice-tag-empty {
    min-width: 0;
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }

  .action-btn {
    border: none;
    background: none;
    color: #8fa8b9;
    border-radius: 999px;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: color 120ms, background 120ms;
  }

  .action-btn:hover {
    color: var(--brand-700, #0e5568);
    background: rgba(23, 112, 137, 0.08);
  }

  .action-btn.fav-active {
    color: #c0392b;
  }

  .pin-wrapper {
    position: relative;
  }

  .pin-popover {
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    min-width: 200px;
    background: #fff;
    border: 1px solid #c9d7e3;
    border-radius: 12px;
    padding: 0.55rem;
    box-shadow: 0 10px 28px rgba(15, 35, 54, 0.14);
    z-index: 30;
    animation: popIn 180ms ease;
  }

  .popover-label {
    margin: 0 0 0.35rem;
    font-size: 0.8rem;
    font-weight: 680;
    color: #284f69;
  }

  .popover-list {
    display: grid;
    gap: 0.2rem;
    max-height: 140px;
    overflow-y: auto;
  }

  .popover-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #2e4b61;
    cursor: pointer;
    padding: 0.2rem 0.28rem;
    border-radius: 6px;
  }

  .popover-item:hover {
    background: #f2f6f9;
  }

  .popover-item input[type="checkbox"] {
    accent-color: var(--brand-600, #177089);
    width: auto;
    padding: 0;
  }

  .popover-create {
    margin-top: 0.4rem;
    display: flex;
    gap: 0.25rem;
    border-top: 1px solid #e8eff4;
    padding-top: 0.4rem;
  }

  .popover-create input {
    flex: 1;
    border: 1px solid #c0d1df;
    border-radius: 8px;
    padding: 0.3rem 0.45rem;
    font-size: 0.8rem;
    min-width: 0;
  }

  .popover-create-btn {
    border: 1px solid #c0d1df;
    background: #f4f8fb;
    border-radius: 8px;
    width: 1.8rem;
    height: 1.8rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #325067;
    padding: 0;
  }

  .popover-create-btn:hover {
    background: #e8f0f6;
    border-color: var(--brand-600, #177089);
    color: var(--brand-600, #177089);
  }

  .empty {
    margin: 0;
    border: 1px dashed #b8cad7;
    border-radius: 12px;
    background: #ffffff88;
    padding: 1.5rem;
    color: #4a6279;
    text-align: center;
    font-size: 0.9rem;
  }

  /* ── Responsive: tablet — panel becomes drawer ── */
  @media (max-width: 980px) {
    .page-layout {
      flex-direction: column;
    }

    .filter-panel {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      max-width: 85vw;
      z-index: 100;
      border-radius: 0;
      border-right: 1px solid var(--stroke-soft, #d0dce6);
      transform: translateX(-100%);
      transition: transform 220ms ease;
      box-shadow: none;
      max-height: 100vh;
    }

    .filter-panel.collapsed {
      width: 280px;
    }

    .filter-panel.open {
      transform: translateX(0);
      box-shadow: 4px 0 24px rgba(15, 35, 54, 0.12);
    }

    .filter-drawer-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid var(--stroke-soft, #d0dce6);
      background: #fff;
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 670;
      color: #284f69;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }

    .filter-drawer-toggle:hover {
      border-color: #9eb6c8;
      background: #f8fbfd;
    }

    .panel-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(15, 27, 38, 0.35);
      z-index: 99;
      animation: fadeIn 180ms ease;
    }
  }

  /* ── Responsive: mobile — rows stack ── */
  @media (max-width: 640px) {
    .voice-row {
      grid-template-columns: 30px 1fr auto;
      grid-template-rows: auto auto;
      gap: 0.15rem 0.5rem;
      padding: 0.5rem 0.4rem;
    }

    .voice-name {
      grid-column: 2;
      grid-row: 1;
    }

    .provider-pill {
      grid-column: 2;
      grid-row: 2;
      justify-self: start;
    }

    .voice-lang,
    .voice-tier,
    .voice-tag,
    .voice-tag-empty {
      display: none;
    }

    .row-actions {
      grid-column: 3;
      grid-row: 1 / -1;
    }

    .toolbar {
      flex-wrap: wrap;
    }
  }

  @keyframes rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes popIn {
    from { opacity: 0; transform: translateY(4px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pulseRing {
    0%, 100% { box-shadow: 0 0 0 0 rgba(23, 112, 137, 0.25); }
    50% { box-shadow: 0 0 0 5px rgba(23, 112, 137, 0); }
  }
</style>
