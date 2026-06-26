<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>Steering & Expressivity | Vokda Docs</title>
  <meta name="description" content="Steer how a Vokda voice delivers a line — OpenAI free-text directions, ElevenLabs voice settings and v3 audio tags, AWS Polly newscaster. Read each voice's steering capability via the API and SDK." />
</svelte:head>

<main>
  <nav class="breadcrumb"><a href="/docs">Docs</a> <span>/</span> Steering &amp; Expressivity</nav>
  <h1>Steering &amp; Expressivity</h1>
  <p class="subtitle">Control <em>how</em> a voice delivers a line — not just what it says.</p>

  <section id="overview">
    <h2>What is steering?</h2>
    <p>
      Many providers let you shape delivery — tone, emotion, pacing, a named style. Support varies by
      <strong>provider, voice, and model</strong>, so Vokda resolves a single <code>steering</code> descriptor
      per voice that tells you exactly what a voice supports and which <code>options.*</code> to send when you
      synthesize. Read it once, then branch on <code>steering.kind</code>.
    </p>

    <div class="field-table">
      <div class="field"><code>instructions</code> <span class="pill openai">OpenAI</span> <span>Free-text delivery direction</span></div>
      <div class="field"><code>settings</code> <span class="pill eleven">ElevenLabs</span> <span>Numeric voice settings + <code>eleven_v3</code> audio tags</span></div>
      <div class="field"><code>styles</code> <span class="pill polly">AWS Polly</span> <span>A named style (newscaster)</span></div>
      <div class="field"><code>none</code> <span class="pill none">—</span> <span>Voice takes no expressivity options</span></div>
    </div>

    <p class="note">
      Every voice in the catalog carries this descriptor — see <code>steering</code> on
      <a href="/api/v1/voices.json" target="_blank">/api/v1/voices.json</a> and the
      <a href="/docs/api#catalog-api">catalog API</a>.
    </p>
  </section>

  <section id="discover">
    <h2>Read a voice's capability</h2>
    <p>Inspect <code>steering</code> on any catalog voice, then send the matching options:</p>
    <pre class="code">{`import { VokdaCatalogClient } from '@vokda/sdk';

const catalog = new VokdaCatalogClient();
const { voices } = await catalog.listVoices();
const voice = voices.find((v) => v.providerId === 'openai');

voice.steering;
// → { kind: 'instructions', param: 'instructions',
//     hint: 'Free-text delivery direction…' }`}</pre>
    <div class="tip">
      The <code>param</code> field names the exact <code>options.*</code> key to send. <code>kind: 'none'</code>
      (or a missing <code>steering</code>) means the voice takes no expressivity options — render no control.
    </div>
  </section>

  <section id="openai">
    <h2><span class="pill openai">OpenAI</span> Free-text directions</h2>
    <p>
      OpenAI voices (on <code>gpt-4o-mini-tts</code>) accept a natural-language <code>instructions</code> string
      describing the delivery. Be specific about emotion, pace, and emphasis.
    </p>
    <pre class="code">{`await vokda.synthesize({
  text: 'We did it — against every odd.',
  provider: 'openai',
  providerVoiceId: 'nova',
  options: {
    instructions: 'warm and triumphant; speak slowly, with a smile',
  },
});`}</pre>
    <p class="note">Examples: <em>"cheerful and upbeat"</em>, <em>"calm, slow bedtime-story narration"</em>, <em>"urgent newscaster, clipped sentences"</em>.</p>
  </section>

  <section id="elevenlabs">
    <h2><span class="pill eleven">ElevenLabs</span> Voice settings &amp; audio tags</h2>
    <p>Two complementary controls. First, numeric <code>voice_settings</code> (each 0–1 unless noted):</p>
    <div class="field-table">
      <div class="field"><code>stability</code> <span>0–1 · lower = more expressive/variable (default 0.5)</span></div>
      <div class="field"><code>similarity_boost</code> <span>0–1 · adherence to the original voice (default 0.75)</span></div>
      <div class="field"><code>style</code> <span>0–1 · style exaggeration (default 0)</span></div>
      <div class="field"><code>speed</code> <span>0.7–1.2 · playback speed (default 1.0)</span></div>
    </div>
    <pre class="code">{`await vokda.synthesize({
  text: 'Picture this: a city that never sleeps.',
  provider: 'elevenlabs',
  providerVoiceId: '<your-voice-id>',
  options: { stability: 0.3, style: 0.6, speed: 1.0 },
});`}</pre>

    <p>
      Second, on the <code>eleven_v3</code> model you can drop <strong>inline audio tags</strong> directly into the
      text. Set <code>options.model_id</code> to the voice's <code>steering.audioTagsModel</code>:
    </p>
    <pre class="code">{`await vokda.synthesize({
  text: '[whispers] Can you keep a secret? [excited] We launched!',
  provider: 'elevenlabs',
  providerVoiceId: '<your-voice-id>',
  options: { model_id: 'eleven_v3', stability: 0.4 },
});`}</pre>
    <p class="note">Tags like <code>[whispers]</code>, <code>[excited]</code>, <code>[laughs]</code> are interpreted only by <code>eleven_v3</code>; other models read them as literal text.</p>
  </section>

  <section id="polly">
    <h2><span class="pill polly">AWS Polly</span> Newscaster style</h2>
    <p>
      Polly's neural newscaster style is available on a few voices — <code>steering.options</code> lists the
      allowed values. Send your choice in <code>options.speakingStyle</code>:
    </p>
    <pre class="code">{`await vokda.synthesize({
  text: 'Tonight, a breakthrough in voice technology.',
  provider: 'aws-polly',
  providerVoiceId: 'Matthew',
  options: { speakingStyle: 'newscaster' },
});`}</pre>
    <p class="note">Steerable Polly voices in the catalog: <strong>Matthew, Joanna, Amy</strong> (the resolver also covers Lupe where available). All other Polly voices report <code>kind: 'none'</code>.</p>
  </section>

  <section id="descriptor">
    <h2>The <code>steering</code> descriptor</h2>
    <div class="field-table">
      <div class="field"><code>kind</code> <span><code>instructions</code> · <code>styles</code> · <code>settings</code> · <code>none</code></span></div>
      <div class="field"><code>param</code> <span>The <code>options.*</code> key to send (<code>instructions</code> · <code>voice_settings</code> · <code>speakingStyle</code>)</span></div>
      <div class="field"><code>hint</code> <span><code>instructions</code>: guidance on what direction to write</span></div>
      <div class="field"><code>options</code> <span><code>styles</code>: allowed string values for <code>options[param]</code></span></div>
      <div class="field"><code>settings</code> <span><code>settings</code>: numeric ranges — <code>{`{ key, min, max, default }`}</code></span></div>
      <div class="field"><code>audioTagsModel</code> <span><code>settings</code> (ElevenLabs): set <code>options.model_id</code> to this for inline audio tags</span></div>
    </div>
    <div class="resource-links">
      <a href="/docs/api#synthesize" class="resource-link"><Icon name="key" size={14} /> Synthesis API</a>
      <a href="/docs/sdk#steering" class="resource-link"><Icon name="lightning" size={14} /> SDK usage</a>
      <a href="/api/v1/openapi.json" target="_blank" class="resource-link"><Icon name="globe" size={14} /> OpenAPI Spec</a>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1rem 4rem;
  }
  .breadcrumb { font-size: var(--text-small); color: #5a7a90; margin-bottom: 0.25rem; }
  .breadcrumb a { color: var(--brand-600); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb span { margin: 0 0.25rem; }

  h1 { font-size: var(--text-display); margin: 0 0 0.25rem; }
  .subtitle { color: #4a6a82; margin: 0 0 1rem; }
  h2 { font-size: 1.2rem; font-weight: 760; color: #0e2233; margin: 2rem 0 0.4rem; display: flex; align-items: center; gap: 0.5rem; }
  section p { color: #3e5972; line-height: 1.6; margin: 0.3rem 0; }
  section p a { color: var(--brand-600); }
  .note { font-size: var(--text-small); color: #5a7a90; }

  code {
    background: #eef4f8; color: #173046;
    padding: 0.05rem 0.25rem; border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85em;
  }
  .code {
    background: #0e2233; color: #c8dce8;
    padding: 0.7rem 0.85rem; border-radius: 10px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.75rem; line-height: 1.6;
    overflow-x: auto; white-space: pre; margin: 0.4rem 0;
  }

  .field-table { display: grid; gap: 0.25rem; margin: 0.5rem 0; }
  .field {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: var(--text-xs); padding: 0.35rem 0.55rem;
    background: #f8fbfd; border-radius: 6px;
  }
  .field code { font-size: 0.85em; font-weight: 660; }
  .field span { color: #5a7a90; }

  .pill {
    font-size: 0.6rem; font-weight: 720;
    padding: 0.08rem 0.4rem; border-radius: 999px;
    white-space: nowrap;
  }
  .pill.openai { color: #0b7a5b; background: #d8f3ea; }
  .pill.eleven { color: #6b46c1; background: #eadcfb; }
  .pill.polly { color: #8f5a0b; background: #fef0db; }
  .pill.none { color: #5a7a90; background: #eef4f8; }
  h2 .pill { font-size: 0.62rem; }

  .tip {
    padding: 0.5rem 0.75rem;
    border-left: 3px solid var(--brand-600);
    background: #f0f8fb;
    border-radius: 0 10px 10px 0;
    font-size: var(--text-small);
    color: #2c4b60;
    margin: 0.5rem 0;
    line-height: 1.5;
  }

  .resource-links { display: flex; gap: 0.4rem; margin: 1rem 0 0; flex-wrap: wrap; }
  .resource-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: var(--text-small); font-weight: 650;
    color: var(--brand-700, #1d4ed8);
    background: #f0f7fd; border: 1px solid var(--brand-100, #dbeafe);
    border-radius: 10px; padding: 0.4rem 0.7rem; text-decoration: none;
    transition: background 120ms, border-color 120ms;
  }
  .resource-link:hover { background: var(--brand-100, #dbeafe); border-color: var(--brand-600, #2563eb); }
</style>
