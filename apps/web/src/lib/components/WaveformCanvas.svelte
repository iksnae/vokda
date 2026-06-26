<script lang="ts">
  /**
   * Renders precomputed waveform peaks (BBC audiowaveform JSON) on a canvas.
   *
   * Draws interleaved min/max pairs as vertical bars — no audio decoding on the
   * client. Optional `progress` (0–1) tints the played portion. Redraws on data,
   * size, or device-pixel-ratio change for crisp rendering on retina displays.
   */
  import { onMount } from 'svelte';
  import type { Waveform } from '$lib/types';

  export let waveform: Waveform | null = null;
  export let height = 56;
  /** Playback position 0–1; the played portion uses `playedColor`. */
  export let progress = 0;
  export let color = '#b6c8d6';
  export let playedColor = '#177089';

  let canvas: HTMLCanvasElement;
  let width = 0;

  function draw() {
    if (!canvas || width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const peaks = waveform?.data;
    const count = waveform?.length ?? 0;
    if (!peaks || count === 0) return;

    const peak = (1 << ((waveform?.bits ?? 8) - 1)) - 1; // 127 for 8-bit
    const mid = height / 2;
    const playedX = progress > 0 ? width * Math.min(1, Math.max(0, progress)) : 0;

    // One bar per available horizontal slot, sampling the peaks evenly.
    const barWidth = 2;
    const gap = 1;
    const slots = Math.max(1, Math.floor(width / (barWidth + gap)));

    for (let i = 0; i < slots; i += 1) {
      const x = i * (barWidth + gap);
      const peakIndex = Math.min(count - 1, Math.floor((i / slots) * count));
      const min = peaks[peakIndex * 2] / peak; // -1..0
      const max = peaks[peakIndex * 2 + 1] / peak; // 0..1
      const top = mid - max * mid;
      const bottom = mid - min * mid;
      const barHeight = Math.max(1, bottom - top);
      ctx.fillStyle = x + barWidth <= playedX ? playedColor : color;
      ctx.fillRect(x, top, barWidth, barHeight);
    }
  }

  onMount(() => {
    const ro = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
      draw();
    });
    ro.observe(canvas.parentElement ?? canvas);
    return () => ro.disconnect();
  });

  // Redraw when inputs change.
  $: if (canvas) {
    void waveform;
    void progress;
    void color;
    void playedColor;
    draw();
  }
</script>

{#if waveform && waveform.length > 0}
  <div class="waveform" style="height: {height}px">
    <canvas bind:this={canvas} style="height: {height}px" aria-hidden="true"></canvas>
  </div>
{/if}

<style>
  .waveform {
    width: 100%;
    display: block;
  }
  canvas {
    width: 100%;
    display: block;
  }
</style>
