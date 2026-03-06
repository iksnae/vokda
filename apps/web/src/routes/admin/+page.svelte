<script lang="ts">
  import { onMount } from 'svelte';
  import { roleFlags, getAuthSnapshot, refreshAuthRoles } from '$lib/auth/store';
  import { addProvider, providerCatalog, removeProvider, updateProvider } from '$lib/stores/app-state';
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import type { ProviderDefinition, ProviderRecord } from '$lib/types';
  import { listProviderRecords, saveProviderRecord } from '$lib/data/voice-store';

  type ManagedRole = 'guest' | 'curator' | 'admin';
  type ProviderDraft = {
    name: string;
    type: ProviderDefinition['type'];
    websiteUrl: string;
  };

  const API_BASE_URL =
    (import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ??
    (typeof window !== 'undefined' && window.location.hostname === 'vokda.iksnae.com'
      ? 'https://vokda.iksnae.com/api'
      : 'http://127.0.0.1:8787');

  // ─── User Roles ───
  let email = '';
  let roleStatus = '';
  let loading = false;
  let current: {
    username: string;
    email: string | null;
    groups: string[];
    roles: string[];
    enabled: boolean;
    status: string | null;
  } | null = null;
  let selectedRole: ManagedRole = 'guest';

  // ─── Provider Management ───
  let providerStatus = '';
  let providerName = '';
  let providerId = '';
  let providerType: ProviderDefinition['type'] = 'cloud_provider';
  let providerWebsite = '';
  let providerDrafts: Record<string, ProviderDraft> = {};

  // ─── DB Provider Records ───
  let dbProviders: ProviderRecord[] = [];
  let dbLoading = false;

  async function loadDbProviders() {
    dbLoading = true;
    try {
      dbProviders = await listProviderRecords();
    } catch (err) {
      console.warn('[admin] Failed to load ProviderRecords:', err);
    } finally {
      dbLoading = false;
    }
  }

  onMount(() => {
    if ($roleFlags.isAdmin) {
      void loadDbProviders();
    }
  });

  // ─── Provider CRUD helpers ───
  function getProviderDraft(provider: ProviderDefinition): ProviderDraft {
    return (
      providerDrafts[provider.id] ?? {
        name: provider.name,
        type: provider.type,
        websiteUrl: provider.websiteUrl ?? ''
      }
    );
  }

  function setProviderDraft(provider: ProviderDefinition, patch: Partial<ProviderDraft>) {
    const currentDraft = getProviderDraft(provider);
    providerDrafts = {
      ...providerDrafts,
      [provider.id]: { ...currentDraft, ...patch }
    };
  }

  function onProviderNameInput(provider: ProviderDefinition, event: Event) {
    setProviderDraft(provider, { name: (event.currentTarget as HTMLInputElement).value });
  }
  function onProviderTypeChange(provider: ProviderDefinition, event: Event) {
    setProviderDraft(provider, { type: (event.currentTarget as HTMLSelectElement).value as ProviderDefinition['type'] });
  }
  function onProviderWebsiteInput(provider: ProviderDefinition, event: Event) {
    setProviderDraft(provider, { websiteUrl: (event.currentTarget as HTMLInputElement).value });
  }

  // ─── API helpers ───
  async function apiRequest(path: string, init: RequestInit) {
    const token = getAuthSnapshot().accessToken || getAuthSnapshot().idToken;
    if (!token) throw new Error('Sign in required');

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {})
      }
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'API request failed');
    return payload;
  }

  async function lookupUser() {
    if (!email.trim()) return;
    loading = true;
    roleStatus = '';
    try {
      const payload = (await apiRequest(`/v1/admin/users?email=${encodeURIComponent(email.trim())}`, { method: 'GET' })) as {
        user: { username: string; email: string | null; groups: string[]; roles: string[]; enabled: boolean; status: string | null; };
      };
      current = payload.user;
      selectedRole = payload.user.roles.includes('admin') ? 'admin' : payload.user.roles.includes('curator') ? 'curator' : 'guest';
      roleStatus = 'User loaded.';
    } catch (error) {
      current = null;
      roleStatus = error instanceof Error ? error.message : 'Lookup failed.';
    } finally {
      loading = false;
    }
  }

  async function applyRole() {
    if (!current) return;
    loading = true;
    roleStatus = '';
    try {
      const rolePayload: Record<ManagedRole, ManagedRole[]> = {
        guest: ['guest'], curator: ['guest', 'curator'], admin: ['guest', 'curator', 'admin']
      };
      const payload = (await apiRequest('/v1/admin/users/roles', {
        method: 'POST',
        body: JSON.stringify({ email: current.email ?? email.trim(), roles: rolePayload[selectedRole] })
      })) as {
        user: { username: string; email: string | null; groups: string[]; roles: string[]; enabled: boolean; status: string | null; };
      };
      current = payload.user;
      roleStatus = `Role updated to ${selectedRole}.`;
      await refreshAuthRoles();
    } catch (error) {
      roleStatus = error instanceof Error ? error.message : 'Role update failed.';
    } finally {
      loading = false;
    }
  }

  async function createProvider() {
    if (!providerName.trim()) {
      providerStatus = 'Provider name is required.';
      return;
    }

    const created = addProvider({
      id: providerId.trim() || undefined,
      name: providerName.trim(),
      type: providerType,
      websiteUrl: providerWebsite.trim() || undefined
    });

    if (created) {
      // Also save to ProviderRecord
      try {
        await saveProviderRecord({
          id: providerId.trim() || providerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: providerName.trim(),
          type: providerType,
          websiteUrl: providerWebsite.trim() || undefined,
        }, 0);
        addToast(`Provider "${providerName.trim()}" created and saved to database.`);
        void loadDbProviders();
      } catch {
        addToast(`Provider "${providerName.trim()}" created locally. Database save failed.`, 'info');
      }

      providerName = '';
      providerId = '';
      providerWebsite = '';
      providerType = 'cloud_provider';
    } else {
      providerStatus = 'Provider add failed. Check duplicate ID or admin role.';
    }
  }

  async function saveProviderLocal(provider: ProviderDefinition) {
    const draft = getProviderDraft(provider);
    const updated = updateProvider(provider.id, {
      name: draft.name,
      type: draft.type,
      websiteUrl: draft.websiteUrl.trim() || undefined
    });

    if (updated) {
      // Sync to ProviderRecord
      try {
        const dbRecord = dbProviders.find(p => p.slug === provider.id || p.id === provider.id);
        await saveProviderRecord({
          ...provider,
          name: draft.name.trim(),
          type: draft.type,
          websiteUrl: draft.websiteUrl.trim() || undefined,
        }, dbRecord?.voiceCount ?? 0);
        addToast(`Provider "${draft.name.trim()}" saved to database.`);
      } catch {
        addToast(`Provider "${draft.name.trim()}" saved locally.`, 'info');
      }
    } else {
      providerStatus = 'Provider update failed.';
    }
  }

  function deleteProvider(provider: ProviderDefinition) {
    const removed = removeProvider(provider.id);
    if (removed) {
      addToast(`Provider "${provider.name}" deleted.`);
      const nextDrafts = { ...providerDrafts };
      delete nextDrafts[provider.id];
      providerDrafts = nextDrafts;
    } else {
      providerStatus = 'Keep at least one provider.';
    }
  }

  let activeTab: 'roles' | 'providers' = 'roles';
</script>

<svelte:head>
  <title>Admin | Vokda</title>
</svelte:head>

<main>
  <h1>
    <Icon name="user" size={24} />
    Admin
  </h1>

  {#if !$roleFlags.isAdmin}
    <p class="blocked">This area is restricted to administrators.</p>
  {:else}
    <nav class="tabs">
      <button class="tab" class:active={activeTab === 'roles'} on:click={() => activeTab = 'roles'}>
        <Icon name="user" size={16} />
        User Roles
      </button>
      <button class="tab" class:active={activeTab === 'providers'} on:click={() => activeTab = 'providers'}>
        <Icon name="globe" size={16} />
        Providers
        <span class="tab-badge">{$providerCatalog.length}</span>
      </button>
    </nav>

    {#if activeTab === 'roles'}
      <section class="panel">
        <div class="controls">
          <label>
            Email
            <input bind:value={email} type="email" placeholder="user@domain.com" />
          </label>
          <button class="primary-btn" on:click={lookupUser} disabled={loading || !email.trim()}>Lookup</button>
        </div>

        {#if current}
          <div class="summary">
            <p><strong>Username:</strong> {current.username}</p>
            <p><strong>Email:</strong> {current.email}</p>
            <p><strong>Status:</strong> {current.status ?? 'UNKNOWN'} | enabled={current.enabled ? 'yes' : 'no'}</p>
            <p><strong>Groups:</strong> {current.groups.join(', ') || '(none)'}</p>
            <p><strong>Roles:</strong> {current.roles.join(', ')}</p>
          </div>

          <div class="controls">
            <label>
              Role tier
              <select bind:value={selectedRole}>
                <option value="guest">Guest</option>
                <option value="curator">Curator</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button class="primary-btn" on:click={applyRole} disabled={loading}>Apply</button>
          </div>
        {/if}

        {#if roleStatus}
          <p class="status">{roleStatus}</p>
        {/if}
      </section>
    {/if}

    {#if activeTab === 'providers'}
      <section class="panel">
        <p class="panel-desc">
          {dbProviders.length} providers in database ·
          {$providerCatalog.length} in local catalog
        </p>

        <div class="controls create-row">
          <label>
            Name
            <input bind:value={providerName} placeholder="Acme Voices" />
          </label>
          <label>
            ID (slug)
            <input bind:value={providerId} placeholder="acme-voices" />
          </label>
          <label>
            Type
            <select bind:value={providerType}>
              <option value="cloud_provider">Cloud provider</option>
              <option value="open_model">Open model</option>
              <option value="self_hosted">Self-hosted</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Website
            <input bind:value={providerWebsite} placeholder="https://example.com" />
          </label>
          <button class="primary-btn" on:click={createProvider}>
            <Icon name="plus" size={14} />
            Create
          </button>
        </div>

        <div class="provider-grid">
          {#each $providerCatalog as provider}
            {@const draft = getProviderDraft(provider)}
            {@const dbRecord = dbProviders.find(p => p.slug === provider.id || p.id === provider.id)}
            <article class="provider-card">
              <div class="provider-header">
                <span class="provider-id">{provider.id}</span>
                {#if dbRecord}
                  <span class="db-badge">
                    <Icon name="check" size={10} />
                    DB · {dbRecord.voiceCount} voices
                  </span>
                {:else}
                  <span class="db-badge missing">local only</span>
                {/if}
              </div>

              <label>
                Name
                <input value={draft.name} on:input={(e) => onProviderNameInput(provider, e)} />
              </label>
              <label>
                Type
                <select value={draft.type} on:change={(e) => onProviderTypeChange(provider, e)}>
                  <option value="cloud_provider">Cloud provider</option>
                  <option value="open_model">Open model</option>
                  <option value="self_hosted">Self-hosted</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Website
                <input value={draft.websiteUrl} on:input={(e) => onProviderWebsiteInput(provider, e)} />
              </label>

              <div class="card-actions">
                <button class="primary-btn small" on:click={() => saveProviderLocal(provider)}>Save</button>
                <button class="ghost-btn small" on:click={() => deleteProvider(provider)}>Delete</button>
              </div>
            </article>
          {/each}
        </div>

        {#if providerStatus}
          <p class="status">{providerStatus}</p>
        {/if}
      </section>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 1020px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: reveal 320ms ease;
  }

  h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: var(--text-display);
  }

  .panel, .blocked { margin-top: 0.5rem; border: 1px solid var(--stroke-soft); border-radius: 16px; background: linear-gradient(180deg, #fff, #fbfdfe); padding: 1rem; box-shadow: 0 10px 22px rgba(17,39,57,.08); }
  .blocked { background: #fff2f0; border-color: #e5b4ab; color: #7a2d1b; }
  .panel-desc { margin: 0 0 0.6rem; color: #4a6a82; font-size: var(--text-body); }

  /* Tabs */
  .tabs { display: flex; gap: 0.3rem; margin-top: 0.75rem; border-bottom: 2px solid #e4edf3; }
  .tab { display: inline-flex; align-items: center; gap: 0.35rem; border: none; background: none; padding: 0.55rem 0.85rem; font-size: var(--text-small); font-weight: 660; color: #5a7a90; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 150ms, border-color 150ms; }
  .tab:hover { color: var(--brand-600); }
  .tab.active { color: var(--brand-700); border-bottom-color: var(--brand-600); }
  .tab-badge { background: var(--brand-100); color: var(--brand-700); font-size: 0.7rem; font-weight: 720; border-radius: 999px; padding: 0.05rem 0.38rem; min-width: 1.2rem; text-align: center; }

  /* Form */
  p { margin: 0; }
  .controls { display: flex; gap: 0.55rem; align-items: end; flex-wrap: wrap; margin-top: 0.5rem; }
  .create-row { padding-bottom: 0.6rem; border-bottom: 1px solid #e4edf3; margin-bottom: 0.6rem; }

  label { display: grid; gap: 0.3rem; font-size: var(--text-small); font-weight: 620; color: #3e5972; }
  input, select { border: 1px solid #bfd0de; border-radius: 12px; padding: 0.5rem 0.65rem; background: #fff; font-size: var(--text-body); }
  input:disabled { background: #f0f3f6; color: #51657b; }

  .primary-btn { display: inline-flex; align-items: center; gap: 0.3rem; border: none; border-radius: 11px; padding: 0.5rem 0.82rem; background: linear-gradient(154deg, var(--brand-600), var(--brand-700)); color: #fff; font-weight: 680; cursor: pointer; font-size: var(--text-small); box-shadow: 0 4px 12px rgba(20,94,121,.2); }
  .primary-btn:hover { box-shadow: 0 6px 16px rgba(20,94,121,.3); }
  .primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .primary-btn.small { padding: 0.4rem 0.65rem; font-size: var(--text-xs); }

  .ghost-btn { background: #f3f7fa; color: #2c4b60; border: 1px solid #c3d1de; border-radius: 11px; padding: 0.4rem 0.65rem; font-weight: 660; cursor: pointer; font-size: var(--text-xs); }
  .ghost-btn:hover { background: #edf2f7; }
  .ghost-btn.small { padding: 0.35rem 0.55rem; }

  .summary { border: 1px solid #cdddea; border-radius: 11px; background: #edf6fb; padding: 0.55rem; display: grid; gap: 0.3rem; margin-top: 0.5rem; }
  .status { color: #1d5476; font-weight: 650; margin-top: 0.5rem; }

  /* Provider grid */
  .provider-grid { display: grid; gap: 0.55rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .provider-card { border: 1px solid #cfdae4; border-radius: 14px; padding: 0.65rem; background: #f8fbfd; display: grid; gap: 0.4rem; }
  .provider-header { display: flex; justify-content: space-between; align-items: center; }
  .provider-id { font-size: var(--text-xs); font-weight: 700; color: #5a7a90; font-family: 'SF Mono', Menlo, monospace; }
  .db-badge { font-size: var(--text-xs); font-weight: 660; color: #2e7d32; background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 999px; padding: 0.08rem 0.4rem; display: inline-flex; align-items: center; gap: 0.2rem; }
  .db-badge.missing { color: #8d5c16; background: #fefbe8; border-color: #f0c36e; }
  .card-actions { display: flex; gap: 0.4rem; margin-top: 0.15rem; }

  @keyframes reveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
