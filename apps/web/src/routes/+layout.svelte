<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, initAuth, roleFlags, signIn, signOut } from '$lib/auth/store';
  import { cartCount, collections, favoritesCount } from '$lib/stores/app-state';

  onMount(() => {
    initAuth();
  });
</script>

<svelte:head>
  <title>Vokda</title>
</svelte:head>

<div class="app-shell">
  <header>
    <a class="brand" href="/">
      <span class="mark">V</span>
      <span>Vokda</span>
    </a>

    <nav>
      <a href="/">Catalog</a>
      <a href="/account">Account</a>
      <a href="/collections">Collections ({$collections.length})</a>
      <a href="/cart">Cart ({$cartCount})</a>
      <a href="/?favorites=1">Favorites ({$favoritesCount})</a>
      {#if $roleFlags.isCurator}
        <a href="/curation">Curation</a>
      {/if}
      {#if $roleFlags.isAdmin}
        <a href="/admin">Admin</a>
      {/if}
    </nav>

    <div class="auth-actions">
      {#if $auth.isAuthenticated}
        <span class="pill">{$auth.user?.roles.join(', ')}</span>
        <button class="ghost" on:click={signOut}>Sign out</button>
      {:else}
        <button on:click={signIn}>Sign in</button>
      {/if}
    </div>
  </header>

  <slot />
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Avenir Next", "Helvetica Neue", sans-serif;
    color: #132131;
    background:
      radial-gradient(circle at 8% 0%, #f6fbff 0%, transparent 30%),
      radial-gradient(circle at 100% 20%, #edf5ff 0%, transparent 35%),
      linear-gradient(180deg, #edf3f8 0%, #eaf1f8 100%);
  }

  .app-shell {
    min-height: 100vh;
  }

  header {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0.95rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    text-decoration: none;
    color: #1a3650;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  .mark {
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 0.45rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(145deg, #1d4f6c 0%, #2b7497 100%);
    font-size: 0.88rem;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  nav a {
    text-decoration: none;
    color: #1d4c6a;
    background: #ffffffb5;
    border: 1px solid #c4d2de;
    border-radius: 999px;
    padding: 0.33rem 0.72rem;
    font-size: 0.9rem;
    font-weight: 650;
  }

  .auth-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .pill {
    border: 1px solid #c0cfdd;
    background: #f4f8fc;
    color: #35526c;
    border-radius: 999px;
    padding: 0.22rem 0.55rem;
    font-size: 0.8rem;
    font-weight: 650;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.34rem 0.68rem;
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
