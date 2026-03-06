<script lang="ts">
  import { onMount } from 'svelte';
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
  import { addToast } from '$lib/components/toast-store';
  import Icon from '$lib/components/Icon.svelte';
  import type { Voice, VoiceVariant, VoiceRecord } from '$lib/types';
  import {
    listVoiceRecords,
    saveVoiceRecord,
    deleteVoiceRecord
  } from '$lib/data/voice-store';

  export let data: { voices: Voice[] };

  $: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices);

  // ─── Voice Records from DynamoDB ───
  let dbVoices: VoiceRecord[] = [];
  let dbLoading = false;
  let dbStats = { total: 0, published: 0, draft: 0, archived: 0 };

  async function loadDbVoices() {
    dbLoading = true;
    try {
      dbVoices = await listVoiceRecords();
      dbStats = {
        total: dbVoices.length,
        published: dbVoices.filter(v => v.status === 'published').length,
        draft: dbVoices.filter(v => v.status === 'draft').length,
        archived: dbVoices.filter(v => v.status === 'archived').length,
      };
    } catch (err) {
      console.warn('[curation] Failed to load VoiceRecords:', err);
      addToast('Could not load voice records from database.', 'error');
    } finally {
      dbLoading = false;
    }
  }

  onMount(() => {
    if ($roleFlags.isCurator) {
      void loadDbVoices();
    }
  });

  // ─── Metadata editor ───
  let selectedVoiceId = '';
  let saveMessage = '';

  let shortLabel = '';
  let searchDescription = '';
  let machineTagsCsv = '';
  let useCasesCsv = '';
  let toneTagsCsv = '';
  let audienceTagsCsv = '';

  // ─── New voice draft ───
  let newName = '';
  let selectedProviderId = '';
  let newProviderVoiceId = '';
  let newDescription = '';
  let newLanguagesCsv = 'en-US';
  let newSourceType: VoiceVariant['sourceType'] = 'cloud_provider';
  let newSourceKey = '';
  let selectedProvider: { id: string; name: string; websiteUrl?: string } | null = null;
  let saveToDB = true;

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

  async function saveMetadata() {
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

    // Also save to VoiceRecord if it exists in DB
    if (saveToDB) {
      try {
        const updatedVoice = {
          ...selectedVoice,
          metadata: {
            ...selectedVoice.metadata,
            shortLabel: shortLabel.trim(),
            searchDescription: searchDescription.trim(),
            machineTags: csvToList(machineTagsCsv),
            useCases: csvToList(useCasesCsv),
            toneTags: csvToList(toneTagsCsv),
            audienceTags: csvToList(audienceTagsCsv),
            metadataQuality: 'editorial' as const,
          }
        };
        await saveVoiceRecord(updatedVoice, 'published');
        addToast('Metadata saved to database.', 'success');
      } catch (err) {
        addToast('Saved locally. Database sync failed.', 'info');
      }
    } else {
      addToast('Metadata saved to curator layer.');
    }
  }

  async function addVoiceDraft() {
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

    // Save to VoiceRecord as draft
    if (saveToDB) {
      try {
        await saveVoiceRecord(voice, 'draft');
        addToast('Voice draft saved to database.');
        void loadDbVoices();
      } catch {
        addToast('Voice added locally. Database save failed.', 'info');
      }
    } else {
      addToast('New curated voice draft added.');
    }

    selectedVoiceId = voice.id;
    newName = '';
    newProviderVoiceId = '';
    newDescription = '';
    newSourceKey = '';
  }

  // ─── DB voice management ───
  async function publishVoice(record: VoiceRecord) {
    try {
      const voice: Voice = {
        id: record.id,
        name: record.name,
        provider: record.provider,
        providerId: record.providerId,
        providerVoiceId: record.providerVoiceId,
        description: record.description,
        tags: record.tags,
        languages: record.languages,
        qualityTier: record.qualityTier,
        licenseNotes: record.licenseNotes,
        metadata: record.metadata,
        modelCard: record.modelCard,
        imageUrl: record.imageUrl,
        audioUrl: record.audioUrl,
        samples: record.samples,
        variants: record.variants,
      };
      await saveVoiceRecord(voice, 'published');
      addToast(`Published "${record.name}".`);
      void loadDbVoices();
    } catch {
      addToast('Publish failed.', 'error');
    }
  }

  async function archiveVoice(record: VoiceRecord) {
    try {
      const voice: Voice = {
        id: record.id,
        name: record.name,
        provider: record.provider,
        providerId: record.providerId,
        providerVoiceId: record.providerVoiceId,
        description: record.description,
        tags: record.tags,
        languages: record.languages,
        qualityTier: record.qualityTier,
        licenseNotes: record.licenseNotes,
        metadata: record.metadata,
        modelCard: record.modelCard,
        imageUrl: record.imageUrl,
        audioUrl: record.audioUrl,
        samples: record.samples,
        variants: record.variants,
      };
      await saveVoiceRecord(voice, 'archived');
      addToast(`Archived "${record.name}".`);
      void loadDbVoices();
    } catch {
      addToast('Archive failed.', 'error');
    }
  }

  async function removeVoice(record: VoiceRecord) {
    if (!confirm(`Delete "${record.name}"? This cannot be undone.`)) return;
    try {
      await deleteVoiceRecord(record.id);
      addToast(`Deleted "${record.name}".`);
      void loadDbVoices();
    } catch {
      addToast('Delete failed.', 'error');
    }
  }

  // ─── Tab state ───
  let activeTab: 'editor' | 'drafts' | 'database' = 'editor';
</script>

<svelte:head>
  <title>Curation | Vokda</title>
</svelte:head>

<main>
  <h1>
    <Icon name="sliders" size={24} />
    Curation Workspace
  </h1>

  {#if !$roleFlags.isCurator}
    <p class="blocked">This workspace is for curators. Sign in with a curator account to continue.</p>
  {:else}
    <!-- Tab bar -->
    <nav class="tabs">
      <button class="tab" class:active={activeTab === 'editor'} on:click={() => activeTab = 'editor'}>
        <Icon name="sliders" size={16} />
        Metadata Editor
      </button>
      <button class="tab" class:active={activeTab === 'drafts'} on:click={() => activeTab = 'drafts'}>
        <Icon name="plus" size={16} />
        New Voice
      </button>
      <button class="tab" class:active={activeTab === 'database'} on:click={() => activeTab = 'database'}>
        <Icon name="info" size={16} />
        Database
        <span class="tab-badge">{dbStats.total}</span>
      </button>
    </nav>

    <!-- Metadata Editor Tab -->
    {#if activeTab === 'editor'}
      <section class="panel">
        <p class="panel-desc">Improve discoverability using structured labels and machine tags.</p>

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
              <textarea bind:value={searchDescription} placeholder="Human-readable semantic summary" />
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

          <div class="action-row">
            <label class="toggle-check">
              <input type="checkbox" bind:checked={saveToDB} />
              Save to database
            </label>
            <button class="primary-btn" on:click={saveMetadata}>
              <Icon name="check" size={16} />
              Save Metadata
            </button>
          </div>
        {/if}
      </section>
    {/if}

    <!-- New Voice Tab -->
    {#if activeTab === 'drafts'}
      <section class="panel">
        <p class="panel-desc">Add voices not yet in provider feeds, then refine metadata.</p>

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
              <option value="cloud_provider">Cloud provider</option>
              <option value="local_model">Local model</option>
              <option value="hf_model">HF model</option>
              <option value="hf_space">HF Space</option>
              <option value="hf_endpoint">HF Endpoint</option>
              <option value="self_hosted">Self-hosted</option>
            </select>
          </label>
          <label>
            Source key
            <input bind:value={newSourceKey} placeholder="provider:voice:id (auto-generated if blank)" />
          </label>
        </div>

        {#if selectedProvider?.websiteUrl}
          <p class="provider-meta">
            Provider: <a href={selectedProvider.websiteUrl} target="_blank" rel="noreferrer">{selectedProvider.websiteUrl}</a>
          </p>
        {/if}

        <div class="action-row">
          <label class="toggle-check">
            <input type="checkbox" bind:checked={saveToDB} />
            Save to database
          </label>
          <button class="primary-btn" on:click={addVoiceDraft}>
            <Icon name="plus" size={16} />
            Add Voice Draft
          </button>
        </div>
      </section>
    {/if}

    <!-- Database Tab -->
    {#if activeTab === 'database'}
      <section class="panel">
        <div class="db-stats">
          <div class="stat">
            <span class="stat-value">{dbStats.total}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat published">
            <span class="stat-value">{dbStats.published}</span>
            <span class="stat-label">Published</span>
          </div>
          <div class="stat draft">
            <span class="stat-value">{dbStats.draft}</span>
            <span class="stat-label">Draft</span>
          </div>
          <div class="stat archived">
            <span class="stat-value">{dbStats.archived}</span>
            <span class="stat-label">Archived</span>
          </div>
          <button class="ghost-btn" on:click={loadDbVoices} disabled={dbLoading}>
            <Icon name="arrow-left" size={14} />
            Refresh
          </button>
        </div>

        {#if dbLoading}
          <p class="loading">Loading voice records...</p>
        {:else if dbVoices.length === 0}
          <p class="empty">No voice records in database. Seed with <code>node scripts/seed-dynamodb.mjs</code></p>
        {:else}
          <div class="db-table-wrap">
            <table class="db-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Languages</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each dbVoices.slice(0, 50) as record}
                  <tr>
                    <td class="name-cell">
                      <a href="/voices/{record.id}">{record.name}</a>
                    </td>
                    <td>{record.provider}</td>
                    <td>
                      <span class="status-badge" class:published={record.status === 'published'} class:draft-status={record.status === 'draft'} class:archived-status={record.status === 'archived'}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.languages.slice(0, 3).join(', ')}</td>
                    <td class="actions-cell">
                      {#if record.status !== 'published'}
                        <button class="small-btn publish" on:click={() => publishVoice(record)} title="Publish">
                          <Icon name="check" size={12} />
                        </button>
                      {/if}
                      {#if record.status !== 'archived'}
                        <button class="small-btn archive" on:click={() => archiveVoice(record)} title="Archive">
                          <Icon name="minus" size={12} />
                        </button>
                      {/if}
                      <button class="small-btn delete" on:click={() => removeVoice(record)} title="Delete">
                        <Icon name="x" size={12} />
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if dbVoices.length > 50}
              <p class="truncated">Showing 50 of {dbVoices.length} records</p>
            {/if}
          </div>
        {/if}
      </section>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 1020px;
    margin: 0 auto;
    padding: 0.85rem 1rem 3rem;
    animation: reveal 320ms ease;
  }

  h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: var(--text-display);
  }

  .panel, .blocked {
    margin-top: 0.5rem;
    border: 1px solid var(--stroke-soft);
    border-radius: 16px;
    background: linear-gradient(180deg, #fff 0%, #fbfdfe 100%);
    padding: 1rem;
    box-shadow: 0 10px 22px rgba(17, 39, 57, 0.08);
  }

  .blocked {
    background: #fff2f0;
    border-color: #e5b4ab;
    color: #7a2d1b;
  }

  .panel-desc {
    margin: 0 0 0.6rem;
    color: #4a6a82;
    font-size: var(--text-body);
  }

  /* ─── Tabs ─── */
  .tabs {
    display: flex;
    gap: 0.3rem;
    margin-top: 0.75rem;
    border-bottom: 2px solid #e4edf3;
    padding-bottom: 0;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: none;
    background: none;
    padding: 0.55rem 0.85rem;
    font-size: var(--text-small);
    font-weight: 660;
    color: #5a7a90;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 150ms, border-color 150ms;
  }

  .tab:hover { color: var(--brand-600); }
  .tab.active {
    color: var(--brand-700);
    border-bottom-color: var(--brand-600);
  }

  .tab-badge {
    background: var(--brand-100);
    color: var(--brand-700);
    font-size: 0.7rem;
    font-weight: 720;
    border-radius: 999px;
    padding: 0.05rem 0.38rem;
    min-width: 1.2rem;
    text-align: center;
  }

  /* ─── Form grid ─── */
  .grid {
    margin-top: 0.6rem;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  label {
    display: grid;
    gap: 0.32rem;
    font-size: var(--text-small);
    font-weight: 620;
    color: #3e5972;
  }

  select, textarea, input {
    border: 1px solid #bfd0de;
    border-radius: 12px;
    padding: 0.55rem 0.7rem;
    background: #fff;
    font-size: var(--text-body);
    width: 100%;
    box-sizing: border-box;
  }

  textarea { min-height: 80px; resize: vertical; }

  .action-row {
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: space-between;
  }

  .toggle-check {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: var(--text-small);
    font-weight: 620;
    color: #4a6a82;
    cursor: pointer;
  }

  .toggle-check input { width: auto; accent-color: var(--brand-600); }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: none;
    border-radius: 12px;
    padding: 0.55rem 1rem;
    background: linear-gradient(154deg, var(--brand-600), var(--brand-700));
    color: #fff;
    font-weight: 680;
    font-size: var(--text-small);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(20, 94, 121, 0.2);
  }

  .primary-btn:hover { box-shadow: 0 6px 16px rgba(20, 94, 121, 0.3); }

  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid #c5d5e2;
    background: #fff;
    border-radius: 10px;
    padding: 0.4rem 0.7rem;
    font-size: var(--text-xs);
    font-weight: 660;
    color: #3e5972;
    cursor: pointer;
  }

  .ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .provider-meta {
    margin-top: 0.45rem;
    color: #35576f;
    font-size: var(--text-small);
  }
  .provider-meta a { color: var(--brand-700); }

  /* ─── Database tab ─── */
  .db-stats {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.45rem 0.75rem;
    border-radius: 12px;
    border: 1px solid #d6e2ec;
    background: #f7fafc;
    min-width: 64px;
  }

  .stat-value { font-size: var(--text-heading); font-weight: 750; color: #1a3347; }
  .stat-label { font-size: var(--text-xs); font-weight: 620; color: #6a8ea6; text-transform: uppercase; }
  .stat.published { border-color: #a5d6a7; background: #e8f5e9; }
  .stat.published .stat-value { color: #2e7d32; }
  .stat.draft { border-color: #f0c36e; background: #fefbe8; }
  .stat.draft .stat-value { color: #8d5c16; }
  .stat.archived { border-color: #d0dce6; background: #f0f4f7; }
  .stat.archived .stat-value { color: #5a7a90; }

  .db-table-wrap { overflow-x: auto; }

  .db-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-small);
  }

  .db-table th {
    text-align: left;
    font-weight: 700;
    color: #3e5972;
    padding: 0.45rem 0.55rem;
    border-bottom: 2px solid #e4edf3;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .db-table td {
    padding: 0.4rem 0.55rem;
    border-bottom: 1px solid #eef3f7;
    color: #2f4e66;
  }

  .db-table tr:hover td { background: #f7fafc; }

  .name-cell a {
    color: var(--brand-600);
    font-weight: 620;
    text-decoration: none;
  }
  .name-cell a:hover { text-decoration: underline; }

  .status-badge {
    font-size: var(--text-xs);
    font-weight: 700;
    border-radius: 999px;
    padding: 0.12rem 0.45rem;
    border: 1px solid;
  }

  .status-badge.published { color: #2e7d32; background: #e8f5e9; border-color: #a5d6a7; }
  .status-badge.draft-status { color: #8d5c16; background: #fefbe8; border-color: #f0c36e; }
  .status-badge.archived-status { color: #5a7a90; background: #f0f4f7; border-color: #d0dce6; }

  .actions-cell {
    display: flex;
    gap: 0.25rem;
  }

  .small-btn {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 8px;
    border: 1px solid #d0dce6;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    color: #5a7a90;
    transition: all 120ms;
  }

  .small-btn:hover { border-color: #9eb6c8; }
  .small-btn.publish:hover { color: #2e7d32; border-color: #a5d6a7; background: #e8f5e9; }
  .small-btn.archive:hover { color: #8d5c16; border-color: #f0c36e; background: #fefbe8; }
  .small-btn.delete:hover { color: #c62828; border-color: #ef9a9a; background: #ffebee; }

  .loading, .empty, .truncated {
    color: #5a7a90;
    font-size: var(--text-small);
    text-align: center;
    padding: 1rem;
  }

  .empty code {
    font-size: var(--text-xs);
    background: #eef4f8;
    padding: 0.15rem 0.4rem;
    border-radius: 6px;
  }

  @keyframes reveal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
