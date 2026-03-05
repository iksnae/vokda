<script lang="ts">
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voice: Voice };

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
</script>

<svelte:head>
  <title>{data.voice.name} | Vokda</title>
</svelte:head>

<main>
  <a class="back-link" href="/">Back to catalog</a>

  <header>
    <h1>{data.voice.name}</h1>
    <p>{data.voice.description}</p>
    <p class="meta">{data.voice.languages.join(', ')} | {data.voice.qualityTier}</p>

    <ul class="tags">
      {#each data.voice.tags as tag}
        <li>{tag}</li>
      {/each}
    </ul>
  </header>

  <section>
    <h2>Variants</h2>
    <ul class="variants">
      {#each data.voice.variants as variant}
        <li>
          <h3>{sourceLabel(variant.sourceType)}</h3>
          <div class="badges">
            <span class={variant.runnable ? 'ok' : 'warn'}>
              {variant.runnable ? 'Runnable' : 'Preview-only'}
            </span>
            <span class={variant.supportsSsml ? 'ok' : 'warn'}>
              {variant.supportsSsml ? 'SSML supported' : 'No SSML'}
            </span>
          </div>
          <p class="variant-id">Variant ID: {variant.id}</p>
        </li>
      {/each}
    </ul>
  </section>
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
    margin: 0;
    font-size: 2rem;
  }

  h2 {
    margin-top: 2rem;
  }

  .meta {
    color: #445567;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: #1e5d7a;
    font-weight: 600;
    text-decoration: none;
  }

  .tags,
  .variants {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .tags li {
    background: #dcecf3;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    font-size: 0.9rem;
  }

  .variants {
    display: grid;
    gap: 0.8rem;
  }

  .variants li {
    border: 1px solid #c5d0dd;
    border-radius: 12px;
    padding: 1rem;
    background: #fff;
  }

  h3 {
    margin: 0 0 0.4rem;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .badges span {
    border-radius: 999px;
    padding: 0.2rem 0.55rem;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .ok {
    background: #d6f2dd;
    color: #1d5a2b;
  }

  .warn {
    background: #f8e6cd;
    color: #764b12;
  }

  .variant-id {
    margin-top: 0.7rem;
    font-family: Menlo, Monaco, monospace;
    font-size: 0.8rem;
    color: #445567;
  }
</style>
