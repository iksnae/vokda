<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';

  type ProviderInfo = {
    id: string;
    name: string;
    type: 'cloud' | 'free' | 'local';
    voices: number;
    synth: boolean;
    ssml: boolean;
    description: string;
    authType: string;
    signupUrl: string;
    docsUrl: string;
    pricing: string;
    features: string[];
  };

  const providers: ProviderInfo[] = [
    // ─── Cloud Providers (Live Synthesis) ───
    {
      id: 'openai', name: 'OpenAI', type: 'cloud', voices: 11, synth: true, ssml: false,
      description: 'High-quality voices via GPT-4o audio models. Excellent for conversational and narration use-cases. Newest model (tts-1-hd) offers near-human naturalness.',
      authType: 'API key', signupUrl: 'https://platform.openai.com/signup', docsUrl: 'https://platform.openai.com/docs/guides/text-to-speech',
      pricing: 'Pay-per-use: $15/1M chars (tts-1), $30/1M chars (tts-1-hd)',
      features: ['6 voices', 'HD model available', 'Streaming', 'Multiple output formats'],
    },
    {
      id: 'elevenlabs', name: 'ElevenLabs', type: 'cloud', voices: 22, synth: true, ssml: false,
      description: 'Industry-leading voice cloning and synthesis. Huge voice library with community voices. Known for expressiveness and emotion control.',
      authType: 'API key', signupUrl: 'https://elevenlabs.io', docsUrl: 'https://docs.elevenlabs.io/api-reference/text-to-speech',
      pricing: 'Free tier (10K chars/mo), Creator $22/mo, Pro $99/mo',
      features: ['Voice cloning', 'Emotion control', 'Community library', 'Streaming', '29 languages'],
    },
    {
      id: 'cartesia', name: 'Cartesia', type: 'cloud', voices: 154, synth: true, ssml: false,
      description: 'Ultra-low latency synthesis built for real-time applications. Sub-100ms time-to-first-byte. Largest voice library in our catalog.',
      authType: 'API key', signupUrl: 'https://cartesia.ai', docsUrl: 'https://docs.cartesia.ai',
      pricing: 'Free tier available, pay-per-use at scale',
      features: ['Ultra-low latency', '154 voices', 'Real-time streaming', 'WebSocket API', 'Voice mixing'],
    },
    {
      id: 'deepgram', name: 'Deepgram', type: 'cloud', voices: 102, synth: true, ssml: false,
      description: 'Aura TTS with a wide selection of voices. Strong multilingual support. Known for ASR but rapidly expanding TTS capabilities.',
      authType: 'API key', signupUrl: 'https://deepgram.com', docsUrl: 'https://developers.deepgram.com/docs/tts-rest',
      pricing: 'Free tier ($200 credit), pay-per-use after',
      features: ['102 voices', 'Aura 2 model', 'Streaming', 'Multiple languages', 'REST + WebSocket'],
    },
    {
      id: 'gemini-tts', name: 'Gemini TTS', type: 'cloud', voices: 30, synth: true, ssml: false,
      description: 'Google\'s newest TTS via the Gemini API. High naturalness, strong multilingual capabilities, easy integration via Google AI Studio.',
      authType: 'API key', signupUrl: 'https://aistudio.google.com/apikey', docsUrl: 'https://ai.google.dev/gemini-api/docs/text-generation',
      pricing: 'Free tier generous, pay-per-use at scale',
      features: ['30 voices', 'High naturalness', 'Multilingual', 'Google AI ecosystem'],
    },
    {
      id: 'gcp-tts', name: 'Google Cloud TTS', type: 'cloud', voices: 27, synth: true, ssml: true,
      description: 'Enterprise-grade TTS with WaveNet and Neural2 voices. Full SSML support. Part of Google Cloud Platform — ideal for GCP-native infrastructure.',
      authType: 'API key', signupUrl: 'https://console.cloud.google.com/apis/credentials', docsUrl: 'https://cloud.google.com/text-to-speech/docs',
      pricing: 'Free: 1M chars/mo (standard), 4M chars/mo with WaveNet. Then $4-$16/1M chars',
      features: ['WaveNet voices', 'Full SSML', 'Neural2 model', 'Audio profiles', '40+ languages'],
    },
    {
      id: 'azure-speech', name: 'Azure Speech', type: 'cloud', voices: 22, synth: true, ssml: true,
      description: 'Microsoft\'s cognitive speech service. Extensive SSML support with Microsoft-specific extensions. Large neural voice library across 140+ languages.',
      authType: 'Subscription key + region', signupUrl: 'https://portal.azure.com', docsUrl: 'https://learn.microsoft.com/azure/ai-services/speech-service/',
      pricing: 'Free: 500K chars/mo. Standard: $16/1M chars. Neural: $16/1M chars',
      features: ['Full SSML + extensions', 'Custom neural voice', '140+ languages', 'Viseme support', 'Word-level timestamps'],
    },
    {
      id: 'aws-polly', name: 'AWS Polly', type: 'cloud', voices: 18, synth: true, ssml: true,
      description: 'Amazon\'s TTS service with neural and standard engines. Full SSML support with Amazon extensions. Tight integration with AWS ecosystem.',
      authType: 'IAM credentials (access key + secret)', signupUrl: 'https://console.aws.amazon.com/iam/', docsUrl: 'https://docs.aws.amazon.com/polly/',
      pricing: 'Free: 5M chars/mo (12 months). Then $4/1M chars (standard), $16/1M chars (neural)',
      features: ['Full SSML + extensions', 'Neural engine', 'Speech marks', 'Lexicons', 'Newscaster style'],
    },
    {
      id: 'lmnt', name: 'LMNT', type: 'cloud', voices: 44, synth: true, ssml: false,
      description: 'Fast, expressive TTS focused on conversational quality. Instant voice cloning. Simple REST API.',
      authType: 'API key', signupUrl: 'https://lmnt.com', docsUrl: 'https://docs.lmnt.com',
      pricing: 'Free tier available, usage-based pricing',
      features: ['44 voices', 'Voice cloning', 'Low latency', 'Simple API', 'Streaming'],
    },
    // ─── Free ───
    {
      id: 'edge-tts', name: 'Edge TTS', type: 'free', voices: 47, synth: false, ssml: true,
      description: 'Microsoft Edge\'s free TTS engine. High-quality neural voices with SSML support. No API key required — runs locally via the edge-tts Python package.',
      authType: 'None (free)', signupUrl: '', docsUrl: 'https://github.com/rany2/edge-tts',
      pricing: 'Free — no API key, no account, no limits',
      features: ['47 neural voices', 'SSML support', 'No API key', 'Free unlimited', '24+ languages'],
    },
    // ─── Local / Open-Source ───
    {
      id: 'kokoro', name: 'Kokoro', type: 'local', voices: 24, synth: false, ssml: false,
      description: 'High-quality open-source TTS model (82M params). Runs locally on Apple Silicon via mlx-audio. Surprisingly natural for its size.',
      authType: 'None (local)', signupUrl: '', docsUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
      pricing: 'Free — runs on your own hardware',
      features: ['24 voices', 'Apple Silicon (MLX)', 'Small model (82M)', 'Fast inference', 'MIT license'],
    },
    {
      id: 'bark', name: 'Bark', type: 'local', voices: 13, synth: false, ssml: false,
      description: 'Suno\'s open-source generative audio model. Produces highly expressive, emotional speech. Can generate laughter, sighs, and music.',
      authType: 'None (local)', signupUrl: '', docsUrl: 'https://github.com/suno-ai/bark',
      pricing: 'Free — runs on your own hardware',
      features: ['13 voices', 'Emotional speech', 'Non-speech sounds', 'Multi-speaker', 'Apache 2.0'],
    },
    {
      id: 'orpheus', name: 'Orpheus TTS', type: 'local', voices: 8, synth: false, ssml: false,
      description: 'Open-weight TTS model with natural prosody and emotion. Runs locally via mlx-audio or Hugging Face.',
      authType: 'None (local)', signupUrl: '', docsUrl: 'https://huggingface.co/canopylabs/orpheus-tts-0.1-finetune-prod',
      pricing: 'Free — runs on your own hardware',
      features: ['8 voices', 'Emotion tags', 'Natural prosody', 'Apple Silicon (MLX)'],
    },
    {
      id: 'qwen3-tts', name: 'Qwen3 TTS', type: 'local', voices: 7, synth: false, ssml: false,
      description: 'Alibaba\'s latest TTS model. Excellent Chinese and English support. Runs locally via mlx-audio.',
      authType: 'None (local)', signupUrl: '', docsUrl: 'https://huggingface.co/Qwen/Qwen3-TTS',
      pricing: 'Free — runs on your own hardware',
      features: ['7 voices', 'Chinese + English', 'Apple Silicon (MLX)', 'Good quality'],
    },
    {
      id: 'dia', name: 'Dia', type: 'local', voices: 3, synth: false, ssml: false,
      description: 'Nari Labs\' dialogue-focused TTS. Generates natural conversations between two speakers. Supports non-verbal cues.',
      authType: 'None (local)', signupUrl: '', docsUrl: 'https://github.com/nari-labs/dia',
      pricing: 'Free — runs on your own hardware',
      features: ['Multi-speaker', 'Dialogue-native', 'Non-verbal cues', 'Apache 2.0'],
    },
    {
      id: 'kittentts', name: 'KittenTTS', type: 'local', voices: 8, synth: false, ssml: false,
      description: 'Self-hosted TTS server with a simple HTTP API. Runs as a local service on port 8200.',
      authType: 'None (local)', signupUrl: '', docsUrl: 'https://github.com/lmg-anmol/KittenTTS',
      pricing: 'Free — self-hosted',
      features: ['8 voices', 'HTTP API', 'Self-hosted', 'Docker support'],
    },
  ];

  const cloudProviders = providers.filter(p => p.type === 'cloud');
  const freeProviders = providers.filter(p => p.type === 'free');
  const localProviders = providers.filter(p => p.type === 'local');
</script>

<svelte:head>
  <title>Provider Guide | Vokda Docs</title>
  <meta name="description" content="Complete guide to all 25 TTS providers on Vokda — cloud APIs, free services, and open-source models. Setup instructions, capabilities, pricing, and voice counts." />
</svelte:head>

<main>
  <nav class="breadcrumb"><a href="/docs">Docs</a> <span>/</span> Provider Guide</nav>
  <h1>Provider Guide</h1>
  <p class="subtitle">All TTS providers covered by Vokda — capabilities, setup, and pricing.</p>

  <div class="summary">
    <div class="sum-stat"><strong>25</strong> providers</div>
    <div class="sum-stat"><strong>550+</strong> voices</div>
    <div class="sum-stat"><strong>9</strong> with live synthesis</div>
    <div class="sum-stat"><strong>4</strong> with SSML support</div>
  </div>

  <section>
    <h2>Cloud Providers <span class="section-badge synth">Live Synthesis</span></h2>
    <p>These providers have server-side adapters on Vokda. Add your API key at <a href="/account/providers">Account → Provider Keys</a> to enable live audition.</p>

    <div class="provider-cards">
      {#each cloudProviders as p}
        <article class="prov-card" id={p.id}>
          <div class="prov-header">
            <h3>{p.name}</h3>
            <div class="prov-badges">
              {#if p.ssml}<span class="badge ssml">SSML</span>{/if}
              <span class="badge voices">{p.voices} voices</span>
            </div>
          </div>
          <p class="prov-desc">{p.description}</p>
          <div class="prov-details">
            <div class="detail-row"><strong>Auth:</strong> {p.authType}</div>
            <div class="detail-row"><strong>Pricing:</strong> {p.pricing}</div>
            <div class="detail-row features">
              {#each p.features as feat}
                <span class="feat-chip">{feat}</span>
              {/each}
            </div>
          </div>
          <div class="prov-links">
            {#if p.signupUrl}
              <a href={p.signupUrl} target="_blank" rel="noopener" class="prov-link">Sign Up ↗</a>
            {/if}
            <a href={p.docsUrl} target="_blank" rel="noopener" class="prov-link">Docs ↗</a>
            <a href="/?provider={encodeURIComponent(p.name)}" class="prov-link">Browse Voices →</a>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section>
    <h2>Free Providers</h2>
    <p>No API key or account required.</p>

    <div class="provider-cards">
      {#each freeProviders as p}
        <article class="prov-card" id={p.id}>
          <div class="prov-header">
            <h3>{p.name}</h3>
            <div class="prov-badges">
              {#if p.ssml}<span class="badge ssml">SSML</span>{/if}
              <span class="badge voices">{p.voices} voices</span>
              <span class="badge free">Free</span>
            </div>
          </div>
          <p class="prov-desc">{p.description}</p>
          <div class="prov-details">
            <div class="detail-row"><strong>Pricing:</strong> {p.pricing}</div>
            <div class="detail-row features">
              {#each p.features as feat}
                <span class="feat-chip">{feat}</span>
              {/each}
            </div>
          </div>
          <div class="prov-links">
            <a href={p.docsUrl} target="_blank" rel="noopener" class="prov-link">Docs ↗</a>
            <a href="/?provider={encodeURIComponent(p.name)}" class="prov-link">Browse Voices →</a>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section>
    <h2>Open-Source & Local Models</h2>
    <p>Run these on your own machine. Most work with <a href="https://github.com/lucasnewman/mlx-audio" target="_blank" rel="noopener">mlx-audio</a> on Apple Silicon.</p>

    <div class="install-block">
      <strong>Quick install (Apple Silicon):</strong>
      <pre class="code-block">pip install mlx-audio
mlx_audio.server --model prince-canuma/Kokoro-82M --port 8100</pre>
    </div>

    <div class="provider-cards">
      {#each localProviders as p}
        <article class="prov-card local" id={p.id}>
          <div class="prov-header">
            <h3>{p.name}</h3>
            <div class="prov-badges">
              <span class="badge voices">{p.voices} voices</span>
              <span class="badge local">Local</span>
            </div>
          </div>
          <p class="prov-desc">{p.description}</p>
          <div class="prov-details">
            <div class="detail-row features">
              {#each p.features as feat}
                <span class="feat-chip">{feat}</span>
              {/each}
            </div>
          </div>
          <div class="prov-links">
            <a href={p.docsUrl} target="_blank" rel="noopener" class="prov-link">Docs ↗</a>
            <a href="/?provider={encodeURIComponent(p.name)}" class="prov-link">Browse Voices →</a>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="comparison">
    <h2>Provider Comparison</h2>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Voices</th>
            <th>Type</th>
            <th>Synth</th>
            <th>SSML</th>
            <th>Free Tier</th>
          </tr>
        </thead>
        <tbody>
          {#each providers as p}
            <tr>
              <td><a href="#{p.id}">{p.name}</a></td>
              <td class="num">{p.voices}</td>
              <td><span class="type-badge {p.type}">{p.type}</span></td>
              <td>{p.synth ? '✓' : '—'}</td>
              <td>{p.ssml ? '✓' : '—'}</td>
              <td class="pricing">{p.pricing.split('.')[0]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 780px;
    margin: 0 auto;
    padding: 0 1rem 4rem;
  }
  .breadcrumb {
    font-size: var(--text-small); color: #5a7a90; margin-bottom: 0.25rem;
  }
  .breadcrumb a { color: var(--brand-600); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb span { margin: 0 0.25rem; }

  h1 { font-size: var(--text-display); margin: 0 0 0.25rem; }
  .subtitle { color: #4a6a82; margin: 0 0 1rem; }
  h2 {
    font-size: 1.25rem; font-weight: 760; color: #0e2233;
    margin: 0 0 0.35rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  section { margin-top: 2rem; }
  section > p { color: #3e5972; margin: 0 0 0.75rem; font-size: var(--text-body); }
  section > p a { color: var(--brand-600); }

  .summary {
    display: flex; gap: 1rem; flex-wrap: wrap;
    padding: 0.65rem 0.85rem;
    border: 1px solid #d6e2ec; border-radius: 12px; background: #f8fbfd;
    margin-bottom: 1rem;
  }
  .sum-stat { font-size: var(--text-small); color: #3e5972; }
  .sum-stat strong { color: var(--brand-700); }

  .section-badge {
    font-size: 0.6rem; font-weight: 720; padding: 0.08rem 0.4rem;
    border-radius: 4px; letter-spacing: 0.03em;
  }
  .section-badge.synth { color: #2e7d32; background: #e8f5e9; border: 1px solid #a5d6a7; }

  .provider-cards { display: grid; gap: 0.6rem; }
  .prov-card {
    padding: 0.85rem 1rem;
    border: 1px solid #d6e2ec; border-radius: 14px; background: #fff;
    scroll-margin-top: 4rem;
  }
  .prov-card:hover { border-color: #b6c8d6; }
  .prov-card.local { border-left: 3px solid #ce93d8; }

  .prov-header {
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap; margin-bottom: 0.35rem;
  }
  .prov-header h3 { font-size: var(--text-body); font-weight: 720; color: #173046; margin: 0; }
  .prov-badges { display: flex; gap: 0.25rem; margin-left: auto; }
  .badge {
    font-size: 0.6rem; font-weight: 700; padding: 0.08rem 0.35rem;
    border-radius: 4px; letter-spacing: 0.02em;
  }
  .badge.voices { color: #5a7a90; background: #eef4f8; border: 1px solid #d6e2ec; }
  .badge.ssml { color: #2e7d32; background: #e8f5e9; border: 1px solid #a5d6a7; }
  .badge.free { color: #1565c0; background: #e3f2fd; border: 1px solid #90caf9; }
  .badge.local { color: #6a1b9a; background: #f3e5f5; border: 1px solid #ce93d8; }

  .prov-desc { font-size: var(--text-small); color: #3e5972; margin: 0 0 0.5rem; line-height: 1.5; }

  .prov-details { display: grid; gap: 0.3rem; margin-bottom: 0.5rem; }
  .detail-row {
    font-size: var(--text-xs); color: #4a6a82; line-height: 1.5;
  }
  .detail-row strong { color: #2c4b60; }
  .detail-row.features { display: flex; flex-wrap: wrap; gap: 0.25rem; }
  .feat-chip {
    font-size: 0.6rem; font-weight: 620;
    padding: 0.1rem 0.4rem; border-radius: 999px;
    color: #3e5972; background: #f3f7fa; border: 1px solid #e4edf3;
  }

  .prov-links { display: flex; gap: 0.5rem; }
  .prov-link {
    font-size: var(--text-xs); font-weight: 660;
    color: var(--brand-600); text-decoration: none;
  }
  .prov-link:hover { text-decoration: underline; }

  .install-block {
    padding: 0.7rem 0.85rem;
    border: 1px solid #d6e2ec; border-radius: 12px; background: #f8fbfd;
    margin-bottom: 0.75rem;
  }
  .install-block strong { font-size: var(--text-small); color: #173046; display: block; margin-bottom: 0.3rem; }
  .code-block {
    background: #0e2233; color: #c8dce8;
    padding: 0.6rem 0.85rem; border-radius: 10px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.75rem; line-height: 1.6;
    overflow-x: auto; white-space: pre; margin: 0;
  }

  /* Comparison table */
  .comparison { margin-top: 2.5rem; }
  .table-scroll { overflow-x: auto; }
  table {
    width: 100%; border-collapse: collapse;
    font-size: var(--text-small);
  }
  th {
    text-align: left; padding: 0.5rem 0.6rem;
    background: #f3f7fa; color: #2c4b60; font-weight: 700;
    border-bottom: 2px solid #d6e2ec;
    white-space: nowrap;
  }
  td {
    padding: 0.45rem 0.6rem; border-bottom: 1px solid #eef4f8;
    color: #3e5972;
  }
  td a { color: var(--brand-600); text-decoration: none; font-weight: 640; }
  td a:hover { text-decoration: underline; }
  .num { text-align: center; font-weight: 660; }
  .type-badge {
    font-size: 0.6rem; font-weight: 660;
    padding: 0.08rem 0.35rem; border-radius: 4px;
  }
  .type-badge.cloud { color: #1565c0; background: #e3f2fd; }
  .type-badge.free { color: #2e7d32; background: #e8f5e9; }
  .type-badge.local { color: #6a1b9a; background: #f3e5f5; }
  .pricing { font-size: var(--text-xs); color: #5a7a90; max-width: 200px; }
</style>
