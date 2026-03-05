<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
  import {
    addVoiceToCollection,
    collections,
    createCollection,
    deleteCollection,
    removeVoiceFromCollection,
    updateCollectionVoiceNote
  } from '$lib/stores/app-state';
  import type { Voice } from '$lib/types';

  export let data: { voices: Voice[] };

  let newCollectionName = '';

  function create() {
    createCollection(newCollectionName);
    newCollectionName = '';
  }

  function voiceById(id: string) {
    return data.voices.find((voice) => voice.id === id);
  }

  function onAddVoice(collectionId: string, event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const voiceId = select.value;
    if (!voiceId) return;

    addVoiceToCollection(collectionId, voiceId);
    select.value = '';
  }

  function onNoteInput(collectionId: string, voiceId: string, event: Event) {
    const target = event.currentTarget as HTMLTextAreaElement;
    updateCollectionVoiceNote(collectionId, voiceId, target.value);
  }
</script>

<svelte:head>
  <title>Collections | Vokda</title>
</svelte:head>

<main>
  <section class="header">
    <h1>Collections</h1>
    <p>Build reusable voice sets for projects, scenes, and publishing workflows.</p>
  </section>

  {#if !$roleFlags.isGuest}
    <p class="empty">Sign in as a registered guest or higher to save and manage collections.</p>
  {:else}
    <section class="new-collection">
      <input bind:value={newCollectionName} placeholder="Collection name (e.g. Documentary Narrators)" />
      <button on:click={create}>Create Collection</button>
    </section>

    {#if $collections.length === 0}
      <p class="empty">No collections yet. Create one and start curating.</p>
    {:else}
      <section class="grid">
        {#each $collections as collection}
          <article>
            <header>
              <div>
                <h2>{collection.name}</h2>
                <p>{collection.voiceIds.length} voices</p>
              </div>
              <button class="ghost" on:click={() => deleteCollection(collection.id)}>Delete</button>
            </header>

            <label>
              Add voice
              <select on:change={(event) => onAddVoice(collection.id, event)}>
                <option value="">Select a voice</option>
                {#each data.voices as voice}
                  <option value={voice.id}>{voice.provider} · {voice.name}</option>
                {/each}
              </select>
            </label>

            {#if collection.voiceIds.length === 0}
              <p class="empty-inline">No voices in this collection yet.</p>
            {:else}
              <ul>
                {#each collection.voiceIds as voiceId}
                  {@const voice = voiceById(voiceId)}
                  {#if voice}
                    <li>
                      <div class="entry">
                        <strong>{voice.name}</strong>
                        <small>{voice.provider}</small>
                        <textarea
                          placeholder="Curator notes"
                          value={collection.notesByVoiceId[voice.id] ?? ''}
                          on:input={(event) => onNoteInput(collection.id, voice.id, event)}
                        />
                      </div>
                      <button class="ghost" on:click={() => removeVoiceFromCollection(collection.id, voice.id)}>
                        Remove
                      </button>
                    </li>
                  {/if}
                {/each}
              </ul>
            {/if}
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
    padding: 0.7rem 1rem 3rem;
  }

  .header h1 {
    margin: 0;
  }

  .header p {
    margin: 0.35rem 0 0;
    color: #3f5972;
  }

  .new-collection {
    margin: 1rem 0 1.2rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.6rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 0.9rem;
  }

  article {
    border: 1px solid #c2d1de;
    border-radius: 16px;
    background: #fff;
    padding: 0.95rem;
    display: grid;
    gap: 0.8rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  header p {
    margin: 0.2rem 0 0;
    font-size: 0.84rem;
    color: #516981;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.88rem;
    font-weight: 600;
    color: #3f5871;
  }

  input,
  select,
  textarea {
    border: 1px solid #b7c7d6;
    border-radius: 10px;
    padding: 0.55rem 0.72rem;
    background: #fff;
    font-size: 0.94rem;
    width: 100%;
    box-sizing: border-box;
  }

  textarea {
    margin-top: 0.42rem;
    min-height: 84px;
    resize: vertical;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.6rem;
  }

  li {
    border: 1px solid #d6e1ec;
    border-radius: 12px;
    background: #f9fbff;
    padding: 0.68rem;
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .entry {
    min-width: 0;
    flex: 1;
  }

  strong,
  small {
    display: block;
  }

  small {
    color: #4f677f;
    margin-top: 0.2rem;
  }

  .empty,
  .empty-inline {
    color: #4f667d;
    border: 1px dashed #bccad8;
    border-radius: 12px;
    padding: 0.75rem;
    background: #ffffff9b;
  }

  button {
    border: none;
    border-radius: 10px;
    padding: 0.5rem 0.8rem;
    background: #1e5b7b;
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .ghost {
    background: #eff4f8;
    color: #2f4760;
    border: 1px solid #bdccda;
  }

  @media (max-width: 760px) {
    .new-collection {
      grid-template-columns: 1fr;
    }
  }
</style>
