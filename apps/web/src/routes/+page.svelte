<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import {
    customVoices,
    favorites,
    metadataOverrides,
    toggleFavorite
  } from '$lib/stores/app-state';
  import { buildEffectiveCatalog } from '$lib/voice-catalog';
  import { roleFlags } from '$lib/auth/store';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voices: Voice[] };

  let query = '';
  let selectedLanguage = 'all';
  let selectedSource = 'all';
  let selectedProvider = 'all';
  let runnableOnly = false;
  let ssmlOnly = false;
  let onlyFavorites = false;

  onMount(() => {
    if (!browser) return;
    onlyFavorites = new URLSearchParams(window.location.search).get('favorites') === '1';
  });

  const sourceLabels: Record<VoiceVariant['sourceType'], string> = {
    cloud_provider: 'Cloud',
    hf_model: 'HF Model',
    hf_space: 'HF Space',
    hf_endpoint: 'HF Endpoint',
    self_hosted: 'Self-hosted'
  };

  function sourceLabel(source: string) {
    return sourceLabels[source as VoiceVariant['sourceType']] ?? source;
  }

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  $: availableLanguages = Array.from(new Set(effectiveVoices.flatMap((voice) => voice.languages))).sort();
  $: availableSources = Array.from(
    new Set(effectiveVoices.flatMap((voice) => voice.variants.map((variant) => variant.sourceType)))
  ).sort();
  $: availableProviders = Array.from(new Set(effectiveVoices.map((voice) => voice.provider))).sort();

  $: filtered = effectiveVoices.filter((voice) => {
    const q = query.trim().toLowerCase();

    const matchesQuery =
      !q ||
      voice.name.toLowerCase().includes(q) ||
      voice.metadata.shortLabel.toLowerCase().includes(q) ||
      voice.provider.toLowerCase().includes(q) ||
      voice.description.toLowerCase().includes(q) ||
      voice.metadata.searchDescription.toLowerCase().includes(q) ||
      voice.metadata.machineTags.some((tag) => tag.toLowerCase().includes(q)) ||
      voice.metadata.useCases.some((useCase) => useCase.toLowerCase().includes(q)) ||
      voice.metadata.audienceTags.some((audience) => audience.toLowerCase().includes(q)) ||
      voice.metadata.toneTags.some((tone) => tone.toLowerCase().includes(q)) ||
      voice.tags.some((tag) => tag.toLowerCase().includes(q));

    const matchesLanguage = selectedLanguage === 'all' || voice.languages.includes(selectedLanguage);
    const matchesSource =
      selectedSource === 'all' ||
      voice.variants.some((variant) => variant.sourceType === selectedSource);
    const matchesProvider = selectedProvider === 'all' || voice.provider === selectedProvider;
    const matchesRunnable = !runnableOnly || voice.variants.some((variant) => variant.runnable);
    const matchesSsml = !ssmlOnly || voice.variants.some((variant) => variant.supportsSsml);
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

  $: runnableCount = effectiveVoices.filter((voice) => voice.variants.some((variant) => variant.runnable)).length;
  $: providerCount = availableProviders.length;
</script>

<svelte:head>
  <title>Vokda Catalog</title>
</svelte:head>

<main>
  <section class="hero">
    <div>
      <p class="eyebrow">Voice Discovery Platform</p>
      <h1>Find the right voice with human and machine friendly metadata</h1>
      <p class="summary">
        Search by labels, audience, tone, and use-case semantics, then refine entries through curator metadata.
      </p>
    </div>
    <div class="stats">
      <article>
        <strong>{filtered.length}</strong>
        <span>Curated Voices</span>
      </article>
      <article>
        <strong>{providerCount}</strong>
        <span>Providers</span>
      </article>
      <article>
        <strong>{runnableCount}</strong>
        <span>Runnable Entries</span>
      </article>
    </div>
  </section>

  <section class="filters">
    <label>
      Search
      <input bind:value={query} placeholder="label, audience, tone, use case, provider..." />
    </label>

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
      Source
      <select bind:value={selectedSource}>
        <option value="all">All sources</option>
        {#each availableSources as source}
          <option value={source}>{sourceLabel(source)}</option>
        {/each}
      </select>
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={runnableOnly} /> Runnable only
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={ssmlOnly} /> SSML support
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={onlyFavorites} /> Favorites only
    </label>
  </section>

  <section class="grid">
    {#each filtered as voice}
      <article>
        <div class="top-line">
          <p class="provider">{voice.provider}</p>
          <p class="tier">{voice.qualityTier}</p>
        </div>
        <h2>{voice.name}</h2>
        <p class="label">{voice.metadata.shortLabel}</p>
        <p class="description">{voice.description}</p>
        <p class="search-desc">{voice.metadata.searchDescription}</p>

        <div class="chips">
          {#each voice.languages as language}
            <span>{language}</span>
          {/each}
          {#each voice.tags.slice(0, 3) as tag}
            <span class="tag">{tag}</span>
          {/each}
          {#each voice.metadata.toneTags.slice(0, 2) as tone}
            <span class="tone">{tone}</span>
          {/each}
        </div>

        <p class="meta">
          {voice.variants.length} variants · {voice.samples.length} samples ·
          {voice.variants.some((variant) => variant.runnable) ? ' runnable' : ' preview-only'}
        </p>

        <div class="card-actions">
          <button class="ghost" on:click={() => toggleFavorite(voice.id)} disabled={!$roleFlags.isGuest}>
            {#if $roleFlags.isGuest}
              {$favorites.includes(voice.id) ? 'Unfavorite' : 'Favorite'}
            {:else}
              Sign in for favorites
            {/if}
          </button>
          <a class="details-link" href={`/voices/${voice.id}`}>Open Voice Profile</a>
        </div>
      </article>
    {:else}
      <p class="empty">No voices matched the active filters.</p>
    {/each}
  </section>
</main>

<style>
  main {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0.6rem 1rem 3.2rem;
  }

  .hero {
    padding: 1.2rem;
    border-radius: 20px;
    border: 1px solid #c4d0db;
    background: linear-gradient(145deg, #f7fbff 0%, #edf4fb 50%, #e8f0f8 100%);
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.78rem;
    color: #44617a;
    font-weight: 700;
  }

  h1 {
    margin: 0.35rem 0 0;
    font-size: clamp(1.45rem, 3.2vw, 2.2rem);
    line-height: 1.2;
  }

  .summary {
    margin: 0.6rem 0 0;
    color: #35516a;
    max-width: 62ch;
  }

  .stats {
    display: grid;
    gap: 0.55rem;
  }

  .stats article {
    border: 1px solid #cadae8;
    border-radius: 14px;
    background: #ffffffbb;
    padding: 0.75rem;
  }

  .stats strong {
    font-size: 1.3rem;
    display: block;
  }

  .stats span {
    color: #49657f;
    font-size: 0.9rem;
  }

  .filters {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.6rem;
  }

  label {
    display: grid;
    gap: 0.33rem;
    font-size: 0.88rem;
    font-weight: 600;
    color: #3a546d;
  }

  input,
  select {
    border: 1px solid #b5c4d3;
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    background: #fff;
    font-size: 0.95rem;
  }

  .toggle {
    align-self: end;
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .grid {
    margin-top: 1.1rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(295px, 1fr));
    gap: 0.75rem;
  }

  article {
    border: 1px solid #c3d0dd;
    border-radius: 16px;
    background: #fff;
    padding: 0.95rem;
    display: grid;
    gap: 0.5rem;
  }

  .top-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.45rem;
  }

  .provider,
  .tier,
  .meta,
  .description,
  .label,
  .search-desc {
    margin: 0;
  }

  .provider {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #48657f;
    font-weight: 700;
  }

  .tier {
    font-size: 0.8rem;
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
    background: #ecf3fb;
    color: #2a4965;
    font-weight: 700;
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .description {
    color: #36536e;
  }

  .label {
    font-size: 0.9rem;
    color: #2e4960;
    font-weight: 700;
  }

  .search-desc {
    font-size: 0.9rem;
    color: #4a6278;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .chips span {
    background: #e8f1f8;
    border: 1px solid #d1dfeb;
    border-radius: 999px;
    padding: 0.16rem 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: #304d67;
  }

  .chips .tag {
    background: #f1f5ed;
    border-color: #dce6d3;
    color: #47653a;
  }

  .chips .tone {
    background: #f5f0ff;
    border-color: #ddd2f6;
    color: #51368a;
  }

  .meta {
    font-size: 0.84rem;
    color: #49657f;
  }

  .details-link {
    margin-top: 0.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    padding: 0.45rem 0.72rem;
    background: #1e5979;
    color: #fff;
    text-decoration: none;
    font-weight: 650;
    font-size: 0.9rem;
  }

  .card-actions {
    display: flex;
    gap: 0.45rem;
    align-items: center;
  }

  .ghost {
    border: 1px solid #c4d3df;
    background: #f2f7fb;
    color: #304a62;
    border-radius: 10px;
    padding: 0.45rem 0.72rem;
    font-weight: 650;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .ghost:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .empty {
    margin: 0;
    border: 1px dashed #afc0d0;
    border-radius: 12px;
    background: #ffffff88;
    padding: 0.9rem;
    color: #405970;
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
