<script lang="ts">
  import { browser } from '$app/environment';
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
  let selectedCardId = '';
  let newCollectionName = '';
  let collectionMessage = '';

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

  function selectCard(voiceId: string) {
    selectedCardId = selectedCardId === voiceId ? '' : voiceId;
  }

  function quickAdd(voice: Voice) {
    if (!$collections.length) return;
    addVoiceToCollection($collections[0].id, voice.id);
    collectionMessage = `Saved to ${$collections[0].name}.`;
  }

  function inCollection(collectionId: string, voiceId: string) {
    const collection = $collections.find((entry) => entry.id === collectionId);
    return collection?.voiceIds.includes(voiceId) ?? false;
  }

  function toggleCollection(voiceId: string, collectionId: string) {
    if (inCollection(collectionId, voiceId)) {
      removeVoiceFromCollection(collectionId, voiceId);
      collectionMessage = 'Removed from collection.';
      return;
    }

    addVoiceToCollection(collectionId, voiceId);
    const collection = $collections.find((entry) => entry.id === collectionId);
    collectionMessage = collection ? `Saved to ${collection.name}.` : 'Saved to collection.';
  }

  function createAndAttach(voiceId: string) {
    const name = newCollectionName.trim();
    if (!name) return;

    createCollection(name);
    const created = $collections.find((collection) => collection.name.toLowerCase() === name.toLowerCase());
    if (!created) return;
    addVoiceToCollection(created.id, voiceId);
    newCollectionName = '';
    collectionMessage = `Created ${created.name}.`;
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
  <title>Find TTS Voices | Vokda</title>
</svelte:head>

<main>
  <section class="hero">
    <div>
      <h1>Find TTS voices fast</h1>
      <p class="summary">Search by voice name, tone, language, or use case.</p>
      <div class="search-shell">
        <input bind:value={query} placeholder="Search voices..." />
      </div>
    </div>
    <div class="stats">
      <article>
        <strong>{filtered.length}</strong>
        <span>Voices</span>
      </article>
      <article>
        <strong>{providerCount}</strong>
        <span>Providers</span>
      </article>
      <article>
        <strong>{runnableCount}</strong>
        <span>Runnable</span>
      </article>
    </div>
  </section>

  <section class="filters">
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
      <input type="checkbox" bind:checked={runnableOnly} /> Runnable
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={ssmlOnly} /> SSML
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={onlyFavorites} /> Starred
    </label>
  </section>

  <section class="grid">
    {#each filtered as voice}
      <article class:selected={selectedCardId === voice.id}>
        <div class="top-line">
          <p class="provider">{voice.provider}</p>
          <div class="right">
            <p class="tier">{voice.qualityTier}</p>
            <button
              class="star"
              aria-label={$favorites.includes(voice.id) ? 'Unstar voice' : 'Star voice'}
              title={$roleFlags.isGuest ? 'Toggle favorite' : 'Sign in to save favorites'}
              disabled={!$roleFlags.isGuest}
              on:click|stopPropagation={() => toggleFavorite(voice.id)}
            >
              {$favorites.includes(voice.id) ? '★' : '☆'}
            </button>
          </div>
        </div>
        <button
          class="select-surface"
          aria-pressed={selectedCardId === voice.id}
          on:click={() => selectCard(voice.id)}
        >
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
        </button>

        <div class="card-actions">
          <button class="ghost" on:click={() => quickAdd(voice)} disabled={!$roleFlags.isGuest || !$collections.length}>
            Save
          </button>
          <a class="details-link" href={`/voices/${voice.id}`}>View</a>
        </div>

        {#if selectedCardId === voice.id}
          <div class="collection-panel">
            {#if !$roleFlags.isGuest}
              <p class="inline-note">Sign in to save voices to collections.</p>
            {:else}
              <p class="inline-note">Save to one or more collections</p>
              <div class="collection-chips">
                <button
                  class:active={$favorites.includes(voice.id)}
                  on:click={() => toggleFavorite(voice.id)}
                >
                  {$favorites.includes(voice.id) ? 'Starred' : 'Star'}
                </button>
                {#each $collections as collection}
                  <button
                    class:active={inCollection(collection.id, voice.id)}
                    on:click={() => toggleCollection(voice.id, collection.id)}
                  >
                    {collection.name}
                  </button>
                {/each}
              </div>
              <div class="new-collection-row">
                <input bind:value={newCollectionName} placeholder="New collection" />
                <button class="ghost" on:click={() => createAndAttach(voice.id)}>Create + Add</button>
              </div>
              {#if collectionMessage}
                <p class="inline-note">{collectionMessage}</p>
              {/if}
            {/if}
          </div>
        {/if}
      </article>
    {:else}
      <p class="empty">No voices matched the active filters.</p>
    {/each}
  </section>
</main>

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
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.15rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.7rem, 3.2vw, 2.4rem);
    line-height: 1.2;
    max-width: 13ch;
  }

  .summary {
    margin: 0.55rem 0 0;
    color: #395367;
    max-width: 38ch;
    line-height: 1.45;
  }

  .search-shell {
    margin-top: 0.8rem;
  }

  .search-shell input {
    width: 100%;
    border: 1px solid #b4c9d8;
    border-radius: 14px;
    padding: 0.7rem 0.82rem;
    background: #fff;
    font-size: 1rem;
    color: #173046;
  }

  .stats {
    display: grid;
    gap: 0.6rem;
  }

  .stats article {
    border: 1px solid #ccdae6;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.84);
    padding: 0.78rem;
    box-shadow: 0 8px 18px rgba(17, 42, 60, 0.07);
  }

  .stats strong {
    font-size: 1.35rem;
    display: block;
  }

  .stats span {
    color: #4e677d;
    font-size: 0.86rem;
  }

  .filters {
    margin-top: 1.1rem;
    padding: 0.82rem;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.6rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 18px;
    background: rgba(248, 252, 254, 0.86);
  }

  label {
    display: grid;
    gap: 0.32rem;
    font-size: 0.8rem;
    font-weight: 650;
    color: #446078;
  }

  input,
  select {
    border: 1px solid #bfd0dd;
    border-radius: 12px;
    padding: 0.55rem 0.7rem;
    background: #fff;
    font-size: 0.9rem;
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
    grid-template-columns: repeat(auto-fill, minmax(295px, 1fr));
    gap: 0.86rem;
  }

  article {
    border: 1px solid #c9d7e3;
    border-radius: 18px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfdfe 100%);
    padding: 1rem;
    display: grid;
    gap: 0.55rem;
    box-shadow: 0 10px 24px rgba(17, 38, 56, 0.08);
    transition: transform 180ms ease, box-shadow 180ms ease;
    animation: cardIn 420ms ease both;
  }

  article:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 30px rgba(15, 39, 58, 0.12);
  }

  article:nth-child(2) {
    animation-delay: 60ms;
  }

  article:nth-child(3) {
    animation-delay: 120ms;
  }

  article:nth-child(4) {
    animation-delay: 180ms;
  }

  .top-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.45rem;
  }

  .right {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
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
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #4d6c82;
    font-weight: 760;
  }

  .tier {
    font-size: 0.72rem;
    border-radius: 999px;
    padding: 0.19rem 0.52rem;
    background: #e4f2f8;
    color: #234c63;
    font-weight: 760;
  }

  h2 {
    margin: 0;
    font-size: 1.08rem;
  }

  .select-surface {
    margin: 0;
    border: 0;
    padding: 0;
    background: transparent;
    text-align: left;
    display: grid;
    gap: 0.55rem;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .select-surface:focus-visible {
    outline: 2px solid #7ca3bf;
    outline-offset: 4px;
    border-radius: 10px;
  }

  .description {
    color: #3a5469;
    line-height: 1.48;
  }

  .label {
    font-size: 0.83rem;
    color: #2f4e66;
    font-weight: 760;
  }

  .search-desc {
    font-size: 0.84rem;
    color: #526a80;
    line-height: 1.48;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .chips span {
    background: #e9f1f6;
    border: 1px solid #d2dee8;
    border-radius: 999px;
    padding: 0.16rem 0.5rem;
    font-size: 0.72rem;
    font-weight: 620;
    color: #334f66;
  }

  .chips .tag {
    background: #edf5ee;
    border-color: #d4e4d8;
    color: #41633e;
  }

  .chips .tone {
    background: #fff2e3;
    border-color: #f0dcbf;
    color: #8d5c16;
  }

  .meta {
    font-size: 0.8rem;
    color: #547087;
  }

  .details-link {
    margin-top: 0.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    padding: 0.45rem 0.72rem;
    background: linear-gradient(152deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.86rem;
  }

  .card-actions {
    display: flex;
    gap: 0.45rem;
    align-items: center;
  }

  .collection-panel {
    border-top: 1px solid #d8e3ec;
    padding-top: 0.55rem;
    display: grid;
    gap: 0.45rem;
  }

  .collection-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.38rem;
  }

  .collection-chips button {
    border: 1px solid #c2d2df;
    background: #f2f7fb;
    color: #2e4b61;
    border-radius: 999px;
    padding: 0.22rem 0.55rem;
    font-size: 0.77rem;
    font-weight: 650;
    cursor: pointer;
  }

  .collection-chips button.active {
    background: #dcedf8;
    border-color: #93b2c9;
    color: #123b57;
  }

  .new-collection-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.4rem;
  }

  .new-collection-row input {
    border: 1px solid #bfd0dd;
    border-radius: 10px;
    padding: 0.45rem 0.62rem;
    font-size: 0.84rem;
  }

  .inline-note {
    margin: 0;
    font-size: 0.8rem;
    color: #40627c;
  }

  .star {
    border: 1px solid #cfdae4;
    background: #fff;
    color: #385468;
    border-radius: 999px;
    height: 1.8rem;
    width: 1.8rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }

  .star:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ghost {
    border: 1px solid #c5d5e2;
    background: #f4f8fb;
    color: #325067;
    border-radius: 11px;
    padding: 0.45rem 0.72rem;
    font-weight: 680;
    font-size: 0.84rem;
    cursor: pointer;
  }

  .ghost:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  article.selected {
    border-color: #8fb0c9;
    box-shadow: 0 0 0 2px rgba(84, 128, 162, 0.2), 0 16px 30px rgba(15, 39, 58, 0.12);
    transform: translateY(-2px);
  }

  .empty {
    margin: 0;
    border: 1px dashed #b8cad7;
    border-radius: 14px;
    background: #ffffff88;
    padding: 0.9rem;
    color: #4a6279;
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .filters {
      grid-template-columns: 1fr;
    }

    .new-collection-row {
      grid-template-columns: 1fr;
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
