<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import SsmlToolbar from './SsmlToolbar.svelte';
  import { validateSsml, type ValidationResult } from '$lib/ssml/validate';
  import { insertTag, wrapSpeak } from '$lib/ssml/serialize';
  import type { SsmlTagDef } from '$lib/ssml/tags';
  import { SSML_PROVIDER_IDS, isTagSupportedByProvider } from '$lib/ssml/tags';

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
    {
      tag: 'break',
      label: 'Pause',
      description: 'Insert silence between phrases. Use time (ms/s) or strength (x-weak → x-strong).',
      variants: [
        { label: 'Short pause', code: 'Neural voices have changed everything.<break time="300ms"/> The quality is remarkable.' },
        { label: 'Dramatic pause', code: 'And the best voice model of the year is<break time="1s"/> ElevenLabs Turbo.' },
        { label: 'By strength', code: 'First, the text is tokenized.<break strength="strong"/> Then, the acoustic model generates mel spectrograms.' },
      ],
    },
    {
      tag: 'prosody',
      label: 'Prosody',
      description: 'Control speaking rate, pitch, and volume. Combine multiple attributes for nuanced delivery.',
      variants: [
        { label: 'Slow + low', code: '<prosody rate="slow" pitch="low">This is a deep, deliberate narration voice for documentary work.</prosody>' },
        { label: 'Fast + high', code: '<prosody rate="fast" pitch="high">Breaking news — a new open-source TTS model just dropped on Hugging Face!</prosody>' },
        { label: 'Whisper', code: '<prosody volume="x-soft" rate="slow">Between you and me, the latency on this model is under fifty milliseconds.</prosody>' },
        { label: 'Announcement', code: '<prosody volume="loud" rate="medium">Introducing Vokda — your destination for discovering the perfect voice.</prosody>' },
      ],
    },
    {
      tag: 'emphasis',
      label: 'Emphasis',
      description: 'Stress a word or phrase. Levels: strong, moderate, reduced, none.',
      variants: [
        { label: 'Strong', code: 'The voice cloning was <emphasis level="strong">identical</emphasis> to the original speaker.' },
        { label: 'Moderate', code: 'Latency matters, but <emphasis level="moderate">naturalness</emphasis> matters more.' },
        { label: 'Reduced', code: 'It supports twelve languages, <emphasis level="reduced">give or take</emphasis>, depending on the model.' },
      ],
    },
    {
      tag: 'say-as',
      label: 'Say-as',
      description: 'Control interpretation of numbers, dates, abbreviations, and more.',
      variants: [
        { label: 'Spell out', code: 'The model is called <say-as interpret-as="characters">TTS</say-as>, short for text-to-speech.' },
        { label: 'Cardinal', code: 'ElevenLabs now supports over <say-as interpret-as="cardinal">1200</say-as> voice presets.' },
        { label: 'Ordinal', code: 'This was the <say-as interpret-as="ordinal">3</say-as> generation of neural speech synthesis.' },
        { label: 'Date', code: 'The model was released on <say-as interpret-as="date" format="mdy">03/06/2026</say-as>.' },
        { label: 'Telephone', code: 'For enterprise licensing, call <say-as interpret-as="telephone">+1-800-555-0199</say-as>.' },
      ],
    },
    {
      tag: 'phoneme',
      label: 'Phoneme',
      description: 'Override pronunciation with IPA or X-SAMPA phonetic notation.',
      variants: [
        { label: 'IPA', code: 'The <phoneme alphabet="ipa" ph="ˈnjuː.rəl">neural</phoneme> architecture uses attention heads.' },
        { label: 'Name', code: 'The lead researcher is <phoneme alphabet="ipa" ph="ˈʃoːn">Sean</phoneme>.' },
        { label: 'Brand', code: 'Welcome to <phoneme alphabet="ipa" ph="ˈvɒk.də">Vokda</phoneme>, the voice discovery platform.' },
      ],
    },
    {
      tag: 'sub',
      label: 'Substitution',
      description: 'Replace displayed text with a different spoken form.',
      variants: [
        { label: 'Acronym', code: 'The <sub alias="speech synthesis markup language">SSML</sub> standard is maintained by the W3C.' },
        { label: 'Abbreviation', code: 'Latency was <sub alias="forty-seven milliseconds">47ms</sub> on average.' },
        { label: 'Technical', code: 'The model runs on <sub alias="Graphics Processing Units">GPUs</sub> with <sub alias="sixteen gigabytes">16GB</sub> of VRAM.' },
      ],
    },
    {
      tag: 'lang',
      label: 'Language',
      description: 'Switch language mid-sentence for multilingual content.',
      variants: [
        { label: 'French', code: 'The French term for voice synthesis is <lang xml:lang="fr-FR">synthèse vocale</lang>.' },
        { label: 'German', code: 'In German, text-to-speech is called <lang xml:lang="de-DE">Sprachsynthese</lang>.' },
        { label: 'Spanish', code: 'Our Spanish users call it <lang xml:lang="es-ES">síntesis de voz</lang>.' },
      ],
    },
  ];

  function isTagSupported(tagName: string): boolean {
    return isTagSupportedByProvider(tagName, providerId);
  }

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
        {#each SSML_EXAMPLES as group (group.tag)}
          {@const supported = isTagSupported(group.tag)}
          <div class="help-group" class:unsupported={!supported}>
            <div class="help-group-header">
              <span class="help-group-tag">&lt;{group.tag}&gt;</span>
              <span class="help-group-label">{group.label}</span>
              {#if !supported}
                <span class="help-unsupported-badge">not supported</span>
              {/if}
            </div>
            <p class="help-group-desc">{group.description}</p>
            <div class="help-variants">
              {#each group.variants as v (v.label)}
                <div class="help-variant">
                  <div class="help-variant-header">
                    <span class="help-variant-label">{v.label}</span>
                    <button
                      class="help-insert"
                      title="Insert into editor"
                      disabled={!supported}
                      on:click={() => insertExample(v.code)}
                    >+</button>
                  </div>
                  <code class="help-code">{v.code}</code>
                </div>
              {/each}
            </div>
          </div>
        {/each}
        <div class="help-links">
          <a href="https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html" target="_blank" rel="noopener">AWS Polly SSML ↗</a>
          <a href="https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup" target="_blank" rel="noopener">Azure SSML ↗</a>
          <a href="https://cloud.google.com/text-to-speech/docs/ssml" target="_blank" rel="noopener">Google Cloud SSML ↗</a>
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
    padding: 12px;
    background: var(--bg-surface, #1a1a2e);
    border: 1px solid var(--border-subtle, #333);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 420px;
    overflow-y: auto;
  }
  .help-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .help-group.unsupported {
    opacity: 0.4;
  }
  .help-group-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .help-group-tag {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--accent, #7c5cbf);
  }
  .help-group-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary, #e0e0e0);
  }
  .help-unsupported-badge {
    font-size: 0.65rem;
    color: #e74c3c;
    background: rgba(231, 76, 60, 0.1);
    padding: 1px 6px;
    border-radius: 3px;
    font-weight: 500;
  }
  .help-group-desc {
    font-size: 0.72rem;
    color: var(--text-secondary, #888);
    margin: 0;
    line-height: 1.4;
  }
  .help-variants {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 4px;
  }
  .help-variant {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .help-variant-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .help-variant-label {
    font-size: 0.7rem;
    color: var(--text-secondary, #999);
    font-weight: 500;
  }
  .help-code {
    font-size: 0.7rem;
    color: var(--accent-light, #a78bfa);
    background: var(--bg-input, #0f0f1e);
    padding: 4px 8px;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
    display: block;
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
  .help-insert:hover:not(:disabled) {
    background: var(--accent, #7c5cbf);
    color: white;
  }
  .help-insert:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .help-links {
    display: flex;
    gap: 12px;
    padding-top: 10px;
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
