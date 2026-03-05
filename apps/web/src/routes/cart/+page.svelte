<script lang="ts">
  import { buildVoicePack, cartItems, clearCart, removeFromCart } from '$lib/stores/app-state';
  import { buildEffectiveCatalog } from '$lib/voice-catalog';
  import { customVoices, metadataOverrides } from '$lib/stores/app-state';
  import { getVariantWarnings } from '$lib/voice-utils';
  import type { Voice } from '$lib/types';

  export let data: { voices: Voice[] };

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  $: lineItems = $cartItems
    .map((item) => {
      const voice = effectiveVoices.find((entry) => entry.id === item.voiceId);
      if (!voice) return null;

      const variant = voice.variants.find((entry) => entry.id === item.variantId);
      if (!variant) return null;

      return { item, voice, variant, warnings: getVariantWarnings(voice, variant) };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  $: runnableCount = lineItems.filter((entry) => entry.variant.runnable).length;

  function downloadVoicePack() {
    const pack = buildVoicePack(effectiveVoices, $cartItems);
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `voice-catalog-import-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Cart | Vokda</title>
</svelte:head>

<main>
  <section class="hero">
    <h1>Cart</h1>
    <p>Finalize selected variants and export an import-ready voice catalog bundle.</p>

    <div class="stats">
      <article>
        <strong>{lineItems.length}</strong>
        <span>Selected Variants</span>
      </article>
      <article>
        <strong>{runnableCount}</strong>
        <span>Runnable</span>
      </article>
    </div>
  </section>

  {#if lineItems.length === 0}
    <p class="empty">Your cart is empty. Open a voice profile and add one or more variants.</p>
  {:else}
    <ul>
      {#each lineItems as { item, voice, variant, warnings }}
        <li>
          <div>
            <p class="provider">{voice.provider}</p>
            <h2>{voice.name}</h2>
            <p>{variant.sourceType} · {variant.sourceKey}</p>
            <p>Formats: {variant.outputFormats.join(', ')} · Max chars: {variant.maxInputChars}</p>
            <p class="license">{voice.licenseNotes}</p>
            {#if warnings.length > 0}
              <ul class="warnings">
                {#each warnings as warning}
                  <li>{warning}</li>
                {/each}
              </ul>
            {/if}
          </div>
          <button class="ghost" on:click={() => removeFromCart(item.voiceId, item.variantId)}>Remove</button>
        </li>
      {/each}
    </ul>

    <div class="actions">
      <button on:click={downloadVoicePack}>Export Voice Catalog Bundle</button>
      <button class="ghost" on:click={clearCart}>Clear Cart</button>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1040px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: reveal 320ms ease;
  }

  .hero {
    border: 1px solid var(--stroke-soft);
    border-radius: 20px;
    padding: 1.05rem;
    background:
      radial-gradient(circle at 100% 0%, #dbeef5 0%, transparent 34%),
      linear-gradient(148deg, #f8fbfd 0%, #eef4f8 100%);
    box-shadow: var(--elev-1);
  }

  h1 {
    margin: 0;
  }

  .hero > p {
    margin: 0.35rem 0 0;
    color: #46617a;
  }

  .stats {
    margin-top: 0.8rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 160px));
    gap: 0.55rem;
  }

  .stats article {
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid #cfdce8;
    border-radius: 12px;
    padding: 0.6rem;
  }

  .stats strong {
    display: block;
    font-size: 1.2rem;
  }

  .stats span {
    font-size: 0.86rem;
    color: #4f687f;
  }

  ul {
    list-style: none;
    margin: 1rem 0;
    padding: 0;
    display: grid;
    gap: 0.8rem;
  }

  li {
    border: 1px solid #cad8e3;
    border-radius: 16px;
    background: linear-gradient(180deg, #fff 0%, #fbfdfe 100%);
    padding: 0.9rem;
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    box-shadow: 0 10px 22px rgba(16, 39, 57, 0.08);
  }

  .provider {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.78rem;
    color: #4a657f;
    font-weight: 700;
  }

  h2 {
    margin: 0.25rem 0;
    font-size: 1.08rem;
  }

  p {
    margin: 0.2rem 0;
    color: #35536d;
  }

  .license {
    color: #6f4d1b;
  }

  .warnings {
    margin: 0.45rem 0 0;
    padding-left: 1.05rem;
    color: #744b18;
    font-size: 0.86rem;
  }

  .actions {
    display: flex;
    gap: 0.6rem;
  }

  .empty {
    margin-top: 1rem;
    border: 1px dashed #b3c3d2;
    border-radius: 12px;
    padding: 0.85rem;
    background: #ffffff88;
    color: #465f78;
  }

  button {
    border: none;
    border-radius: 11px;
    padding: 0.52rem 0.82rem;
    background: linear-gradient(154deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .ghost {
    background: #eff4f8;
    color: #2e4860;
    border: 1px solid #bdcbd9;
  }

  @keyframes reveal {
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
