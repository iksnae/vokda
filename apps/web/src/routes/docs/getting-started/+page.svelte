<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>Getting Started | Vokda Docs</title>
  <meta name="description" content="Get started with Vokda — browse TTS voices, play samples, create collections, set up live synthesis, and manage audio clips." />
</svelte:head>

<main>
  <nav class="breadcrumb"><a href="/docs">Docs</a> <span>/</span> Getting Started</nav>
  <h1>Getting Started</h1>
  <p class="subtitle">From first visit to live synthesis in under 5 minutes.</p>

  <div class="toc">
    <h2>On This Page</h2>
    <ol>
      <li><a href="#browse">Browse & Listen</a></li>
      <li><a href="#filter">Search & Filter</a></li>
      <li><a href="#account">Create an Account</a></li>
      <li><a href="#collections">Organize with Collections</a></li>
      <li><a href="#synthesis">Set Up Live Synthesis</a></li>
      <li><a href="#ssml">Use SSML</a></li>
      <li><a href="#clips">Manage Audio Clips</a></li>
      <li><a href="#api">Use the API</a></li>
    </ol>
  </div>

  <section id="browse">
    <h2><span class="step">1</span> Browse & Listen</h2>
    <p>The <a href="/">home page</a> shows every voice in the catalog. No account needed.</p>
    <ul>
      <li>Click the <strong>▶ play button</strong> on any card to hear a pre-generated sample</li>
      <li>Click the <strong>card itself</strong> to open the voice detail page with full model card and technical specs</li>
      <li>Voices are organized in a Pinterest-style grid sorted by provider</li>
    </ul>
  </section>

  <section id="filter">
    <h2><span class="step">2</span> Search & Filter</h2>
    <p>Use the <strong>search bar</strong> at the top to find voices by name, provider, description, or tags.</p>

    <p>Expand the <strong>Filters</strong> panel for fine-grained control:</p>
    <div class="filter-table">
      <div class="filter-row"><strong>Provider</strong> <span>OpenAI, ElevenLabs, Cartesia, etc.</span></div>
      <div class="filter-row"><strong>Language</strong> <span>53 language codes</span></div>
      <div class="filter-row"><strong>Gender</strong> <span>Female, Male, Neutral, Variable</span></div>
      <div class="filter-row"><strong>Quality</strong> <span>Premium, Standard</span></div>
      <div class="filter-row"><strong>Age</strong> <span>Child through Senior</span></div>
      <div class="filter-row"><strong>Style</strong> <span>Chat, Newscast, Balanced, etc.</span></div>
      <div class="filter-row"><strong>Type</strong> <span>Cloud, Local, Open model</span></div>
      <div class="filter-row"><strong>SSML</strong> <span>Show only SSML-capable voices</span></div>
      <div class="filter-row"><strong>Sort</strong> <span>Name, Provider, or Newest</span></div>
    </div>

    <div class="tip">
      <strong>💡 Tip:</strong> Filters sync to the URL. Bookmark <code>/?gender=female&quality=premium&provider=OpenAI</code> to save a filtered view.
    </div>
  </section>

  <section id="account">
    <h2><span class="step">3</span> Create an Account</h2>
    <p>Browsing is free. Sign up to unlock saving and synthesis:</p>
    <ol>
      <li>Click <strong>Sign In</strong> in the top right</li>
      <li>Choose <strong>Sign Up</strong></li>
      <li>Enter your email and a password</li>
      <li>Check your email for a verification code</li>
      <li>Enter the code and you're in</li>
    </ol>
    <div class="role-table">
      <div class="role-row"><span class="role-badge visitor">Visitor</span> Browse, play samples</div>
      <div class="role-row"><span class="role-badge guest">Guest</span> + Favorites, collections, synthesis, clips</div>
      <div class="role-row"><span class="role-badge curator">Curator</span> + Metadata editing, curation workspace</div>
      <div class="role-row"><span class="role-badge admin">Admin</span> + User management, provider CRUD</div>
    </div>
  </section>

  <section id="collections">
    <h2><span class="step">4</span> Organize with Collections</h2>
    <p>Pin voices to collections for easy comparison and export:</p>
    <ol>
      <li>Click the <strong>📌 pin icon</strong> on any voice card</li>
      <li>Select an existing collection or create a new one</li>
      <li>Visit <a href="/collections">Collections</a> to manage them</li>
      <li><strong>Export</strong> any collection as a Voice Pack JSON — a portable format for voice pipeline integration</li>
    </ol>
  </section>

  <section id="synthesis">
    <h2><span class="step">5</span> Set Up Live Synthesis</h2>
    <p>Audition voices with your own text using <strong>Bring Your Own Key</strong> (BYOK):</p>
    <ol>
      <li>Go to <a href="/account/providers">Account → Provider Keys</a></li>
      <li>Pick a provider (e.g., OpenAI, Cartesia, Gemini)</li>
      <li>Enter your API key from that provider</li>
      <li>Navigate to any voice from that provider</li>
      <li>The <strong>Audition</strong> panel on the voice detail page is now active</li>
      <li>Type text, press <strong>Ctrl+Enter</strong> (or click Synthesize)</li>
    </ol>
    <div class="tip">
      <strong>🔒 Security:</strong> Your API keys are stored encrypted per-user. They're used server-side — never exposed in the browser. Only you can access your own keys.
    </div>

    <h3>Supported Providers for Live Synthesis</h3>
    <div class="provider-grid">
      <span class="p-chip">OpenAI</span>
      <span class="p-chip">ElevenLabs</span>
      <span class="p-chip">Deepgram</span>
      <span class="p-chip">Gemini TTS</span>
      <span class="p-chip">Cartesia</span>
      <span class="p-chip">LMNT</span>
      <span class="p-chip">Google Cloud TTS</span>
      <span class="p-chip">Azure Speech</span>
      <span class="p-chip">AWS Polly</span>
    </div>
    <p class="note">Local models (Kokoro, Bark, etc.) require running the model on your own machine. See <a href="/docs/providers">Provider Guide</a> for setup instructions.</p>
  </section>

  <section id="ssml">
    <h2><span class="step">6</span> Use SSML</h2>
    <p>Switch to <strong>SSML mode</strong> in the audition panel for fine-grained control over speech output:</p>
    <ul>
      <li><code>&lt;break&gt;</code> — Insert pauses</li>
      <li><code>&lt;prosody&gt;</code> — Control rate, pitch, volume</li>
      <li><code>&lt;emphasis&gt;</code> — Stress words</li>
      <li><code>&lt;say-as&gt;</code> — Number/date interpretation</li>
      <li><code>&lt;phoneme&gt;</code> — Exact pronunciation (IPA)</li>
      <li><code>&lt;sub&gt;</code> — Spoken substitution</li>
      <li><code>&lt;lang&gt;</code> — Language switching</li>
    </ul>
    <p>The visual editor shows tag buttons with attribute configuration popovers. Tags unsupported by the current voice's provider are dimmed automatically.</p>
    <p><a href="/docs/ssml">Full SSML Reference →</a></p>
  </section>

  <section id="clips">
    <h2><span class="step">7</span> Manage Audio Clips</h2>
    <p>Every synthesis creates a clip saved to your <a href="/account/clips">clip library</a>:</p>
    <ul>
      <li><strong>Play</strong> — instant playback with seek</li>
      <li><strong>Edit</strong> — name, describe, and tag your clips</li>
      <li><strong>Re-synthesize</strong> — jump back to the voice page with text pre-filled</li>
      <li><strong>Download</strong> — save as MP3</li>
      <li><strong>Search</strong> — filter by name, voice, text, tags, or provider</li>
    </ul>
    <p>Clips are stored server-side. 5 GB of storage per account.</p>
  </section>

  <section id="api">
    <h2><span class="step">8</span> Use the API</h2>
    <p>For programmatic access:</p>
    <ol>
      <li>Go to <a href="/account/api-keys">Account → API Keys</a></li>
      <li>Create a key (it starts with <code>vk_live_</code>)</li>
      <li>Use it in the <code>Authorization</code> header:</li>
    </ol>
    <pre class="code-block">curl -X POST https://api.vokda.iksnae.com/v1/synthesize \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"{"}
    "text": "Hello from the Vokda API.",
    "provider": "openai",
    "providerVoiceId": "nova"
  {"}"}'</pre>
    <p><a href="/docs/api">Full API Reference →</a></p>
  </section>

  <div class="next-steps">
    <h2>Next Steps</h2>
    <div class="next-grid">
      <a href="/" class="next-card">
        <strong>Browse Voices</strong>
        <span>Explore 550+ voices</span>
      </a>
      <a href="/docs/providers" class="next-card">
        <strong>Provider Guide</strong>
        <span>Setup for all 25 providers</span>
      </a>
      <a href="/docs/ssml" class="next-card">
        <strong>SSML Reference</strong>
        <span>Control speech output</span>
      </a>
      <a href="/docs/api" class="next-card">
        <strong>API Docs</strong>
        <span>Programmatic access</span>
      </a>
    </div>
  </div>
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1rem 4rem;
  }
  .breadcrumb {
    font-size: var(--text-small);
    color: #5a7a90;
    margin-bottom: 0.25rem;
  }
  .breadcrumb a { color: var(--brand-600); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb span { margin: 0 0.25rem; }

  h1 { font-size: var(--text-display); margin: 0 0 0.25rem; }
  .subtitle { color: #4a6a82; margin: 0 0 1.25rem; font-size: var(--text-body); }

  /* TOC */
  .toc {
    padding: 0.85rem 1rem;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #f8fbfd;
    margin-bottom: 1.5rem;
  }
  .toc h2 { font-size: var(--text-small); font-weight: 720; margin: 0 0 0.4rem; }
  .toc ol { margin: 0; padding-left: 1.2rem; }
  .toc li { font-size: var(--text-small); line-height: 1.7; }
  .toc a { color: var(--brand-600); text-decoration: none; }
  .toc a:hover { text-decoration: underline; }

  /* Sections */
  section { margin-top: 2rem; scroll-margin-top: 4rem; }
  section h2 {
    font-size: 1.2rem;
    font-weight: 760;
    color: #0e2233;
    margin: 0 0 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  section h3 {
    font-size: var(--text-body);
    font-weight: 700;
    color: #173046;
    margin: 1rem 0 0.4rem;
  }
  .step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    font-size: 0.75rem;
    font-weight: 780;
    flex-shrink: 0;
  }
  section p { color: #3e5972; line-height: 1.6; margin: 0.4rem 0; }
  section ul, section ol { color: #3e5972; line-height: 1.7; padding-left: 1.2rem; }
  section a { color: var(--brand-600); }

  /* Filter table */
  .filter-table {
    display: grid;
    gap: 0.25rem;
    margin: 0.5rem 0;
  }
  .filter-row {
    display: flex;
    gap: 0.5rem;
    font-size: var(--text-small);
    padding: 0.3rem 0.6rem;
    background: #f8fbfd;
    border-radius: 8px;
  }
  .filter-row strong { color: #173046; min-width: 80px; }
  .filter-row span { color: #5a7a90; }

  /* Tips */
  .tip {
    padding: 0.6rem 0.85rem;
    border-left: 3px solid var(--brand-600);
    background: #f0f8fb;
    border-radius: 0 10px 10px 0;
    font-size: var(--text-small);
    color: #2c4b60;
    margin: 0.75rem 0;
    line-height: 1.5;
  }

  /* Roles */
  .role-table { display: grid; gap: 0.3rem; margin: 0.5rem 0; }
  .role-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-small);
    color: #3e5972;
  }
  .role-badge {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    min-width: 52px;
    text-align: center;
  }
  .role-badge.visitor { background: #f3f7fa; color: #5a7a90; border: 1px solid #d6e2ec; }
  .role-badge.guest { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
  .role-badge.curator { background: #f3e5f5; color: #7b1fa2; border: 1px solid #ce93d8; }
  .role-badge.admin { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }

  /* Provider chips */
  .provider-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.5rem 0; }
  .p-chip {
    font-size: var(--text-xs);
    font-weight: 660;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    color: #1565c0;
    background: #e3f2fd;
    border: 1px solid #90caf9;
  }
  .note { font-size: var(--text-small); color: #5a7a90; }

  /* Code */
  .code-block {
    background: #0e2233;
    color: #c8dce8;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.78rem;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    margin: 0.5rem 0;
  }
  code {
    background: #eef4f8;
    color: #173046;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-size: 0.85em;
  }

  /* Next steps */
  .next-steps { margin-top: 2.5rem; }
  .next-steps h2 { font-size: 1.1rem; font-weight: 720; margin: 0 0 0.6rem; color: #173046; }
  .next-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.5rem;
  }
  .next-card {
    padding: 0.75rem 0.85rem;
    border: 1px solid #d6e2ec;
    border-radius: 12px;
    background: #fff;
    text-decoration: none;
    display: grid;
    gap: 0.15rem;
    transition: border-color 120ms;
  }
  .next-card:hover { border-color: var(--brand-600); }
  .next-card strong { font-size: var(--text-small); color: #173046; }
  .next-card span { font-size: var(--text-xs); color: #5a7a90; }
</style>
