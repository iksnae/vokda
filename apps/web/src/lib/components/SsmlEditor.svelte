<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import SsmlToolbar from './SsmlToolbar.svelte';
  import { validateSsml, type ValidationResult } from '$lib/ssml/validate';
  import { insertTag, wrapSpeak } from '$lib/ssml/serialize';
  import type { SsmlTagDef } from '$lib/ssml/tags';
  import { SSML_PROVIDER_IDS } from '$lib/ssml/tags';

  export let value = '';
  export let providerId = '';
  export let supportsSsml = false;
  export let maxChars = 5000;
  export let providerName = '';

  const dispatch = createEventDispatcher<{
    synthesize: void;
    change: string;
  }>();

  let textareaEl: HTMLTextAreaElement;
  let validation: ValidationResult = { valid: true, errors: [], warnings: [] };
  let showValidation = false;
  let showHelp = false;

  $: {
    if (value.trim()) {
      validation = validateSsml(value, providerId);
    } else {
      validation = { valid: true, errors: [], warnings: [] };
    }
  }

  $: charCount = value.length;
  $: charOverLimit = charCount > maxChars;

  function handleInsert(e: CustomEvent<{ tag: SsmlTagDef; attrs: Record<string, string> }>) {
    const { tag, attrs } = e.detail;
    const start = textareaEl?.selectionStart ?? value.length;
    const end = textareaEl?.selectionEnd ?? value.length;
    const result = insertTag(value, start, end, tag, attrs);
    value = result.text;
    dispatch('change', value);

    // Restore focus and cursor position
    requestAnimationFrame(() => {
      textareaEl?.focus();
      textareaEl?.setSelectionRange(result.cursorPos, result.cursorPos);
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      dispatch('synthesize');
    }
  }

  function handleInput() {
    dispatch('change', value);
  }

  const SSML_EXAMPLES = [
    { label: 'Pause', code: '<break time="500ms"/>' },
    { label: 'Slow speech', code: '<prosody rate="slow">Take your time.</prosody>' },
    { label: 'Emphasis', code: '<emphasis level="strong">Important!</emphasis>' },
    { label: 'Spell out', code: '<say-as interpret-as="characters">ABC</say-as>' },
    { label: 'Pronunciation', code: '<phoneme alphabet="ipa" ph="təˈmeɪ.toʊ">tomato</phoneme>' },
    { label: 'Substitution', code: '<sub alias="World Wide Web Consortium">W3C</sub>' },
  ];

  function insertExample(code: string) {
    const start = textareaEl?.selectionStart ?? value.length;
    value = value.slice(0, start) + code + value.slice(start);
    dispatch('change', value);
    requestAnimationFrame(() => {
      const pos = start + code.length;
      textareaEl?.focus();
      textareaEl?.setSelectionRange(pos, pos);
    });
  }
</script>

<div class="ssml-editor">
  {#if !supportsSsml}
    <div class="ssml-disabled-overlay">
      <div class="disabled-icon">🚫</div>
      <p class="disabled-message">
        SSML is not supported by <strong>{providerName || providerId}</strong>.
      </p>
      <p class="disabled-hint">
        Switch to a voice from AWS Polly, Azure Speech, Google Cloud TTS, or Edge TTS to use SSML.
      </p>
    </div>
  {:else}
    <SsmlToolbar {providerId} disabled={!supportsSsml} on:insert={handleInsert} />

    <div class="textarea-wrap">
      <textarea
        bind:this={textareaEl}
        bind:value
        class="ssml-textarea"
        class:error={!validation.valid && value.trim().length > 0}
        placeholder={'<speak>\n  Enter your SSML here…\n</speak>'}
        rows="5"
        on:keydown={handleKeydown}
        on:input={handleInput}
      ></textarea>
      <div class="char-count" class:over={charOverLimit}>
        {charCount}/{maxChars}
      </div>
    </div>

    <!-- Validation bar -->
    {#if value.trim()}
      <button
        class="validation-bar"
        class:valid={validation.valid && validation.warnings.length === 0}
        class:has-warnings={validation.valid && validation.warnings.length > 0}
        class:has-errors={!validation.valid}
        on:click={() => (showValidation = !showValidation)}
      >
        {#if !validation.valid}
          <span>✗ {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}</span>
        {:else if validation.warnings.length > 0}
          <span>⚠ {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}</span>
        {:else}
          <span>✓ Valid SSML</span>
        {/if}
        <span class="expand-hint">{showValidation ? '▲' : '▼'}</span>
      </button>

      {#if showValidation && (validation.errors.length > 0 || validation.warnings.length > 0)}
        <div class="validation-detail">
          {#each validation.errors as err}
            <div class="val-item val-error">✗ {err.message}</div>
          {/each}
          {#each validation.warnings as warn}
            <div class="val-item val-warning">⚠ {warn.message}</div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Help reference -->
    <button class="help-toggle" on:click={() => (showHelp = !showHelp)}>
      {showHelp ? '▾ Hide' : '▸ Show'} SSML Quick Reference
    </button>

    {#if showHelp}
      <div class="ssml-help">
        <div class="help-grid">
          {#each SSML_EXAMPLES as ex}
            <div class="help-example">
              <span class="help-label">{ex.label}</span>
              <code class="help-code">{ex.code}</code>
              <button class="help-insert" title="Insert" on:click={() => insertExample(ex.code)}>+</button>
            </div>
          {/each}
        </div>
        <div class="help-links">
          <a href="https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html" target="_blank" rel="noopener">AWS Polly SSML</a>
          <a href="https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup" target="_blank" rel="noopener">Azure SSML</a>
          <a href="https://cloud.google.com/text-to-speech/docs/ssml" target="_blank" rel="noopener">Google Cloud SSML</a>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .ssml-editor {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Disabled overlay */
  .ssml-disabled-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    border: 1px dashed var(--border-subtle, #333);
    border-radius: 8px;
    background: var(--bg-surface, #1a1a2e);
    text-align: center;
    min-height: 120px;
  }
  .disabled-icon {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  .disabled-message {
    font-size: 0.9rem;
    color: var(--text-primary, #e0e0e0);
    margin: 0 0 4px;
  }
  .disabled-hint {
    font-size: 0.78rem;
    color: var(--text-secondary, #888);
    margin: 0;
  }

  /* Textarea */
  .textarea-wrap {
    position: relative;
  }
  .ssml-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle, #333);
    border-radius: 8px;
    background: var(--bg-input, #0f0f1e);
    color: var(--text-primary, #e0e0e0);
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .ssml-textarea:focus {
    outline: none;
    border-color: var(--accent, #7c5cbf);
  }
  .ssml-textarea.error {
    border-color: #e74c3c;
  }
  .char-count {
    position: absolute;
    bottom: 6px;
    right: 10px;
    font-size: 0.7rem;
    color: var(--text-secondary, #666);
  }
  .char-count.over {
    color: #e74c3c;
    font-weight: 600;
  }

  /* Validation */
  .validation-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    width: 100%;
    text-align: left;
  }
  .validation-bar.valid {
    background: rgba(39, 174, 96, 0.12);
    color: #27ae60;
  }
  .validation-bar.has-warnings {
    background: rgba(241, 196, 15, 0.12);
    color: #f1c40f;
  }
  .validation-bar.has-errors {
    background: rgba(231, 76, 60, 0.12);
    color: #e74c3c;
  }
  .expand-hint {
    font-size: 0.65rem;
    opacity: 0.6;
  }
  .validation-detail {
    padding: 6px 10px;
    background: var(--bg-surface, #1a1a2e);
    border: 1px solid var(--border-subtle, #333);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .val-item {
    font-size: 0.75rem;
    line-height: 1.4;
  }
  .val-error {
    color: #e74c3c;
  }
  .val-warning {
    color: #f1c40f;
  }

  /* Help */
  .help-toggle {
    background: none;
    border: none;
    color: var(--text-secondary, #888);
    font-size: 0.72rem;
    cursor: pointer;
    padding: 4px 0;
    text-align: left;
  }
  .help-toggle:hover {
    color: var(--accent, #7c5cbf);
  }
  .ssml-help {
    padding: 10px;
    background: var(--bg-surface, #1a1a2e);
    border: 1px solid var(--border-subtle, #333);
    border-radius: 8px;
  }
  .help-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .help-example {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .help-label {
    font-size: 0.75rem;
    color: var(--text-secondary, #999);
    min-width: 80px;
    font-weight: 500;
  }
  .help-code {
    flex: 1;
    font-size: 0.72rem;
    color: var(--accent, #7c5cbf);
    background: var(--bg-input, #0f0f1e);
    padding: 2px 6px;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .help-insert {
    background: none;
    border: 1px solid var(--border-subtle, #333);
    color: var(--accent, #7c5cbf);
    border-radius: 4px;
    width: 22px;
    height: 22px;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .help-insert:hover {
    background: var(--accent, #7c5cbf);
    color: white;
  }
  .help-links {
    display: flex;
    gap: 12px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle, #333);
  }
  .help-links a {
    font-size: 0.7rem;
    color: var(--accent, #7c5cbf);
    text-decoration: none;
  }
  .help-links a:hover {
    text-decoration: underline;
  }
</style>
