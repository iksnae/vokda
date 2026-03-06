<script lang="ts">
  import { isAuthenticated, auth } from '$lib/auth/store';
  import {
    credentials,
    credentialsLoading,
    connectedProviders,
    connectProvider,
    disconnectProvider,
    testCredential,
    refreshCredentials,
  } from '$lib/stores/credentials';
  import {
    getCredentialProviders,
    getFreeProviders,
    type ProviderAuthConfig,
    type CredentialData,
  } from '$lib/synthesis/provider-auth';
  import { getCredentialData } from '$lib/data/credential-store';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import { getProviderColor as getProviderColorScheme } from '$lib/provider-colors';

  const credProviders = getCredentialProviders();
  const freeProviders = getFreeProviders();

  // ─── Expand/collapse state ───
  let expandedId: string | null = null;

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  // ─── Per-provider form fields ───
  let fieldValues: Record<string, Record<string, string>> = {};
  let saving: Record<string, boolean> = {};
  let testing: Record<string, boolean> = {};

  function getFieldValue(providerId: string, key: string): string {
    return fieldValues[providerId]?.[key] ?? '';
  }

  function setFieldValue(providerId: string, key: string, value: string) {
    fieldValues = {
      ...fieldValues,
      [providerId]: { ...fieldValues[providerId], [key]: value },
    };
  }

  // ─── Save ───
  async function handleSave(config: ProviderAuthConfig) {
    const missing = config.fields.filter(
      (f) => f.required && !getFieldValue(config.providerId, f.key).trim()
    );
    if (missing.length > 0) {
      addToast(`Please fill in: ${missing.map((f) => f.label).join(', ')}`, 'error');
      return;
    }

    saving = { ...saving, [config.providerId]: true };

    try {
      const data: Record<string, string> = {};
      for (const f of config.fields) {
        data[f.key] = getFieldValue(config.providerId, f.key).trim();
      }
      await connectProvider(config.providerId, config.providerId, data as CredentialData);
      addToast(`${config.providerId} connected!`);
      expandedId = null;
    } catch (err) {
      console.error(`[providers] Save failed:`, err);
      addToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      saving = { ...saving, [config.providerId]: false };
    }
  }

  // ─── Test ───
  async function handleTest(config: ProviderAuthConfig) {
    testing = { ...testing, [config.providerId]: true };

    try {
      const cred = $credentials.find((c) => c.providerId === config.providerId);
      let data: CredentialData;

      if (cred) {
        const stored = await getCredentialData(config.providerId);
        if (!stored) throw new Error('No stored credential data');
        data = stored;
      } else {
        const d: Record<string, string> = {};
        for (const f of config.fields) d[f.key] = getFieldValue(config.providerId, f.key).trim();
        data = d as CredentialData;
      }

      const result = await testCredential(cred?.id ?? '', config.providerId, data);
      addToast(result.message, result.success ? 'success' : 'error');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Test failed', 'error');
    } finally {
      testing = { ...testing, [config.providerId]: false };
    }
  }

  // ─── Remove ───
  async function handleRemove(config: ProviderAuthConfig) {
    const cred = $credentials.find((c) => c.providerId === config.providerId);
    if (!cred) return;
    if (!confirm(`Disconnect ${config.providerId}? Your stored key will be deleted.`)) return;

    try {
      await disconnectProvider(cred.id, config.providerId);
      addToast(`${config.providerId} disconnected.`);
    } catch {
      addToast('Failed to disconnect.', 'error');
    }
  }

  function getColor(id: string) { return getProviderColorScheme(id).bg; }
  function getAccent(id: string) { return getProviderColorScheme(id).text; }
</script>

<svelte:head>
  <title>API Keys | Vokda</title>
</svelte:head>

<main>
  <header class="page-header">
    <a href="/account" class="back"><Icon name="arrow-left" size={14} /> Account</a>
    <h1>Provider API Keys</h1>
    <p class="subtitle">
      Store your TTS provider API keys to synthesize voices directly.
      Keys are encrypted and only accessible to your account.
    </p>
  </header>

  {#if !$isAuthenticated}
    <div class="auth-gate">
      <Icon name="user" size={28} />
      <p>Sign in to manage your API keys.</p>
      <a href="/account?intent=signin" class="btn primary">Sign In</a>
    </div>
  {:else}
    <div class="stats">
      <span><strong>{$credentials.filter(c => c.status === 'active').length}</strong> of {credProviders.length} providers connected</span>
      <button class="btn ghost sm" on:click={refreshCredentials} disabled={$credentialsLoading}>
        {$credentialsLoading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    <!-- Vokda API key callout -->
    <a href="/account/api-keys" class="vokda-key-banner">
      <div class="banner-text">
        <strong>Vokda API Keys</strong>
        <span>Create API keys for the Vokda Synthesis API (CLI, SDK, curl)</span>
      </div>
      <Icon name="arrow-right" size={16} />
    </a>

    <section>
      <h2>Cloud Providers</h2>
      {#each credProviders as config (config.providerId)}
        {@const status = $connectedProviders.get(config.providerId)}
        {@const isConnected = status === 'active'}
        {@const isExpanded = expandedId === config.providerId}
        <div
          class="card"
          class:connected={isConnected}
          style="--accent: {getAccent(config.providerId)}"
        >
          <button class="card-header" on:click={() => toggle(config.providerId)}>
            <span class="dot" style="background: {getAccent(config.providerId)}"></span>
            <span class="name">{config.providerId}</span>
            <span class="spacer"></span>
            {#if isConnected}
              <span class="status-pill connected"><Icon name="check" size={11} /> Connected</span>
            {:else}
              <span class="status-pill">Not connected</span>
            {/if}
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
          </button>

          {#if isExpanded}
            <div class="card-body">
              {#if config.notes}
                <p class="notes">{config.notes}</p>
              {/if}

              {#if !isConnected}
                <div class="fields">
                  {#each config.fields as field (field.key)}
                    <label>
                      <span class="field-label">{field.label} {#if field.required}<span class="req">*</span>{/if}</span>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={getFieldValue(config.providerId, field.key)}
                        on:input={(e) => setFieldValue(config.providerId, field.key, e.currentTarget.value)}
                        autocomplete="off"
                        spellcheck="false"
                      />
                    </label>
                  {/each}
                </div>

                {#if config.docsUrl}
                  <a href={config.docsUrl} target="_blank" rel="noreferrer" class="docs-link">
                    Get your API key →
                  </a>
                {/if}

                <div class="actions">
                  <button
                    class="btn primary"
                    on:click={() => handleSave(config)}
                    disabled={saving[config.providerId]}
                  >
                    {saving[config.providerId] ? 'Saving…' : 'Save Key'}
                  </button>
                </div>
              {:else}
                <p class="connected-msg">
                  <Icon name="check" size={14} /> API key stored securely.
                </p>
                <div class="actions">
                  <button
                    class="btn ghost"
                    on:click={() => handleTest(config)}
                    disabled={testing[config.providerId]}
                  >
                    {testing[config.providerId] ? 'Testing…' : 'Test Connection'}
                  </button>
                  <button class="btn danger" on:click={() => handleRemove(config)}>
                    Remove
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </section>

    <section>
      <h2>Free Providers</h2>
      <p class="section-note">No API key needed — these run locally or use free endpoints.</p>
      <div class="free-grid">
        {#each freeProviders as config (config.providerId)}
          <div class="free-chip">
            <span class="dot" style="background: {getAccent(config.providerId)}"></span>
            <span>{config.providerId}</span>
            <span class="free-badge">Free</span>
          </div>
        {/each}
      </div>
    </section>
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
    margin-bottom: 0.25rem;
  }
  .back:hover { text-decoration: underline; }

  h1 { margin: 0; font-size: var(--text-display); }
  h2 { font-size: var(--text-heading); margin: 1.5rem 0 0.5rem; color: #1a3347; }

  .subtitle {
    margin: 0.25rem 0 0;
    color: #4a6a82;
    font-size: var(--text-body);
    line-height: 1.5;
  }

  .section-note { color: #5a7a90; font-size: var(--text-small); margin: 0 0 0.5rem; }

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

  /* Stats */
  .stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e4edf3;
    border-radius: 12px;
    background: #f8fbfd;
    font-size: var(--text-small);
    color: #3e5972;
  }
  .stats strong { color: var(--brand-700); }

  /* Vokda API key banner */
  .vokda-key-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    margin-top: 0.75rem;
    border: 1px solid var(--brand-100);
    border-radius: 14px;
    background: linear-gradient(135deg, #f0f9fd 0%, #f8fbfd 100%);
    text-decoration: none;
    color: #1a3347;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .vokda-key-banner:hover {
    border-color: var(--brand-600);
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.12);
  }
  .banner-text { flex: 1; display: grid; gap: 0.15rem; }
  .banner-text strong { font-size: var(--text-body); }
  .banner-text span { font-size: var(--text-small); color: #4a6a82; }

  /* Cards */
  .card {
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
    margin-bottom: 0.5rem;
    overflow: hidden;
    transition: border-color 150ms;
  }
  .card.connected { border-color: #a5d6a7; }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.7rem 0.9rem;
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
    font-size: var(--text-body);
    color: #1a3347;
    text-align: left;
  }
  .card-header:hover { background: #f7fafc; }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .name { font-weight: 680; }
  .spacer { flex: 1; }

  .status-pill {
    font-size: var(--text-xs);
    font-weight: 660;
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    border: 1px solid #d6e2ec;
    color: #5a7a90;
    background: #f0f4f7;
  }
  .status-pill.connected {
    color: #2e7d32;
    background: #e8f5e9;
    border-color: #a5d6a7;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  .card-body {
    padding: 0 0.9rem 0.9rem;
    border-top: 1px solid #eef3f7;
  }

  .notes {
    font-size: var(--text-small);
    color: #5a7a90;
    margin: 0.5rem 0;
  }

  .fields { display: grid; gap: 0.5rem; margin: 0.6rem 0; }

  label { display: grid; gap: 0.2rem; }

  .field-label {
    font-size: var(--text-small);
    font-weight: 620;
    color: #3e5972;
  }
  .req { color: #c62828; }

  input {
    border: 1px solid #bfd0de;
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    font-size: var(--text-body);
    font-family: 'SF Mono', Menlo, monospace;
    letter-spacing: 0.02em;
    background: #fff;
  }
  input:focus { outline: 2px solid var(--brand-600); outline-offset: -1px; }

  .docs-link {
    display: inline-block;
    font-size: var(--text-small);
    font-weight: 620;
    color: var(--brand-600);
    margin-bottom: 0.5rem;
  }

  .connected-msg {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: var(--text-small);
    color: #2e7d32;
    margin: 0.5rem 0;
  }

  .actions { display: flex; gap: 0.4rem; margin-top: 0.4rem; }

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

  .btn.primary {
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }
  .btn.primary:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3); }

  .btn.ghost {
    background: #f3f7fa;
    color: #2c4b60;
    border: 1px solid #c3d1de;
  }
  .btn.ghost:hover:not(:disabled) { background: #edf2f7; }
  .btn.ghost.sm { padding: 0.35rem 0.65rem; }

  .btn.danger {
    background: #fff;
    color: #c62828;
    border: 1px solid #ef9a9a;
  }
  .btn.danger:hover { background: #ffebee; }

  /* Free providers */
  .free-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .free-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border: 1px solid #d6e2ec;
    border-radius: 999px;
    background: #f8fbfd;
    font-size: var(--text-small);
    font-weight: 620;
    color: #1a3347;
  }

  .free-badge {
    font-size: var(--text-xs);
    color: #2e7d32;
    font-weight: 700;
  }
</style>
