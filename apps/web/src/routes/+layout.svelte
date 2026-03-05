<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, initAuth, isAuthReady, roleFlags, signIn, signOut } from '$lib/auth/store';
  import { collections } from '$lib/stores/app-state';
  import Toast from '$lib/components/Toast.svelte';
  import Icon from '$lib/components/Icon.svelte';

  onMount(() => {
    initAuth();
  });

  $: collectionCount = $collections.length;
  $: userInitial = $auth.user?.name?.[0]?.toUpperCase()
    ?? $auth.user?.email?.[0]?.toUpperCase()
    ?? '?';
</script>

<svelte:head>
  <title>Vokda</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="app-shell">
  <header>
    <a class="brand" href="/">
      <span class="mark">V</span>
      <span class="wordmark">Vokda</span>
    </a>

    <nav>
      <a href="/" class="nav-link">Explore</a>
      <a href="/collections" class="nav-link">
        Collections
        {#if collectionCount > 0}
          <span class="badge">{collectionCount}</span>
        {/if}
      </a>
      {#if $roleFlags.isCurator}
        <a href="/curation" class="nav-link">Curation</a>
      {/if}
      {#if $roleFlags.isAdmin}
        <a href="/admin" class="nav-link">Admin</a>
      {/if}
    </nav>

    <div class="auth-actions">
      {#if !$isAuthReady}
        <span class="avatar-skeleton" aria-label="Loading authentication"></span>
      {:else if $auth.isAuthenticated}
        <span class="avatar" title="{$auth.user?.email ?? 'User'} ({$auth.user?.roles.join(', ')})">{userInitial}</span>
        <button class="ghost" on:click={signOut}>Sign out</button>
      {:else}
        <button class="btn-signin" on:click={signIn}>
          Sign in
        </button>
      {/if}
    </div>
  </header>

  <slot />

  <Toast />
</div>

<style>
  :global(:root) {
    --bg-ink: #0f1b26;
    --bg-muted: #52657a;
    --surface-0: #f2f6f9;
    --surface-1: #f8fbfd;
    --surface-2: #ffffff;
    --stroke-soft: #d5e0e9;
    --stroke-strong: #b6c8d6;
    --brand-700: #0f5f7a;
    --brand-600: #177089;
    --brand-100: #dbeef5;
    --accent-100: #fef0db;
    --accent-700: #8f5a0b;
    --elev-1: 0 12px 24px rgba(15, 35, 54, 0.08);
    --elev-2: 0 20px 42px rgba(13, 29, 45, 0.14);
    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 24px;

    /* Type scale */
    --text-display: clamp(1.6rem, 3vw, 2.2rem);
    --text-heading: 1.15rem;
    --text-subhead: 1.02rem;
    --text-body: 0.9rem;
    --text-small: 0.82rem;
    --text-xs: 0.74rem;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: "Sora", "Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif;
    color: var(--bg-ink);
    background:
      radial-gradient(circle at 6% -8%, #dbeef5 0%, transparent 34%),
      radial-gradient(circle at 106% 22%, #f5ead6 0%, transparent 40%),
      linear-gradient(180deg, #eef3f6 0%, #e8eef2 100%);
    min-height: 100vh;
  }

  :global(body)::before,
  :global(body)::after {
    content: '';
    position: fixed;
    width: 260px;
    height: 260px;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(12px);
    z-index: -1;
    opacity: 0.5;
    animation: drift 16s ease-in-out infinite;
  }

  :global(body)::before {
    top: -120px;
    right: -80px;
    background: #cce6f1;
  }

  :global(body)::after {
    bottom: -120px;
    left: -120px;
    background: #f5dfc2;
    animation-delay: -7s;
  }

  /* Global focus ring */
  :global(*:focus-visible) {
    outline: 2px solid var(--brand-600);
    outline-offset: 2px;
  }

  .app-shell {
    min-height: 100vh;
    padding-bottom: 1.5rem;
  }

  header {
    position: sticky;
    top: 0.55rem;
    z-index: 20;
    max-width: 1180px;
    margin: 0.55rem auto 0;
    padding: 0.72rem 0.84rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    border: 1px solid var(--stroke-soft);
    border-radius: var(--radius-lg);
    background: rgba(248, 251, 253, 0.78);
    backdrop-filter: blur(12px);
    box-shadow: var(--elev-1);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.52rem;
    text-decoration: none;
    color: #16304a;
    font-weight: 760;
    letter-spacing: 0.01em;
  }

  .mark {
    width: 1.72rem;
    height: 1.72rem;
    border-radius: 0.58rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(155deg, #0e5f79 0%, #2a819d 58%, #56a8bf 100%);
    font-size: 0.9rem;
    box-shadow: 0 8px 18px rgba(28, 92, 118, 0.3);
  }

  .wordmark {
    font-size: 1.03rem;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .nav-link {
    text-decoration: none;
    color: #284f69;
    background: #ffffffd6;
    border: 1px solid var(--stroke-soft);
    border-radius: 999px;
    padding: 0.35rem 0.74rem;
    font-size: 0.84rem;
    font-weight: 670;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: transform 150ms ease, border-color 180ms ease, background 180ms ease;
  }

  .nav-link:hover {
    transform: translateY(-1px);
    border-color: #9eb6c8;
    background: #fff;
  }

  .badge {
    background: var(--brand-100);
    color: var(--brand-700);
    font-size: 0.7rem;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.08rem 0.38rem;
    min-width: 1.2rem;
    text-align: center;
  }

  .auth-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: linear-gradient(155deg, #0e5f79, #2a819d);
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: default;
  }

  .avatar-skeleton {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: #dce5ec;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .btn-signin {
    border: none;
    border-radius: 999px;
    padding: 0.38rem 0.74rem;
    background: linear-gradient(160deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    font-weight: 680;
    cursor: pointer;
    box-shadow: 0 8px 16px rgba(20, 94, 121, 0.26);
    font-size: var(--text-small);
  }

  .btn-signin:hover {
    box-shadow: 0 10px 20px rgba(20, 94, 121, 0.35);
  }

  .ghost {
    background: #f3f7fa;
    color: #2c4b60;
    border: 1px solid #c3d1de;
    border-radius: 999px;
    padding: 0.38rem 0.74rem;
    font-weight: 680;
    cursor: pointer;
    box-shadow: none;
    font-size: var(--text-small);
  }

  .ghost:hover {
    background: #edf2f7;
    border-color: #a8b9c9;
  }

  @keyframes drift {
    0%,
    100% {
      transform: translate3d(0, 0, 0);
    }
    50% {
      transform: translate3d(0, -14px, 0);
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.2; }
  }

  @media (max-width: 980px) {
    header {
      position: static;
      margin-top: 0;
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }
  }

  @media (max-width: 820px) {
    header {
      flex-wrap: wrap;
    }

    nav {
      order: 3;
      width: 100%;
      overflow-x: auto;
      flex-wrap: nowrap;
      padding-bottom: 0.2rem;
    }

    .nav-link {
      white-space: nowrap;
    }
  }
</style>
