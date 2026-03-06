<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>About Vokda — The TTS Voice Discovery Hub</title>
  <meta name="description" content="Vokda is the central destination for text-to-speech — discover 550+ voices across 25 providers, audition with custom text, organize collections, and stay current on the TTS industry." />
</svelte:head>

<main>
  <section class="hero">
    <h1>The Central Hub for<br />Text-to-Speech</h1>
    <p class="lead">
      Discover, audition, and organize TTS voices across every major provider and open-source model — all in one place.
    </p>
    <div class="hero-stats">
      <div class="stat">
        <span class="stat-value">550+</span>
        <span class="stat-label">Voices</span>
      </div>
      <div class="stat">
        <span class="stat-value">25</span>
        <span class="stat-label">Providers</span>
      </div>
      <div class="stat">
        <span class="stat-value">53</span>
        <span class="stat-label">Languages</span>
      </div>
      <div class="stat">
        <span class="stat-value">9</span>
        <span class="stat-label">Live Synthesis</span>
      </div>
    </div>
    <div class="hero-cta">
      <a href="/" class="btn primary">Browse Voices</a>
      <a href="/docs/getting-started" class="btn ghost">Get Started</a>
    </div>
  </section>

  <section class="features">
    <h2>What Vokda Does</h2>

    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon"><Icon name="search" size={24} /></div>
        <h3>Discover</h3>
        <p>Browse the largest curated TTS catalog — cloud providers, open-source models, and self-hosted options. Filter by provider, language, gender, quality, style, and more.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon"><Icon name="play" size={24} /></div>
        <h3>Listen</h3>
        <p>Every voice has a real audio sample. No sign-up required. Hit play on any voice card and hear it instantly.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon"><Icon name="lightning" size={24} /></div>
        <h3>Audition</h3>
        <p>Type your own text and hear any voice speak it in real-time. Supports plain text and SSML with a visual editor. Bring your own API keys — your credentials, your quota.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon"><Icon name="waveform" size={24} /></div>
        <h3>Collect</h3>
        <p>Pin voices to collections. Organize by project, use-case, or mood. Export as Voice Pack JSON for direct use in your pipeline.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon"><Icon name="sliders" size={24} /></div>
        <h3>Compare</h3>
        <p>See technical specs side-by-side: model architecture, capabilities, SSML support, streaming, latency profiles, and licensing — all on the voice detail page.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon"><Icon name="key" size={24} /></div>
        <h3>API Access</h3>
        <p>Synthesize programmatically via the Vokda API. One endpoint, nine providers. Manage clips, keys, and usage from the dashboard or command line.</p>
      </div>
    </div>
  </section>

  <section class="providers-section">
    <h2>Providers We Cover</h2>
    <p class="section-subtitle">Cloud, open-source, and local — Vokda is provider-agnostic.</p>

    <div class="provider-groups">
      <div class="provider-group">
        <h3>Cloud Providers <span class="group-badge">Live Synthesis</span></h3>
        <div class="provider-list">
          <span class="provider-chip api">OpenAI</span>
          <span class="provider-chip api">ElevenLabs</span>
          <span class="provider-chip api">Google Cloud TTS</span>
          <span class="provider-chip api">Azure Speech</span>
          <span class="provider-chip api">AWS Polly</span>
          <span class="provider-chip api">Gemini TTS</span>
          <span class="provider-chip api">Cartesia</span>
          <span class="provider-chip api">Deepgram</span>
          <span class="provider-chip api">LMNT</span>
        </div>
      </div>

      <div class="provider-group">
        <h3>Free & Edge</h3>
        <div class="provider-list">
          <span class="provider-chip free">Edge TTS</span>
        </div>
      </div>

      <div class="provider-group">
        <h3>Open-Source & Local Models</h3>
        <div class="provider-list">
          <span class="provider-chip local">Kokoro</span>
          <span class="provider-chip local">Bark</span>
          <span class="provider-chip local">Orpheus TTS</span>
          <span class="provider-chip local">Dia</span>
          <span class="provider-chip local">Qwen3 TTS</span>
          <span class="provider-chip local">KittenTTS</span>
          <span class="provider-chip local">Spark TTS</span>
          <span class="provider-chip local">OuteTTS</span>
          <span class="provider-chip local">Chatterbox</span>
          <span class="provider-chip local">Soprano</span>
          <span class="provider-chip local">Pocket TTS</span>
          <span class="provider-chip local">VoxCPM</span>
          <span class="provider-chip local">Marvis</span>
          <span class="provider-chip local">VibeVoice</span>
        </div>
      </div>
    </div>

    <a href="/docs/providers" class="section-link">View all providers →</a>
  </section>

  <section class="who-section">
    <h2>Who It's For</h2>
    <div class="audience-grid">
      <div class="audience-card">
        <h3>Developers & Engineers</h3>
        <p>Building voice-powered apps, agents, or pipelines? Compare voices across providers, evaluate quality, and select the right fit — without visiting nine different dashboards.</p>
      </div>
      <div class="audience-card">
        <h3>Content Creators</h3>
        <p>Podcasters, audiobook producers, video makers — audition voices with your actual script before committing to a provider. Export your picks as a reference pack.</p>
      </div>
      <div class="audience-card">
        <h3>TTS Enthusiasts</h3>
        <p>Keep up with the fastest-moving space in AI audio. New models drop weekly — Vokda tracks them all so you don't have to.</p>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <h2>Start Discovering</h2>
    <p>No account needed to browse and listen. Sign up free to save favorites, build collections, and audition with live synthesis.</p>
    <div class="cta-buttons">
      <a href="/" class="btn primary lg">Browse 550+ Voices</a>
      <a href="/docs/getting-started" class="btn ghost lg">Read the Guide</a>
      <a href="/docs/api" class="btn ghost lg">API Docs</a>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 1rem 4rem;
  }

  /* ─── Hero ─── */
  .hero {
    text-align: center;
    padding: 2.5rem 0 2rem;
  }
  .hero h1 {
    font-size: clamp(1.8rem, 5vw, 2.6rem);
    font-weight: 800;
    line-height: 1.15;
    color: #0e2233;
    margin: 0;
  }
  .lead {
    font-size: var(--text-body-lg, 1.05rem);
    color: #3e5972;
    max-width: 540px;
    margin: 0.75rem auto 1.5rem;
    line-height: 1.55;
  }
  .hero-stats {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--brand-700);
  }
  .stat-label {
    font-size: var(--text-xs);
    font-weight: 660;
    color: #5a7a90;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .hero-cta {
    display: flex;
    gap: 0.6rem;
    justify-content: center;
  }

  /* ─── Buttons ─── */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 12px;
    font-weight: 680;
    font-size: var(--text-small);
    font-family: inherit;
    text-decoration: none;
    padding: 0.55rem 1rem;
    border: none;
    cursor: pointer;
    transition: all 120ms;
  }
  .btn.primary {
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    box-shadow: 0 4px 14px rgba(20, 94, 121, 0.22);
  }
  .btn.primary:hover { box-shadow: 0 6px 20px rgba(20, 94, 121, 0.3); }
  .btn.ghost {
    background: #f3f7fa;
    color: #2c4b60;
    border: 1px solid #c3d1de;
  }
  .btn.ghost:hover { background: #e8eff5; }
  .btn.lg { padding: 0.65rem 1.2rem; font-size: var(--text-body); }

  /* ─── Sections ─── */
  section { margin-top: 3rem; }
  h2 {
    font-size: 1.5rem;
    font-weight: 780;
    color: #0e2233;
    margin: 0 0 0.25rem;
  }
  .section-subtitle {
    color: #4a6a82;
    margin: 0 0 1.25rem;
    font-size: var(--text-body);
  }
  .section-link {
    display: inline-block;
    margin-top: 0.75rem;
    color: var(--brand-600);
    font-weight: 660;
    font-size: var(--text-small);
    text-decoration: none;
  }
  .section-link:hover { text-decoration: underline; }

  /* ─── Feature Grid ─── */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
  }
  .feature-card {
    padding: 1rem 1.1rem;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
  }
  .feature-icon {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 10px;
    background: linear-gradient(154deg, rgba(23, 112, 137, 0.08), rgba(23, 112, 137, 0.14));
    color: var(--brand-700);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.6rem;
  }
  .feature-card h3 {
    font-size: var(--text-body);
    font-weight: 720;
    margin: 0 0 0.3rem;
    color: #173046;
  }
  .feature-card p {
    font-size: var(--text-small);
    color: #4a6a82;
    margin: 0;
    line-height: 1.5;
  }

  /* ─── Providers ─── */
  .provider-groups {
    display: grid;
    gap: 1rem;
  }
  .provider-group {
    padding: 0.85rem 1rem;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
  }
  .provider-group h3 {
    font-size: var(--text-small);
    font-weight: 720;
    color: #173046;
    margin: 0 0 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .group-badge {
    font-size: 0.6rem;
    font-weight: 700;
    color: #2e7d32;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 4px;
    padding: 0.05rem 0.35rem;
    letter-spacing: 0.02em;
  }
  .provider-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .provider-chip {
    font-size: var(--text-xs);
    font-weight: 640;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid;
  }
  .provider-chip.api {
    color: #1565c0;
    background: #e3f2fd;
    border-color: #90caf9;
  }
  .provider-chip.free {
    color: #2e7d32;
    background: #e8f5e9;
    border-color: #a5d6a7;
  }
  .provider-chip.local {
    color: #6a1b9a;
    background: #f3e5f5;
    border-color: #ce93d8;
  }

  /* ─── Audience ─── */
  .audience-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  .audience-card {
    padding: 1rem;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
  }
  .audience-card h3 {
    font-size: var(--text-small);
    font-weight: 720;
    margin: 0 0 0.35rem;
    color: #173046;
  }
  .audience-card p {
    font-size: var(--text-small);
    color: #4a6a82;
    margin: 0;
    line-height: 1.5;
  }

  /* ─── CTA ─── */
  .cta-section {
    text-align: center;
    padding: 2rem 1rem;
    border: 1px solid #d6e2ec;
    border-radius: 18px;
    background: linear-gradient(165deg, #f8fcfe, #eef5fa);
  }
  .cta-section h2 { margin-bottom: 0.35rem; }
  .cta-section p {
    color: #4a6a82;
    margin: 0 auto 1rem;
    max-width: 480px;
    font-size: var(--text-body);
  }
  .cta-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
