<script lang="ts">
  import { onMount } from 'svelte';
  import {
    auth,
    confirmSignUpWithCode,
    confirmPasswordReset,
    isAuthReady,
    refreshAuthRoles,
    resetPasswordRequest,
    signInWithPassword,
    signOut,
    signUpWithPassword,
    resendSignUpConfirmation
  } from '$lib/auth/store';

  type AuthView = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

  let view: AuthView = 'signin';
  let email = '';
  let password = '';
  let newPassword = '';
  let confirmationCode = '';
  let resetCode = '';
  let status = '';
  let pending = false;

  // ─── Dashboard state ──────────────────────────────────────────────

  interface UsageData {
    totalBytes: number;
    fileCount: number;
    quotaBytes: number;
    usagePercent: number;
    remainingBytes: number;
  }

  interface CredentialItem {
    providerId: string;
    label: string;
    authType: string;
    status: string;
    maskedKey: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface JobItem {
    jobId: string;
    voiceId: string;
    voiceName: string | null;
    provider: string;
    status: string;
    inputText: string;
    inputMode: string;
    fileSizeBytes: number | null;
    durationMs: number | null;
    latencyMs: number | null;
    createdAt: string;
  }

  let usage: UsageData | null = null;
  let credentials: CredentialItem[] = [];
  let keyCount: number | null = null;
  let recentJobs: JobItem[] = [];
  let totalClips = 0;
  let dashboardLoading = true;
  let dashboardError = '';

  // Computed stats from history
  $: providerBreakdown = computeProviderBreakdown(recentJobs);
  $: totalSynthesized = recentJobs.length;
  $: avgLatency = recentJobs.length > 0
    ? Math.round(recentJobs.reduce((sum, j) => sum + (j.latencyMs ?? 0), 0) / recentJobs.length)
    : 0;

  function computeProviderBreakdown(jobs: JobItem[]): { provider: string; count: number; bytes: number }[] {
    const map: Record<string, { count: number; bytes: number }> = {};
    for (const j of jobs) {
      if (!map[j.provider]) map[j.provider] = { count: 0, bytes: 0 };
      map[j.provider].count++;
      map[j.provider].bytes += j.fileSizeBytes ?? 0;
    }
    return Object.entries(map)
      .map(([provider, d]) => ({ provider, ...d }))
      .sort((a, b) => b.count - a.count);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max) + '…';
  }

  function providerLabel(id: string): string {
    const labels: Record<string, string> = {
      openai: 'OpenAI', elevenlabs: 'ElevenLabs', deepgram: 'Deepgram',
      cartesia: 'Cartesia', lmnt: 'LMNT', 'gcp-tts': 'Google TTS',
      'gemini-tts': 'Gemini', 'azure-speech': 'Azure', 'aws-polly': 'Polly',
    };
    return labels[id] || id;
  }

  async function fetchDashboard() {
    const apiUrl = import.meta.env.VITE_PUBLIC_SYNTHESIS_API_URL || '';
    if (!apiUrl) { dashboardLoading = false; return; }

    const token = $auth.idToken || $auth.accessToken;
    if (!token) { dashboardLoading = false; return; }

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

    try {
      const [usageRes, credRes, keysRes, jobsRes] = await Promise.allSettled([
        fetch(`${apiUrl}/v1/media/usage`, { headers }),
        fetch(`${apiUrl}/v1/credentials`, { headers }),
        fetch(`${apiUrl}/v1/keys`, { headers }),
        fetch(`${apiUrl}/v1/jobs?limit=200`, { headers }),
      ]);

      if (usageRes.status === 'fulfilled' && usageRes.value.ok) {
        usage = await usageRes.value.json() as UsageData;
      }
      if (credRes.status === 'fulfilled' && credRes.value.ok) {
        const data = await credRes.value.json();
        credentials = data.credentials ?? [];
      }
      if (keysRes.status === 'fulfilled' && keysRes.value.ok) {
        const data = await keysRes.value.json();
        keyCount = data.keys?.length ?? 0;
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
        const data = await jobsRes.value.json();
        recentJobs = data.jobs ?? [];
        totalClips = data.count ?? recentJobs.length;
      }
    } catch {
      dashboardError = 'Could not load account data.';
    } finally {
      dashboardLoading = false;
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('intent') === 'signup') view = 'signup';
    if (params.get('intent') === 'signin') view = 'signin';
  });

  // Fetch dashboard when authenticated
  $: if ($auth.isAuthenticated && ($auth.idToken || $auth.accessToken)) {
    fetchDashboard();
  }

  // ─── Auth handlers ────────────────────────────────────────────────

  async function handleSignIn() {
    pending = true; status = '';
    const result = await signInWithPassword(email.trim(), password);
    status = result.message;
    if (result.needsConfirmation) view = 'verify';
    pending = false;
  }

  async function handleSignUp() {
    pending = true; status = '';
    const result = await signUpWithPassword(email.trim(), password);
    status = result.message;
    view = result.needsConfirmation ? 'verify' : 'signin';
    pending = false;
  }

  async function handleConfirm() {
    pending = true; status = '';
    const result = await confirmSignUpWithCode(email.trim(), confirmationCode.trim());
    status = result.message;
    if (result.success) { view = 'signin'; confirmationCode = ''; }
    pending = false;
  }

  async function handleResend() {
    pending = true;
    const result = await resendSignUpConfirmation(email.trim());
    status = result.message;
    pending = false;
  }

  async function handleForgotPassword() {
    pending = true; status = '';
    const result = await resetPasswordRequest(email.trim());
    status = result.message;
    if (result.needsConfirmation) view = 'reset';
    pending = false;
  }

  async function handleResetPassword() {
    pending = true; status = '';
    const result = await confirmPasswordReset(email.trim(), resetCode.trim(), newPassword);
    status = result.message;
    if (result.success) { view = 'signin'; resetCode = ''; newPassword = ''; password = ''; }
    pending = false;
  }

  async function handleRefreshAccess() {
    pending = true; status = '';
    await refreshAuthRoles();
    status = 'Access updated.';
    pending = false;
  }
</script>

<svelte:head>
  <title>{$auth.isAuthenticated ? 'Account' : 'Sign In'} | Vokda</title>
</svelte:head>

<main>
  {#if !$isAuthReady}
    <section class="auth-shell">
      <p class="status">Loading session...</p>
    </section>

  {:else if $auth.isAuthenticated}
    <!-- ─── Authenticated Dashboard ─── -->
    <header class="page-header">
      <h1>Account</h1>
      <p class="sub">Signed in as <strong>{$auth.user?.email ?? $auth.user?.id}</strong></p>
      <p class="sub role-badge">{$auth.user?.roles.join(', ')}</p>
    </header>

    <!-- Quick nav -->
    <nav class="account-links">
      <a href="/account/providers">🔑 Provider Keys</a>
      <a href="/account/api-keys">🗝️ API Keys</a>
      <a href="/account/clips">🎧 Audio Clips</a>
    </nav>

    {#if dashboardLoading}
      <div class="panel">
        <p class="loading-text">Loading account data…</p>
      </div>
    {:else if dashboardError}
      <div class="panel">
        <p class="error-text">{dashboardError}</p>
      </div>
    {:else}
      <!-- ─── Plan & Storage ─── -->
      <section class="panel">
        <h2 class="panel-title">Plan & Storage</h2>
        <div class="plan-row">
          <div class="plan-badge">Free</div>
          <span class="plan-desc">
            {#if usage}
              {formatBytes(usage.quotaBytes)} storage
            {:else}
              5 GB storage
            {/if}
            · Unlimited providers · BYOK synthesis
          </span>
        </div>
        {#if usage}
          <div class="storage-section">
            <div class="storage-header">
              <span class="storage-used">{formatBytes(usage.totalBytes)} used</span>
              <span class="storage-total">of {formatBytes(usage.quotaBytes)}</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                class:warn={usage.usagePercent > 75}
                class:critical={usage.usagePercent > 90}
                style="width: {Math.max(usage.usagePercent, 0.5)}%"
              ></div>
            </div>
            <span class="storage-remaining">{formatBytes(usage.remainingBytes)} remaining ({Math.round(100 - usage.usagePercent)}%)</span>
          </div>
        {/if}
      </section>

      <!-- ─── Stats Overview ─── -->
      <section class="stats-grid">
        <a href="/account/clips" class="stat-card">
          <span class="stat-number">{totalClips}</span>
          <span class="stat-label">Audio Clips</span>
        </a>
        <a href="/account/providers" class="stat-card">
          <span class="stat-number">{credentials.length}</span>
          <span class="stat-label">Providers</span>
        </a>
        <a href="/account/api-keys" class="stat-card">
          <span class="stat-number">{keyCount ?? '—'}</span>
          <span class="stat-label">API Keys</span>
        </a>
        <div class="stat-card">
          <span class="stat-number">{avgLatency ? avgLatency + 'ms' : '—'}</span>
          <span class="stat-label">Avg Latency</span>
        </div>
      </section>

      <!-- ─── Provider Usage Breakdown ─── -->
      {#if providerBreakdown.length > 0}
        <section class="panel">
          <h2 class="panel-title">Provider Usage</h2>
          <div class="provider-table">
            {#each providerBreakdown as row}
              <div class="provider-row">
                <span class="provider-name">{providerLabel(row.provider)}</span>
                <span class="provider-count">{row.count} clip{row.count !== 1 ? 's' : ''}</span>
                <span class="provider-bytes">{formatBytes(row.bytes)}</span>
                <div class="provider-bar-track">
                  <div class="provider-bar-fill" style="width: {Math.round(row.count / totalClips * 100)}%"></div>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- ─── Connected Providers ─── -->
      {#if credentials.length > 0}
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Connected Providers</h2>
            <a href="/account/providers" class="panel-link">Manage →</a>
          </div>
          <div class="cred-grid">
            {#each credentials as cred}
              <div class="cred-card" class:inactive={cred.status !== 'active'}>
                <span class="cred-provider">{providerLabel(cred.providerId)}</span>
                <span class="cred-key">{cred.maskedKey || '••••'}</span>
                <span class="cred-status" class:active={cred.status === 'active'}>
                  {cred.status === 'active' ? '● Active' : '○ Inactive'}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- ─── Recent Activity ─── -->
      {#if recentJobs.length > 0}
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Synthesis History</h2>
            <a href="/account/clips" class="panel-link">View all →</a>
          </div>
          <div class="history-list">
            {#each recentJobs.slice(0, 10) as job}
              <div class="history-item" class:failed={job.status === 'failed'}>
                <div class="history-main">
                  <span class="history-provider">{providerLabel(job.provider)}</span>
                  <span class="history-voice">{job.voiceName || 'Unknown voice'}</span>
                  <span class="history-text">{truncate(job.inputText, 60)}</span>
                </div>
                <div class="history-meta">
                  {#if job.status === 'failed'}
                    <span class="history-badge badge-failed">Failed</span>
                  {:else if job.inputMode === 'ssml'}
                    <span class="history-badge badge-ssml">SSML</span>
                  {/if}
                  {#if job.fileSizeBytes}
                    <span class="history-size">{formatBytes(job.fileSizeBytes)}</span>
                  {/if}
                  {#if job.latencyMs}
                    <span class="history-latency">{job.latencyMs < 1000 ? job.latencyMs + 'ms' : (job.latencyMs / 1000).toFixed(1) + 's'}</span>
                  {/if}
                  <span class="history-time">{timeAgo(job.createdAt)}</span>
                </div>
              </div>
            {/each}
          </div>
          {#if totalClips > 10}
            <a href="/account/clips" class="show-more">Show all {totalClips} clips →</a>
          {/if}
        </section>
      {/if}
    {/if}

    <div class="actions">
      <button class="ghost" on:click={handleRefreshAccess} disabled={pending}>Refresh Access</button>
      <button on:click={signOut} disabled={pending}>Sign Out</button>
    </div>

    {#if status}
      <p class="status">{status}</p>
    {/if}

  {:else}
    <!-- ─── Auth Forms ─── -->
    <section class="auth-shell">
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
      {:else if view === 'forgot'}
        <h1>Forgot Password</h1>
        <p class="sub">Enter your email to receive a reset code.</p>
      {:else if view === 'reset'}
        <h1>Reset Password</h1>
        <p class="sub">Enter the code from your email and choose a new password.</p>
      {:else}
        <h1>Verify Email</h1>
        <p class="sub">Enter the code sent to your email.</p>
      {/if}

      <div class="form-grid">
        <label>
          Email
          <input type="email" bind:value={email} placeholder="you@domain.com" autocomplete="email" />
        </label>

        {#if view === 'signin' || view === 'signup'}
          <label>
            Password
            <input type="password" bind:value={password} placeholder="Password" autocomplete={view === 'signin' ? 'current-password' : 'new-password'} />
          </label>
        {/if}

        {#if view === 'verify'}
          <label>
            Verification Code
            <input type="text" bind:value={confirmationCode} placeholder="123456" />
          </label>
        {/if}

        {#if view === 'reset'}
          <label>
            Reset Code
            <input type="text" bind:value={resetCode} placeholder="123456" autocomplete="one-time-code" />
          </label>
          <label>
            New Password
            <input type="password" bind:value={newPassword} placeholder="New password" autocomplete="new-password" />
          </label>
        {/if}

        <div class="actions">
          {#if view === 'signin'}
            <button on:click={handleSignIn} disabled={pending || !email || !password}>Sign In</button>
          {:else if view === 'signup'}
            <button on:click={handleSignUp} disabled={pending || !email || !password}>Create Account</button>
          {:else if view === 'forgot'}
            <button on:click={handleForgotPassword} disabled={pending || !email}>Send Reset Code</button>
            <button class="ghost" on:click={() => (view = 'signin')}>Back to Sign In</button>
          {:else if view === 'reset'}
            <button on:click={handleResetPassword} disabled={pending || !email || !resetCode || !newPassword}>Reset Password</button>
            <button class="ghost" on:click={handleForgotPassword} disabled={pending || !email}>Resend Code</button>
          {:else}
            <button on:click={handleConfirm} disabled={pending || !email || !confirmationCode}>Verify</button>
            <button class="ghost" on:click={handleResend} disabled={pending || !email}>Resend Code</button>
          {/if}
        </div>

        {#if view === 'signin'}
          <button class="link-btn" on:click={() => (view = 'forgot')}>Forgot password?</button>
        {/if}
      </div>

      {#if status}
        <p class="status">{status}</p>
      {/if}
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 0.75rem;
  }

  /* ─── Page Header ─── */

  .page-header {
    display: grid;
    gap: 0.15rem;
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .role-badge {
    font-size: 0.78rem;
    font-weight: 650;
    color: var(--brand-700, #1d4ed8);
    background: #e8f4fd;
    border-radius: 6px;
    padding: 0.12rem 0.45rem;
    width: fit-content;
  }

  /* ─── Auth Shell ─── */

  .auth-shell {
    border: 1px solid var(--stroke-soft);
    border-radius: 18px;
    background: linear-gradient(180deg, #fff 0%, #fbfdfe 100%);
    padding: 1rem;
    box-shadow: var(--elev-1);
    display: grid;
    gap: 0.75rem;
  }

  h1, p { margin: 0; }

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

  .sub { color: #3f5973; font-size: 0.92rem; }

  .form-grid { display: grid; gap: 0.55rem; }

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

  /* ─── Quick Nav ─── */

  .account-links {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .account-links a {
    display: inline-block;
    text-decoration: none;
    font-size: var(--text-small, 0.85rem);
    font-weight: 640;
    color: var(--brand-700, #1d4ed8);
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--brand-100, #dbeafe);
    border-radius: 10px;
    background: #f0f9fd;
    transition: background 120ms, border-color 120ms;
  }

  .account-links a:hover {
    background: var(--brand-100, #dbeafe);
    border-color: var(--brand-600, #2563eb);
  }

  /* ─── Panel ─── */

  .panel {
    border: 1px solid var(--stroke-soft, #d5e1eb);
    border-radius: 14px;
    background: #fff;
    padding: 0.85rem;
    display: grid;
    gap: 0.6rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-title {
    font-size: 0.92rem;
    font-weight: 720;
    color: #1a3a52;
    margin: 0;
  }

  .panel-link {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--brand-600, #2563eb);
    text-decoration: none;
  }

  .panel-link:hover { text-decoration: underline; }

  .loading-text { color: #5a7b94; font-size: 0.88rem; margin: 0; }
  .error-text { color: #b44; font-size: 0.88rem; margin: 0; }

  /* ─── Plan & Storage ─── */

  .plan-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .plan-badge {
    font-size: 0.75rem;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #fff;
    background: linear-gradient(135deg, var(--brand-500, #3b82f6), var(--brand-700, #1d4ed8));
    border-radius: 6px;
    padding: 0.18rem 0.5rem;
  }

  .plan-desc {
    font-size: 0.82rem;
    color: #5a7b94;
  }

  .storage-section { display: grid; gap: 0.25rem; }

  .storage-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .storage-used {
    font-size: 0.88rem;
    font-weight: 650;
    color: #1a3a52;
    font-variant-numeric: tabular-nums;
  }

  .storage-total {
    font-size: 0.82rem;
    color: #6a8da5;
    font-variant-numeric: tabular-nums;
  }

  .storage-remaining {
    font-size: 0.78rem;
    color: #6a8da5;
  }

  .progress-track {
    height: 8px;
    background: #dfe9f0;
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand-500, #3b82f6), var(--brand-600, #2563eb));
    transition: width 600ms ease;
    min-width: 4px;
  }

  .progress-fill.warn { background: linear-gradient(90deg, #f59e0b, #d97706); }
  .progress-fill.critical { background: linear-gradient(90deg, #ef4444, #dc2626); }

  /* ─── Stats Grid ─── */

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.12rem;
    padding: 0.6rem 0.3rem;
    border: 1px solid #dde8f0;
    border-radius: 11px;
    background: #fff;
    text-decoration: none;
    transition: border-color 120ms, box-shadow 120ms;
  }

  .stat-card:hover {
    border-color: var(--brand-400, #60a5fa);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
  }

  .stat-number {
    font-size: 1.25rem;
    font-weight: 750;
    color: var(--brand-700, #1d4ed8);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.68rem;
    font-weight: 650;
    color: #5a7b94;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    text-align: center;
  }

  /* ─── Provider Usage Breakdown ─── */

  .provider-table { display: grid; gap: 0.4rem; }

  .provider-row {
    display: grid;
    grid-template-columns: 1fr auto auto 80px;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.85rem;
  }

  .provider-name { font-weight: 640; color: #1a3a52; }
  .provider-count { color: #5a7b94; font-variant-numeric: tabular-nums; font-weight: 600; }
  .provider-bytes { color: #6a8da5; font-variant-numeric: tabular-nums; font-size: 0.8rem; }

  .provider-bar-track {
    height: 6px;
    background: #e8f0f5;
    border-radius: 999px;
    overflow: hidden;
  }

  .provider-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand-400, #60a5fa), var(--brand-600, #2563eb));
    min-width: 3px;
  }

  /* ─── Credential Cards ─── */

  .cred-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.4rem;
  }

  .cred-card {
    display: grid;
    gap: 0.1rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid #dde8f0;
    border-radius: 10px;
    background: #f9fcfe;
  }

  .cred-card.inactive { opacity: 0.6; }

  .cred-provider {
    font-size: 0.82rem;
    font-weight: 680;
    color: #1a3a52;
  }

  .cred-key {
    font-size: 0.75rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #6a8da5;
  }

  .cred-status {
    font-size: 0.72rem;
    font-weight: 600;
    color: #9ab;
  }

  .cred-status.active { color: #16a34a; }

  /* ─── History List ─── */

  .history-list { display: grid; gap: 0; }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eef3f8;
  }

  .history-item:last-child { border-bottom: none; }
  .history-item.failed { opacity: 0.65; }

  .history-main {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
    flex: 1;
  }

  .history-provider {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--brand-600, #2563eb);
  }

  .history-voice {
    font-size: 0.85rem;
    font-weight: 640;
    color: #1a3a52;
  }

  .history-text {
    font-size: 0.78rem;
    color: #6a8da5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    flex-shrink: 0;
  }

  .history-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.1rem 0.35rem;
    border-radius: 5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge-ssml { background: #e0f2fe; color: #0369a1; }
  .badge-failed { background: #fee2e2; color: #dc2626; }

  .history-size, .history-latency, .history-time {
    font-size: 0.75rem;
    color: #7a9ab0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .show-more {
    display: block;
    text-align: center;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--brand-600, #2563eb);
    text-decoration: none;
    padding: 0.4rem;
    border-radius: 8px;
    background: #f0f7fd;
  }

  .show-more:hover { background: #dbeafe; }

  /* ─── Actions ─── */

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

  button:disabled { opacity: 0.55; cursor: not-allowed; }

  .link-btn {
    background: none;
    border: none;
    color: var(--brand-600, #2563eb);
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0;
    cursor: pointer;
    text-align: left;
    width: fit-content;
  }

  .link-btn:hover { text-decoration: underline; }

  .status {
    border: 1px solid #ceddeb;
    border-radius: 11px;
    background: #edf5fb;
    padding: 0.45rem 0.55rem;
    color: #2b4f67;
    font-size: 0.88rem;
  }

  /* ─── Responsive ─── */

  @media (max-width: 520px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .provider-row { grid-template-columns: 1fr auto auto; }
    .provider-bar-track { display: none; }
    .cred-grid { grid-template-columns: 1fr 1fr; }
    .history-item { flex-direction: column; gap: 0.25rem; }
    .history-meta { justify-content: flex-start; }
  }
</style>
