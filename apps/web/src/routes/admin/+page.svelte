<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
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
      <h2>Admin Mode Enabled</h2>
      <p>Manage policy controls and platform-level guardrails.</p>
      <ul>
        <li>Role governance and claims mapping</li>
        <li>Provider allowlist and deprecation flags</li>
        <li>Ingestion/synthesis operational controls</li>
      </ul>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 0.6rem 1rem 3rem;
  }

  .panel,
  .blocked {
    margin-top: 0.8rem;
    border: 1px solid #c3d1de;
    border-radius: 14px;
    background: #fff;
    padding: 0.85rem;
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
  ul {
    margin-top: 0.45rem;
  }
</style>
