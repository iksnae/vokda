<script lang="ts">
  import type { Voice } from '$lib/types';

  export let data: { voices: Voice[] };

  let query = '';
  let selectedLanguage = 'all';
  let selectedSource = 'all';
  let runnableOnly = false;
  let ssmlOnly = false;

  $: availableLanguages = Array.from(
    new Set(data.voices.flatMap((voice) => voice.languages))
  ).sort();

  $: availableSources = Array.from(
    new Set(data.voices.flatMap((voice) => voice.variants.map((variant) => variant.sourceType)))
  ).sort();

  $: filtered = data.voices.filter((voice) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      voice.name.toLowerCase().includes(q) ||
      voice.description.toLowerCase().includes(q) ||
      voice.tags.some((tag) => tag.toLowerCase().includes(q));

    const matchesLanguage =
      selectedLanguage === 'all' || voice.languages.includes(selectedLanguage);

    const matchesSource =
      selectedSource === 'all' ||
      voice.variants.some((variant) => variant.sourceType === selectedSource);

    const matchesRunnable = !runnableOnly || voice.variants.some((variant) => variant.runnable);

    const matchesSsml = !ssmlOnly || voice.variants.some((variant) => variant.supportsSsml);

    return matchesQuery && matchesLanguage && matchesSource && matchesRunnable && matchesSsml;
  });
</script>

<svelte:head>
  <title>Vokda Catalog</title>
</svelte:head>

<main>
  <h1>Vokda</h1>
  <p>Voice catalog MVP (app-owned data module)</p>

  <label>
    Search voices
    <input bind:value={query} placeholder="narrator, warm, multilingual..." />
  </label>

  <section class="filters">
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
      Source type
      <select bind:value={selectedSource}>
        <option value="all">All sources</option>
        {#each availableSources as source}
          <option value={source}>{source}</option>
        {/each}
      </select>
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={runnableOnly} />
      Runnable only
    </label>

    <label class="toggle">
      <input type="checkbox" bind:checked={ssmlOnly} />
      SSML supported
    </label>
  </section>

  <ul>
    {#each filtered as voice}
      <li>
        <h2>{voice.name}</h2>
        <p>{voice.description}</p>
        <p>{voice.languages.join(', ')} | {voice.qualityTier}</p>
        <p>{voice.variants.length} variant{voice.variants.length === 1 ? '' : 's'}</p>
        <a class="details-link" href={`/voices/${voice.id}`}>View details</a>
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

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    margin: 0 0 1.25rem;
  }

  select {
    border: 1px solid #9aa8b8;
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    font-size: 1rem;
    background: #fff;
  }

  .toggle {
    align-self: end;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
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

  .details-link {
    display: inline-block;
    margin-top: 0.6rem;
    border-radius: 8px;
    padding: 0.45rem 0.7rem;
    background: #1e5d7a;
    color: #fff;
    font-weight: 600;
    text-decoration: none;
  }
</style>
