<script lang="ts">
  import type { Voice } from '$lib/types';

  export let data: { voices: Voice[] };

  let query = '';

  $: filtered = data.voices.filter((voice) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return (
      voice.name.toLowerCase().includes(q) ||
      voice.description.toLowerCase().includes(q) ||
      voice.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
</script>

<svelte:head>
  <title>Vokda Catalog</title>
</svelte:head>

<main>
  <h1>Vokda</h1>
  <p>Voice catalog MVP (S3-backed index)</p>

  <label>
    Search voices
    <input bind:value={query} placeholder="narrator, warm, multilingual..." />
  </label>

  <ul>
    {#each filtered as voice}
      <li>
        <h2>{voice.name}</h2>
        <p>{voice.description}</p>
        <p>{voice.languages.join(', ')} | {voice.qualityTier}</p>
      </li>
    {:else}
      <li>No voices matched the current search.</li>
    {/each}
  </ul>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    background: linear-gradient(180deg, #f2f7f9 0%, #e9eef6 100%);
    color: #16202a;
  }

  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem 3rem;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }

  label {
    display: grid;
    gap: 0.4rem;
    margin: 1rem 0 1.5rem;
  }

  input {
    border: 1px solid #9aa8b8;
    border-radius: 10px;
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.8rem;
  }

  li {
    border: 1px solid #c5d0dd;
    border-radius: 12px;
    padding: 1rem;
    background: #fff;
  }

  h2 {
    margin: 0 0 0.4rem;
    font-size: 1.1rem;
  }

  p {
    margin: 0.2rem 0;
  }
</style>
