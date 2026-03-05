<script lang="ts">
  import { onMount } from 'svelte';
  import {
    auth,
    confirmSignUpWithCode,
    isAuthReady,
    refreshAuthRoles,
    signInWithPassword,
    signOut,
    signUpWithPassword,
    resendSignUpConfirmation
  } from '$lib/auth/store';

  type AuthView = 'signin' | 'signup' | 'verify';

  let view: AuthView = 'signin';
  let email = '';
  let password = '';
  let confirmationCode = '';
  let status = '';
  let pending = false;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('intent') === 'signup') view = 'signup';
    if (params.get('intent') === 'signin') view = 'signin';
  });

  async function handleSignIn() {
    pending = true;
    status = '';

    const result = await signInWithPassword(email.trim(), password);
    status = result.message;
    if (result.needsConfirmation) {
      view = 'verify';
    }

    pending = false;
  }

  async function handleSignUp() {
    pending = true;
    status = '';

    const result = await signUpWithPassword(email.trim(), password);
    status = result.message;
    view = result.needsConfirmation ? 'verify' : 'signin';

    pending = false;
  }

  async function handleConfirm() {
    pending = true;
    status = '';

    const result = await confirmSignUpWithCode(email.trim(), confirmationCode.trim());
    status = result.message;

    if (result.success) {
      view = 'signin';
      confirmationCode = '';
    }

    pending = false;
  }

  async function handleResend() {
    pending = true;
    const result = await resendSignUpConfirmation(email.trim());
    status = result.message;
    pending = false;
  }

  async function handleRefreshAccess() {
    pending = true;
    status = '';

    await refreshAuthRoles();
    status = 'Access updated.';

    pending = false;
  }
</script>

<svelte:head>
  <title>Sign In | Vokda</title>
</svelte:head>

<main>
  <section class="auth-shell">
    {#if !$isAuthReady}
      <p class="status">Loading session...</p>
    {:else if $auth.isAuthenticated}
      <h1>Account</h1>
      <p class="sub">Signed in as {$auth.user?.email ?? $auth.user?.id}</p>
      <p class="sub">Access: {$auth.user?.roles.join(', ')}</p>

      <div class="actions">
        <button class="ghost" on:click={handleRefreshAccess} disabled={pending}>Refresh Access</button>
        <button on:click={signOut} disabled={pending}>Sign Out</button>
      </div>

      {#if status}
        <p class="status">{status}</p>
      {/if}
    {:else}
      <div class="tabs">
        <button class:active={view === 'signin'} on:click={() => (view = 'signin')}>Sign In</button>
        <button class:active={view === 'signup'} on:click={() => (view = 'signup')}>Create Account</button>
      </div>

      {#if view === 'signin'}
        <h1>Welcome Back</h1>
        <p class="sub">Sign in to save and organize voices.</p>
      {:else if view === 'signup'}
        <h1>Create Account</h1>
        <p class="sub">Create your account to start building collections.</p>
      {:else}
        <h1>Verify Email</h1>
        <p class="sub">Enter the code sent to your email.</p>
      {/if}

      <div class="form-grid">
        <label>
          Email
          <input type="email" bind:value={email} placeholder="you@domain.com" autocomplete="email" />
        </label>

        {#if view !== 'verify'}
          <label>
            Password
            <input type="password" bind:value={password} placeholder="Password" autocomplete="current-password" />
          </label>
        {/if}

        {#if view === 'verify'}
          <label>
            Verification Code
            <input type="text" bind:value={confirmationCode} placeholder="123456" />
          </label>
        {/if}

        <div class="actions">
          {#if view === 'signin'}
            <button on:click={handleSignIn} disabled={pending || !email || !password}>Sign In</button>
          {:else if view === 'signup'}
            <button on:click={handleSignUp} disabled={pending || !email || !password}>Create Account</button>
          {:else}
            <button on:click={handleConfirm} disabled={pending || !email || !confirmationCode}>Verify</button>
            <button class="ghost" on:click={handleResend} disabled={pending || !email}>Resend Code</button>
          {/if}
        </div>
      </div>

      {#if status}
        <p class="status">{status}</p>
      {/if}
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 1rem;
  }

  .auth-shell {
    border: 1px solid var(--stroke-soft);
    border-radius: 18px;
    background: linear-gradient(180deg, #fff 0%, #fbfdfe 100%);
    padding: 1rem;
    box-shadow: var(--elev-1);
    display: grid;
    gap: 0.75rem;
  }

  h1,
  p {
    margin: 0;
  }

  .tabs {
    display: inline-flex;
    gap: 0.35rem;
    background: #eef4f8;
    border: 1px solid #cfdae4;
    border-radius: 999px;
    padding: 0.25rem;
    width: fit-content;
  }

  .tabs button {
    border: none;
    background: transparent;
    color: #355069;
    border-radius: 999px;
    padding: 0.35rem 0.72rem;
    font-size: 0.86rem;
    font-weight: 650;
    cursor: pointer;
  }

  .tabs button.active {
    background: #fff;
    color: #123b58;
    box-shadow: 0 2px 8px rgba(16, 40, 59, 0.12);
  }

  .sub {
    color: #3f5973;
    font-size: 0.92rem;
  }

  .form-grid {
    display: grid;
    gap: 0.55rem;
  }

  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #2f4760;
  }

  input {
    border: 1px solid #c1d2df;
    border-radius: 12px;
    padding: 0.55rem 0.68rem;
    font-size: 0.95rem;
  }

  .actions {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
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

  .status {
    border: 1px solid #ceddeb;
    border-radius: 11px;
    background: #edf5fb;
    padding: 0.45rem 0.55rem;
    color: #2b4f67;
    font-size: 0.88rem;
  }
</style>
