<script lang="ts">
  import { roleFlags, getAuthSnapshot, refreshAuthRoles } from '$lib/auth/store';
  import { addProvider, providerCatalog } from '$lib/stores/app-state';
  import type { ProviderDefinition } from '$lib/types';

  type ManagedRole = 'guest' | 'curator' | 'admin';

  const API_BASE_URL =
    (import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ??
    (typeof window !== 'undefined' && window.location.hostname === 'vokda.iksnae.com'
      ? 'https://vokda.iksnae.com/api'
      : 'http://127.0.0.1:8787');

  let email = '';
  let status = '';
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
    status = '';

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
      status = 'User loaded.';
    } catch (error) {
      current = null;
      status = error instanceof Error ? error.message : 'Lookup failed.';
    } finally {
      loading = false;
    }
  }

  async function applyRole() {
    if (!current) return;

    loading = true;
    status = '';

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
      status = `Role updated to ${selectedRole}.`;
      await refreshAuthRoles();
    } catch (error) {
      status = error instanceof Error ? error.message : 'Role update failed.';
    } finally {
      loading = false;
    }
  }

  function createProvider() {
    if (!providerName.trim()) {
      status = 'Provider name is required.';
      return;
    }

    const created = addProvider({
      id: providerId.trim() || undefined,
      name: providerName.trim(),
      type: providerType,
      websiteUrl: providerWebsite.trim() || undefined
    });

    status = created
      ? `Provider "${providerName.trim()}" added to curation catalog.`
      : 'Provider could not be added. Check admin role or duplicate provider ID.';

    if (created) {
      providerName = '';
      providerId = '';
      providerWebsite = '';
      providerType = 'cloud_provider';
    }
  }
</script>

<svelte:head>
  <title>Admin | Vokda</title>
</svelte:head>

<main>
  <h1>Admin Control</h1>

  {#if !$roleFlags.isAdmin}
    <p class="blocked">Access restricted. Admin tier is required.</p>
  {:else}
    <section class="panel">
      <h2>User Role Management</h2>
      <p>Find a user by email and apply role tier mapping to Cognito groups.</p>

      <div class="controls">
        <label>
          User email
          <input bind:value={email} type="email" placeholder="user@domain.com" />
        </label>
        <button class="ghost" on:click={lookupUser} disabled={loading || !email.trim()}>Lookup</button>
      </div>

      {#if current}
        <div class="summary">
          <p><strong>Username:</strong> {current.username}</p>
          <p><strong>Email:</strong> {current.email}</p>
          <p><strong>Status:</strong> {current.status ?? 'UNKNOWN'} | enabled={current.enabled ? 'yes' : 'no'}</p>
          <p><strong>Current groups:</strong> {current.groups.join(', ') || '(none)'}</p>
          <p><strong>Current roles:</strong> {current.roles.join(', ')}</p>
        </div>

        <div class="controls">
          <label>
            Assign role tier
            <select bind:value={selectedRole}>
              <option value="guest">Guest</option>
              <option value="curator">Curator</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button on:click={applyRole} disabled={loading}>Apply Role</button>
        </div>
      {/if}

      {#if status}
        <p class="status">{status}</p>
      {/if}
    </section>

    <section class="panel">
      <h2>Provider Catalog</h2>
      <p>Manage predefined providers used by the curation picker.</p>

      <div class="controls">
        <label>
          Provider name
          <input bind:value={providerName} placeholder="Acme Voices" />
        </label>
        <label>
          Provider ID (optional)
          <input bind:value={providerId} placeholder="acme-voices" />
        </label>
        <label>
          Provider type
          <select bind:value={providerType}>
            <option value="cloud_provider">cloud_provider</option>
            <option value="open_model">open_model</option>
            <option value="self_hosted">self_hosted</option>
            <option value="other">other</option>
          </select>
        </label>
        <label>
          Website URL (optional)
          <input bind:value={providerWebsite} placeholder="https://example.com" />
        </label>
        <button on:click={createProvider}>Add Provider</button>
      </div>

      <div class="summary">
        <p><strong>Available providers:</strong> {$providerCatalog.length}</p>
        {#each $providerCatalog as provider}
          <p>
            <strong>{provider.name}</strong> ({provider.id}) · {provider.type}
            {#if provider.websiteUrl}
              · <a href={provider.websiteUrl} target="_blank" rel="noreferrer">{provider.websiteUrl}</a>
            {/if}
          </p>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 900px;
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
  .summary {
    margin-top: 0.45rem;
  }

  .controls {
    display: flex;
    gap: 0.55rem;
    align-items: end;
    flex-wrap: wrap;
  }

  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.88rem;
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
