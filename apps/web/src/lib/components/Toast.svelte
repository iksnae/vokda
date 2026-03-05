<script lang="ts">
  import { toasts, dismissToast } from './toast-store';
  import Icon from './Icon.svelte';
</script>

{#if $toasts.length > 0}
  <div class="toast-container" aria-live="polite">
    {#each $toasts as toast (toast.id)}
      <div class="toast toast-{toast.type}" role="status">
        <span class="toast-message">{toast.message}</span>
        <button
          class="toast-dismiss"
          on:click={() => dismissToast(toast.id)}
          aria-label="Dismiss notification"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1.2rem;
    right: 1.2rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 360px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    background: #fff;
    border: 1px solid #d0dce6;
    box-shadow: 0 8px 24px rgba(15, 35, 54, 0.14);
    animation: slideIn 250ms ease;
    font-size: 0.88rem;
    font-weight: 600;
    color: #1a3a50;
  }

  .toast-success {
    border-left: 3px solid #2d8a4e;
    color: #1d5a39;
  }

  .toast-error {
    border-left: 3px solid #c0392b;
    color: #7a2d1b;
  }

  .toast-info {
    border-left: 3px solid #1a6b8a;
    color: #1a3a50;
  }

  .toast-message {
    flex: 1;
  }

  .toast-dismiss {
    border: none;
    background: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    padding: 0.2rem;
    display: inline-flex;
    align-items: center;
    border-radius: 4px;
  }

  .toast-dismiss:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 480px) {
    .toast-container {
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>
