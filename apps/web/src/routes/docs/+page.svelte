<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>Documentation | Vokda</title>
  <meta name="description" content="Vokda documentation — getting started, provider guides, SSML reference, and API docs for the TTS voice discovery hub." />
</svelte:head>

<main>
  <h1>Documentation</h1>
  <p class="subtitle">Everything you need to discover, audition, and integrate TTS voices.</p>

  <div class="doc-grid">
    <a href="/docs/getting-started" class="doc-card">
      <div class="doc-icon"><Icon name="arrow-right" size={20} /></div>
      <h2>Getting Started</h2>
      <p>Browse voices, play samples, create collections, and set up live synthesis in under 5 minutes.</p>
    </a>

    <a href="/docs/providers" class="doc-card">
      <div class="doc-icon"><Icon name="globe" size={20} /></div>
      <h2>Provider Guide</h2>
      <p>All 25 providers covered — cloud APIs, free services, and open-source models. Setup steps, capabilities, and pricing context.</p>
    </a>

    <a href="/docs/ssml" class="doc-card">
      <div class="doc-icon"><Icon name="sliders" size={20} /></div>
      <h2>SSML Reference</h2>
      <p>Control pronunciation, pacing, emphasis, and language with Speech Synthesis Markup Language. Tag reference and provider compatibility.</p>
    </a>

    <a href="/docs/api" class="doc-card">
      <div class="doc-icon"><Icon name="key" size={20} /></div>
      <h2>API Reference</h2>
      <p>Synthesize, manage clips, and administer keys programmatically. Full endpoint documentation with examples.</p>
    </a>
  </div>

  <section class="quick-links">
    <h2>Quick Links</h2>
    <div class="link-grid">
      <a href="/">Browse Voices</a>
      <a href="/about">About Vokda</a>
      <a href="/collections">My Collections</a>
      <a href="/account/clips">Audio Clips</a>
      <a href="/account/providers">Provider Keys</a>
      <a href="/account/api-keys">API Keys</a>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 780px;
    margin: 0 auto;
    padding: 0 1rem 4rem;
  }
  h1 { font-size: var(--text-display); margin: 1rem 0 0.25rem; }
  .subtitle { color: #4a6a82; margin: 0 0 1.5rem; }

  .doc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }
  .doc-card {
    padding: 1.1rem 1.2rem;
    border: 1px solid #d6e2ec;
    border-radius: 16px;
    background: #fff;
    text-decoration: none;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .doc-card:hover {
    border-color: var(--brand-600);
    box-shadow: 0 4px 16px rgba(20, 94, 121, 0.1);
  }
  .doc-icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 10px;
    background: linear-gradient(154deg, rgba(23, 112, 137, 0.08), rgba(23, 112, 137, 0.14));
    color: var(--brand-700);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.6rem;
  }
  .doc-card h2 {
    font-size: var(--text-body);
    font-weight: 720;
    color: #173046;
    margin: 0 0 0.3rem;
  }
  .doc-card p {
    font-size: var(--text-small);
    color: #4a6a82;
    margin: 0;
    line-height: 1.5;
  }

  .quick-links { margin-top: 2.5rem; }
  .quick-links h2 {
    font-size: 1.1rem;
    font-weight: 720;
    margin: 0 0 0.5rem;
    color: #173046;
  }
  .link-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .link-grid a {
    font-size: var(--text-small);
    font-weight: 640;
    color: var(--brand-600);
    background: #f3f7fa;
    border: 1px solid #d6e2ec;
    border-radius: 10px;
    padding: 0.4rem 0.7rem;
    text-decoration: none;
  }
  .link-grid a:hover { background: #e8f0f6; border-color: var(--brand-600); }
</style>
