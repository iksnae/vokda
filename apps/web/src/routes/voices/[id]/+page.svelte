<script lang="ts">
  import { slide } from 'svelte/transition';
  import { synthesizePreview, stopPreviewPlayback } from '$lib/synthesis/service';
  import type { SynthesisPreview } from '$lib/synthesis/types';
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
  import { getVariantWarnings } from '$lib/voice-utils';
  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voices: Voice[]; voiceId: string };

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);
  $: voice = effectiveVoices.find((entry) => entry.id === data.voiceId) ?? null;
  $: colors = voice ? getProviderColor(voice.providerId ?? voice.provider) : null;

  /** Collapsible sections */
  let aboutOpen = false;
  let techOpen = false;

  /** Collection pin popover */
  let pinOpen = false;
  let newCollectionName = '';

  let previewVariantId = '';
  let previewInputMode: 'text' | 'ssml' = 'text';
  let previewInput = '';
  let previewStatus = '';
  let previewBusy = false;
  let previewResult: SynthesisPreview | null = null;

  $: if (voice && !previewVariantId) {
    previewVariantId = voice.variants[0]?.id ?? '';
  }

  /** Prefill audition text from first sample transcript */
  $: if (voice && voice.samples[0]?.transcript && !previewInput) {
    previewInput = voice.samples[0].transcript;
  }

  $: previewVariant = voice?.variants.find((v) => v.id === previewVariantId) ?? null;
  $: previewWarnings = voice && previewVariant ? getVariantWarnings(voice, previewVariant) : [];

  $: isFav = voice ? $favorites.includes(voice.id) : false;

  function sourceLabel(sourceType: VoiceVariant['sourceType']) {
    switch (sourceType) {
      case 'cloud_provider': return 'Cloud Provider';
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

  async function playPreview() {
    if (!previewVariant || !voice) return;

    previewBusy = true;
    previewStatus = 'Generating preview...';
    previewResult = null;

    try {
      const preview = await synthesizePreview({
        voice,
        variant: previewVariant,
        input: previewInput,
        mode: previewInputMode
      });

      previewResult = preview;
      previewStatus = `Preview generated via ${preview.adapter} in ${preview.latencyMs}ms.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown preview error.';
      previewStatus = `Preview failed: ${message}`;
    } finally {
      previewBusy = false;
    }
  }

  function stopPreview() {
    stopPreviewPlayback();
    previewStatus = 'Preview stopped.';
  }
</script>

<svelte:head>
  <title>{voice ? `${voice.name} | Vokda` : 'Voice | Vokda'}</title>
</svelte:head>

<main>
  {#if !voice}
    <p class="muted">Voice not found in current curated catalog.</p>
  {:else}
    <a class="back-link" href="/">
      <Icon name="arrow-left" size={16} />
      Explore
    </a>

    <!-- Profile header with save actions above the fold -->
    <section class="profile-header">
      <div class="header-top">
        <div class="header-info">
          <p class="provider-line">
            <span
              class="provider-badge"
              style="background:{colors?.bg};border-color:{colors?.border};color:{colors?.text}"
            >{voice.provider}</span>
            <span class="tier-badge">{voice.qualityTier}</span>
          </p>
          <h1>{voice.name}</h1>
          <p class="short-label">{voice.metadata.shortLabel}</p>
          <div class="tag-list">
            {#each voice.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
            {#each voice.languages as lang}
              <span class="tag lang-tag">{lang}</span>
            {/each}
          </div>
        </div>

        <!-- Primary actions — Favorite and Pin to collection -->
        <div class="header-actions">
          <button
            class="action-btn"
            class:active={isFav}
            on:click={handleFavorite}
            aria-label={isFav ? 'Remove from favorites' : 'Favorite'}
          >
            <Icon name={isFav ? 'heart-filled' : 'heart'} size={18} />
            {isFav ? 'Favorited' : 'Favorite'}
          </button>

          <div class="pin-wrapper">
            <button
              class="action-btn"
              on:click={handlePin}
              aria-label="Add to collection"
            >
              <Icon name="pin" size={18} />
              Add to collection
              <Icon name="chevron-down" size={14} />
            </button>

            {#if pinOpen}
              <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
              <div class="pin-popover" on:click|stopPropagation>
                {#if !$roleFlags.isGuest}
                  <p class="popover-note">Sign in to save and organize voices.</p>
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
                      placeholder="New collection"
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
      </div>
    </section>

    <!-- Listen section -->
    <section class="listen-section">
      <h2>
        <Icon name="speaker" size={20} />
        Listen
      </h2>
      <div class="listen-panel">
        <label>
          Variant
          <select bind:value={previewVariantId}>
            {#each voice.variants as variant}
              <option value={variant.id}>
                {sourceLabel(variant.sourceType)} · {variant.sourceKey}
              </option>
            {/each}
          </select>
        </label>

        <div class="mode-row">
          <label class="mode-option">
            <input type="radio" bind:group={previewInputMode} value="text" />
            Plain text
          </label>
          <label class="mode-option">
            <input type="radio" bind:group={previewInputMode} value="ssml" />
            SSML
          </label>
        </div>

        <label>
          Preview text
          <textarea bind:value={previewInput} placeholder="Enter text to preview this voice..."></textarea>
        </label>

        {#if previewWarnings.length > 0}
          <ul class="warnings">
            {#each previewWarnings as warning}
              <li>{warning}</li>
            {/each}
          </ul>
        {/if}

        <div class="listen-actions">
          <button class="btn-primary" on:click={playPreview} disabled={!previewVariant || previewBusy}>
            <Icon name={previewBusy ? 'pause' : 'play'} size={16} />
            {previewBusy ? 'Generating...' : 'Play'}
          </button>
          <button class="btn-ghost" on:click={stopPreview}>Stop</button>
        </div>

        {#if previewStatus}
          <p class="status">{previewStatus}</p>
        {/if}

        {#if previewResult}
          <div class="preview-result">
            <p><strong>Adapter:</strong> {previewResult.adapter}</p>
            <p><strong>Source:</strong> {previewResult.sourceKey}</p>
            <p><strong>Input used:</strong> {previewResult.inputUsed}</p>
            {#if previewResult.warnings.length > 0}
              <ul class="warnings">
                {#each previewResult.warnings as w}
                  <li>{w}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>
    </section>

    <!-- About this voice — collapsible -->
    <section class="collapsible-section">
      <button class="section-toggle" on:click={() => (aboutOpen = !aboutOpen)} aria-expanded={aboutOpen}>
        <Icon name={aboutOpen ? 'chevron-down' : 'chevron-right'} size={16} />
        About this voice
      </button>
      {#if aboutOpen}
        <div class="section-content" transition:slide|local>
          <p class="detail-description">{voice.description}</p>
          <p class="license"><strong>License:</strong> {voice.licenseNotes}</p>
          {#if voice.metadata.useCases.length > 0}
            <div class="detail-group">
              <strong>Recommended for:</strong>
              <div class="chip-list">
                {#each voice.metadata.useCases as useCase}
                  <span class="detail-chip">{useCase}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if voice.metadata.accent || voice.metadata.genderPresentation || voice.metadata.agePresentation}
            <div class="detail-group">
              {#if voice.metadata.genderPresentation}
                <p><strong>Gender presentation:</strong> {voice.metadata.genderPresentation}</p>
              {/if}
              {#if voice.metadata.agePresentation}
                <p><strong>Age:</strong> {voice.metadata.agePresentation}</p>
              {/if}
              {#if voice.metadata.accent}
                <p><strong>Accent:</strong> {voice.metadata.accent}</p>
              {/if}
              {#if voice.metadata.speakingStyle}
                <p><strong>Style:</strong> {voice.metadata.speakingStyle}</p>
              {/if}
            </div>
          {/if}
          {#if voice.samples.length > 0}
            <div class="detail-group">
              <strong>Samples</strong>
              <ul class="samples-list">
                {#each voice.samples as sample}
                  <li>
                    <p class="sample-label">{sample.label}</p>
                    <p class="sample-transcript">{sample.transcript}</p>
                    {#if sample.audioUrl}
                      <audio controls src={sample.audioUrl}></audio>
                    {:else}
                      <p class="muted-small">Audio not linked yet.</p>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    </section>

    <!-- Technical details — collapsible -->
    <section class="collapsible-section">
      <button class="section-toggle" on:click={() => (techOpen = !techOpen)} aria-expanded={techOpen}>
        <Icon name={techOpen ? 'chevron-down' : 'chevron-right'} size={16} />
        Technical details
      </button>
      {#if techOpen}
        <div class="section-content" transition:slide|local>
          <ul class="variants-list">
            {#each voice.variants as variant}
              <li class="variant-item">
                <div>
                  <h3>{sourceLabel(variant.sourceType)}</h3>
                  <p class="source-key">{variant.sourceKey}</p>
                </div>
                <div class="variant-badges">
                  <span class={variant.runnable ? 'badge-ok' : 'badge-warn'}>
                    {variant.runnable ? 'Live preview' : 'Preview-only'}
                  </span>
                  <span class={variant.supportsSsml ? 'badge-ok' : 'badge-warn'}>
                    {variant.supportsSsml ? 'SSML' : 'No SSML'}
                  </span>
                  <span class="badge-neutral">{variant.outputFormats.join(', ')}</span>
                  <span class="badge-neutral">Max {variant.maxInputChars} chars</span>
                </div>
              </li>
            {/each}
          </ul>
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
    padding: 0.6rem 1rem 3rem;
  }

  h1, h2, h3, p { margin: 0; }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.9rem;
    color: #1e5979;
    font-weight: 700;
    text-decoration: none;
    font-size: var(--text-body);
  }

  .back-link:hover { text-decoration: underline; }

  /* Profile header */
  .profile-header {
    border: 1px solid #c6d4e1;
    border-radius: 20px;
    padding: 1.2rem;
    background: linear-gradient(145deg, #f7fbff 0%, #edf4fa 100%);
    box-shadow: var(--elev-1);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.2rem;
    flex-wrap: wrap;
  }

  .header-info {
    display: grid;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }

  .provider-line {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .provider-badge {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.14rem 0.5rem;
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

  h1 { font-size: var(--text-display); }

  .short-label {
    font-size: var(--text-body);
    color: #2f4e66;
    font-weight: 620;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.15rem;
  }

  .tag {
    border-radius: 999px;
    border: 1px solid #cfdeeb;
    background: #eaf2fa;
    padding: 0.14rem 0.45rem;
    font-size: var(--text-xs);
    font-weight: 600;
    color: #2f4d68;
  }

  .lang-tag {
    background: #e9f1f6;
    border-color: #d2dee8;
  }

  /* Header actions — above the fold */
  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid #c5d5e2;
    background: #fff;
    border-radius: 12px;
    padding: 0.5rem 0.85rem;
    font-weight: 680;
    font-size: var(--text-small);
    color: #325067;
    cursor: pointer;
    transition: border-color 150ms, background 150ms, color 150ms;
  }

  .action-btn:hover {
    border-color: #9eb6c8;
    background: #f6f9fc;
  }

  .action-btn.active {
    color: #c0392b;
    border-color: #e5b4ab;
    background: #fef0ee;
  }

  /* Pin popover */
  .pin-wrapper { position: relative; }

  .pin-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 240px;
    background: #fff;
    border: 1px solid #c9d7e3;
    border-radius: 14px;
    padding: 0.65rem;
    box-shadow: 0 12px 32px rgba(15, 35, 54, 0.16);
    z-index: 30;
    animation: popIn 180ms ease;
  }

  .popover-note {
    font-size: var(--text-small);
    color: #4f667d;
    padding: 0.3rem;
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

  .popover-item input[type="checkbox"] {
    accent-color: var(--brand-600);
    width: auto;
    padding: 0;
  }

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

  .popover-create-btn:hover {
    background: #e8f0f6;
    color: var(--brand-600);
  }

  /* Listen section */
  .listen-section {
    margin-top: 1.2rem;
  }

  .listen-section h2 {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.55rem;
    font-size: var(--text-heading);
  }

  .listen-panel {
    border: 1px solid #c4d2df;
    border-radius: 16px;
    background: #fff;
    padding: 1rem;
    display: grid;
    gap: 0.6rem;
  }

  .mode-row {
    display: flex;
    gap: 0.8rem;
  }

  .mode-option {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: var(--text-small);
  }

  .warnings {
    margin: 0.4rem 0 0;
    padding-left: 1.05rem;
    color: #714816;
    font-size: var(--text-small);
  }

  .listen-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .status {
    font-size: var(--text-small);
    color: #1d5a39;
    font-weight: 650;
  }

  .preview-result {
    border: 1px solid #d3e0eb;
    border-radius: 10px;
    background: #f8fbff;
    padding: 0.65rem;
    display: grid;
    gap: 0.2rem;
    font-size: var(--text-small);
  }

  /* Collapsible sections */
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

  .section-toggle:hover {
    background: #f6f9fc;
  }

  .section-content {
    padding: 0 1rem 1rem;
    display: grid;
    gap: 0.55rem;
    animation: slideDown 200ms ease;
  }

  .detail-description {
    color: #37546d;
    line-height: 1.5;
  }

  .license {
    color: #6f4d1b;
    font-size: var(--text-small);
  }

  .detail-group {
    display: grid;
    gap: 0.3rem;
    font-size: var(--text-body);
    color: #37546d;
  }

  .detail-group p { margin: 0; }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .detail-chip {
    background: #edf5ee;
    border: 1px solid #d4e4d8;
    border-radius: 999px;
    padding: 0.12rem 0.42rem;
    font-size: var(--text-xs);
    font-weight: 620;
    color: #41633e;
  }

  .samples-list {
    list-style: none;
    padding: 0;
    margin: 0.3rem 0 0;
    display: grid;
    gap: 0.55rem;
  }

  .samples-list li {
    border: 1px solid #dce5ec;
    border-radius: 10px;
    padding: 0.6rem;
    background: #fafcfe;
  }

  .sample-label {
    font-weight: 660;
    font-size: var(--text-body);
  }

  .sample-transcript {
    margin-top: 0.2rem;
    color: #3e5972;
    font-size: var(--text-small);
    line-height: 1.45;
  }

  audio {
    width: 100%;
    margin-top: 0.4rem;
  }

  .muted-small {
    color: #7a96aa;
    font-size: var(--text-small);
    margin-top: 0.2rem;
  }

  /* Variants */
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
    padding: 0.7rem;
    background: #fafcfe;
  }

  h3 { font-size: var(--text-body); }

  .source-key {
    font-size: var(--text-xs);
    font-family: Menlo, Monaco, monospace;
    color: #4e6a80;
    margin-top: 0.15rem;
  }

  .variant-badges {
    margin-top: 0.45rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .variant-badges span {
    border-radius: 999px;
    padding: 0.14rem 0.45rem;
    font-size: var(--text-xs);
    font-weight: 620;
  }

  .badge-ok {
    color: #1f5a30;
    background: #d8f2dd;
    border: 1px solid #bfe3c7;
  }

  .badge-warn {
    color: #744c17;
    background: #f7e8d2;
    border: 1px solid #eed7b7;
  }

  .badge-neutral {
    color: #2d4861;
    background: #eaf1f8;
    border: 1px solid #d3e0eb;
  }

  /* Shared form styles */
  label {
    display: grid;
    gap: 0.35rem;
    font-size: var(--text-body);
    font-weight: 600;
    color: #3e5871;
  }

  select, textarea, input {
    border: 1px solid #b7c7d5;
    border-radius: 10px;
    padding: 0.55rem 0.72rem;
    background: #fff;
    font-size: var(--text-body);
    box-sizing: border-box;
    width: 100%;
  }

  textarea {
    min-height: 90px;
    resize: vertical;
    font-family: inherit;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: none;
    border-radius: 11px;
    padding: 0.5rem 0.85rem;
    background: linear-gradient(152deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    font-weight: 680;
    font-size: var(--text-small);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: #eff4f8;
    color: #2f4760;
    border: 1px solid #bdccda;
    border-radius: 11px;
    padding: 0.5rem 0.85rem;
    font-weight: 680;
    font-size: var(--text-small);
    cursor: pointer;
  }

  .btn-ghost:hover {
    background: #e8eef4;
    border-color: #a8b9c9;
  }

  .muted {
    color: #4f667d;
    border: 1px dashed #bccad8;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes popIn {
    from { opacity: 0; transform: translateY(4px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 640px) {
    .header-top {
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
    }

    .action-btn {
      flex: 1;
      justify-content: center;
    }
  }
</style>
