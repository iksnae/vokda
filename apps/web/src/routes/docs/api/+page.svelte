<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>API Reference | Vokda Docs</title>
  <meta name="description" content="Vokda Synthesis API reference — synthesize speech, manage clips, and administer API keys programmatically. 9 providers, one endpoint." />
</svelte:head>

<main>
  <nav class="breadcrumb"><a href="/docs">Docs</a> <span>/</span> API Reference</nav>
  <h1>API Reference</h1>
  <p class="subtitle">Synthesize speech, manage clips, and administer keys — programmatically.</p>

  <div class="base-urls">
    <div class="base-url">
      <strong>Synthesis API:</strong>
      <code>https://api.vokda.iksnae.com</code>
      <span class="url-note">Authenticated — requires API key or JWT</span>
    </div>
    <div class="base-url">
      <strong>Catalog API:</strong>
      <code>https://vokda.iksnae.com/api/v1/</code>
      <span class="url-note">Public — no authentication required</span>
    </div>
  </div>

  <div class="resource-links">
    <a href="/api/v1/openapi.json" target="_blank" class="resource-link">
      <Icon name="globe" size={14} /> OpenAPI 3.1 Spec
    </a>
    <a href="/docs/sdk" class="resource-link">
      <Icon name="lightning" size={14} /> TypeScript SDK
    </a>
  </div>

  <section id="auth">
    <h2>Authentication</h2>
    <p>Every request requires an <code>Authorization</code> header:</p>
    <pre class="code">Authorization: Bearer &lt;token&gt;</pre>

    <div class="auth-table">
      <div class="auth-row">
        <span class="auth-type">Vokda API Key</span>
        <code>vk_live_...</code>
        <span>Create at <a href="/account/api-keys">Account → API Keys</a></span>
      </div>
      <div class="auth-row">
        <span class="auth-type">Cognito JWT</span>
        <code>eyJ...</code>
        <span>Auto-used by the web app</span>
      </div>
    </div>
    <p class="note">API keys are recommended for scripts and CI/CD. JWTs are used automatically by the browser.</p>
  </section>

  <section id="synthesize">
    <h2>POST /v1/synthesize</h2>
    <p>Generate speech from text or SSML.</p>

    <h3>Request</h3>
    <pre class="code">{`{
  "text": "Hello from the Vokda API.",
  "provider": "openai",
  "providerVoiceId": "nova",
  "voiceName": "Nova",
  "voiceId": "01KJ...",
  "mode": "text"
}`}</pre>

    <div class="field-table">
      <div class="field"><code>text</code> <span class="req">required</span> <span>Input text (max 5,000 chars)</span></div>
      <div class="field"><code>provider</code> <span class="req">required</span> <span>Provider ID (see below)</span></div>
      <div class="field"><code>providerVoiceId</code> <span class="opt">optional</span> <span>Provider's own voice ID</span></div>
      <div class="field"><code>voiceName</code> <span class="opt">optional</span> <span>Display name (stored with clip)</span></div>
      <div class="field"><code>voiceId</code> <span class="opt">optional</span> <span>Vokda catalog voice ID</span></div>
      <div class="field"><code>mode</code> <span class="opt">optional</span> <span><code>"text"</code> (default) or <code>"ssml"</code></span></div>
    </div>

    <h3>Response <span class="status-badge ok">200</span></h3>
    <pre class="code">{`{
  "jobId": "01KK1TYX403VB9KK398W",
  "status": "completed",
  "audioUrl": "https://...presigned-s3-url...",
  "fileSizeBytes": 253966,
  "durationMs": null,
  "latencyMs": 4259,
  "provider": "openai",
  "voiceName": "Nova",
  "createdAt": "2026-03-06T15:06:21.696Z"
}`}</pre>
    <p class="note">The <code>audioUrl</code> is a presigned S3 URL valid for <strong>7 days</strong>. After expiry, fetch the job again to get a fresh URL.</p>

    <h3>Supported Providers</h3>
    <div class="provider-table">
      <div class="prov-row"><code>openai</code> <span>OpenAI (alloy, echo, fable, nova, onyx, shimmer)</span></div>
      <div class="prov-row"><code>elevenlabs</code> <span>ElevenLabs</span></div>
      <div class="prov-row"><code>deepgram</code> <span>Deepgram Aura</span></div>
      <div class="prov-row"><code>gemini-tts</code> <span>Google Gemini TTS</span></div>
      <div class="prov-row"><code>cartesia</code> <span>Cartesia</span></div>
      <div class="prov-row"><code>lmnt</code> <span>LMNT</span></div>
      <div class="prov-row"><code>gcp-tts</code> <span>Google Cloud TTS (SSML ✓)</span></div>
      <div class="prov-row"><code>azure-speech</code> <span>Azure Speech (SSML ✓)</span></div>
      <div class="prov-row"><code>aws-polly</code> <span>AWS Polly (SSML ✓)</span></div>
    </div>
  </section>

  <section id="jobs">
    <h2>Clip Management</h2>

    <article class="endpoint">
      <h3>GET /v1/jobs</h3>
      <p>List your synthesis clips, newest first.</p>
      <div class="field-table">
        <div class="field"><code>limit</code> <span class="opt">query</span> <span>Max results (default: 50, max: 200)</span></div>
        <div class="field"><code>status</code> <span class="opt">query</span> <span>Filter: <code>completed</code>, <code>pending</code>, <code>failed</code></span></div>
      </div>
      <h4>Response <span class="status-badge ok">200</span></h4>
      <pre class="code">{`{
  "jobs": [
    {
      "jobId": "01KK...",
      "voiceName": "Nova",
      "provider": "openai",
      "status": "completed",
      "inputText": "Hello!",
      "inputMode": "text",
      "clipName": "Demo Intro",
      "clipDescription": "Opening line for product demo",
      "clipTags": ["demo", "intro"],
      "audioUrl": "https://...",
      "fileSizeBytes": 12400,
      "latencyMs": 890,
      "createdAt": "2026-03-06T15:06:21.696Z"
    }
  ],
  "count": 1
}`}</pre>
    </article>

    <article class="endpoint">
      <h3>GET /v1/jobs/{'{id}'}</h3>
      <p>Get a single clip with a fresh presigned audio URL.</p>
    </article>

    <article class="endpoint">
      <h3>PATCH /v1/jobs/{'{id}'}</h3>
      <p>Update clip metadata.</p>
      <pre class="code">{`{
  "clipName": "Hero Intro V2",
  "clipDescription": "Dramatic intro for trailer",
  "clipTags": ["trailer", "dramatic"]
}`}</pre>
      <div class="field-table">
        <div class="field"><code>clipName</code> <span class="opt">optional</span> <span>Max 500 chars, or <code>null</code> to clear</span></div>
        <div class="field"><code>clipDescription</code> <span class="opt">optional</span> <span>Max 500 chars, or <code>null</code> to clear</span></div>
        <div class="field"><code>clipTags</code> <span class="opt">optional</span> <span>String array, max 20 tags</span></div>
      </div>
    </article>

    <article class="endpoint">
      <h3>DELETE /v1/jobs/{'{id}'}</h3>
      <p>Delete a clip and its audio file from storage.</p>
      <pre class="code">{`{ "deleted": true, "freedBytes": 253966 }`}</pre>
    </article>
  </section>

  <section id="usage">
    <h2>GET /v1/media/usage</h2>
    <p>Check your storage quota and usage.</p>
    <pre class="code">{`{
  "totalBytes": 1548230,
  "fileCount": 12,
  "quotaBytes": 5368709120,
  "usagePercent": 0,
  "remainingBytes": 5367160890
}`}</pre>
    <p class="note">Default quota: <strong>5 GB</strong> per user.</p>
  </section>

  <section id="keys">
    <h2>API Key Management</h2>

    <article class="endpoint">
      <h3>POST /v1/keys</h3>
      <p>Create a new API key. Requires a Cognito JWT (you need to be signed in to create keys).</p>
      <pre class="code">{`{ "label": "My CLI tool" }`}</pre>
      <h4>Response <span class="status-badge created">201</span></h4>
      <pre class="code">{`{
  "keyId": "abc123...",
  "key": "vk_live_lmGF135y2EU...",
  "label": "My CLI tool",
  "createdAt": "2026-03-06T12:00:00.000Z"
}`}</pre>
      <div class="warning">⚠ The full <code>key</code> value is shown <strong>only on creation</strong>. Store it securely.</div>
    </article>

    <article class="endpoint">
      <h3>GET /v1/keys</h3>
      <p>List your API keys (values masked).</p>
    </article>

    <article class="endpoint">
      <h3>DELETE /v1/keys/{'{id}'}</h3>
      <p>Revoke a key immediately.</p>
    </article>
  </section>

  <section id="errors">
    <h2>Error Handling</h2>
    <pre class="code">{`{
  "error": "error_code_or_message",
  "message": "Human-readable description"
}`}</pre>

    <div class="error-table">
      <div class="err-row"><span class="err-code">400</span> <span>Missing required field, invalid provider, no stored credential</span></div>
      <div class="err-row"><span class="err-code">401</span> <span>Missing or invalid auth token</span></div>
      <div class="err-row"><span class="err-code">404</span> <span>Job/key not found</span></div>
      <div class="err-row"><span class="err-code">500</span> <span>Provider API failure or internal error</span></div>
    </div>

    <div class="tip">Provider errors (401, 403, 429 from the upstream API) are returned as 400/500 with the provider's error message included. Check <code>message</code> for details.</div>
  </section>

  <section id="credentials">
    <h2>Provider Credentials (BYOK)</h2>
    <p>Store and manage your Bring Your Own Key provider API keys programmatically.</p>

    <article class="endpoint">
      <h3>POST /v1/credentials</h3>
      <p>Store or update a provider credential. One credential per provider (upsert).</p>
      <pre class="code">{`{
  "providerId": "openai",
  "credentialData": { "apiKey": "sk-..." },
  "label": "My OpenAI Key"
}`}</pre>

      <h4>Credential Formats</h4>
      <div class="field-table">
        <div class="field"><code>api_key</code> <span class="opt">OpenAI, ElevenLabs, Deepgram, Cartesia, LMNT, GCP, Gemini</span> <span><code>{`{ "apiKey": "..." }`}</code></span></div>
        <div class="field"><code>subscription_key</code> <span class="opt">Azure Speech</span> <span><code>{`{ "subscriptionKey": "...", "region": "eastus" }`}</code></span></div>
        <div class="field"><code>aws_credentials</code> <span class="opt">AWS Polly</span> <span><code>{`{ "accessKeyId": "...", "secretAccessKey": "...", "region": "us-east-1" }`}</code></span></div>
      </div>

      <h4>Response <span class="status-badge ok">200</span></h4>
      <pre class="code">{`{
  "providerId": "openai",
  "label": "My OpenAI Key",
  "authType": "api_key",
  "status": "active",
  "createdAt": "2026-03-06T12:00:00.000Z",
  "updatedAt": "2026-03-06T12:00:00.000Z"
}`}</pre>
    </article>

    <article class="endpoint">
      <h3>GET /v1/credentials</h3>
      <p>List all stored credentials with masked key values.</p>
      <h4>Response <span class="status-badge ok">200</span></h4>
      <pre class="code">{`{
  "credentials": [
    {
      "providerId": "openai",
      "label": "My OpenAI Key",
      "authType": "api_key",
      "status": "active",
      "maskedKey": "sk-p…MmcA",
      "createdAt": "...",
      "updatedAt": "...",
      "lastTestedAt": null
    }
  ],
  "count": 1
}`}</pre>
    </article>

    <article class="endpoint">
      <h3>POST /v1/credentials/test</h3>
      <p>Test a credential without storing it. Performs a minimal synthesis to verify the key works.</p>
      <pre class="code">{`{
  "providerId": "openai",
  "credentialData": { "apiKey": "sk-..." }
}`}</pre>
      <h4>Response <span class="status-badge ok">200</span></h4>
      <pre class="code">{`{ "success": true, "latencyMs": 305 }`}</pre>
      <p class="note">On failure: <code>{`{ "success": false, "latencyMs": 305, "error": "..." }`}</code></p>
    </article>

    <article class="endpoint">
      <h3>DELETE /v1/credentials/{'{providerId}'}</h3>
      <p>Remove a stored credential.</p>
      <h4>Response <span class="status-badge ok">200</span></h4>
      <pre class="code">{`{ "deleted": true, "providerId": "openai" }`}</pre>
    </article>
  </section>

  <section id="catalog-api">
    <h2>Catalog API (Public)</h2>
    <p>Browse the voice catalog without authentication. Static JSON served from <code>https://vokda.iksnae.com</code>.</p>

    <article class="endpoint">
      <h3>GET /api/v1/voices.json</h3>
      <p>Full voice catalog — 550 voices across 25 providers.</p>
      <pre class="code">{`curl https://vokda.iksnae.com/api/v1/voices.json | jq '.voices | length'
# → 550`}</pre>
    </article>

    <article class="endpoint">
      <h3>GET /api/v1/voices/{'{voiceId}'}.json</h3>
      <p>Individual voice detail with samples, variants, model card, and metadata.</p>
      <pre class="code">{`curl https://vokda.iksnae.com/api/v1/voices/01JCW012A9N9Y3W08F0Q0A1O1.json | jq '{name, provider, languages}'
# → { "name": "alloy", "provider": "OpenAI", "languages": ["en-US"] }`}</pre>
    </article>

    <article class="endpoint">
      <h3>GET /api/v1/providers.json</h3>
      <p>Provider directory with voice counts, capabilities, pricing, auth type, and links.</p>
      <pre class="code">{`curl https://vokda.iksnae.com/api/v1/providers.json | jq '.providers[] | {name, voiceCount, freeTier}'`}</pre>
    </article>

    <article class="endpoint">
      <h3>GET /api/v1/stats.json</h3>
      <p>Aggregate catalog statistics.</p>
    </article>

    <article class="endpoint">
      <h3>GET /api/v1/openapi.json</h3>
      <p>Complete OpenAPI 3.1 specification covering all 13 endpoints with 27 component schemas.</p>
      <p class="note">Use with tools like <a href="https://editor.swagger.io/" target="_blank">Swagger Editor</a>, <a href="https://github.com/Redocly/redoc" target="_blank">Redoc</a>, or any OpenAPI client generator.</p>
    </article>
  </section>

  <section id="examples">
    <h2>Examples</h2>

    <h3>Synthesize with OpenAI</h3>
    <pre class="code">{`curl -X POST https://api.vokda.iksnae.com/v1/synthesize \\
  -H "Authorization: Bearer vk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Welcome to the future of voice.",
    "provider": "openai",
    "providerVoiceId": "nova"
  }'`}</pre>

    <h3>Synthesize with SSML (AWS Polly)</h3>
    <pre class="code">{`curl -X POST https://api.vokda.iksnae.com/v1/synthesize \\
  -H "Authorization: Bearer vk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "<speak><prosody rate=\\"slow\\">Welcome.</prosody> <break time=\\"500ms\\"/> Let us begin.</speak>",
    "provider": "aws-polly",
    "providerVoiceId": "Joanna",
    "mode": "ssml"
  }'`}</pre>

    <h3>List and Download Clips</h3>
    <pre class="code">{`# List clips
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \\
  https://api.vokda.iksnae.com/v1/jobs

# Download audio from a specific clip
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \\
  https://api.vokda.iksnae.com/v1/jobs/01KK1TYX403VB9KK398W \\
  | jq -r '.audioUrl' | xargs curl -o clip.mp3`}</pre>

    <h3>Tag a Clip</h3>
    <pre class="code">{`curl -X PATCH https://api.vokda.iksnae.com/v1/jobs/01KK1TYX403VB9KK398W \\
  -H "Authorization: Bearer vk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clipName": "Product Demo Intro",
    "clipTags": ["demo", "product", "intro"]
  }'`}</pre>

    <h3>Create an API Key</h3>
    <pre class="code">{`# Requires Cognito JWT (sign in first)
curl -X POST https://api.vokda.iksnae.com/v1/keys \\
  -H "Authorization: Bearer eyJ..." \\
  -H "Content-Type: application/json" \\
  -d '{"label": "CI Pipeline"}'`}</pre>
  </section>

  <section id="limits">
    <h2>Limits</h2>
    <div class="limits-table">
      <div class="limit-row"><strong>Max text per request</strong> <span>5,000 characters</span></div>
      <div class="limit-row"><strong>Storage quota</strong> <span>5 GB per user</span></div>
      <div class="limit-row"><strong>Audio URL expiry</strong> <span>7 days (refresh via GET /v1/jobs/{'{id}'})</span></div>
      <div class="limit-row"><strong>Clip name/description</strong> <span>500 characters max</span></div>
      <div class="limit-row"><strong>Clip tags</strong> <span>20 tags max</span></div>
    </div>
    <p class="note">Provider-side rate limits apply based on your API key tier with each provider.</p>
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
  .subtitle { color: #4a6a82; margin: 0 0 1rem; }
  h2 { font-size: 1.2rem; font-weight: 760; color: #0e2233; margin: 2rem 0 0.4rem; }
  h3 { font-size: var(--text-body); font-weight: 720; color: #173046; margin: 1rem 0 0.3rem; }
  h4 { font-size: var(--text-small); font-weight: 700; color: #2c4b60; margin: 0.6rem 0 0.2rem; }
  section p { color: #3e5972; line-height: 1.6; margin: 0.3rem 0; }
  section p a { color: var(--brand-600); }
  .note { font-size: var(--text-small); color: #5a7a90; }

  .base-urls {
    display: grid;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .base-url {
    padding: 0.55rem 0.85rem;
    border: 1px solid #d6e2ec;
    border-radius: 12px;
    background: #f8fbfd;
    font-size: var(--text-small);
    color: #2c4b60;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .base-url code {
    background: #0e2233; color: #68d391;
    padding: 0.15rem 0.45rem; border-radius: 6px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85em;
  }
  .url-note {
    font-size: var(--text-xs, 0.75rem);
    color: #7a9ab0;
    font-weight: 500;
  }
  .resource-links {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .resource-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--text-small);
    font-weight: 650;
    color: var(--brand-700, #1d4ed8);
    background: #f0f7fd;
    border: 1px solid var(--brand-100, #dbeafe);
    border-radius: 10px;
    padding: 0.4rem 0.7rem;
    text-decoration: none;
    transition: background 120ms, border-color 120ms;
  }
  .resource-link:hover {
    background: var(--brand-100, #dbeafe);
    border-color: var(--brand-600, #2563eb);
  }

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
  .warning {
    padding: 0.4rem 0.7rem;
    border-left: 3px solid #f9a825;
    background: #fffde7;
    border-radius: 0 8px 8px 0;
    font-size: var(--text-xs);
    color: #5d4037;
    margin: 0.5rem 0;
  }

  /* Auth table */
  .auth-table { display: grid; gap: 0.3rem; margin: 0.5rem 0; }
  .auth-row {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: var(--text-small); padding: 0.35rem 0.6rem;
    background: #f8fbfd; border-radius: 8px;
  }
  .auth-type {
    font-weight: 680; color: #173046; min-width: 100px;
  }
  .auth-row code { font-size: 0.78em; }
  .auth-row span { color: #5a7a90; font-size: var(--text-xs); }
  .auth-row a { color: var(--brand-600); font-size: var(--text-xs); }

  /* Field tables */
  .field-table { display: grid; gap: 0.25rem; margin: 0.4rem 0; }
  .field {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: var(--text-xs); padding: 0.3rem 0.5rem;
    background: #f8fbfd; border-radius: 6px;
  }
  .field code { font-size: 0.85em; font-weight: 660; }
  .field span { color: #5a7a90; }
  .req {
    font-size: 0.6rem; font-weight: 700;
    color: #c62828; background: #ffebee;
    padding: 0.05rem 0.3rem; border-radius: 3px;
  }
  .opt {
    font-size: 0.6rem; font-weight: 700;
    color: #5a7a90; background: #eef4f8;
    padding: 0.05rem 0.3rem; border-radius: 3px;
  }

  .status-badge {
    font-size: 0.6rem; font-weight: 720;
    padding: 0.08rem 0.35rem; border-radius: 4px;
    margin-left: 0.3rem;
  }
  .status-badge.ok { color: #2e7d32; background: #e8f5e9; }
  .status-badge.created { color: #1565c0; background: #e3f2fd; }

  /* Provider table */
  .provider-table { display: grid; gap: 0.2rem; margin: 0.4rem 0; }
  .prov-row {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: var(--text-xs); padding: 0.3rem 0.5rem;
    background: #f8fbfd; border-radius: 6px;
  }
  .prov-row code { font-weight: 660; min-width: 100px; }
  .prov-row span { color: #5a7a90; }

  /* Error table */
  .error-table { display: grid; gap: 0.25rem; margin: 0.4rem 0; }
  .err-row {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: var(--text-xs); padding: 0.3rem 0.5rem;
    background: #f8fbfd; border-radius: 6px;
  }
  .err-code {
    font-weight: 720; font-family: 'SF Mono', monospace;
    color: #c62828; min-width: 32px;
  }
  .err-row span { color: #5a7a90; }

  /* Limits */
  .limits-table { display: grid; gap: 0.25rem; margin: 0.4rem 0; }
  .limit-row {
    display: flex; justify-content: space-between;
    font-size: var(--text-small); padding: 0.35rem 0.6rem;
    background: #f8fbfd; border-radius: 8px;
  }
  .limit-row strong { color: #173046; }
  .limit-row span { color: #5a7a90; }

  .endpoint {
    padding: 0.75rem 0.85rem;
    border: 1px solid #e4edf3;
    border-radius: 12px;
    margin: 0.6rem 0;
  }
  .endpoint h3 { margin: 0 0 0.25rem; }
  .endpoint p { font-size: var(--text-small); margin: 0 0 0.3rem; }
</style>
