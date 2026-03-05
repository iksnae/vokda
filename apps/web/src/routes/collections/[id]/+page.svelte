<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
  import {
    collections,
    removeVoiceFromCollection,
    reorderCollectionVoices,
    renameCollection,
    updateCollectionVoiceNote,
    deleteCollection,
    buildVoicePack
  } from '$lib/stores/app-state';
  import { buildEffectiveCatalog } from '$lib/voice-catalog';
  import { customVoices, metadataOverrides } from '$lib/stores/app-state';
  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import { AUTH_MODE } from '$lib/auth/config';
  import type { Voice } from '$lib/types';

  const authMode = AUTH_MODE;

  export let data: { voices: Voice[]; collectionId: string };

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);
  $: collection = $collections.find((c) => c.id === data.collectionId) ?? null;

  $: collectionVoices = collection
    ? collection.voiceIds
        .map((id) => effectiveVoices.find((v) => v.id === id))
        .filter((v): v is Voice => Boolean(v))
    : [];

  let editingName = false;
  let nameInput = '';

  function startEditName() {
    if (!collection) return;
    nameInput = collection.name;
    editingName = true;
    // Focus the input after render
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>('.name-input');
      el?.focus();
      el?.select();
    });
  }

  function saveNameEdit() {
    if (!collection) return;
    const trimmed = nameInput.trim();
    editingName = false;
    if (!trimmed || trimmed === collection.name) return;
    renameCollection(collection.id, trimmed);
    addToast(`Renamed to "${trimmed}".`);
  }

  function onNoteInput(voiceId: string, event: Event) {
    if (!collection) return;
    const target = event.currentTarget as HTMLTextAreaElement;
    updateCollectionVoiceNote(collection.id, voiceId, target.value);
  }

  function moveVoice(voiceId: string, direction: 'up' | 'down') {
    if (!collection) return;
    const ids = [...collection.voiceIds];
    const idx = ids.indexOf(voiceId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    reorderCollectionVoices(collection.id, ids);
  }

  function removeVoice(voiceId: string) {
    if (!collection) return;
    removeVoiceFromCollection(collection.id, voiceId);
    addToast('Voice removed from collection.');
  }

  function exportCollection() {
    if (!collection) return;

    const pack = buildVoicePack(collection.name, effectiveVoices, collection.voiceIds);
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-voice-pack.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast(`Exported "${collection.name}" voice pack.`);
  }

  function handleDelete() {
    if (!collection) return;
    const name = collection.name;
    deleteCollection(collection.id);
    addToast(`Deleted "${name}".`);
    window.history.back();
  }
</script>

<svelte:head>
  <title>{collection ? `${collection.name} | Collections` : 'Collection'} | Vokda</title>
</svelte:head>

<main>
  <a class="back-link" href="/collections">
    <Icon name="arrow-left" size={16} />
    Collections
  </a>

  {#if !collection}
    <div class="empty-state">
      <p>Collection not found. It may have been deleted.</p>
      <a href="/collections" class="btn-primary">Back to Collections</a>
    </div>
  {:else if !$roleFlags.isGuest && authMode === 'amplify'}
    <div class="empty-state">
      <p>Sign in to view and manage your collections.</p>
    </div>
  {:else}
    <section class="collection-header">
      <div class="header-top">
        <div>
          {#if editingName}
            <input
              class="name-input"
              bind:value={nameInput}
              on:blur={saveNameEdit}
              on:keydown={(e) => { if (e.key === 'Enter') saveNameEdit(); if (e.key === 'Escape') { editingName = false; } }}
            />
          {:else}
            <h1>
              <button class="name-edit-btn" on:click={startEditName} aria-label="Edit collection name">
                {collection.name}
                <Icon name="pencil" size={16} />
              </button>
            </h1>
          {/if}
          <p class="voice-count">{collectionVoices.length} voice{collectionVoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" on:click={exportCollection} disabled={collectionVoices.length === 0}>
            <Icon name="export" size={16} />
            Export Voice Pack
          </button>
          <button class="btn-ghost btn-danger" on:click={handleDelete}>
            <Icon name="trash" size={16} />
            Delete
          </button>
        </div>
      </div>
    </section>

    {#if collectionVoices.length === 0}
      <div class="empty-state">
        <p>No voices in this collection yet.</p>
        <p class="hint">Pin voices from the <a href="/">catalog</a> to add them here.</p>
      </div>
    {:else}
      <section class="voice-grid">
        {#each collectionVoices as voice, i}
          {@const colors = getProviderColor(voice.providerId ?? voice.provider)}
          <article class="voice-card">
            <div class="card-top">
              <div class="card-top-left">
                {#if voice.imageUrl}
                  <img class="voice-thumb" src={voice.imageUrl} alt="" width="44" height="44" loading="lazy" />
                {/if}
                <span
                  class="provider-badge"
                  style="background:{colors.bg};border-color:{colors.border};color:{colors.text}"
                >
                  {voice.provider}
                </span>
              </div>
              <div class="card-top-right">
                <span class="tier">{voice.qualityTier}</span>
                <div class="reorder-btns">
                  <button class="reorder-btn" disabled={i === 0} on:click={() => moveVoice(voice.id, 'up')} aria-label="Move up" title="Move up">
                    <Icon name="chevron-up" size={14} />
                  </button>
                  <button class="reorder-btn" disabled={i === collectionVoices.length - 1} on:click={() => moveVoice(voice.id, 'down')} aria-label="Move down" title="Move down">
                    <Icon name="chevron-down" size={14} />
                  </button>
                </div>
              </div>
            </div>

            <a class="voice-link" href="/voices/{voice.id}">
              <h3>{voice.name}</h3>
              <p class="short-label">{voice.metadata.shortLabel}</p>
            </a>

            <div class="chips">
              {#each voice.languages as lang}
                <span class="chip">{lang}</span>
              {/each}
              {#each voice.tags.slice(0, 3) as tag}
                <span class="chip tag-chip">{tag}</span>
              {/each}
            </div>

            <textarea
              class="note-input"
              placeholder="Your notes about this voice..."
              value={collection.notesByVoiceId[voice.id] ?? ''}
              on:input={(e) => onNoteInput(voice.id, e)}
            />

            <div class="card-actions">
              <a href="/voices/{voice.id}" class="btn-ghost btn-sm">Details</a>
              <button class="btn-ghost btn-sm btn-danger" on:click={() => removeVoice(voice.id)}>
                <Icon name="x" size={14} />
                Remove
              </button>
            </div>
          </article>
        {/each}
      </section>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: appear 320ms ease;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #1e5979;
    font-weight: 700;
    text-decoration: none;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .collection-header {
    padding: 1.2rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 20px;
    background: linear-gradient(148deg, #f8fbfd 0%, #eef4f8 100%);
    box-shadow: var(--elev-1);
    margin-bottom: 1.2rem;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
  }

  .name-edit-btn {
    all: unset;
    cursor: pointer;
    font: inherit;
    font-weight: inherit;
  }

  .name-edit-btn:hover {
    color: var(--brand-600);
  }

  .name-input {
    font-size: 1.4rem;
    font-weight: 700;
    border: 1px solid var(--brand-600);
    border-radius: 10px;
    padding: 0.3rem 0.5rem;
    background: #fff;
  }

  .voice-count {
    margin: 0.25rem 0 0;
    color: #4f667d;
    font-size: 0.9rem;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.9rem;
  }

  .voice-card {
    border: 1px solid #c9d7e3;
    border-radius: 16px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfdfe 100%);
    padding: 1rem;
    display: grid;
    gap: 0.5rem;
    box-shadow: 0 8px 20px rgba(17, 38, 56, 0.07);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .voice-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(15, 39, 58, 0.1);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.4rem;
  }

  .card-top-left {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .card-top-right {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .voice-thumb {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }

  .reorder-btns {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .reorder-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 18px;
    border: 1px solid #d0dce6;
    background: #f4f8fb;
    color: #4a6580;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
  }

  .reorder-btn:hover:not(:disabled) {
    background: #e4edf4;
    border-color: #a8bccf;
  }

  .reorder-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .provider-badge {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.18rem 0.52rem;
    border: 1px solid;
  }

  .tier {
    font-size: 0.72rem;
    border-radius: 999px;
    padding: 0.19rem 0.52rem;
    background: #e4f2f8;
    color: #234c63;
    font-weight: 720;
  }

  .voice-link {
    text-decoration: none;
    color: inherit;
  }

  .voice-link:hover h3 {
    color: var(--brand-600);
  }

  h3 {
    margin: 0;
    font-size: 1.05rem;
    transition: color 150ms;
  }

  .short-label {
    margin: 0.15rem 0 0;
    font-size: 0.84rem;
    color: #3a5469;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .chip {
    background: #e9f1f6;
    border: 1px solid #d2dee8;
    border-radius: 999px;
    padding: 0.14rem 0.45rem;
    font-size: 0.7rem;
    font-weight: 620;
    color: #334f66;
  }

  .tag-chip {
    background: #edf5ee;
    border-color: #d4e4d8;
    color: #41633e;
  }

  .note-input {
    border: 1px solid #d0dce6;
    border-radius: 10px;
    padding: 0.45rem 0.6rem;
    font-size: 0.84rem;
    min-height: 56px;
    resize: vertical;
    background: #fafcfe;
    color: #2a4560;
    font-family: inherit;
  }

  .note-input:focus {
    outline: 2px solid var(--brand-600);
    outline-offset: 1px;
  }

  .card-actions {
    display: flex;
    gap: 0.4rem;
    justify-content: space-between;
    align-items: center;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    border-radius: 11px;
    padding: 0.5rem 0.85rem;
    background: linear-gradient(152deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    font-weight: 680;
    font-size: 0.88rem;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .btn-primary:hover {
    box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid #c5d5e2;
    background: #f4f8fb;
    color: #325067;
    border-radius: 10px;
    padding: 0.45rem 0.72rem;
    font-weight: 650;
    font-size: 0.86rem;
    cursor: pointer;
    text-decoration: none;
  }

  .btn-ghost:hover {
    background: #edf2f7;
    border-color: #a8bccf;
  }

  .btn-sm {
    padding: 0.32rem 0.55rem;
    font-size: 0.8rem;
  }

  .btn-danger {
    color: #7a2d1b;
  }

  .btn-danger:hover {
    background: #fef0ee;
    border-color: #e5b4ab;
  }

  .empty-state {
    margin-top: 1.5rem;
    text-align: center;
    padding: 2rem;
    border: 1px dashed #bccad8;
    border-radius: 16px;
    background: #ffffff9b;
    color: #4f667d;
  }

  .empty-state p {
    margin: 0;
  }

  .hint {
    margin-top: 0.5rem !important;
    font-size: 0.88rem;
    color: #6b8298;
  }

  .hint a {
    color: var(--brand-600);
    font-weight: 650;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .header-top {
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
    }

    .btn-primary,
    .btn-ghost {
      flex: 1;
      justify-content: center;
    }
  }
</style>
