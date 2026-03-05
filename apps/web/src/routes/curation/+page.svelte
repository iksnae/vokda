<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
</script>

<svelte:head>
  <title>Curation | Vokda</title>
</svelte:head>

<main>
  <h1>Curation Workspace</h1>

  {#if !$roleFlags.isCurator}
    <p class="blocked">Access restricted. Curator tier or higher is required.</p>
  {:else}
    <section class="panel">
      <h2>Curator Mode Enabled</h2>
      <p>Use this workspace for editorial voice metadata and featured shelf planning.</p>
      <ul>
        <li>Track featured collections by use case</li>
        <li>Review licensing posture before promotion</li>
        <li>Prepare shortlist bundles for export</li>
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
