<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SSML_TAGS, getTagsForProvider, isTagSupportedByProvider } from '$lib/ssml/tags';
  import type { SsmlTagDef, SsmlAttrDef } from '$lib/ssml/tags';

  export let providerId: string;
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    insert: { tag: SsmlTagDef; attrs: Record<string, string> };
  }>();

  const TAG_ICONS: Record<string, string> = {
    break: '⏸',
    prosody: '🔊',
    emphasis: '❗',
    'say-as': '🗣',
    phoneme: '🔤',
    sub: '↔',
    lang: '🌐',
  };

  let activePopover: string | null = null;
  let popoverAttrs: Record<string, string> = {};

  function openPopover(tag: SsmlTagDef) {
    if (disabled || !isTagSupportedByProvider(tag.tag, providerId)) return;
    if (activePopover === tag.tag) {
      activePopover = null;
      return;
    }
    activePopover = tag.tag;
    // Initialize attr values to defaults
    popoverAttrs = {};
    for (const attr of tag.attributes) {
      popoverAttrs[attr.name] = attr.default ?? '';
    }
  }

  function confirmInsert() {
    if (!activePopover) return;
    const tag = SSML_TAGS.find((t) => t.tag === activePopover);
    if (!tag) return;
    dispatch('insert', { tag, attrs: { ...popoverAttrs } });
    activePopover = null;
    popoverAttrs = {};
  }

  function cancelPopover() {
    activePopover = null;
    popoverAttrs = {};
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') cancelPopover();
    if (e.key === 'Enter') { e.preventDefault(); confirmInsert(); }
  }
</script>

<div class="ssml-toolbar" class:disabled>
  {#each SSML_TAGS as tag (tag.tag)}
    {@const supported = isTagSupportedByProvider(tag.tag, providerId)}
    <div class="toolbar-item">
      <button
        class="tag-btn"
        class:unsupported={!supported}
        disabled={disabled || !supported}
        title={supported ? tag.description : `<${tag.tag}> not supported by this provider`}
        on:click={() => openPopover(tag)}
      >
        <span class="tag-icon">{TAG_ICONS[tag.tag] ?? '🏷'}</span>
        <span class="tag-label">{tag.label}</span>
      </button>

      {#if activePopover === tag.tag}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div class="popover" role="dialog" on:keydown={handleKeydown}>
          <div class="popover-title">&lt;{tag.tag}&gt;</div>
          {#each tag.attributes as attr (attr.name)}
            <label class="popover-field">
              <span class="field-label">{attr.label}{attr.required ? ' *' : ''}</span>
              {#if attr.type === 'select' && attr.options}
                <select bind:value={popoverAttrs[attr.name]}>
                  {#each attr.options as opt (opt.value)}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type="text"
                  bind:value={popoverAttrs[attr.name]}
                  placeholder={attr.placeholder ?? ''}
                />
              {/if}
            </label>
          {/each}
          <div class="popover-actions">
            <button class="pop-btn pop-cancel" on:click={cancelPopover}>Cancel</button>
            <button class="pop-btn pop-insert" on:click={confirmInsert}>Insert</button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .ssml-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 0;
  }
  .ssml-toolbar.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
  .toolbar-item {
    position: relative;
  }
  .tag-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    border: 1px solid var(--border-subtle, #333);
    border-radius: 6px;
    background: var(--bg-surface, #1a1a2e);
    color: var(--text-primary, #e0e0e0);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .tag-btn:hover:not(:disabled) {
    background: var(--bg-hover, #252545);
    border-color: var(--accent, #7c5cbf);
  }
  .tag-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .tag-btn.unsupported {
    text-decoration: line-through;
  }
  .tag-icon {
    font-size: 0.85rem;
  }
  .tag-label {
    font-weight: 500;
  }

  .popover {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 100;
    min-width: 220px;
    padding: 10px;
    background: var(--bg-surface, #1a1a2e);
    border: 1px solid var(--accent, #7c5cbf);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }
  .popover-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--accent, #7c5cbf);
    font-family: monospace;
  }
  .popover-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .field-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #999);
    font-weight: 500;
  }
  .popover select,
  .popover input {
    padding: 4px 6px;
    border: 1px solid var(--border-subtle, #333);
    border-radius: 4px;
    background: var(--bg-input, #0f0f1e);
    color: var(--text-primary, #e0e0e0);
    font-size: 0.8rem;
  }
  .popover-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 4px;
  }
  .pop-btn {
    padding: 4px 10px;
    border: 1px solid var(--border-subtle, #333);
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    font-weight: 500;
  }
  .pop-cancel {
    background: transparent;
    color: var(--text-secondary, #999);
  }
  .pop-insert {
    background: var(--accent, #7c5cbf);
    color: white;
    border-color: var(--accent, #7c5cbf);
  }
  .pop-insert:hover {
    opacity: 0.9;
  }
</style>
