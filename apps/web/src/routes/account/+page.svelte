<script lang="ts">
  import { AUTH_MODE } from '$lib/auth/config';
  import {
    auth,
    authDebugConfig,
    confirmSignUpWithCode,
    roleFlags,
    setMockRole,
    signIn,
    signInWithPassword,
    signOut,
    signUpWithPassword,
    resendSignUpConfirmation,
    isAuthReady
  } from '$lib/auth/store';

  let email = '';
  let password = '';
  let confirmationCode = '';
  let status = '';
  let pending = false;
  let needsConfirmation = false;

  async function handleSignIn() {
    pending = true;
    status = '';

    const result = await signInWithPassword(email.trim(), password);
    status = result.message;
    needsConfirmation = Boolean(result.needsConfirmation);

    pending = false;
  }

  async function handleSignUp() {
    pending = true;
    status = '';

    const result = await signUpWithPassword(email.trim(), password);
    status = result.message;
    needsConfirmation = Boolean(result.needsConfirmation);

    pending = false;
  }

  async function handleConfirm() {
    pending = true;
    status = '';

    const result = await confirmSignUpWithCode(email.trim(), confirmationCode.trim());
    status = result.message;
    if (result.success) {
      needsConfirmation = false;
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
</script>

<svelte:head>
  <title>Account | Vokda</title>
</svelte:head>

<main>
  <h1>Account</h1>

  <section class="panel">
    <p><strong>Auth mode:</strong> {AUTH_MODE}</p>

    {#if !$isAuthReady}
      <p>Loading account session...</p>
    {:else if $auth.isAuthenticated}
      <p><strong>Signed in as:</strong> {$auth.user?.email ?? $auth.user?.id}</p>
      <p><strong>Roles:</strong> {$auth.user?.roles.join(', ')}</p>
      <button on:click={signOut}>Sign out</button>
    {:else if AUTH_MODE === 'amplify'}
      <p>Register or sign in with your email to unlock favorites, collections, and role-based access.</p>
      <div class="form-grid">
        <label>
          Email
          <input type="email" bind:value={email} placeholder="you@domain.com" autocomplete="email" />
        </label>

        <label>
          Password
          <input
            type="password"
            bind:value={password}
            placeholder="Your password"
            autocomplete="current-password"
          />
        </label>

        <div class="actions">
          <button on:click={handleSignIn} disabled={pending || !email || !password}>Sign in</button>
          <button class="ghost" on:click={handleSignUp} disabled={pending || !email || !password}>
            Create account
          </button>
        </div>
      </div>

      {#if needsConfirmation}
        <div class="confirm">
          <label>
            Verification code
            <input type="text" bind:value={confirmationCode} placeholder="123456" />
          </label>
          <div class="actions">
            <button class="ghost" on:click={handleConfirm} disabled={pending || !confirmationCode}>Confirm email</button>
            <button class="ghost" on:click={handleResend} disabled={pending || !email}>Resend code</button>
          </div>
        </div>
      {/if}

      {#if status}
        <p class="status">{status}</p>
      {/if}
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
      <h2>Amplify Auth</h2>
      <p><strong>Provider:</strong> {cfg.provider}</p>
      <p><strong>Mode:</strong> {cfg.mode}</p>
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
  ul,
  .form-grid,
  .confirm {
    margin-top: 0.45rem;
  }

  ul {
    padding-left: 1.1rem;
  }

  .form-grid,
  .confirm {
    display: grid;
    gap: 0.55rem;
  }

  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.92rem;
    font-weight: 600;
    color: #2f4760;
  }

  input {
    border: 1px solid #bdcbd9;
    border-radius: 10px;
    padding: 0.48rem 0.6rem;
    font-size: 0.95rem;
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

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ghost {
    background: #eff4f8;
    color: #2e4860;
    border: 1px solid #bdcbd9;
  }

  .status {
    border: 1px solid #d2ddeb;
    border-radius: 10px;
    background: #f6f9fc;
    padding: 0.45rem 0.55rem;
  }
</style>
