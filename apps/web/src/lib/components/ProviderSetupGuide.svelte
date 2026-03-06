<script lang="ts">
  import Icon from './Icon.svelte';
  import { getProviderAuthConfig, type ProviderAuthConfig } from '$lib/synthesis/provider-auth';

  export let providerId: string;
  export let providerName: string = '';

  $: config = getProviderAuthConfig(providerId);
  $: displayName = providerName || providerId;
  $: isApiProvider = config && config.authType !== 'none';
  $: isFreeProvider = config?.freeProvider === true;
  $: isLocalModel = isLocalProviderId(providerId);
  $: isUnknown = !config;

  // Server-side synthesis support (providers with Vokda API adapters)
  const SERVER_ADAPTERS = new Set([
    'openai', 'elevenlabs', 'deepgram', 'gemini-tts',
    'cartesia', 'lmnt', 'gcp-tts', 'azure-speech', 'aws-polly'
  ]);
  $: hasServerAdapter = SERVER_ADAPTERS.has(providerId);

  function isLocalProviderId(id: string): boolean {
    return ['kokoro', 'bark', 'orpheus', 'dia', 'qwen3-tts', 'kittentts',
            'mlx', 'outetts', 'spark-tts', 'voxcpm', 'pocket-tts',
            'soprano', 'marvis', 'chatterbox', 'chatterbox-turbo', 'vibevoice'].includes(id);
  }

  const LOCAL_MODEL_TIPS: Record<string, { tool: string; install: string; run: string }> = {
    kokoro:    { tool: 'mlx-audio', install: 'pip install mlx-audio', run: 'mlx_audio.tts --model kokoro' },
    bark:      { tool: 'mlx-audio', install: 'pip install mlx-audio', run: 'mlx_audio.tts --model bark' },
    orpheus:   { tool: 'mlx-audio', install: 'pip install mlx-audio', run: 'mlx_audio.tts --model orpheus' },
    dia:       { tool: 'mlx-audio', install: 'pip install mlx-audio', run: 'mlx_audio.tts --model dia' },
    'qwen3-tts': { tool: 'mlx-audio', install: 'pip install mlx-audio', run: 'mlx_audio.tts --model qwen3-tts' },
    kittentts: { tool: 'KittenTTS', install: 'Follow KittenTTS docs', run: 'kittentts serve --port 8200' },
  };

  const PROVIDER_DESCRIPTIONS: Record<string, string> = {
    openai: 'Industry-leading TTS with natural voices. Models: tts-1, tts-1-hd, gpt-4o-mini-tts.',
    elevenlabs: 'Premium voice synthesis with voice cloning. Free tier: 10K chars/month.',
    deepgram: 'Fast, affordable TTS with Aura voices. Free tier: $200 credit.',
    cartesia: 'Ultra-low latency streaming TTS. Sonic-2 model.',
    lmnt: 'Professional voice synthesis with natural prosody.',
    'azure-speech': 'Microsoft Neural TTS with 400+ voices, SSML support, and emotion control.',
    'gcp-tts': 'Google Cloud TTS with WaveNet and Neural2 voices. SSML support.',
    'gemini-tts': 'Google Gemini 2.5 Flash TTS with 30 built-in voices.',
    'aws-polly': 'Amazon Polly with Neural and Standard engines. SSML support.',
    'edge-tts': 'Free Azure Neural TTS via Edge browser API. No account needed.',
    kokoro: 'Lightweight open-source TTS running locally on Apple Silicon via mlx-audio.',
    bark: 'Suno Bark — expressive TTS with music and sound effects. Runs locally.',
    orpheus: 'Open-source emotional TTS model. Runs locally via mlx-audio.',
    dia: 'Dialogue-aware TTS model. Runs locally via mlx-audio.',
    'qwen3-tts': 'Alibaba Qwen3-TTS model. Runs locally via mlx-audio.',
    kittentts: 'Lightweight local TTS server on port 8200.',
  };
</script>

<div class="setup-guide">
  {#if isApiProvider && hasServerAdapter}
    <!-- API provider with server adapter — connect key to use -->
    <div class="guide-icon">
      <Icon name="key" size={28} />
    </div>
    <h3 class="guide-title">Connect {displayName}</h3>
    <p class="guide-desc">
      {PROVIDER_DESCRIPTIONS[providerId] ?? `${displayName} requires an API key for synthesis.`}
    </p>

    <div class="guide-steps">
      <div class="step">
        <span class="step-num">1</span>
        <span class="step-text">
          Get an API key from
          {#if config?.docsUrl}
            <a href={config.docsUrl} target="_blank" rel="noopener">{displayName}'s dashboard</a>
          {:else}
            {displayName}'s dashboard
          {/if}
        </span>
      </div>
      <div class="step">
        <span class="step-num">2</span>
        <span class="step-text">
          Go to <a href="/account/providers">Account → Provider Keys</a> and add it
        </span>
      </div>
      <div class="step">
        <span class="step-num">3</span>
        <span class="step-text">Return here and synthesize</span>
      </div>
    </div>

    {#if config?.notes}
      <p class="guide-note">{config.notes}</p>
    {/if}

    <a href="/account/providers" class="guide-cta">
      <Icon name="key" size={14} />
      Add {displayName} Key
    </a>

  {:else if isFreeProvider && !isLocalModel}
    <!-- Free cloud provider (edge-tts) — no key needed but no server adapter -->
    <div class="guide-icon">
      <Icon name="lightning" size={28} />
    </div>
    <h3 class="guide-title">{displayName} — Free Provider</h3>
    <p class="guide-desc">
      {PROVIDER_DESCRIPTIONS[providerId] ?? `${displayName} is free and doesn't require an API key.`}
    </p>
    <p class="guide-note">
      Live audition for {displayName} isn't available yet in the browser. Listen to the pre-generated audio samples above, or check back soon.
    </p>

  {:else if isLocalModel}
    <!-- Local model — run locally -->
    <div class="guide-icon">💻</div>
    <h3 class="guide-title">{displayName} — Local Model</h3>
    <p class="guide-desc">
      {PROVIDER_DESCRIPTIONS[providerId] ?? `${displayName} runs locally on your machine.`}
    </p>

    {#if LOCAL_MODEL_TIPS[providerId]}
      {@const tip = LOCAL_MODEL_TIPS[providerId]}
      <div class="guide-steps">
        <div class="step">
          <span class="step-num">1</span>
          <span class="step-text">Install: <code>{tip.install}</code></span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span class="step-text">Run: <code>{tip.run}</code></span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span class="step-text">Listen to the pre-generated samples above</span>
        </div>
      </div>
    {/if}

    <p class="guide-note">
      Local model audition is not yet supported in the browser. Pre-generated audio samples are available above.
    </p>

  {:else if isApiProvider && !hasServerAdapter}
    <!-- API provider without server adapter — not yet supported -->
    <div class="guide-icon">🔧</div>
    <h3 class="guide-title">{displayName} — Coming Soon</h3>
    <p class="guide-desc">
      {PROVIDER_DESCRIPTIONS[providerId] ?? `${displayName} synthesis.`}
    </p>
    <p class="guide-note">
      Server-side synthesis for {displayName} is not yet available. Listen to pre-generated audio samples above.
    </p>

  {:else}
    <!-- Unknown provider -->
    <div class="guide-icon">
      <Icon name="info" size={28} />
    </div>
    <h3 class="guide-title">{displayName}</h3>
    <p class="guide-desc">
      Live audition isn't available for this voice yet. Listen to the pre-generated audio samples above.
    </p>
  {/if}
</div>

<style>
  .setup-guide {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1.5rem 1.25rem;
    gap: 0.6rem;
  }
  .guide-icon {
    font-size: 1.75rem;
    color: var(--brand-500, #2196f3);
    margin-bottom: 0.25rem;
  }
  .guide-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-heading, #e0e0e0);
    margin: 0;
  }
  .guide-desc {
    font-size: 0.82rem;
    color: var(--text-secondary, #8899a6);
    margin: 0;
    max-width: 420px;
    line-height: 1.45;
  }
  .guide-steps {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
    width: 100%;
    max-width: 360px;
    margin: 0.5rem 0;
  }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    font-size: 0.82rem;
    color: var(--text-primary, #c0c0c0);
  }
  .step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--brand-600, #1976d2);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  .step-text {
    line-height: 1.45;
    padding-top: 1px;
  }
  .step-text a {
    color: var(--brand-400, #42a5f5);
    text-decoration: none;
    font-weight: 600;
  }
  .step-text a:hover {
    text-decoration: underline;
  }
  .step-text code {
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--accent, #7c5cbf);
  }
  .guide-note {
    font-size: 0.72rem;
    color: var(--text-muted, #607080);
    margin: 0;
    font-style: italic;
    max-width: 380px;
    line-height: 1.4;
  }
  .guide-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    text-decoration: none;
    border-radius: 10px;
    padding: 0.5rem 1rem;
    background: linear-gradient(154deg, var(--brand-600, #1976d2), var(--brand-700, #1565c0));
    color: #fff;
    font-weight: 680;
    font-size: 0.85rem;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
    transition: transform 0.1s, box-shadow 0.1s;
    margin-top: 0.25rem;
  }
  .guide-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3);
  }
</style>
