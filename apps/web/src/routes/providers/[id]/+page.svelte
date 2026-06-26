<script lang="ts">
  import type { PageData } from './$types';
  import { getProviderCatalogEntry } from '$lib/provider-catalog';
  import { providerCatalog } from '$lib/stores/app-state';
  import { PROVIDER_AUTH_CONFIGS } from '$lib/synthesis/provider-auth';
  import { getProviderColor } from '$lib/provider-colors';
  import { getLanguageDisplayName } from '$lib/language-utils';
  import Icon from '$lib/components/Icon.svelte';

  export let data: PageData;

  $: entry = getProviderCatalogEntry(data.providerId, data.voices, $providerCatalog, PROVIDER_AUTH_CONFIGS);
  $: providerVoices = data.voices.filter((v) => v.providerId === data.providerId);
  $: color = getProviderColor(data.providerId);
  $: langNames = entry ? entry.languages.slice(0, 10).map((l) => getLanguageDisplayName(l.split('-')[0])) : [];

  const TYPE_LABEL: Record<string, string> = {
    cloud_provider: 'Cloud API',
    open_model: 'Open model',
    self_hosted: 'Self-hosted',
    other: 'Provider',
  };
</script>

<svelte:head>
  <title>{entry?.name ?? data.providerId} voices | Vokda</title>
</svelte:head>

<main>
  {#if !entry}
    <p class="empty">
      No provider named “{data.providerId}”. <a href="/">Browse the catalog →</a>
    </p>
  {:else}
    <a class="back" href="/">
      <Icon name="arrow-left" size={14} /> All voices
    </a>

    <header class="hero" style="--accent: {color.text}; --accent-bg: {color.bg};">
      <span class="dot"></span>
      <div class="head-main">
        <h1>{entry.name}</h1>
        <div class="meta">
          <span class="type-badge">{TYPE_LABEL[entry.type] ?? 'Provider'}</span>
          <span><strong>{entry.voiceCount}</strong> voice{entry.voiceCount === 1 ? '' : 's'}</span>
          <span><strong>{entry.languageCount}</strong> language{entry.languageCount === 1 ? '' : 's'}</span>
          {#if entry.ssmlSupport}<span class="ok"><Icon name="check" size={12} /> SSML</span>{/if}
        </div>
      </div>
      {#if entry.websiteUrl}
        <a class="ghost-btn" href={entry.websiteUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="globe" size={14} /> Website
        </a>
      {/if}
    </header>

    <section class="info-grid">
      <div class="panel">
        <h2>Pricing &amp; access</h2>
        {#if entry.pricingSummary}<p class="pricing">{entry.pricingSummary}</p>{/if}
        {#if entry.freeTier}<p class="free">🎁 {entry.freeTier}</p>{/if}
        {#if !entry.pricingSummary && !entry.freeTier}<p class="muted">See the provider website for current pricing.</p>{/if}
        <div class="cta-row">
          <a class="primary-btn" href="/account/providers">
            <Icon name="key" size={14} /> Connect this provider
          </a>
          {#if entry.pricingUrl}
            <a class="ghost-btn" href={entry.pricingUrl} target="_blank" rel="noopener noreferrer">Pricing details</a>
          {/if}
        </div>
      </div>

      {#if entry.features?.length || langNames.length}
        <div class="panel">
          <h2>Capabilities</h2>
          {#if entry.features?.length}
            <ul class="features">
              {#each entry.features as feature}<li><Icon name="check" size={12} /> {feature}</li>{/each}
            </ul>
          {/if}
          {#if langNames.length}
            <p class="langs"><strong>Languages:</strong> {langNames.join(', ')}{entry.languageCount > langNames.length ? `, +${entry.languageCount - langNames.length} more` : ''}</p>
          {/if}
        </div>
      {/if}
    </section>

    <section class="gallery">
      <h2>{entry.name} voices</h2>
      <div class="grid">
        {#each providerVoices as voice (voice.id)}
          <a class="vcard" href="/voices/{voice.id}">
            <div class="thumb" style="background: {color.bg};">
              {#if voice.imageUrl}
                <img src={voice.imageUrl} alt={voice.name} loading="lazy" />
              {:else}
                <span class="thumb-initial" style="color: {color.text};">{voice.name.charAt(0)}</span>
              {/if}
            </div>
            <div class="vmeta">
              <span class="vname">{voice.name}</span>
              <span class="vsub">
                {#if voice.metadata?.genderPresentation}{voice.metadata.genderPresentation}{/if}
                {#if voice.qualityTier} · {voice.qualityTier}{/if}
              </span>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: reveal 320ms ease;
  }
  @keyframes reveal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .empty { color: #6a8197; padding: 2rem 0; }
  .empty a, .back { color: var(--brand-700); text-decoration: none; font-weight: 660; }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--text-small);
    margin-bottom: 0.8rem;
  }
  .back:hover { text-decoration: underline; }

  .hero {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--stroke-soft);
    border-radius: var(--radius-md);
    padding: 1rem 1.1rem;
    box-shadow: var(--elev-1);
  }
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }
  .head-main { flex: 1; }
  h1 { margin: 0; font-size: var(--text-display); color: var(--bg-ink); }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.7rem;
    margin-top: 0.3rem;
    font-size: var(--text-small);
    color: #4a657a;
  }
  .type-badge {
    background: var(--accent-bg);
    color: var(--accent);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    font-weight: 680;
    font-size: var(--text-xs);
  }
  .ok { display: inline-flex; align-items: center; gap: 0.2rem; color: #2e7d32; }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.9rem;
    margin: 1rem 0;
  }
  .panel {
    background: var(--surface-2);
    border: 1px solid var(--stroke-soft);
    border-radius: var(--radius-md);
    padding: 1rem 1.1rem;
  }
  .panel h2 { margin: 0 0 0.6rem; font-size: var(--text-body); color: var(--bg-ink); }
  .pricing { font-weight: 680; color: #173046; margin: 0.2rem 0; }
  .free { color: var(--accent-700); margin: 0.3rem 0; }
  .muted { color: #6a8197; font-size: var(--text-small); }
  .features { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .features li { display: flex; align-items: center; gap: 0.4rem; font-size: var(--text-small); color: #3e5972; }
  .langs { font-size: var(--text-small); color: #3e5972; margin: 0.6rem 0 0; }

  .cta-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.9rem; }
  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: none;
    border-radius: 12px;
    padding: 0.5rem 0.95rem;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    font-weight: 680;
    font-size: var(--text-small);
    text-decoration: none;
  }
  .primary-btn:hover { box-shadow: var(--elev-1); }
  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--stroke-strong);
    background: var(--surface-2);
    border-radius: 12px;
    padding: 0.45rem 0.8rem;
    font-size: var(--text-small);
    font-weight: 660;
    color: #3e5972;
    text-decoration: none;
  }
  .ghost-btn:hover { border-color: var(--brand-600); color: var(--brand-700); }

  .gallery { margin-top: 1.4rem; }
  .gallery h2 { font-size: var(--text-body); color: var(--bg-ink); margin: 0 0 0.7rem; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.7rem;
  }
  .vcard {
    display: flex;
    flex-direction: column;
    background: var(--surface-2);
    border: 1px solid var(--stroke-soft);
    border-radius: var(--radius-sm);
    overflow: hidden;
    text-decoration: none;
    transition: transform 140ms ease, box-shadow 140ms ease;
  }
  .vcard:hover { transform: translateY(-2px); box-shadow: var(--elev-1); }
  .thumb {
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .thumb-initial { font-size: 2rem; font-weight: 760; }
  .vmeta { padding: 0.5rem 0.6rem; }
  .vname { display: block; font-weight: 680; color: var(--bg-ink); font-size: var(--text-small); }
  .vsub { display: block; color: #6a8197; font-size: var(--text-xs); text-transform: capitalize; }
</style>
