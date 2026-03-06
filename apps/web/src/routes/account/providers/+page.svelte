<script lang="ts">
  import { onMount } from 'svelte';
  import { isAuthenticated, roleFlags } from '$lib/auth/store';
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
  import {
    oauthSignIn,
    oauthSignOut,
    getOAuthToken,
    getAvailableOAuthConfigs,
    hasValidOAuthToken,
    oauthTokens,
    type OAuthProvider,
  } from '$lib/synthesis/oauth';
  import { registerCredentialAdapter } from '$lib/synthesis/registry';

  const credProviders = getCredentialProviders();
  const freeProviders = getFreeProviders();
  const availableOAuth = getAvailableOAuthConfigs();

  // ─── Form state per provider ───
  type FormState = {
    expanded: boolean;
    fields: Record<string, string>;
    saving: boolean;
    testing: boolean;
    testResult?: { success: boolean; message: string };
  };

  let forms: Record<string, FormState> = {};

  function getForm(providerId: string): FormState {
    return forms[providerId] ?? { expanded: false, fields: {}, saving: false, testing: false };
  }

  function toggleExpand(providerId: string) {
    const f = getForm(providerId);
    forms = { ...forms, [providerId]: { ...f, expanded: !f.expanded } };
  }

  function updateField(providerId: string, key: string, value: string) {
    const f = getForm(providerId);
    forms = {
      ...forms,
      [providerId]: { ...f, fields: { ...f.fields, [key]: value } },
    };
  }

  function getProviderColor(providerId: string): string {
    return getProviderColorScheme(providerId).bg;
  }

  function getProviderAccent(providerId: string): string {
    return getProviderColorScheme(providerId).text;
  }

  // ─── Actions ───

  async function saveProvider(config: ProviderAuthConfig) {
    const f = getForm(config.providerId);
    const missingFields = config.fields.filter(
      (field) => field.required && !f.fields[field.key]?.trim()
    );
    if (missingFields.length > 0) {
      addToast(`Fill in: ${missingFields.map((f) => f.label).join(', ')}`, 'error');
      return;
    }

    forms = { ...forms, [config.providerId]: { ...f, saving: true } };

    try {
      const data = buildCredentialData(config, f.fields);
      await connectProvider(config.providerId, config.providerId, data);
      addToast(`${config.providerId} connected!`);
      forms = {
        ...forms,
        [config.providerId]: { ...f, saving: false, expanded: false, testResult: undefined },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      addToast(msg, 'error');
      forms = { ...forms, [config.providerId]: { ...f, saving: false } };
    }
  }

  async function testProvider(config: ProviderAuthConfig) {
    const f = getForm(config.providerId);
    forms = { ...forms, [config.providerId]: { ...f, testing: true, testResult: undefined } };

    try {
      // Get credential data from saved credential or form fields
      let data: CredentialData;
      const cred = $credentials.find((c) => c.providerId === config.providerId);

      if (cred) {
        const stored = await getCredentialData(config.providerId);
        if (!stored) throw new Error('No stored credential data');
        data = stored;
      } else {
        data = buildCredentialData(config, f.fields);
      }

      const credId = cred?.id ?? '';
      const result = await testCredential(credId, config.providerId, data);

      forms = { ...forms, [config.providerId]: { ...f, testing: false, testResult: result } };

      if (result.success) {
        addToast(result.message);
      } else {
        addToast(result.message, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      forms = {
        ...forms,
        [config.providerId]: {
          ...f,
          testing: false,
          testResult: { success: false, message: msg },
        },
      };
      addToast(msg, 'error');
    }
  }

  async function removeProvider(config: ProviderAuthConfig) {
    const cred = $credentials.find((c) => c.providerId === config.providerId);
    if (!cred) return;
    if (!confirm(`Disconnect ${config.providerId}? Your API key will be deleted.`)) return;

    try {
      await disconnectProvider(cred.id, config.providerId);
      addToast(`${config.providerId} disconnected.`);
      forms = { ...forms, [config.providerId]: { expanded: false, fields: {}, saving: false, testing: false } };
    } catch (err) {
      addToast('Failed to disconnect.', 'error');
    }
  }

  function buildCredentialData(
    config: ProviderAuthConfig,
    fields: Record<string, string>
  ): CredentialData {
    const data: Record<string, string> = {};
    for (const field of config.fields) {
      data[field.key] = fields[field.key]?.trim() ?? '';
    }
    return data as CredentialData;
  }

  // ─── OAuth actions ───
  let oauthLoading: Record<string, boolean> = {};

  async function handleOAuthSignIn(config: ProviderAuthConfig) {
    if (!config.oauth) return;
    const provider = config.oauth.provider;
    oauthLoading = { ...oauthLoading, [config.providerId]: true };

    try {
      const token = await oauthSignIn(provider);
      addToast(`Signed in with ${config.oauth.label.replace('Sign in with ', '')}. Token valid for ~1 hour.`);

      // Register a placeholder adapter that the real adapter will use via getAccessTokenForProvider()
      // The real adapters already check for OAuth tokens internally
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OAuth sign-in failed';
      addToast(msg, 'error');
    } finally {
      oauthLoading = { ...oauthLoading, [config.providerId]: false };
    }
  }

  async function handleOAuthSignOut(config: ProviderAuthConfig) {
    if (!config.oauth) return;
    try {
      await oauthSignOut(config.oauth.provider);
      addToast(`Signed out of ${config.oauth.label.replace('Sign in with ', '')}.`);
    } catch {
      addToast('Sign-out failed.', 'error');
    }
  }

  function isOAuthConnected(config: ProviderAuthConfig): boolean {
    if (!config.oauth) return false;
    return hasValidOAuthToken(config.providerId);
  }

  function getOAuthExpiryLabel(provider: OAuthProvider): string {
    const token = getOAuthToken(provider);
    if (!token) return '';
    const minutesLeft = Math.max(0, Math.round((token.expiresAt - Date.now()) / 60000));
    if (minutesLeft < 1) return 'Expired';
    return `${minutesLeft} min remaining`;
  }

  function statusIcon(status: string | undefined): string {
    switch (status) {
      case 'active': return 'check';
      case 'invalid': return 'x';
      case 'expired': return 'x';
      default: return 'minus';
    }
  }

  function statusLabel(status: string | undefined): string {
    switch (status) {
      case 'active': return 'Connected';
      case 'invalid': return 'Invalid';
      case 'expired': return 'Expired';
      default: return 'Not connected';
    }
  }
</script>

<svelte:head>
  <title>Provider Accounts | Vokda</title>
  <meta name="description" content="Connect your TTS provider API keys to synthesize voices with your own account." />
</svelte:head>

<main>
  <header>
    <a href="/account" class="back">
      <Icon name="arrow-left" size={16} />
      Account
    </a>
    <h1>
      <Icon name="globe" size={24} />
      Provider Accounts
    </h1>
    <p class="subtitle">
      Connect your API keys to synthesize voices. <strong>Your keys, your billing</strong> — Vokda never stores system keys.
    </p>
  </header>

  {#if !$isAuthenticated}
    <div class="auth-gate">
      <Icon name="user" size={32} />
      <p>Sign in to manage your provider accounts.</p>
      <a href="/account?intent=signin" class="primary-btn">Sign In</a>
    </div>
  {:else}
    <!-- Connected count -->
    <div class="stats-bar">
      <span class="stat">
        <strong>{$credentials.filter(c => c.status === 'active').length}</strong> of {credProviders.length} connected
      </span>
      <button class="ghost-btn" on:click={refreshCredentials} disabled={$credentialsLoading}>
        Refresh
      </button>
    </div>

    <!-- Cloud providers requiring API keys -->
    <section>
      <h2>Cloud Providers</h2>
      <div class="provider-grid">
        {#each credProviders as config}
          {@const status = $connectedProviders.get(config.providerId)}
          {@const f = getForm(config.providerId)}
          {@const oauthConnected = isOAuthConnected(config)}
          {@const isConnected = status === 'active' || oauthConnected}
          <article
            class="provider-card"
            class:connected={isConnected}
            class:invalid={status === 'invalid'}
            style="--provider-bg: {getProviderColor(config.providerId)}; --provider-fg: {getProviderAccent(config.providerId)}"
          >
            <div class="card-header" role="button" tabindex="0" on:click={() => toggleExpand(config.providerId)} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(config.providerId); }}>
              <div class="card-title">
                <span class="provider-dot" style="background: {getProviderAccent(config.providerId)}"></span>
                <span class="provider-name">{config.providerId}</span>
              </div>
              <div class="card-status">
                <span class="status-badge" class:active={isConnected} class:oauth={oauthConnected && status !== 'active'} class:invalid={status === 'invalid'}>
                  <Icon name={isConnected ? 'check' : statusIcon(status)} size={12} />
                  {oauthConnected && status !== 'active' ? 'OAuth' : statusLabel(isConnected ? 'active' : status)}
                </span>
                <Icon name={f.expanded ? 'chevron-up' : 'chevron-down'} size={14} />
              </div>
            </div>

            {#if f.expanded}
              <div class="card-body">
                {#if config.notes}
                  <p class="notes">{config.notes}</p>
                {/if}

                <!-- OAuth option (when available) -->
                {#if config.oauth}
                  {@const oauthActive = isOAuthConnected(config)}
                  <div class="oauth-section">
                    <div class="oauth-header">
                      <span class="oauth-label">Quick Connect</span>
                      {#if oauthActive}
                        <span class="oauth-timer">{getOAuthExpiryLabel(config.oauth.provider)}</span>
                      {/if}
                    </div>

                    {#if oauthActive}
                      <div class="oauth-connected">
                        <span class="oauth-status">
                          <Icon name="check" size={14} />
                          Signed in via {config.oauth.label.replace('Sign in with ', '')}
                        </span>
                        <button class="ghost-btn small" on:click={() => handleOAuthSignOut(config)}>
                          Sign Out
                        </button>
                      </div>
                    {:else}
                      <button
                        class="oauth-btn"
                        class:google={config.oauth.provider === 'google'}
                        class:microsoft={config.oauth.provider === 'microsoft'}
                        on:click={() => handleOAuthSignIn(config)}
                        disabled={oauthLoading[config.providerId]}
                      >
                        {#if config.oauth.provider === 'google'}
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        {:else if config.oauth.provider === 'microsoft'}
                          <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true">
                            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                          </svg>
                        {/if}
                        {oauthLoading[config.providerId] ? 'Signing in...' : config.oauth.buttonLabel}
                      </button>
                      <p class="oauth-note">Session-based · Token expires in ~1 hour · No key stored</p>
                    {/if}
                  </div>

                  <div class="auth-divider">
                    <span>or use API key</span>
                  </div>
                {/if}

                {#if !isConnected}
                  <div class="fields">
                    {#each config.fields as field}
                      <label>
                        {field.label}
                        {#if field.required}<span class="req">*</span>{/if}
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={f.fields[field.key] ?? ''}
                          on:input={(e) => updateField(config.providerId, field.key, e.currentTarget.value)}
                          autocomplete="off"
                        />
                      </label>
                    {/each}
                  </div>

                  {#if config.docsUrl}
                    <p class="docs-link">
                      <a href={config.docsUrl} target="_blank" rel="noreferrer">
                        Get your API key →
                      </a>
                    </p>
                  {/if}

                  <div class="card-actions">
                    <button
                      class="primary-btn"
                      on:click={() => saveProvider(config)}
                      disabled={f.saving}
                    >
                      {f.saving ? 'Saving...' : 'Save API Key'}
                    </button>
                  </div>
                {:else}
                  <!-- Connected via API key -->
                  <div class="connected-info">
                    <p>✓ API key stored securely in your account.</p>

                    {#if f.testResult}
                      <p class="test-result" class:success={f.testResult.success} class:fail={!f.testResult.success}>
                        {f.testResult.message}
                      </p>
                    {/if}
                  </div>

                  <div class="card-actions">
                    <button
                      class="ghost-btn"
                      on:click={() => testProvider(config)}
                      disabled={f.testing}
                    >
                      {f.testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button class="danger-btn" on:click={() => removeProvider(config)}>
                      Remove Key
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </section>

    <!-- Free providers -->
    <section>
      <h2>Free Providers</h2>
      <p class="section-desc">These providers don't need API keys — synthesis is free or runs locally.</p>
      <div class="free-grid">
        {#each freeProviders as config}
          <div class="free-card">
            <span class="provider-dot" style="background: {getProviderAccent(config.providerId)}"></span>
            <span class="free-name">{config.providerId}</span>
            <span class="free-status">
              <Icon name="check" size={12} />
              Free
            </span>
            {#if config.notes}
              <span class="free-notes">{config.notes}</span>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 1rem 3rem;
    animation: reveal 320ms ease;
  }

  header { margin-bottom: 1rem; }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--brand-600);
    font-size: var(--text-small);
    font-weight: 620;
    text-decoration: none;
    margin-bottom: 0.3rem;
  }
  .back:hover { text-decoration: underline; }

  h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: var(--text-display);
  }

  .subtitle {
    margin: 0.3rem 0 0;
    color: #4a6a82;
    font-size: var(--text-body);
  }

  h2 {
    font-size: var(--text-heading);
    margin: 1.2rem 0 0.5rem;
    color: #1a3347;
  }

  .section-desc {
    color: #5a7a90;
    font-size: var(--text-small);
    margin: 0 0 0.5rem;
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

  /* Stats */
  .stats-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e4edf3;
    border-radius: 12px;
    background: #f8fbfd;
    margin-bottom: 0.5rem;
  }

  .stat { font-size: var(--text-small); color: #3e5972; }
  .stat strong { color: var(--brand-700); }

  /* Provider grid */
  .provider-grid {
    display: grid;
    gap: 0.5rem;
  }

  .provider-card {
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
    overflow: hidden;
    transition: border-color 150ms;
  }

  .provider-card.connected { border-color: #a5d6a7; }
  .provider-card.invalid { border-color: #ef9a9a; }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 0.85rem;
    cursor: pointer;
    user-select: none;
  }

  .card-header:hover { background: #f7fafc; }

  .card-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .provider-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .provider-name {
    font-weight: 680;
    font-size: var(--text-body);
    color: #1a3347;
  }

  .card-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #5a7a90;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--text-xs);
    font-weight: 660;
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    border: 1px solid #d6e2ec;
    color: #5a7a90;
    background: #f0f4f7;
  }

  .status-badge.active {
    color: #2e7d32;
    background: #e8f5e9;
    border-color: #a5d6a7;
  }

  .status-badge.invalid {
    color: #c62828;
    background: #ffebee;
    border-color: #ef9a9a;
  }

  .card-body {
    padding: 0 0.85rem 0.85rem;
    border-top: 1px solid #eef3f7;
  }

  .notes {
    font-size: var(--text-small);
    color: #5a7a90;
    margin: 0.5rem 0;
  }

  .fields {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.5rem;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-size: var(--text-small);
    font-weight: 620;
    color: #3e5972;
  }

  .req { color: #c62828; }

  input {
    border: 1px solid #bfd0de;
    border-radius: 10px;
    padding: 0.5rem 0.65rem;
    background: #fff;
    font-size: var(--text-body);
    font-family: 'SF Mono', Menlo, monospace;
    letter-spacing: 0.02em;
  }

  input:focus {
    outline: 2px solid var(--brand-400);
    outline-offset: -1px;
  }

  .docs-link {
    margin: 0.4rem 0;
    font-size: var(--text-small);
  }

  .docs-link a { color: var(--brand-600); font-weight: 620; }

  .card-actions {
    display: flex;
    gap: 0.45rem;
    margin-top: 0.55rem;
  }

  .connected-info {
    margin: 0.5rem 0;
    font-size: var(--text-small);
    color: #2e7d32;
  }

  .test-result {
    font-size: var(--text-xs);
    padding: 0.3rem 0.5rem;
    border-radius: 8px;
    margin-top: 0.3rem;
  }

  .test-result.success { background: #e8f5e9; color: #2e7d32; }
  .test-result.fail { background: #ffebee; color: #c62828; }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: none;
    border-radius: 11px;
    padding: 0.5rem 1rem;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    font-weight: 680;
    font-size: var(--text-small);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .primary-btn:hover { box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3); }
  .primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .ghost-btn {
    background: #f3f7fa;
    color: #2c4b60;
    border: 1px solid #c3d1de;
    border-radius: 11px;
    padding: 0.45rem 0.75rem;
    font-weight: 660;
    font-size: var(--text-small);
    cursor: pointer;
  }

  .ghost-btn:hover { background: #edf2f7; }
  .ghost-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .danger-btn {
    background: #fff;
    color: #c62828;
    border: 1px solid #ef9a9a;
    border-radius: 11px;
    padding: 0.45rem 0.75rem;
    font-weight: 660;
    font-size: var(--text-small);
    cursor: pointer;
  }

  .danger-btn:hover { background: #ffebee; }

  /* Free providers */
  .free-grid {
    display: grid;
    gap: 0.35rem;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .free-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.35rem;
    align-items: center;
    padding: 0.45rem 0.65rem;
    border: 1px solid #d6e2ec;
    border-radius: 12px;
    background: #f8fbfd;
  }

  .free-name {
    font-weight: 660;
    font-size: var(--text-small);
    color: #1a3347;
  }

  .free-status {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: var(--text-xs);
    font-weight: 660;
    color: #2e7d32;
  }

  .free-notes {
    grid-column: 1 / -1;
    font-size: var(--text-xs);
    color: #5a7a90;
  }

  /* OAuth section */
  .oauth-section {
    margin: 0.55rem 0;
    padding: 0.65rem;
    border: 1px solid #e0e8ef;
    border-radius: 12px;
    background: #f7fafc;
  }

  .oauth-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .oauth-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #5a7a90;
  }

  .oauth-timer {
    font-size: var(--text-xs);
    color: #8d5c16;
    font-weight: 620;
  }

  .oauth-connected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .oauth-status {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--text-small);
    font-weight: 640;
    color: #2e7d32;
  }

  .oauth-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
    border: 1px solid #d0dce6;
    border-radius: 11px;
    padding: 0.6rem 1rem;
    background: #fff;
    font-size: var(--text-body);
    font-weight: 620;
    color: #3e5972;
    cursor: pointer;
    transition: all 150ms;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .oauth-btn:hover {
    background: #f7fafc;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .oauth-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .oauth-btn.google:hover { border-color: #4285F4; }
  .oauth-btn.microsoft:hover { border-color: #00a4ef; }

  .oauth-note {
    margin: 0.35rem 0 0;
    font-size: var(--text-xs);
    color: #7a8fa0;
    text-align: center;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.65rem 0;
    color: #8a9fb0;
    font-size: var(--text-xs);
    font-weight: 620;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #d6e2ec;
  }

  .status-badge.oauth {
    color: #1565c0;
    background: #e3f2fd;
    border-color: #90caf9;
  }

  @keyframes reveal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
