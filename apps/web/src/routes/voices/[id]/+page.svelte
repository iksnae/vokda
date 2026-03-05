<script lang="ts">
  import { browser } from '$app/environment';
  import {
    addToCart,
    addVoiceToCollection,
    collections,
    createCollection,
    updateCollectionVoiceNote
  } from '$lib/stores/app-state';
  import { getVariantWarnings, stripSsml, truncateToVariantLimit } from '$lib/voice-utils';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voice: Voice };

  let selectedCollectionId = '';
  let quickCollectionName = '';
  let noteDraft = '';
  let cartMessage = '';
  let collectionMessage = '';
  let previewVariantId = data.voice.variants[0]?.id ?? '';
  let previewInputMode: 'text' | 'ssml' = 'text';
  let previewInput =
    'This is a live audition preview from Vokda. Use this to validate tone, pacing, and clarity.';
  let previewStatus = '';

  $: previewVariant = data.voice.variants.find((variant) => variant.id === previewVariantId);
  $: previewWarnings = previewVariant ? getVariantWarnings(data.voice, previewVariant) : [];

  function sourceLabel(sourceType: VoiceVariant['sourceType']) {
    switch (sourceType) {
      case 'cloud_provider':
        return 'Cloud Provider';
      case 'hf_model':
        return 'HF Model';
      case 'hf_space':
        return 'HF Space';
      case 'hf_endpoint':
        return 'HF Endpoint';
      case 'self_hosted':
        return 'Self Hosted';
      default:
        return sourceType;
    }
  }

  function addVariantToCart(variantId: string) {
    addToCart(data.voice.id, variantId);
    cartMessage = 'Variant added to cart.';
  }

  function saveToCollection() {
    if (!selectedCollectionId) return;

    addVoiceToCollection(selectedCollectionId, data.voice.id);

    if (noteDraft.trim()) {
      updateCollectionVoiceNote(selectedCollectionId, data.voice.id, noteDraft.trim());
    }

    collectionMessage = 'Voice saved to collection.';
  }

  function createAndSave() {
    const name = quickCollectionName.trim();
    if (!name) return;

    createCollection(name);

    const created = $collections.find((collection) => collection.name.toLowerCase() === name.toLowerCase());
    if (!created) return;

    selectedCollectionId = created.id;
    addVoiceToCollection(created.id, data.voice.id);

    if (noteDraft.trim()) {
      updateCollectionVoiceNote(created.id, data.voice.id, noteDraft.trim());
    }

    collectionMessage = `Created "${created.name}" and saved voice.`;
    quickCollectionName = '';
  }

  function playPreview() {
    if (!browser || !previewVariant) return;
    if (!('speechSynthesis' in window)) {
      previewStatus = 'Browser speech preview is unavailable in this environment.';
      return;
    }

    const baseInput = previewInputMode === 'ssml' ? stripSsml(previewInput) : previewInput;
    const constrainedInput = truncateToVariantLimit(baseInput, previewVariant);
    if (!constrainedInput.trim()) {
      previewStatus = 'Preview text is empty after processing.';
      return;
    }

    const utterance = new SpeechSynthesisUtterance(constrainedInput);
    utterance.lang = data.voice.languages[0] ?? 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    const voiceMatch = speechSynthesis
      .getVoices()
      .find((entry) => entry.lang.toLowerCase() === utterance.lang.toLowerCase());
    if (voiceMatch) {
      utterance.voice = voiceMatch;
    }

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);

    if (baseInput.length > constrainedInput.length) {
      previewStatus = `Preview started. Input truncated to ${previewVariant.maxInputChars} chars.`;
      return;
    }

    previewStatus = 'Preview started.';
  }

  function stopPreview() {
    if (!browser || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    previewStatus = 'Preview stopped.';
  }
</script>

<svelte:head>
  <title>{data.voice.name} | Vokda</title>
</svelte:head>

<main>
  <a class="back-link" href="/">Back to catalog</a>

  <section class="profile-header">
    <p class="provider">{data.voice.provider}</p>
    <h1>{data.voice.name}</h1>
    <p class="description">{data.voice.description}</p>

    <p class="meta">{data.voice.languages.join(', ')} · {data.voice.qualityTier} tier</p>

    <ul class="tags">
      {#each data.voice.tags as tag}
        <li>{tag}</li>
      {/each}
    </ul>

    <p class="license">License: {data.voice.licenseNotes}</p>
  </section>

  <section>
    <h2>Audition Studio</h2>
    <div class="audition-panel">
      <label>
        Variant for preview
        <select bind:value={previewVariantId}>
          {#each data.voice.variants as variant}
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
          SSML input
        </label>
      </div>

      <label>
        Preview input
        <textarea bind:value={previewInput} placeholder="Enter text or SSML for quick audition"></textarea>
      </label>

      {#if previewWarnings.length > 0}
        <ul class="warnings">
          {#each previewWarnings as warning}
            <li>{warning}</li>
          {/each}
        </ul>
      {/if}

      <div class="actions">
        <button on:click={playPreview} disabled={!previewVariant}>Play Preview</button>
        <button class="ghost" on:click={stopPreview}>Stop</button>
      </div>

      {#if previewStatus}
        <p class="flash">{previewStatus}</p>
      {/if}
    </div>
  </section>

  <section>
    <h2>Samples</h2>
    <ul class="samples">
      {#each data.voice.samples as sample}
        <li>
          <h3>{sample.label}</h3>
          <p>{sample.transcript}</p>
          {#if sample.audioUrl}
            <audio controls src={sample.audioUrl}></audio>
          {:else}
            <p class="muted">Audio sample not linked yet.</p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <h2>Variants</h2>
    <ul class="variants">
      {#each data.voice.variants as variant}
        <li>
          <div class="row">
            <div>
              <h3>{sourceLabel(variant.sourceType)}</h3>
              <p class="source-key">{variant.sourceKey}</p>
            </div>
            <button on:click={() => addVariantToCart(variant.id)}>Add to Cart</button>
          </div>

          <div class="badges">
            <span class={variant.runnable ? 'ok' : 'warn'}>
              {variant.runnable ? 'Runnable' : 'Preview-only'}
            </span>
            <span class={variant.supportsSsml ? 'ok' : 'warn'}>
              {variant.supportsSsml ? 'SSML supported' : 'No SSML'}
            </span>
            <span>{variant.outputFormats.join(', ')}</span>
            <span>Max chars: {variant.maxInputChars}</span>
          </div>
        </li>
      {/each}
    </ul>

    {#if cartMessage}
      <p class="flash">{cartMessage}</p>
    {/if}
  </section>

  <section class="collection-panel">
    <h2>Save To Collection</h2>

    <label>
      Existing collections
      <select bind:value={selectedCollectionId}>
        <option value="">Select a collection</option>
        {#each $collections as collection}
          <option value={collection.id}>{collection.name}</option>
        {/each}
      </select>
    </label>

    <label>
      Curator note
      <textarea bind:value={noteDraft} placeholder="Why this voice belongs in your set"></textarea>
    </label>

    <div class="actions">
      <button on:click={saveToCollection} disabled={!selectedCollectionId}>Save to Selected</button>
    </div>

    <div class="create-row">
      <input bind:value={quickCollectionName} placeholder="New collection name" />
      <button class="ghost" on:click={createAndSave}>Create + Save</button>
    </div>

    {#if collectionMessage}
      <p class="flash">{collectionMessage}</p>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 1040px;
    margin: 0 auto;
    padding: 0.6rem 1rem 3rem;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 0.9rem;
    color: #1e5979;
    font-weight: 700;
    text-decoration: none;
  }

  .profile-header {
    border: 1px solid #c6d4e1;
    border-radius: 16px;
    padding: 1rem;
    background: linear-gradient(145deg, #f7fbff 0%, #edf4fa 100%);
    display: grid;
    gap: 0.42rem;
  }

  .provider {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.78rem;
    color: #4a657f;
    font-weight: 700;
  }

  .description,
  .meta {
    color: #37546d;
  }

  .tags {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0;
    margin: 0.25rem 0 0;
  }

  .tags li {
    border-radius: 999px;
    border: 1px solid #cfdeeb;
    background: #eaf2fa;
    padding: 0.16rem 0.48rem;
    font-size: 0.79rem;
    font-weight: 600;
    color: #2f4d68;
  }

  .license {
    margin-top: 0.2rem;
    color: #6f4d1b;
    font-size: 0.9rem;
  }

  section {
    margin-top: 1rem;
  }

  h2 {
    margin-bottom: 0.55rem;
  }

  .samples,
  .variants {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.68rem;
  }

  .samples li,
  .variants li,
  .collection-panel {
    border: 1px solid #c4d2df;
    border-radius: 14px;
    background: #fff;
    padding: 0.86rem;
  }

  .audition-panel {
    border: 1px solid #c4d2df;
    border-radius: 14px;
    background: #fff;
    padding: 0.86rem;
  }

  .mode-row {
    margin-top: 0.6rem;
    display: flex;
    gap: 0.8rem;
  }

  .mode-option {
    margin-top: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.86rem;
  }

  .warnings {
    margin: 0.65rem 0 0;
    padding-left: 1.05rem;
    color: #714816;
  }

  .samples p,
  .muted,
  .source-key {
    margin-top: 0.35rem;
    color: #3e5972;
  }

  audio {
    width: 100%;
    margin-top: 0.52rem;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .source-key {
    font-size: 0.8rem;
    font-family: Menlo, Monaco, monospace;
  }

  .badges {
    margin-top: 0.58rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .badges span {
    border-radius: 999px;
    padding: 0.16rem 0.48rem;
    font-size: 0.79rem;
    font-weight: 620;
    color: #2d4861;
    background: #eaf1f8;
    border: 1px solid #d3e0eb;
  }

  .ok {
    color: #1f5a30;
    background: #d8f2dd;
    border-color: #bfe3c7;
  }

  .warn {
    color: #744c17;
    background: #f7e8d2;
    border-color: #eed7b7;
  }

  .collection-panel {
    margin-top: 1rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.7rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #3e5871;
  }

  select,
  textarea,
  input {
    border: 1px solid #b7c7d5;
    border-radius: 10px;
    padding: 0.55rem 0.72rem;
    background: #fff;
    font-size: 0.94rem;
    box-sizing: border-box;
    width: 100%;
  }

  textarea {
    min-height: 90px;
    resize: vertical;
  }

  .actions {
    margin-top: 0.7rem;
  }

  .create-row {
    margin-top: 0.8rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.55rem;
  }

  button {
    border: none;
    border-radius: 10px;
    padding: 0.5rem 0.8rem;
    background: #1f5f7f;
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .ghost {
    background: #eff4f8;
    color: #2f4760;
    border: 1px solid #bdccda;
  }

  button[disabled] {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .flash {
    margin-top: 0.65rem;
    color: #1d5a39;
    font-weight: 650;
  }
</style>
