<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>SSML Reference | Vokda Docs</title>
  <meta name="description" content="Speech Synthesis Markup Language (SSML) reference for Vokda — tag reference, provider compatibility, examples, and best practices." />
</svelte:head>

<main>
  <nav class="breadcrumb"><a href="/docs">Docs</a> <span>/</span> SSML Reference</nav>
  <h1>SSML Reference</h1>
  <p class="subtitle">Control how voices speak — pauses, pacing, pronunciation, and more.</p>

  <section class="intro">
    <p>
      <strong>Speech Synthesis Markup Language (SSML)</strong> is an XML-based markup language that gives you fine-grained control over TTS output. Vokda's SSML editor provides a visual toolbar for inserting tags, real-time validation, and provider-aware compatibility checking.
    </p>
    <div class="tip">
      To use SSML, switch to <strong>SSML mode</strong> in the audition panel on any voice detail page. The toolbar shows which tags are supported by the current voice's provider.
    </div>
  </section>

  <section class="compat">
    <h2>Provider Compatibility</h2>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Tag</th>
            <th>AWS Polly</th>
            <th>Azure Speech</th>
            <th>Google Cloud</th>
            <th>Edge TTS</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>&lt;break&gt;</code></td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td><code>&lt;prosody&gt;</code></td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td><code>&lt;emphasis&gt;</code></td><td>✓*</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td><code>&lt;say-as&gt;</code></td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td><code>&lt;phoneme&gt;</code></td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
          <tr><td><code>&lt;sub&gt;</code></td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td><code>&lt;lang&gt;</code></td><td>✓</td><td>✓</td><td>—</td><td>✓</td></tr>
        </tbody>
      </table>
    </div>
    <p class="table-note">* AWS Polly neural voices don't support <code>&lt;emphasis&gt;</code>. Standard voices do.</p>
  </section>

  <section>
    <h2>Tag Reference</h2>

    <article class="tag-card" id="break">
      <h3><code>&lt;break&gt;</code> — Pause</h3>
      <p>Insert a silence of a given duration.</p>
      <div class="attrs">
        <div class="attr"><code>time</code> — Duration: <code>"250ms"</code>, <code>"1s"</code>, <code>"2.5s"</code></div>
        <div class="attr"><code>strength</code> — Named: <code>"none"</code>, <code>"x-weak"</code>, <code>"weak"</code>, <code>"medium"</code>, <code>"strong"</code>, <code>"x-strong"</code></div>
      </div>
      <pre class="example">&lt;speak&gt;
  Welcome to the future of voice. &lt;break time="500ms"/&gt;
  Let's begin.
&lt;/speak&gt;</pre>
    </article>

    <article class="tag-card" id="prosody">
      <h3><code>&lt;prosody&gt;</code> — Rate, Pitch, Volume</h3>
      <p>Modify the speed, pitch, or volume of enclosed text.</p>
      <div class="attrs">
        <div class="attr"><code>rate</code> — <code>"x-slow"</code>, <code>"slow"</code>, <code>"medium"</code>, <code>"fast"</code>, <code>"x-fast"</code>, or percentage <code>"+20%"</code></div>
        <div class="attr"><code>pitch</code> — <code>"x-low"</code>, <code>"low"</code>, <code>"medium"</code>, <code>"high"</code>, <code>"x-high"</code>, or semitones <code>"+2st"</code></div>
        <div class="attr"><code>volume</code> — <code>"silent"</code>, <code>"x-soft"</code>, <code>"soft"</code>, <code>"medium"</code>, <code>"loud"</code>, <code>"x-loud"</code>, or dB <code>"+6dB"</code></div>
      </div>
      <pre class="example">&lt;speak&gt;
  &lt;prosody rate="slow" pitch="low"&gt;
    This is a deep, slow introduction.
  &lt;/prosody&gt;
  &lt;prosody rate="fast" volume="loud"&gt;
    And now we're picking up the pace!
  &lt;/prosody&gt;
&lt;/speak&gt;</pre>
    </article>

    <article class="tag-card" id="emphasis">
      <h3><code>&lt;emphasis&gt;</code> — Stress</h3>
      <p>Apply stress or emphasis to words.</p>
      <div class="attrs">
        <div class="attr"><code>level</code> — <code>"reduced"</code>, <code>"moderate"</code>, <code>"strong"</code></div>
      </div>
      <pre class="example">&lt;speak&gt;
  This is &lt;emphasis level="strong"&gt;incredibly&lt;/emphasis&gt; important.
&lt;/speak&gt;</pre>
      <div class="warning">⚠ Not supported on AWS Polly neural voices. Use prosody adjustments instead.</div>
    </article>

    <article class="tag-card" id="say-as">
      <h3><code>&lt;say-as&gt;</code> — Interpret As</h3>
      <p>Control how numbers, dates, and other text types are spoken.</p>
      <div class="attrs">
        <div class="attr"><code>interpret-as</code> — <code>"cardinal"</code>, <code>"ordinal"</code>, <code>"characters"</code>, <code>"spell-out"</code>, <code>"telephone"</code>, <code>"date"</code>, <code>"time"</code>, <code>"currency"</code>, <code>"unit"</code></div>
        <div class="attr"><code>format</code> — Date format: <code>"mdy"</code>, <code>"dmy"</code>, <code>"ymd"</code>, <code>"md"</code>, <code>"dm"</code>, <code>"ym"</code>, <code>"my"</code></div>
      </div>
      <pre class="example">&lt;speak&gt;
  Call us at &lt;say-as interpret-as="telephone"&gt;+1-555-867-5309&lt;/say-as&gt;.
  Your order number is &lt;say-as interpret-as="characters"&gt;AB123&lt;/say-as&gt;.
  The date is &lt;say-as interpret-as="date" format="mdy"&gt;03/06/2026&lt;/say-as&gt;.
&lt;/speak&gt;</pre>
    </article>

    <article class="tag-card" id="phoneme">
      <h3><code>&lt;phoneme&gt;</code> — Pronunciation</h3>
      <p>Specify exact pronunciation using IPA (International Phonetic Alphabet).</p>
      <div class="attrs">
        <div class="attr"><code>alphabet</code> — <code>"ipa"</code> or <code>"x-sampa"</code></div>
        <div class="attr"><code>ph</code> — Phonetic transcription</div>
      </div>
      <pre class="example">&lt;speak&gt;
  The word &lt;phoneme alphabet="ipa" ph="pɪˈkɑːn"&gt;pecan&lt;/phoneme&gt;
  is pronounced differently across regions.
&lt;/speak&gt;</pre>
      <div class="warning">⚠ Not supported by Edge TTS.</div>
    </article>

    <article class="tag-card" id="sub">
      <h3><code>&lt;sub&gt;</code> — Substitution</h3>
      <p>Replace the displayed text with a different spoken form.</p>
      <div class="attrs">
        <div class="attr"><code>alias</code> — The text to speak instead</div>
      </div>
      <pre class="example">&lt;speak&gt;
  &lt;sub alias="World Wide Web Consortium"&gt;W3C&lt;/sub&gt; published the standard.
  The temperature is 72&lt;sub alias="degrees Fahrenheit"&gt;°F&lt;/sub&gt;.
&lt;/speak&gt;</pre>
    </article>

    <article class="tag-card" id="lang">
      <h3><code>&lt;lang&gt;</code> — Language</h3>
      <p>Switch the language for a portion of the text.</p>
      <div class="attrs">
        <div class="attr"><code>xml:lang</code> — BCP-47 code: <code>"en-US"</code>, <code>"fr-FR"</code>, <code>"de-DE"</code>, <code>"ja-JP"</code></div>
      </div>
      <pre class="example">&lt;speak&gt;
  The French word &lt;lang xml:lang="fr-FR"&gt;bonjour&lt;/lang&gt;
  means hello.
&lt;/speak&gt;</pre>
      <div class="warning">⚠ Not supported by Google Cloud TTS.</div>
    </article>
  </section>

  <section>
    <h2>The <code>&lt;speak&gt;</code> Root Element</h2>
    <p>All SSML must be wrapped in a <code>&lt;speak&gt;</code> root element. Vokda's editor adds this automatically when you switch to SSML mode.</p>
    <pre class="example">&lt;speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xml:lang="en-US"&gt;
  Your SSML content goes here.
&lt;/speak&gt;</pre>
    <div class="tip">If you omit the <code>&lt;speak&gt;</code> wrapper, the validation bar will show a warning and the API will wrap it for you automatically.</div>
  </section>

  <section>
    <h2>Provider Extensions</h2>
    <p>Some providers support proprietary SSML extensions beyond the W3C standard:</p>

    <h3>Amazon Polly</h3>
    <ul>
      <li><code>&lt;amazon:breath&gt;</code> — Insert breathing sounds</li>
      <li><code>&lt;amazon:auto-breaths&gt;</code> — Automatic breathing</li>
      <li><code>&lt;amazon:effect name="whispered"&gt;</code> — Whisper effect</li>
      <li><code>&lt;amazon:domain name="news"&gt;</code> — Newscaster style</li>
    </ul>

    <h3>Azure Speech</h3>
    <ul>
      <li><code>&lt;mstts:express-as&gt;</code> — Style control (cheerful, sad, angry, etc.)</li>
      <li><code>&lt;mstts:silence&gt;</code> — Fine-grained silence control</li>
      <li><code>&lt;mstts:viseme&gt;</code> — Lip-sync data</li>
    </ul>

    <div class="tip">Vokda's validator treats unknown tags as <strong>warnings, not errors</strong> — so provider extensions won't block synthesis.</div>
  </section>

  <section>
    <h2>Best Practices</h2>
    <ol class="best-practices">
      <li><strong>Start simple.</strong> Add one tag at a time. Test after each change.</li>
      <li><strong>Use <code>&lt;break&gt;</code> generously.</strong> Pauses improve naturalness more than any other tag.</li>
      <li><strong>Prefer named values.</strong> <code>rate="slow"</code> is more portable than <code>rate="80%"</code>.</li>
      <li><strong>Check the provider.</strong> The toolbar dims unsupported tags. Using them won't error — but they'll be ignored.</li>
      <li><strong>Keep it readable.</strong> SSML is XML — mismatched tags cause errors. The validation bar catches these in real-time.</li>
      <li><strong>Test with the target voice.</strong> Different voices respond differently to the same SSML. Polly neural handles prosody differently than standard.</li>
    </ol>
  </section>

  <section>
    <h2>Further Reading</h2>
    <div class="link-grid">
      <a href="https://www.w3.org/TR/speech-synthesis11/" target="_blank" rel="noopener">W3C SSML Spec ↗</a>
      <a href="https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html" target="_blank" rel="noopener">AWS Polly SSML ↗</a>
      <a href="https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup" target="_blank" rel="noopener">Azure SSML ↗</a>
      <a href="https://cloud.google.com/text-to-speech/docs/ssml" target="_blank" rel="noopener">Google Cloud SSML ↗</a>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1rem 4rem;
  }
  .breadcrumb {
    font-size: var(--text-small); color: #5a7a90; margin-bottom: 0.25rem;
  }
  .breadcrumb a { color: var(--brand-600); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb span { margin: 0 0.25rem; }

  h1 { font-size: var(--text-display); margin: 0 0 0.25rem; }
  .subtitle { color: #4a6a82; margin: 0 0 1rem; }
  h2 { font-size: 1.2rem; font-weight: 760; color: #0e2233; margin: 2rem 0 0.4rem; }
  h3 { font-size: var(--text-body); font-weight: 720; color: #173046; margin: 1rem 0 0.3rem; }
  section p { color: #3e5972; line-height: 1.6; margin: 0.4rem 0; }
  section p a, section ul a { color: var(--brand-600); }
  section ul, section ol { color: #3e5972; line-height: 1.7; padding-left: 1.2rem; }

  .intro { margin-top: 0; }

  .tip {
    padding: 0.6rem 0.85rem;
    border-left: 3px solid var(--brand-600);
    background: #f0f8fb;
    border-radius: 0 10px 10px 0;
    font-size: var(--text-small);
    color: #2c4b60;
    margin: 0.75rem 0;
    line-height: 1.5;
  }
  .warning {
    padding: 0.4rem 0.7rem;
    border-left: 3px solid #f9a825;
    background: #fffde7;
    border-radius: 0 8px 8px 0;
    font-size: var(--text-xs);
    color: #5d4037;
    margin: 0.5rem 0;
  }

  /* Compatibility table */
  .table-scroll { overflow-x: auto; }
  table {
    width: 100%; border-collapse: collapse;
    font-size: var(--text-small); margin: 0.5rem 0;
  }
  th {
    text-align: left; padding: 0.45rem 0.6rem;
    background: #f3f7fa; color: #2c4b60; font-weight: 700;
    border-bottom: 2px solid #d6e2ec; white-space: nowrap;
  }
  td {
    padding: 0.4rem 0.6rem; border-bottom: 1px solid #eef4f8;
    color: #3e5972; text-align: center;
  }
  td:first-child { text-align: left; }
  .table-note { font-size: var(--text-xs); color: #5a7a90; margin: 0.25rem 0; }

  /* Tag cards */
  .tag-card {
    padding: 0.85rem 1rem;
    border: 1px solid #d6e2ec;
    border-radius: 14px;
    background: #fff;
    margin: 0.75rem 0;
    scroll-margin-top: 4rem;
  }
  .tag-card h3 {
    font-size: var(--text-body);
    margin: 0 0 0.3rem;
  }
  .tag-card > p { font-size: var(--text-small); margin: 0 0 0.4rem; }

  .attrs { display: grid; gap: 0.2rem; margin: 0.4rem 0; }
  .attr {
    font-size: var(--text-xs); color: #3e5972;
    padding: 0.25rem 0.5rem;
    background: #f8fbfd; border-radius: 6px;
  }

  code {
    background: #eef4f8; color: #173046;
    padding: 0.05rem 0.25rem; border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85em;
  }
  .example {
    background: #0e2233; color: #c8dce8;
    padding: 0.7rem 0.85rem; border-radius: 10px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.75rem; line-height: 1.6;
    overflow-x: auto; white-space: pre; margin: 0.4rem 0;
  }

  .best-practices li { margin-bottom: 0.3rem; }

  .link-grid {
    display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem;
  }
  .link-grid a {
    font-size: var(--text-small); font-weight: 640;
    color: var(--brand-600); background: #f3f7fa;
    border: 1px solid #d6e2ec; border-radius: 10px;
    padding: 0.4rem 0.7rem; text-decoration: none;
  }
  .link-grid a:hover { background: #e8f0f6; border-color: var(--brand-600); }
</style>
