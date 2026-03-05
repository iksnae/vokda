<script lang="ts">
  import { roleFlags, getAuthSnapshot, refreshAuthRoles } from '$lib/auth/store';
  import { addProvider, providerCatalog, removeProvider, updateProvider } from '$lib/stores/app-state';
  import type { ProviderDefinition } from '$lib/types';

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

  let email = '';
  let roleStatus = '';
  let providerStatus = '';
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
  let providerName = '';
  let providerId = '';
  let providerType: ProviderDefinition['type'] = 'cloud_provider';
  let providerWebsite = '';
  let providerDrafts: Record<string, ProviderDraft> = {};

  function getProviderDraft(provider: ProviderDefinition): ProviderDraft {
    return (
      providerDrafts[provider.id] ?? {
        name: provider.name,
        type: provider.type,
        websiteUrl: provider.websiteUrl ?? ''
      }
    );
  }

  function setProviderDraft(
    provider: ProviderDefinition,
    patch: Partial<ProviderDraft>
  ) {
    const currentDraft = getProviderDraft(provider);
    providerDrafts = {
      ...providerDrafts,
      [provider.id]: {
        ...currentDraft,
        ...patch
      }
    };
  }

  function onProviderNameInput(provider: ProviderDefinition, event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    setProviderDraft(provider, { name: target.value });
  }

  function onProviderTypeChange(provider: ProviderDefinition, event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    setProviderDraft(provider, { type: target.value as ProviderDefinition['type'] });
  }

  function onProviderWebsiteInput(provider: ProviderDefinition, event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    setProviderDraft(provider, { websiteUrl: target.value });
  }

  async function apiRequest(path: string, init: RequestInit) {
    const token = getAuthSnapshot().accessToken || getAuthSnapshot().idToken;
    if (!token) {
      throw new Error('Sign in required');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {})
      }
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'API request failed');
    }

    return payload;
  }

  async function lookupUser() {
    if (!email.trim()) return;

    loading = true;
    roleStatus = '';

    try {
      const payload = (await apiRequest(`/v1/admin/users?email=${encodeURIComponent(email.trim())}`, {
        method: 'GET'
      })) as {
        user: {
          username: string;
          email: string | null;
          groups: string[];
          roles: string[];
          enabled: boolean;
          status: string | null;
        };
      };

      current = payload.user;
      selectedRole = payload.user.roles.includes('admin')
        ? 'admin'
        : payload.user.roles.includes('curator')
          ? 'curator'
          : 'guest';
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
        guest: ['guest'],
        curator: ['guest', 'curator'],
        admin: ['guest', 'curator', 'admin']
      };

      const payload = (await apiRequest('/v1/admin/users/roles', {
        method: 'POST',
        body: JSON.stringify({
          email: current.email ?? email.trim(),
          roles: rolePayload[selectedRole]
        })
      })) as {
        user: {
          username: string;
          email: string | null;
          groups: string[];
          roles: string[];
          enabled: boolean;
          status: string | null;
        };
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

  function createProvider() {
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

    providerStatus = created
      ? `Provider "${providerName.trim()}" added.`
      : 'Provider add failed. Check duplicate ID or admin role.';

    if (created) {
      providerName = '';
      providerId = '';
      providerWebsite = '';
      providerType = 'cloud_provider';
    }
  }

  function saveProvider(provider: ProviderDefinition) {
    const draft = getProviderDraft(provider);
    const updated = updateProvider(provider.id, {
      name: draft.name,
      type: draft.type,
      websiteUrl: draft.websiteUrl.trim() || undefined
    });

    providerStatus = updated
      ? `Provider "${draft.name.trim()}" saved.`
      : 'Provider update failed. Check admin role and required fields.';
  }

  function deleteProvider(provider: ProviderDefinition) {
    const removed = removeProvider(provider.id);
    providerStatus = removed
      ? `Provider "${provider.name}" deleted.`
      : 'Provider delete failed. Keep at least one provider in catalog.';

    if (removed) {
      const nextDrafts = { ...providerDrafts };
      delete nextDrafts[provider.id];
      providerDrafts = nextDrafts;
    }
  }
</script>

<svelte:head>
  <title>Admin | Vokda</title>
</svelte:head>

<main>
  <h1>Admin</h1>

  {#if !$roleFlags.isAdmin}
    <p class="blocked">Access restricted. Admin tier is required.</p>
  {:else}
    <section class="panel">
      <h2>User Roles</h2>

      <div class="controls">
        <label>
          Email
          <input bind:value={email} type="email" placeholder="user@domain.com" />
        </label>
        <button class="ghost" on:click={lookupUser} disabled={loading || !email.trim()}>Lookup</button>
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
          <button on:click={applyRole} disabled={loading}>Apply</button>
        </div>
      {/if}

      {#if roleStatus}
        <p class="status">{roleStatus}</p>
      {/if}
    </section>

    <section class="panel">
      <h2>Providers</h2>

      <div class="controls create-row">
        <label>
          Name
          <input bind:value={providerName} placeholder="Acme Voices" />
        </label>
        <label>
          ID
          <input bind:value={providerId} placeholder="acme-voices" />
        </label>
        <label>
          Type
          <select bind:value={providerType}>
            <option value="cloud_provider">cloud_provider</option>
            <option value="open_model">open_model</option>
            <option value="self_hosted">self_hosted</option>
            <option value="other">other</option>
          </select>
        </label>
        <label>
          Website
          <input bind:value={providerWebsite} placeholder="https://example.com" />
        </label>
        <button on:click={createProvider}>Create</button>
      </div>

      <div class="provider-grid">
        {#each $providerCatalog as provider}
          {@const draft = getProviderDraft(provider)}
          <article class="provider-card">
            <label>
              Name
              <input
                value={draft.name}
                on:input={(event) => onProviderNameInput(provider, event)}
              />
            </label>

            <label>
              ID
              <input value={provider.id} disabled />
            </label>

            <label>
              Type
              <select
                value={draft.type}
                on:change={(event) => onProviderTypeChange(provider, event)}
              >
                <option value="cloud_provider">cloud_provider</option>
                <option value="open_model">open_model</option>
                <option value="self_hosted">self_hosted</option>
                <option value="other">other</option>
              </select>
            </label>

            <label>
              Website
              <input
                value={draft.websiteUrl}
                on:input={(event) => onProviderWebsiteInput(provider, event)}
              />
            </label>

            <div class="card-actions">
              <button on:click={() => saveProvider(provider)}>Save</button>
              <button class="ghost" on:click={() => deleteProvider(provider)}>Delete</button>
            </div>
          </article>
        {/each}
      </div>

      {#if providerStatus}
        <p class="status">{providerStatus}</p>
      {/if}
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 980px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: reveal 320ms ease;
  }

  .panel,
  .blocked {
    margin-top: 0.8rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 16px;
    background: linear-gradient(180deg, #fff 0%, #fbfdfe 100%);
    padding: 0.85rem;
    box-shadow: 0 10px 22px rgba(17, 39, 57, 0.08);
  }

  .blocked {
    background: #fff2f0;
    border-color: #e5b4ab;
    color: #7a2d1b;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  p,
  .controls,
  .summary,
  .provider-grid {
    margin-top: 0.5rem;
  }

  .controls {
    display: flex;
    gap: 0.55rem;
    align-items: end;
    flex-wrap: wrap;
  }

  .create-row {
    padding-bottom: 0.45rem;
    border-bottom: 1px solid #d7e2ec;
  }

  .provider-grid {
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .provider-card {
    border: 1px solid #cfdae4;
    border-radius: 12px;
    padding: 0.6rem;
    background: #f8fbfd;
    display: grid;
    gap: 0.45rem;
  }

  .card-actions {
    margin-top: 0.25rem;
    display: flex;
    gap: 0.5rem;
  }

  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.82rem;
    font-weight: 600;
  }

  input,
  select {
    border: 1px solid #bfd0de;
    border-radius: 12px;
    padding: 0.5rem 0.65rem;
    background: #fff;
    font-size: 0.95rem;
  }

  input:disabled {
    background: #f0f3f6;
    color: #51657b;
  }

  button {
    border: none;
    border-radius: 11px;
    padding: 0.5rem 0.82rem;
    background: linear-gradient(154deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .ghost {
    background: #eff4f8;
    color: #2e4860;
    border: 1px solid #bdcbd9;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .summary {
    border: 1px solid #cdddea;
    border-radius: 11px;
    background: #edf6fb;
    padding: 0.55rem;
    display: grid;
    gap: 0.3rem;
  }

  .status {
    color: #1d5476;
    font-weight: 650;
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
