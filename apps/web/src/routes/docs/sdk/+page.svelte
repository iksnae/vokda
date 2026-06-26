<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';

  let activeLang = 'typescript';

  const langs = [
    { id: 'typescript', label: 'TypeScript', icon: '🟦' },
    { id: 'python', label: 'Python', icon: '🐍' },
    { id: 'go', label: 'Go', icon: '🔵' },
    { id: 'rust', label: 'Rust', icon: '🦀' },
  ];
</script>

<svelte:head>
  <title>SDKs & Client Libraries | Vokda Docs</title>
  <meta name="description" content="Vokda API client libraries for TypeScript, Python, Go, and Rust. Browse voices, synthesize speech, manage clips and credentials." />
</svelte:head>

<main>
  <nav class="breadcrumb"><a href="/docs">Docs</a> <span>/</span> SDKs & Client Libraries</nav>
  <h1>SDKs & Client Libraries</h1>
  <p class="subtitle">Official clients for TypeScript, Python, Go, and Rust.</p>

  <div class="badge-row">
    <a href="/api/v1/openapi.json" target="_blank" class="badge link">OpenAPI 3.1 Spec ↗</a>
    <span class="badge outline">13 endpoints · 27 schemas</span>
  </div>

  <!-- Language tabs -->
  <div class="lang-tabs">
    {#each langs as lang}
      <button
        class="lang-tab"
        class:active={activeLang === lang.id}
        on:click={() => (activeLang = lang.id)}
      >
        <span class="lang-icon">{lang.icon}</span>
        {lang.label}
      </button>
    {/each}
  </div>

  <!-- ═══════════════════ TypeScript ═══════════════════ -->
  {#if activeLang === 'typescript'}

  <section id="install">
    <h2>Installation</h2>
    <pre class="code">npm install @vokda/sdk</pre>
    <p class="note">Zero dependencies — uses <code>fetch()</code>. Works in Node.js 18+ and modern browsers.</p>
  </section>

  <section id="catalog">
    <h2>Browse the Voice Catalog</h2>
    <p>The catalog client is <strong>public — no authentication required</strong>.</p>
    <pre class="code">{`import { VokdaCatalogClient } from '@vokda/sdk';

const catalog = new VokdaCatalogClient();

// List all 550 voices
const { voices } = await catalog.listVoices();
console.log(\`\${voices.length} voices\`);

// Get a single voice
const voice = await catalog.getVoice('01JCW012A9N9Y3W08F0Q0A1O1');
console.log(voice.name, voice.provider, voice.languages);

// List providers with pricing
const { providers } = await catalog.listProviders();
for (const p of providers) {
  console.log(\`\${p.name}: \${p.voiceCount} voices\`);
}

// Catalog statistics
const stats = await catalog.getStats();`}</pre>
  </section>

  <section id="synthesis">
    <h2>Synthesize Speech</h2>
    <p>Requires a <a href="/account/api-keys">Vokda API key</a>.</p>
    <pre class="code">{`import { VokdaClient } from '@vokda/sdk';

const vokda = new VokdaClient({ apiKey: 'vk_live_...' });

// Store provider credential (one-time)
await vokda.saveCredential({
  providerId: 'openai',
  credentialData: { apiKey: 'sk-...' },
});

// Synthesize
const clip = await vokda.synthesize({
  text: 'Hello from Vokda!',
  provider: 'openai',
  providerVoiceId: 'alloy',
});

console.log(clip.audioUrl);      // presigned S3 URL
console.log(clip.latencyMs);     // synthesis time`}</pre>
  </section>

  <!-- ═══════════════════ Python ═══════════════════ -->
  {:else if activeLang === 'python'}

  <section id="install">
    <h2>Installation</h2>
    <pre class="code">pip install vokda</pre>
    <p class="note">Zero dependencies — uses only Python stdlib (<code>urllib</code>, <code>json</code>). Python 3.9+.</p>
  </section>

  <section id="catalog">
    <h2>Browse the Voice Catalog</h2>
    <pre class="code">{`from vokda import VokdaCatalogClient

catalog = VokdaCatalogClient()

# List all 550 voices
data = catalog.list_voices()
print(f"{len(data['voices'])} voices")

# Get a single voice
voice = catalog.get_voice("01JCW012A9N9Y3W08F0Q0A1O1")
print(voice["name"], voice["provider"])

# List providers
providers = catalog.list_providers()
for p in providers["providers"]:
    print(f"{p['name']}: {p['voiceCount']} voices")`}</pre>
  </section>

  <section id="synthesis">
    <h2>Synthesize Speech</h2>
    <pre class="code">{`from vokda import VokdaClient

client = VokdaClient(api_key="vk_live_...")

# Store provider credential (one-time)
client.save_credential("openai", {"apiKey": "sk-..."})

# Synthesize
clip = client.synthesize(
    text="Hello from Vokda!",
    provider="openai",
    provider_voice_id="alloy",
)
print(clip["audioUrl"])
print(clip["latencyMs"])`}</pre>
  </section>

  <!-- ═══════════════════ Go ═══════════════════ -->
  {:else if activeLang === 'go'}

  <section id="install">
    <h2>Installation</h2>
    <pre class="code">go get github.com/iksnae/vokda/sdks/go</pre>
    <p class="note">Zero external dependencies — uses only <code>net/http</code> and <code>encoding/json</code>. Go 1.21+.</p>
  </section>

  <section id="catalog">
    <h2>Browse the Voice Catalog</h2>
    <pre class="code">{`package main

import (
    "fmt"
    vokda "github.com/iksnae/vokda/sdks/go"
)

func main() {
    catalog := vokda.NewCatalogClient()

    data, _ := catalog.ListVoices()
    fmt.Printf("%d voices\\n", len(data.Voices))

    voice, _ := catalog.GetVoice("01JCW012A9N9Y3W08F0Q0A1O1")
    fmt.Println(voice.Name, voice.Provider)

    providers, _ := catalog.ListProviders()
    for _, p := range providers.Providers {
        fmt.Printf("%s: %d voices\\n", p.Name, p.VoiceCount)
    }
}`}</pre>
  </section>

  <section id="synthesis">
    <h2>Synthesize Speech</h2>
    <pre class="code">{`client := vokda.NewClient("vk_live_...")

// Store credential
client.SaveCredential("openai", map[string]string{"apiKey": "sk-..."}, "")

// Synthesize
clip, err := client.Synthesize(&vokda.SynthesizeRequest{
    Text:            "Hello from Vokda!",
    Provider:        "openai",
    ProviderVoiceID: "alloy",
})
fmt.Println(clip.AudioURL)
fmt.Println(clip.LatencyMs)`}</pre>
  </section>

  <!-- ═══════════════════ Rust ═══════════════════ -->
  {:else if activeLang === 'rust'}

  <section id="install">
    <h2>Installation</h2>
    <pre class="code">{`# Cargo.toml
[dependencies]
vokda = { git = "https://github.com/iksnae/vokda", path = "sdks/rust" }
tokio = { version = "1", features = ["full"] }`}</pre>
    <p class="note">Uses <code>reqwest</code> + <code>serde</code>. Async with tokio.</p>
  </section>

  <section id="catalog">
    <h2>Browse the Voice Catalog</h2>
    <pre class="code">{`use vokda::CatalogClient;

#[tokio::main]
async fn main() -> Result<(), vokda::Error> {
    let catalog = CatalogClient::new();

    let data = catalog.list_voices().await?;
    println!("{} voices", data.voices.len());

    let voice = catalog.get_voice("01JCW012A9N9Y3W08F0Q0A1O1").await?;
    println!("{} ({})", voice.name, voice.provider);

    let providers = catalog.list_providers().await?;
    for p in &providers.providers {
        println!("{}: {} voices", p.name, p.voice_count);
    }
    Ok(())
}`}</pre>
  </section>

  <section id="synthesis">
    <h2>Synthesize Speech</h2>
    <pre class="code">{`use vokda::{Client, SynthesizeRequest};

let client = Client::new("vk_live_...");

// Store credential
client.save_credential(
    "openai",
    serde_json::json!({"apiKey": "sk-..."}),
    None,
).await?;

// Synthesize
let clip = client.synthesize(SynthesizeRequest {
    text: "Hello from Vokda!".into(),
    provider: "openai".into(),
    provider_voice_id: Some("alloy".into()),
    ..Default::default()
}).await?;

println!("{}", clip.audio_url.unwrap_or_default());`}</pre>
  </section>
  {/if}

  <!-- ═══════════════════ Common sections (all languages) ═══════════════════ -->

  <section id="steering">
    <h2>Steering — shape <em>how</em> a voice delivers</h2>
    <p>
      Every catalog voice carries a <code>steering</code> descriptor telling you what expressivity control it
      supports and which <code>options.*</code> to send. Read it, branch on <code>kind</code>, then pass the
      matching options. See the <a href="/docs/steering">Steering guide</a>.
    </p>
    {#if activeLang === 'typescript'}
    <pre class="code">{`const { voices } = await catalog.listVoices();
const voice = voices.find((v) => v.providerId === 'openai')!;

switch (voice.steering?.kind) {
  case 'instructions': // OpenAI — free-text direction
    await vokda.synthesize({ text: 'We did it!', provider: 'openai', providerVoiceId: 'nova',
      options: { instructions: 'cheerful and upbeat; speak slowly' } });
    break;
  case 'settings':     // ElevenLabs — voice_settings (+ eleven_v3 audio tags)
    await vokda.synthesize({ text: '[excited] We did it!', provider: 'elevenlabs', providerVoiceId: '...',
      options: { model_id: voice.steering.audioTagsModel, stability: 0.3, style: 0.6 } });
    break;
  case 'styles':       // AWS Polly — newscaster on Matthew/Joanna/Amy
    await vokda.synthesize({ text: 'Tonight on the news…', provider: 'aws-polly', providerVoiceId: 'Matthew',
      options: { speakingStyle: 'newscaster' } });
    break;
}`}</pre>
    {:else if activeLang === 'python'}
    <pre class="code">{`voice = next(v for v in catalog.list_voices()["voices"] if v["providerId"] == "openai")

# Steering options are passed as keyword args (collected into options).
kind = (voice.get("steering") or {}).get("kind")
if kind == "instructions":   # OpenAI — free-text direction
    client.synthesize(text="We did it!", provider="openai", provider_voice_id="nova",
        instructions="cheerful and upbeat; speak slowly")
elif kind == "settings":     # ElevenLabs — voice_settings (+ eleven_v3 audio tags)
    client.synthesize(text="[excited] We did it!", provider="elevenlabs", provider_voice_id="...",
        model_id=voice["steering"]["audioTagsModel"], stability=0.3)
elif kind == "styles":       # AWS Polly — newscaster
    client.synthesize(text="Tonight on the news…", provider="aws-polly", provider_voice_id="Matthew",
        speakingStyle="newscaster")`}</pre>
    {:else if activeLang === 'go'}
    <pre class="code">{`// voice.Steering.Kind is one of: instructions | settings | styles | none
client.Synthesize(&vokda.SynthesizeRequest{
    Text: "We did it!", Provider: "openai", ProviderVoiceID: "nova",
    Options: map[string]any{"instructions": "cheerful and upbeat; speak slowly"},
})
// ElevenLabs: Options{"model_id": voice.Steering.AudioTagsModel, "stability": 0.3}
// AWS Polly:  Options{"speakingStyle": "newscaster"}`}</pre>
    {:else}
    <pre class="code">{`// voice.steering.kind is one of: instructions | settings | styles | none
client.synthesize(SynthesizeRequest {
    text: "We did it!".into(), provider: "openai".into(),
    provider_voice_id: Some("nova".into()),
    options: Some(serde_json::json!({ "instructions": "cheerful and upbeat; speak slowly" })),
    ..Default::default()
}).await?;
// ElevenLabs: { "model_id": "eleven_v3", "stability": 0.3 }
// AWS Polly:  { "speakingStyle": "newscaster" }`}</pre>
    {/if}
    <p class="note">Voices with <code>kind: 'none'</code> (or no <code>steering</code>) take no expressivity options.</p>
  </section>

  <section id="waveform">
    <h2>Clip waveform</h2>
    <p>
      Synthesis responses and clips include a precomputed <code>waveform</code> (peaks) so you can render a
      waveform without decoding audio — <code>data</code> is interleaved min/max pairs per pixel in the signed
      <code>bits</code> range (8-bit → ±127; normalize by ÷127). <code>null</code> when audio couldn't be decoded.
    </p>
    {#if activeLang === 'typescript'}
    <pre class="code">{`const clip = await vokda.synthesize({ text: 'Hi', provider: 'openai', providerVoiceId: 'alloy' });
if (clip.waveform) {
  const peaks = clip.waveform.data;          // [min, max, min, max, …]
  const norm = peaks.map((v) => v / 127);    // → [-1, 1]
}`}</pre>
    {:else if activeLang === 'python'}
    <pre class="code">{`clip = client.synthesize(text="Hi", provider="openai", provider_voice_id="alloy")
if clip.get("waveform"):
    peaks = clip["waveform"]["data"]          # [min, max, min, max, …]
    norm = [v / 127 for v in peaks]           # → [-1, 1]`}</pre>
    {:else if activeLang === 'go'}
    <pre class="code">{`clip, _ := client.Synthesize(req)
if clip.Waveform != nil {
    peaks := clip.Waveform.Data            // [min, max, min, max, …]
    _ = peaks
}`}</pre>
    {:else}
    <pre class="code">{`let clip = client.synthesize(req).await?;
if let Some(w) = clip.waveform {
    let peaks = w.data;                     // [min, max, min, max, …]
}`}</pre>
    {/if}
  </section>

  <section id="clips">
    <h2>Manage Clips</h2>
    {#if activeLang === 'typescript'}
    <pre class="code">{`const { jobs, count } = await vokda.listClips({ limit: 50 });

await vokda.updateClip(clip.jobId, {
  clipName: 'Welcome message',
  clipTags: ['greeting', 'openai'],
});

const refreshed = await vokda.getClip(clip.jobId);
await vokda.deleteClip(clip.jobId);`}</pre>
    {:else if activeLang === 'python'}
    <pre class="code">{`clips = client.list_clips(limit=50)

client.update_clip(clip["jobId"],
    clip_name="Welcome message",
    clip_tags=["greeting", "openai"],
)

refreshed = client.get_clip(clip["jobId"])
client.delete_clip(clip["jobId"])`}</pre>
    {:else if activeLang === 'go'}
    <pre class="code">{`clips, _ := client.ListClips(50)

name := "Welcome message"
client.UpdateClip(clip.JobID, &vokda.ClipUpdate{
    ClipName: &name,
    ClipTags: []string{"greeting", "openai"},
})

refreshed, _ := client.GetClip(clip.JobID)
client.DeleteClip(clip.JobID)`}</pre>
    {:else}
    <pre class="code">{`let clips = client.list_clips(50).await?;

client.update_clip(clip.job_id, ClipUpdate {
    clip_name: Some("Welcome message".into()),
    clip_tags: Some(vec!["greeting".into(), "openai".into()]),
    ..Default::default()
}).await?;

let refreshed = client.get_clip(&clip.job_id).await?;
client.delete_clip(&clip.job_id).await?;`}</pre>
    {/if}
  </section>

  <section id="errors">
    <h2>Error Handling</h2>
    {#if activeLang === 'typescript'}
    <pre class="code">{`import { VokdaApiError } from '@vokda/sdk';

try {
  await vokda.synthesize({ text: 'Hello', provider: 'openai', providerVoiceId: 'alloy' });
} catch (err) {
  if (err instanceof VokdaApiError) {
    console.error(\`API error \${err.status}: \${err.body.error}\`);
  }
}`}</pre>
    {:else if activeLang === 'python'}
    <pre class="code">{`from vokda import VokdaApiError

try:
    client.synthesize(text="", provider="openai")
except VokdaApiError as e:
    print(f"Error {e.status}: {e.body['error']}")`}</pre>
    {:else if activeLang === 'go'}
    <pre class="code">{`_, err := client.Synthesize(&vokda.SynthesizeRequest{Text: "", Provider: "openai"})
if err != nil {
    var apiErr *vokda.ApiError
    if errors.As(err, &apiErr) {
        fmt.Printf("API error %d: %s\\n", apiErr.StatusCode, apiErr.Body.Error)
    }
}`}</pre>
    {:else}
    <pre class="code">{`match client.synthesize(req).await {
    Ok(clip) => println!("{}", clip.audio_url.unwrap_or_default()),
    Err(vokda::Error::Api { status, body }) => {
        eprintln!("API error {}: {}", status, body.error);
    }
    Err(e) => eprintln!("Network error: {}", e),
}`}</pre>
    {/if}
  </section>

  <section id="credentials">
    <h2>Credential Formats</h2>
    <div class="cred-table">
      <div class="cred-row head">
        <span>Auth Type</span><span>Providers</span><span>Format</span>
      </div>
      <div class="cred-row">
        <code>api_key</code>
        <span>OpenAI, ElevenLabs, Deepgram, Cartesia, LMNT, GCP TTS, Gemini</span>
        <code>{`{ apiKey: '...' }`}</code>
      </div>
      <div class="cred-row">
        <code>subscription_key</code>
        <span>Azure Speech</span>
        <code>{`{ subscriptionKey: '...', region: 'eastus' }`}</code>
      </div>
      <div class="cred-row">
        <code>aws_credentials</code>
        <span>AWS Polly</span>
        <code>{`{ accessKeyId: '...', secretAccessKey: '...', region: 'us-east-1' }`}</code>
      </div>
    </div>
  </section>

  <section id="reference">
    <h2>Method Reference</h2>
    <div class="ref-table">
      <div class="ref-row head">
        <span>Method</span><span>HTTP</span><span>Auth</span>
      </div>
      <div class="ref-row"><code>catalog.listVoices()</code><span>GET /api/v1/voices.json</span><span class="no">No</span></div>
      <div class="ref-row"><code>catalog.getVoice(id)</code><span>GET /api/v1/voices/{'{id}'}.json</span><span class="no">No</span></div>
      <div class="ref-row"><code>catalog.listProviders()</code><span>GET /api/v1/providers.json</span><span class="no">No</span></div>
      <div class="ref-row"><code>catalog.getProvider(id)</code><span>GET /api/v1/providers.json</span><span class="no">No</span></div>
      <div class="ref-row"><code>catalog.getStats()</code><span>GET /api/v1/stats.json</span><span class="no">No</span></div>
      <div class="ref-row sep"><span></span><span></span><span></span></div>
      <div class="ref-row"><code>client.synthesize(req)</code><span>POST /v1/synthesize</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.listClips(opts?)</code><span>GET /v1/jobs</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.getClip(id)</code><span>GET /v1/jobs/{'{id}'}</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.updateClip(id, u)</code><span>PATCH /v1/jobs/{'{id}'}</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.deleteClip(id)</code><span>DELETE /v1/jobs/{'{id}'}</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.saveCredential(req)</code><span>POST /v1/credentials</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.listCredentials()</code><span>GET /v1/credentials</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.testCredential(req)</code><span>POST /v1/credentials/test</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.deleteCredential(id)</code><span>DELETE /v1/credentials/{'{id}'}</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.createApiKey(label?)</code><span>POST /v1/keys</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.listApiKeys()</code><span>GET /v1/keys</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.revokeApiKey(id)</code><span>DELETE /v1/keys/{'{id}'}</span><span class="yes">Yes</span></div>
      <div class="ref-row"><code>client.getUsage()</code><span>GET /v1/media/usage</span><span class="yes">Yes</span></div>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 720px;
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
  .subtitle { color: #4a6a82; margin: 0 0 0.6rem; }
  h2 { font-size: 1.15rem; font-weight: 760; color: #0e2233; margin: 2rem 0 0.4rem; }
  h3 { font-size: var(--text-body); font-weight: 720; color: #173046; margin: 1rem 0 0.3rem; }
  section p { color: #3e5972; line-height: 1.6; margin: 0.3rem 0; }
  section p a { color: var(--brand-600); }
  .note { font-size: var(--text-small); color: #5a7a90; }

  /* Language tabs */
  .lang-tabs {
    display: flex;
    gap: 0.3rem;
    background: #eef4f8;
    border: 1px solid #cfdae4;
    border-radius: 12px;
    padding: 0.25rem;
    width: fit-content;
    margin-bottom: 1rem;
  }
  .lang-tab {
    border: none;
    background: transparent;
    color: #4a6a82;
    border-radius: 9px;
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 650;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: background 120ms, color 120ms;
  }
  .lang-tab:hover { background: rgba(255,255,255,0.5); }
  .lang-tab.active {
    background: #fff;
    color: #0e2233;
    box-shadow: 0 2px 8px rgba(16, 40, 59, 0.1);
  }
  .lang-icon { font-size: 0.9rem; }

  .badge-row { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .badge {
    font-size: 0.75rem; font-weight: 700;
    padding: 0.2rem 0.55rem; border-radius: 6px;
    background: linear-gradient(135deg, var(--brand-600), var(--brand-700));
    color: #fff;
  }
  .badge.outline {
    background: transparent;
    border: 1px solid #c0d0dc;
    color: #4a6a82;
  }
  .badge.link {
    text-decoration: none;
    background: #0e2233;
    color: #68d391;
  }
  .badge.link:hover { opacity: 0.9; }

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

  /* Credential table */
  .cred-table { display: grid; gap: 0; margin: 0.5rem 0; border: 1px solid #dde8f0; border-radius: 10px; overflow: hidden; }
  .cred-row {
    display: grid; grid-template-columns: 140px 1fr 1fr;
    gap: 0.5rem; padding: 0.45rem 0.65rem;
    font-size: var(--text-xs); background: #f8fbfd;
    border-bottom: 1px solid #eef3f8;
    align-items: center;
  }
  .cred-row:last-child { border-bottom: none; }
  .cred-row.head { background: #eef4f8; font-weight: 700; color: #173046; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .cred-row span { color: #5a7a90; }
  .cred-row code { font-size: 0.78em; }

  /* Reference table */
  .ref-table { display: grid; gap: 0; margin: 0.5rem 0; border: 1px solid #dde8f0; border-radius: 10px; overflow: hidden; }
  .ref-row {
    display: grid; grid-template-columns: 1fr 1fr 40px;
    gap: 0.4rem; padding: 0.4rem 0.65rem;
    font-size: var(--text-xs); background: #f8fbfd;
    border-bottom: 1px solid #eef3f8;
    align-items: center;
  }
  .ref-row:last-child { border-bottom: none; }
  .ref-row.head { background: #eef4f8; font-weight: 700; color: #173046; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .ref-row.sep { padding: 0; border-bottom: 2px solid #dde8f0; }
  .ref-row code { font-size: 0.78em; font-weight: 640; }
  .ref-row span { color: #5a7a90; font-size: 0.75rem; }
  .ref-row .yes { color: var(--brand-600); font-weight: 700; }
  .ref-row .no { color: #9ab; font-weight: 600; }
</style>
