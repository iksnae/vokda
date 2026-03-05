<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
  import {
    collections,
    createCollection,
    deleteCollection
  } from '$lib/stores/app-state';
  import { buildEffectiveCatalog } from '$lib/voice-catalog';
  import { customVoices, metadataOverrides } from '$lib/stores/app-state';
  import { getProviderColor } from '$lib/provider-colors';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import { AUTH_MODE } from '$lib/auth/config';
  import type { Voice } from '$lib/types';

  const authMode = AUTH_MODE;

  export let data: { voices: Voice[] };
  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  let newCollectionName = '';

  function create() {
    const name = newCollectionName.trim();
    if (!name) return;
    createCollection(name);
    newCollectionName = '';
    addToast(`Created "${name}".`);
  }

  function handleDelete(collectionId: string, collectionName: string) {
    deleteCollection(collectionId);
    addToast(`Deleted "${collectionName}".`);
  }

  function voiceById(id: string) {
    return effectiveVoices.find((v) => v.id === id);
  }

  function collectionPreviewVoices(voiceIds: string[]): Voice[] {
    return voiceIds
      .slice(0, 4)
      .map((id) => voiceById(id))
      .filter((v): v is Voice => Boolean(v));
  }
</script>

<svelte:head>
  <title>Collections | Vokda</title>
  <link rel="canonical" href="https://vokda.iksnae.com/collections" />
  <meta property="og:url" content="https://vokda.iksnae.com/collections" />
  <meta property="og:title" content="Voice Collections | Vokda" />
  <meta property="og:description" content="Curate and organize your favorite TTS voices into collections." />
  <meta property="og:image" content="https://vokda.iksnae.com/og-image.png" />
  <meta name="twitter:title" content="Voice Collections | Vokda" />
  <meta name="twitter:description" content="Curate and organize your favorite TTS voices into collections." />
  <meta name="twitter:image" content="https://vokda.iksnae.com/og-image.png" />
</svelte:head>

<main>
  <section class="header">
    <h1>Collections</h1>
    <p>Build voice sets for projects, scenes, and publishing workflows.</p>
  </section>

  {#if !$roleFlags.isGuest && authMode === 'amplify'}
    <div class="auth-prompt">
      <p>Sign in to start building voice collections.</p>
      <p class="hint">Browse the <a href="/">catalog</a> to discover voices first.</p>
    </div>
  {:else}
    <section class="new-collection">
      <input
        bind:value={newCollectionName}
        placeholder="New collection name (e.g. Documentary Narrators)"
        on:keydown={(e) => { if (e.key === 'Enter') create(); }}
      />
      <button class="btn-primary" on:click={create}>
        <Icon name="plus" size={16} />
        Create
      </button>
    </section>

    {#if $collections.length === 0}
      <div class="empty-state">
        <p>Your collections will appear here.</p>
        <p class="hint">Pin voices from the <a href="/">catalog</a> to get started.</p>
      </div>
    {:else}
      <section class="grid">
        {#each $collections as collection}
          {@const previewVoices = collectionPreviewVoices(collection.voiceIds)}
          {@const extraCount = collection.voiceIds.length - previewVoices.length}
          <article>
            <div class="card-header">
              <div>
                <h2>{collection.name}</h2>
                <p class="count">{collection.voiceIds.length} voice{collection.voiceIds.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {#if previewVoices.length > 0}
              <div class="voice-previews">
                {#each previewVoices as voice}
                  {#if voice.imageUrl}
                    <img
                      class="mini-avatar-img"
                      src={voice.imageUrl}
                      alt={voice.name}
                      title={voice.name}
                      width="36"
                      height="36"
                      loading="lazy"
                    />
                  {:else}
                    {@const colors = getProviderColor(voice.providerId ?? voice.provider)}
                    <span
                      class="mini-avatar"
                      style="background:{colors.bg};border-color:{colors.border};color:{colors.text}"
                      title={voice.name}
                    >
                      {voice.name.slice(0, 2)}
                    </span>
                  {/if}
                {/each}
                {#if extraCount > 0}
                  <span class="mini-avatar extra">+{extraCount}</span>
                {/if}
              </div>
            {/if}

            <div class="card-actions">
              <a href="/collections/{collection.id}" class="btn-primary btn-sm">Open</a>
              <button class="btn-ghost btn-sm btn-danger" on:click={() => handleDelete(collection.id, collection.name)}>
                <Icon name="trash" size={14} />
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

  .header {
    padding: 1.2rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 20px;
    background: linear-gradient(148deg, #f8fbfd 0%, #eef4f8 100%);
    box-shadow: var(--elev-1);
  }

  .header h1 { margin: 0; font-size: var(--text-display); }
  .header p { margin: 0.35rem 0 0; color: #3f5972; font-size: var(--text-body); }

  .new-collection {
    margin: 1rem 0 1.2rem;
    display: flex;
    gap: 0.6rem;
  }

  .new-collection input {
    flex: 1;
    border: 1px solid #c0d1df;
    border-radius: 14px;
    padding: 0.6rem 0.82rem;
    background: #fff;
    font-size: var(--text-body);
    color: #173046;
  }

  .new-collection input:focus {
    border-color: var(--brand-600);
    box-shadow: 0 0 0 3px rgba(23, 112, 137, 0.12);
    outline: none;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.9rem;
  }

  article {
    border: 1px solid #cad9e5;
    border-radius: 18px;
    background: linear-gradient(180deg, #fff 0%, #fafcfd 100%);
    padding: 1rem;
    display: grid;
    gap: 0.65rem;
    box-shadow: 0 10px 24px rgba(16, 40, 59, 0.08);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  article:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(15, 39, 58, 0.12);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  h2 { margin: 0; font-size: var(--text-subhead); }
  .count { margin: 0.15rem 0 0; font-size: var(--text-small); color: #516981; }

  /* Mini voice avatars */
  .voice-previews {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .mini-avatar-img {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }

  .mini-avatar {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 720;
    border: 1px solid;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .mini-avatar.extra {
    background: #f0f3f6;
    border-color: #d0dce6;
    color: #547087;
  }

  .card-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: space-between;
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
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .btn-primary:hover {
    box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3);
  }

  .btn-sm {
    padding: 0.38rem 0.68rem;
    font-size: var(--text-small);
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid #c5d5e2;
    background: #f4f8fb;
    color: #325067;
    border-radius: 10px;
    padding: 0.38rem 0.55rem;
    font-weight: 650;
    font-size: var(--text-small);
    cursor: pointer;
  }

  .btn-ghost:hover {
    background: #edf2f7;
    border-color: #a8bccf;
  }

  .btn-danger { color: #7a2d1b; }
  .btn-danger:hover {
    background: #fef0ee;
    border-color: #e5b4ab;
  }

  .auth-prompt, .empty-state {
    margin-top: 1.5rem;
    text-align: center;
    padding: 2rem;
    border: 1px dashed #bccad8;
    border-radius: 16px;
    background: #ffffff9b;
    color: #4f667d;
  }

  .auth-prompt p, .empty-state p { margin: 0; }

  .hint {
    margin-top: 0.5rem !important;
    font-size: var(--text-small);
    color: #6b8298;
  }

  .hint a {
    color: var(--brand-600);
    font-weight: 650;
  }

  @keyframes appear {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 640px) {
    .new-collection {
      flex-direction: column;
    }
  }
</style>
