<script lang="ts">
  import { onMount } from 'svelte';
  import { isAuthenticated, auth } from '$lib/auth/store';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';

  const API_BASE = import.meta.env.PUBLIC_SYNTHESIS_API_URL || 'https://api.vokda.iksnae.com';

  type ApiKey = {
    id: string;
    keyPrefix: string;
    label: string;
    status: string;
    createdAt: string;
    lastUsedAt: string | null;
  };

  let keys: ApiKey[] = [];
  let loading = true;
  let creating = false;
  let newLabel = '';
  let justCreatedKey = ''; // shown once, then cleared

  // ─── Auth header ───
  function getAuthHeader(): string {
    const state = getAuthSnapshot();
    if (state.idToken) return `Bearer ${state.idToken}`;
    return '';
  }

  function getAuthSnapshot() {
    let snap = { idToken: '', isAuthenticated: false };
    auth.subscribe((v) => {
      snap = { idToken: v.idToken ?? '', isAuthenticated: v.isAuthenticated };
    })();
    return snap;
  }

  // ─── API calls ───
  async function fetchKeys() {
    if (!API_BASE) { loading = false; return; }
    loading = true;
    try {
      const res = await fetch(`${API_BASE}/v1/keys`, {
        headers: { Authorization: getAuthHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      keys = data.keys ?? [];
    } catch (err) {
      console.error('[api-keys] fetch failed:', err);
      addToast('Failed to load API keys', 'error');
    } finally {
      loading = false;
    }
  }

  async function createKey() {
    if (!newLabel.trim()) {
      addToast('Enter a label for this key', 'error');
      return;
    }
    creating = true;
    justCreatedKey = '';
    try {
      const res = await fetch(`${API_BASE}/v1/keys`, {
        method: 'POST',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      justCreatedKey = data.key; // show once
      newLabel = '';
      addToast('API key created! Copy it now — it won\'t be shown again.');
      await fetchKeys();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create key', 'error');
    } finally {
      creating = false;
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    try {
      const res = await fetch(`${API_BASE}/v1/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: getAuthHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast('API key revoked.');
      await fetchKeys();
    } catch (err) {
      addToast('Failed to revoke key', 'error');
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(justCreatedKey);
    addToast('Copied to clipboard!');
  }

  function formatDate(iso: string | null): string {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  onMount(() => {
    if ($isAuthenticated && API_BASE) fetchKeys();
  });

  // Refetch when auth changes
  $: if ($isAuthenticated && API_BASE) fetchKeys();
</script>

<svelte:head>
  <title>Vokda API Keys</title>
</svelte:head>

<main>
  <header class="page-header">
    <a href="/account" class="back"><Icon name="arrow-left" size={14} /> Account</a>
    <h1>Vokda API Keys</h1>
    <p class="subtitle">
      Use API keys to access the Vokda Synthesis API from the command line, SDKs, or any HTTP client.
    </p>
  </header>

  {#if !$isAuthenticated}
    <div class="auth-gate">
      <Icon name="user" size={28} />
      <p>Sign in to manage your API keys.</p>
      <a href="/account?intent=signin" class="btn primary">Sign In</a>
    </div>
  {:else if !API_BASE}
    <div class="info-box">
      <Icon name="info" size={16} />
      <div>
        <strong>Synthesis API not configured</strong>
        <p>Set <code>PUBLIC_SYNTHESIS_API_URL</code> in your environment to enable API key management.</p>
      </div>
    </div>
  {:else}
    <!-- Create new key -->
    <div class="create-section">
      <h2>Create New Key</h2>
      <div class="create-row">
        <input
          type="text"
          bind:value={newLabel}
          placeholder="Key label (e.g. my-app, cli, testing)"
          on:keydown={(e) => { if (e.key === 'Enter') createKey(); }}
        />
        <button class="btn primary" on:click={createKey} disabled={creating || !newLabel.trim()}>
          {creating ? 'Creating…' : 'Create Key'}
        </button>
      </div>
    </div>

    <!-- Just created key (show once) -->
    {#if justCreatedKey}
      <div class="created-banner">
        <div class="banner-header">
          <Icon name="check" size={16} />
          <strong>New API key created</strong>
        </div>
        <p class="banner-warn">Copy this key now. It won't be shown again.</p>
        <div class="key-display">
          <code>{justCreatedKey}</code>
          <button class="btn ghost sm" on:click={copyKey}>
            <Icon name="clipboard" size={14} /> Copy
          </button>
        </div>
      </div>
    {/if}

    <!-- Usage example -->
    <div class="usage-box">
      <h3>Usage</h3>
      <pre><code>curl -X POST {API_BASE}/v1/synthesize \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{JSON.stringify({ text: "Hello world", provider: "openai", providerVoiceId: "alloy" })}'</code></pre>
    </div>

    <!-- Key list -->
    <section>
      <h2>Your Keys</h2>
      {#if loading}
        <p class="loading">Loading keys…</p>
      {:else if keys.length === 0}
        <p class="empty">No API keys yet. Create one above to get started.</p>
      {:else}
        <div class="key-list">
          {#each keys as key (key.id)}
            <div class="key-row" class:revoked={key.status !== 'active'}>
              <div class="key-info">
                <span class="key-label">{key.label || 'Untitled'}</span>
                <code class="key-prefix">{key.keyPrefix}…</code>
              </div>
              <div class="key-meta">
                <span>Created {formatDate(key.createdAt)}</span>
                {#if key.lastUsedAt}
                  <span>Last used {formatDate(key.lastUsedAt)}</span>
                {/if}
              </div>
              <div class="key-actions">
                {#if key.status === 'active'}
                  <button class="btn danger sm" on:click={() => revokeKey(key.id)}>Revoke</button>
                {:else}
                  <span class="revoked-badge">Revoked</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Link to provider keys -->
    <a href="/account/providers" class="provider-link">
      <div>
        <strong>Provider API Keys</strong>
        <span>Connect your OpenAI, ElevenLabs, Deepgram keys to enable synthesis</span>
      </div>
      <Icon name="arrow-right" size={16} />
    </a>
  {/if}
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1rem 3rem;
  }

  .page-header { margin-bottom: 1.2rem; }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--brand-600);
    font-size: var(--text-small);
    font-weight: 620;
    text-decoration: none;
  }
  .back:hover { text-decoration: underline; }

  h1 { margin: 0.25rem 0 0; font-size: var(--text-display); }
  h2 { font-size: var(--text-heading); margin: 1.2rem 0 0.5rem; color: #1a3347; }
  h3 { font-size: var(--text-body); margin: 0 0 0.4rem; color: #1a3347; }

  .subtitle {
    margin: 0.25rem 0 0;
    color: #4a6a82;
    font-size: var(--text-body);
    line-height: 1.5;
  }

  /* Auth gate */
  .auth-gate {
    text-align: center;
    padding: 3rem 1rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 16px;
    background: #f8fbfd;
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: #3e5972;
  }

  /* Info box */
  .info-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid #e0d9c8;
    border-radius: 14px;
    background: #fdf9f0;
    color: #5a4a2a;
    margin-top: 1rem;
  }
  .info-box p { margin: 0.2rem 0 0; font-size: var(--text-small); }
  .info-box code { background: #f0ead8; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: var(--text-xs); }

  /* Create section */
  .create-section {
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
    padding: 1rem;
    margin-top: 0.75rem;
  }
  .create-section h2 { margin: 0 0 0.5rem; }

  .create-row {
    display: flex;
    gap: 0.5rem;
  }

  .create-row input {
    flex: 1;
    border: 1px solid #bfd0de;
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    font-size: var(--text-body);
    font-family: inherit;
  }
  .create-row input:focus { outline: 2px solid var(--brand-600); outline-offset: -1px; }

  /* Created banner */
  .created-banner {
    border: 1px solid #a5d6a7;
    border-radius: 14px;
    background: #e8f5e9;
    padding: 1rem;
    margin-top: 0.75rem;
  }
  .banner-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #2e7d32;
    margin-bottom: 0.2rem;
  }
  .banner-warn {
    font-size: var(--text-small);
    color: #5a7a90;
    margin: 0 0 0.5rem;
  }
  .key-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fff;
    border: 1px solid #c8e6c9;
    border-radius: 10px;
    padding: 0.5rem 0.7rem;
  }
  .key-display code {
    flex: 1;
    font-size: var(--text-small);
    word-break: break-all;
    color: #1a3347;
  }

  /* Usage box */
  .usage-box {
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #f8fbfd;
    padding: 0.75rem 1rem;
    margin-top: 0.75rem;
  }
  .usage-box pre {
    margin: 0;
    background: #1a2a3a;
    color: #d4e8f4;
    border-radius: 10px;
    padding: 0.75rem;
    overflow-x: auto;
    font-size: var(--text-xs);
    line-height: 1.6;
  }

  /* Key list */
  .key-list { display: grid; gap: 0.4rem; }

  .key-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.85rem;
    border: 1px solid #d6e2ec;
    border-radius: 12px;
    background: #fff;
  }
  .key-row.revoked { opacity: 0.55; }

  .key-info { flex: 1; display: grid; gap: 0.1rem; }
  .key-label { font-weight: 660; font-size: var(--text-body); color: #1a3347; }
  .key-prefix { font-size: var(--text-xs); color: #5a7a90; }

  .key-meta {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-size: var(--text-xs);
    color: #5a7a90;
    text-align: right;
  }

  .key-actions { flex-shrink: 0; }

  .revoked-badge {
    font-size: var(--text-xs);
    font-weight: 660;
    color: #c62828;
    padding: 0.15rem 0.5rem;
    border: 1px solid #ef9a9a;
    border-radius: 999px;
    background: #ffebee;
  }

  .loading, .empty {
    font-size: var(--text-small);
    color: #5a7a90;
    padding: 1rem 0;
  }

  /* Provider link */
  .provider-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    margin-top: 1.5rem;
    border: 1px solid var(--brand-100);
    border-radius: 14px;
    background: linear-gradient(135deg, #f0f9fd 0%, #f8fbfd 100%);
    text-decoration: none;
    color: #1a3347;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .provider-link:hover {
    border-color: var(--brand-600);
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.12);
  }
  .provider-link div { flex: 1; display: grid; gap: 0.15rem; }
  .provider-link strong { font-size: var(--text-body); }
  .provider-link span { font-size: var(--text-small); color: #4a6a82; }

  /* Buttons */
  .btn {
    border: none;
    border-radius: 10px;
    padding: 0.5rem 0.9rem;
    font-weight: 660;
    font-size: var(--text-small);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: inherit;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn.sm { padding: 0.35rem 0.65rem; }

  .btn.primary {
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .btn.ghost {
    background: #f3f7fa;
    color: #2c4b60;
    border: 1px solid #c3d1de;
  }

  .btn.danger {
    background: #fff;
    color: #c62828;
    border: 1px solid #ef9a9a;
  }
  .btn.danger:hover { background: #ffebee; }

  @media (max-width: 600px) {
    .create-row { flex-direction: column; }
    .key-row { flex-wrap: wrap; }
    .key-meta { text-align: left; }
  }
</style>
