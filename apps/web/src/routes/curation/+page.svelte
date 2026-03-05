<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
  import {
    addCustomVoice,
    customVoices,
    metadataOverrides,
    providerCatalog,
    upsertMetadataOverride
  } from '$lib/stores/app-state';
  import { normalizeProviderId } from '$lib/providers';
  import { buildEffectiveCatalog, createVoiceFromDraft, csvToList, listToCsv } from '$lib/voice-catalog';
  import type { Voice, VoiceVariant } from '$lib/types';

  export let data: { voices: Voice[] };

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  let selectedVoiceId = '';
  let saveMessage = '';

  let shortLabel = '';
  let searchDescription = '';
  let machineTagsCsv = '';
  let useCasesCsv = '';
  let toneTagsCsv = '';
  let audienceTagsCsv = '';

  let newName = '';
  let selectedProviderId = '';
  let newProviderVoiceId = '';
  let newDescription = '';
  let newLanguagesCsv = 'en-US';
  let newSourceType: VoiceVariant['sourceType'] = 'cloud_provider';
  let newSourceKey = '';
  let selectedProvider: { id: string; name: string; websiteUrl?: string } | null = null;

  $: if (!selectedProviderId && $providerCatalog.length) {
    selectedProviderId = $providerCatalog[0].id;
  }

  $: selectedProvider = $providerCatalog.find((provider) => provider.id === selectedProviderId) ?? null;

  $: selectedVoice = effectiveVoices.find((voice) => voice.id === selectedVoiceId) ?? null;

  $: if (selectedVoice) {
    shortLabel = selectedVoice.metadata.shortLabel;
    searchDescription = selectedVoice.metadata.searchDescription;
    machineTagsCsv = listToCsv(selectedVoice.metadata.machineTags);
    useCasesCsv = listToCsv(selectedVoice.metadata.useCases);
    toneTagsCsv = listToCsv(selectedVoice.metadata.toneTags);
    audienceTagsCsv = listToCsv(selectedVoice.metadata.audienceTags);
  }

  function saveMetadata() {
    if (!selectedVoice) return;

    upsertMetadataOverride(selectedVoice.id, {
      shortLabel: shortLabel.trim(),
      searchDescription: searchDescription.trim(),
      machineTags: csvToList(machineTagsCsv),
      useCases: csvToList(useCasesCsv),
      toneTags: csvToList(toneTagsCsv),
      audienceTags: csvToList(audienceTagsCsv),
      metadataQuality: 'editorial'
    });

    saveMessage = 'Metadata saved to curator layer.';
  }

  function addVoiceDraft() {
    if (!newName.trim() || !selectedProvider || !newDescription.trim() || !newProviderVoiceId.trim()) return;

    const resolvedSourceKey =
      newSourceKey.trim() || `${normalizeProviderId(selectedProvider.id)}:voice:${newProviderVoiceId.trim()}`;

    const voice = createVoiceFromDraft({
      name: newName.trim(),
      provider: selectedProvider.name,
      providerId: selectedProvider.id,
      providerVoiceId: newProviderVoiceId.trim(),
      description: newDescription.trim(),
      languages: csvToList(newLanguagesCsv),
      sourceType: newSourceType,
      sourceKey: resolvedSourceKey,
      shortLabel: shortLabel.trim() || newName.trim(),
      searchDescription: searchDescription.trim() || newDescription.trim(),
      machineTags: csvToList(machineTagsCsv),
      toneTags: csvToList(toneTagsCsv),
      useCases: csvToList(useCasesCsv),
      audienceTags: csvToList(audienceTagsCsv)
    });

    addCustomVoice(voice);
    selectedVoiceId = voice.id;
    saveMessage = 'New curated voice draft added.';

    newName = '';
    newProviderVoiceId = '';
    newDescription = '';
    newSourceKey = '';
  }
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
      <h2>Metadata Editor</h2>
      <p>Improve discoverability using structured labels and machine tags.</p>

      <label>
        Voice
        <select bind:value={selectedVoiceId}>
          <option value="">Select voice</option>
          {#each effectiveVoices as voice}
            <option value={voice.id}>{voice.provider} · {voice.name}</option>
          {/each}
        </select>
      </label>

      {#if selectedVoice}
        <div class="grid">
          <label>
            Short label
            <input bind:value={shortLabel} placeholder="Cinematic narrator, calm female UK, etc." />
          </label>
          <label>
            Search description
            <textarea bind:value={searchDescription} placeholder="Human-readable semantic summary for search and ranking" />
          </label>
          <label>
            Machine tags (CSV)
            <input bind:value={machineTagsCsv} placeholder="broadcast, high-clarity, onboarding" />
          </label>
          <label>
            Use cases (CSV)
            <input bind:value={useCasesCsv} placeholder="News read, Product walkthrough" />
          </label>
          <label>
            Tone tags (CSV)
            <input bind:value={toneTagsCsv} placeholder="warm, assertive, playful" />
          </label>
          <label>
            Audience tags (CSV)
            <input bind:value={audienceTagsCsv} placeholder="enterprise, creators, education" />
          </label>
        </div>

        <button on:click={saveMetadata}>Save Metadata</button>
      {/if}
    </section>

    <section class="panel">
      <h2>Add New Voice Draft</h2>
      <p>Add voices not yet in provider feeds, then refine metadata.</p>

      <div class="grid">
        <label>
          Voice name
          <input bind:value={newName} placeholder="Voice name" />
        </label>
        <label>
          Provider
          <select bind:value={selectedProviderId}>
            {#each $providerCatalog as provider}
              <option value={provider.id}>{provider.name}</option>
            {/each}
          </select>
        </label>
        <label>
          Provider voice ID
          <input bind:value={newProviderVoiceId} placeholder="Amy, alloy, p364, EXAVIT..." />
        </label>
        <label>
          Description
          <textarea bind:value={newDescription} placeholder="Voice summary" />
        </label>
        <label>
          Languages (CSV)
          <input bind:value={newLanguagesCsv} placeholder="en-US, es-ES" />
        </label>
        <label>
          Source type
          <select bind:value={newSourceType}>
            <option value="cloud_provider">cloud_provider</option>
            <option value="hf_model">hf_model</option>
            <option value="hf_space">hf_space</option>
            <option value="hf_endpoint">hf_endpoint</option>
            <option value="self_hosted">self_hosted</option>
          </select>
        </label>
        <label>
          Source key
          <input bind:value={newSourceKey} placeholder="provider:voice:id (optional auto-generated)" />
        </label>
      </div>

      {#if selectedProvider?.websiteUrl}
        <p class="provider-meta">
          Provider reference: <a href={selectedProvider.websiteUrl} target="_blank" rel="noreferrer">{selectedProvider.websiteUrl}</a>
        </p>
      {/if}

      <button on:click={addVoiceDraft}>Add Voice Draft</button>
    </section>

    {#if saveMessage}
      <p class="success">{saveMessage}</p>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 980px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: reveal 320ms ease;
  }

  .panel,
  .blocked {
    margin-top: 0.8rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 16px;
    background: linear-gradient(180deg, #fff 0%, #fbfdfe 100%);
    padding: 0.85rem;
    box-shadow: 0 10px 22px rgba(17, 39, 57, 0.08);
  }

  .blocked {
    background: #fff2f0;
    border-color: #e5b4ab;
    color: #7a2d1b;
  }

  .grid {
    margin-top: 0.6rem;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  label {
    display: grid;
    gap: 0.32rem;
    font-size: 0.88rem;
    font-weight: 600;
  }

  select,
  textarea,
  input {
    border: 1px solid #bfd0de;
    border-radius: 12px;
    padding: 0.55rem 0.7rem;
    background: #fff;
    font-size: 0.95rem;
    width: 100%;
    box-sizing: border-box;
  }

  textarea {
    min-height: 86px;
    resize: vertical;
  }

  button {
    margin-top: 0.7rem;
    border: none;
    border-radius: 11px;
    padding: 0.52rem 0.82rem;
    background: linear-gradient(154deg, var(--brand-600) 0%, var(--brand-700) 100%);
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .success {
    margin-top: 0.8rem;
    color: #1d5a39;
    font-weight: 650;
  }

  .provider-meta {
    margin-top: 0.45rem;
    color: #35576f;
    font-size: 0.84rem;
  }

  .provider-meta a {
    color: var(--brand-700);
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
