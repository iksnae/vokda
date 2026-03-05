<script lang="ts">
  import { AUTH_MODE } from '$lib/auth/config';
  import { auth, authDebugConfig, roleFlags, setMockRole, signIn, signOut } from '$lib/auth/store';
</script>

<svelte:head>
  <title>Account | Vokda</title>
</svelte:head>

<main>
  <h1>Account</h1>

  <section class="panel">
    <p><strong>Auth mode:</strong> {AUTH_MODE}</p>
    {#if $auth.isAuthenticated}
      <p><strong>Signed in as:</strong> {$auth.user?.email ?? $auth.user?.id}</p>
      <p><strong>Roles:</strong> {$auth.user?.roles.join(', ')}</p>
      <button on:click={signOut}>Sign out</button>
    {:else}
      <p>You are currently browsing as a visitor.</p>
      <button on:click={signIn}>Sign in</button>
    {/if}
  </section>

  {#if AUTH_MODE !== 'amplify' && $auth.isAuthenticated}
    <section class="panel">
      <h2>Mock Role Controls</h2>
      <p>Use these only in local/non-amplify mode for UI testing.</p>
      <div class="actions">
        <button class="ghost" on:click={() => setMockRole('guest')}>Set Guest</button>
        <button class="ghost" on:click={() => setMockRole('curator')}>Set Curator</button>
        <button class="ghost" on:click={() => setMockRole('admin')}>Set Admin</button>
      </div>
    </section>
  {/if}

  <section class="panel">
    <h2>Access Summary</h2>
    <ul>
      <li>Visitor: browse catalog only</li>
      <li>Guest: favorites + collections + cart/export</li>
      <li>Curator: guest features + curation tools</li>
      <li>Admin: full access + admin tools</li>
    </ul>
    <p>
      <strong>Current flags:</strong>
      guest={$roleFlags.isGuest ? 'yes' : 'no'},
      curator={$roleFlags.isCurator ? 'yes' : 'no'},
      admin={$roleFlags.isAdmin ? 'yes' : 'no'}
    </p>
  </section>

  {#if AUTH_MODE === 'amplify'}
    {@const cfg = authDebugConfig()}
    <section class="panel">
      <h2>Amplify Hosted UI Config</h2>
      <p><strong>Configured:</strong> {cfg.configured ? 'yes' : 'no'}</p>
      <p><strong>Domain:</strong> {cfg.domain || '(missing)'}</p>
      <p><strong>Sign-in redirect:</strong> {cfg.redirectSignIn || '(missing)'}</p>
      <p><strong>Sign-out redirect:</strong> {cfg.redirectSignOut || '(missing)'}</p>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 0.6rem 1rem 3rem;
  }

  .panel {
    margin-top: 0.9rem;
    border: 1px solid #c3d1de;
    border-radius: 14px;
    background: #fff;
    padding: 0.85rem;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h2,
  p,
  ul {
    margin-top: 0.45rem;
  }

  ul {
    padding-left: 1.1rem;
  }

  .actions {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  button {
    border: none;
    border-radius: 10px;
    padding: 0.48rem 0.78rem;
    background: #1f5f7f;
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .ghost {
    background: #eff4f8;
    color: #2e4860;
    border: 1px solid #bdcbd9;
  }
</style>
