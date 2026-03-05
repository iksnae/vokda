<script lang="ts">
  import { cartCount, collections } from '$lib/stores/app-state';
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
      <a href="/collections">Collections ({$collections.length})</a>
      <a href="/cart">Cart ({$cartCount})</a>
    </nav>
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
</style>
