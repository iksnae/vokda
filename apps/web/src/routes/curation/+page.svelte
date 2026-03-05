<script lang="ts">
  import { roleFlags } from '$lib/auth/store';
  import { addCustomVoice, customVoices, metadataOverrides, upsertMetadataOverride } from '$lib/stores/app-state';
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
  let newProvider = '';
  let newDescription = '';
  let newLanguagesCsv = 'en-US';
  let newSourceType: VoiceVariant['sourceType'] = 'cloud_provider';
  let newSourceKey = '';

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
    if (!newName.trim() || !newProvider.trim() || !newDescription.trim() || !newSourceKey.trim()) return;

    const voice = createVoiceFromDraft({
      name: newName.trim(),
      provider: newProvider.trim(),
      description: newDescription.trim(),
      languages: csvToList(newLanguagesCsv),
      sourceType: newSourceType,
      sourceKey: newSourceKey.trim(),
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
    newProvider = '';
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
          <input bind:value={newProvider} placeholder="Provider name" />
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
          <input bind:value={newSourceKey} placeholder="provider:key:voice" />
        </label>
      </div>

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
    border: 1px solid #b5c4d3;
    border-radius: 10px;
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
    border-radius: 10px;
    padding: 0.52rem 0.82rem;
    background: #1f5f7f;
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }

  .success {
    margin-top: 0.8rem;
    color: #1d5a39;
    font-weight: 650;
  }
</style>
