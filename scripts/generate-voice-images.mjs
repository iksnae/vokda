#!/usr/bin/env node
/**
 * Generate unique profile images (600x600 JPG) for each voice.
 * Uses ImageMagick. Each image is deterministic from voice metadata.
 */

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const OUT_DIR = join(import.meta.dirname, '..', 'apps/web/static/images/voices');
const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));
const SIZE = 600;
const QUALITY = 82;

mkdirSync(OUT_DIR, { recursive: true });

// ─── Color palettes per provider ───

const PALETTES = {
  'aws-polly':    { dark: '#4a2800', mid: '#8f5a0b', light: '#f0c68a', accent: '#d4870b' },
  'azure-speech': { dark: '#0a2a4f', mid: '#1a5fb4', light: '#a4c0e8', accent: '#3a7fd5' },
  'gcp-tts':      { dark: '#0a3a1a', mid: '#1a8a3e', light: '#93d1a0', accent: '#2eaa52' },
  elevenlabs:     { dark: '#2d0a4e', mid: '#7c3aad', light: '#c4a0e8', accent: '#9b59d0' },
  openai:         { dark: '#1a1a1a', mid: '#444444', light: '#b0b0b0', accent: '#666666' },
  kokoro:         { dark: '#3e0520', mid: '#ad1457', light: '#f48fb1', accent: '#d81b60' },
  'qwen3-tts':    { dark: '#003038', mid: '#00838f', light: '#80deea', accent: '#00acc1' },
  soprano:        { dark: '#2a0845', mid: '#7b1fa2', light: '#ce93d8', accent: '#9c27b0' },
  chatterbox:     { dark: '#0d1545', mid: '#283593', light: '#9fa8da', accent: '#3f51b5' },
  dia:            { dark: '#3e1f00', mid: '#e65100', light: '#ffcc80', accent: '#ff6d00' },
  outetts:        { dark: '#00251a', mid: '#00695c', light: '#80cbc4', accent: '#00897b' },
  'pocket-tts':   { dark: '#3e0520', mid: '#ad1457', light: '#f48fb1', accent: '#d81b60' },
  'spark-tts':    { dark: '#3e3000', mid: '#f57f17', light: '#ffe082', accent: '#ffab00' },
  voxcpm:         { dark: '#0a2e10', mid: '#2e7d32', light: '#a5d6a7', accent: '#43a047' },
  kittentts:      { dark: '#3e0530', mid: '#9b1b5a', light: '#f8a4c8', accent: '#c2185b' },
  marvis:         { dark: '#0d1150', mid: '#1a237e', light: '#7986cb', accent: '#3949ab' },
  vibevoice:      { dark: '#002a40', mid: '#01579b', light: '#4fc3f7', accent: '#0288d1' },
  bark:           { dark: '#3e1f00', mid: '#e65100', light: '#ffb74d', accent: '#ff6d00' },
  'gemini-tts':   { dark: '#0a2a50', mid: '#1967d2', light: '#669df6', accent: '#4285f4' },
  orpheus:        { dark: '#1a0a40', mid: '#4527a0', light: '#b39ddb', accent: '#7e57c2' },
  'chatterbox-turbo': { dark: '#0a2a50', mid: '#1565c0', light: '#90caf9', accent: '#1e88e5' },
  'edge-tts':     { dark: '#0a2050', mid: '#0d47a1', light: '#64b5f6', accent: '#1976d2' },
  deepgram:       { dark: '#0a300a', mid: '#1b5e20', light: '#66bb6a', accent: '#2e7d32' },
  cartesia:       { dark: '#400a0a', mid: '#b71c1c', light: '#ef9a9a', accent: '#c62828' },
  lmnt:           { dark: '#3e1f00', mid: '#e65100', light: '#ffb74d', accent: '#f57c00' },
};
const DEFAULT_PAL = { dark: '#0a2a3e', mid: '#1c5c76', light: '#7abcd0', accent: '#2a9ab5' };

const TONE_COLORS = {
  warm: '#f59e0b', friendly: '#f59e0b', cheerful: '#f59e0b',
  calm: '#3b82f6', measured: '#3b82f6', steady: '#3b82f6',
  energetic: '#f97316', animated: '#f97316', excited: '#f97316',
  confident: '#8b5cf6', authoritative: '#8b5cf6', assertive: '#8b5cf6',
  clear: '#06b6d4', professional: '#06b6d4', neutral: '#06b6d4',
  dramatic: '#ec4899', expressive: '#ec4899', vivid: '#ec4899',
  sad: '#6366f1', empathetic: '#6366f1', fearful: '#6366f1',
  angry: '#ef4444', serious: '#ef4444',
  natural: '#10b981', conversation: '#10b981', chat: '#10b981',
};

// ─── Helpers ───

function hash(s) { return createHash('md5').update(s).digest(); }
function hf(buf, off) { return ((buf[off % buf.length] << 8) | buf[(off + 1) % buf.length]) / 65535; }

function hexToRgb(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [100, 100, 100];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('');
}

function blend(c1, c2, t) {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function toneBar(tags) {
  for (const t of (tags || [])) { const c = TONE_COLORS[t.toLowerCase()]; if (c) return c; }
  return '#64748b';
}

function polyline(h, y, amp, count, w) {
  const pts = [];
  const step = w / count;
  for (let i = 0; i <= count; i++) {
    const x = Math.round(i * step);
    const v = hf(h, i * 7 + 3);
    const phase = hf(h, i * 5 + 1);
    const py = Math.round(y + Math.sin(i * 0.8 + phase * 6.28) * amp * (0.6 + 0.4 * v));
    pts.push(`${x},${py}`);
  }
  return pts.join(' ');
}

// ─── Main ───

function generateVoiceImage(voice) {
  const outPath = join(OUT_DIR, `${voice.id}.jpg`);
  if (existsSync(outPath)) return 'skip';

  const pid = voice.providerId || '';
  const pal = PALETTES[pid] || DEFAULT_PAL;
  const md = voice.metadata || {};
  const h = hash(voice.id + voice.name);
  const gender = md.genderPresentation || 'neutral';
  const age = md.agePresentation || 'adult';
  const tone0 = toneBar(md.toneTags);
  const initial = voice.name.charAt(0).toUpperCase();
  const provInitial = voice.provider.charAt(0).toUpperCase();

  // Gender-based color shift
  const genderShift = gender === 'female' ? blend(pal.mid, '#cc3366', 0.12)
    : gender === 'male' ? blend(pal.mid, '#2244aa', 0.12)
    : pal.mid;

  // Age-based waveform amplitude
  const ampMap = { young: 90, adult: 60, middle_aged: 45, old: 30 };
  const amplitude = ampMap[age] || 60;

  // Style-based waveform count
  const style = md.speakingStyle || '';
  const waveCount = style.includes('animated') || style.includes('dynamic') ? 14
    : style.includes('broadcast') || style.includes('newscast') ? 9
    : style.includes('steady') || style.includes('measured') ? 5
    : 7 + Math.round(hf(h, 0) * 5);

  // Circle position from hash (constrained to top-left quadrant)
  const cx = 85 + Math.round(hf(h, 20) * 50);
  const cy = 90 + Math.round(hf(h, 22) * 40);

  try {
    // All in one magick command (no rotation — use diagonal gradient via sparse-color)
    const drawCmds = [];

    // Waveform lines (4 layers)
    for (let layer = 0; layer < 4; layer++) {
      const yOff = 220 + layer * 50;
      const amp = amplitude * (1 - layer * 0.12);
      const lh = hash(voice.id + layer.toString());
      const wc = waveCount + layer * 2;
      const strokeColor = blend(pal.light, '#ffffff', [0.25, 0.18, 0.12, 0.08][layer]);
      const strokeW = [3.5, 2.5, 2, 1.5][layer];
      drawCmds.push(
        '-stroke', strokeColor,
        '-strokewidth', strokeW.toString(),
        '-draw', `polyline ${polyline(lh, yOff, amp, wc, SIZE)}`,
      );
    }

    const c1 = pal.dark;
    const c2 = blend(pal.dark, genderShift, 0.3);
    const c3 = blend(pal.dark, genderShift, 0.5);
    const c4 = genderShift;

    execFileSync('magick', [
      // Diagonal gradient background via sparse-color
      '-size', `${SIZE}x${SIZE}`, 'xc:black',
      '-sparse-color', 'Bilinear',
        `0,0,${c1} ${SIZE},0,${c2} 0,${SIZE},${c3} ${SIZE},${SIZE},${c4}`,

      // Waveforms
      '-fill', 'none',
      ...drawCmds,

      // Radial glow
      '(', '-size', `${SIZE}x${SIZE}`, 'radial-gradient:#ffffff10-#00000000', ')',
      '-composite',

      // Voice initial circle
      '-fill', `${pal.accent}cc`,
      '-stroke', '#ffffff33', '-strokewidth', '2.5',
      '-draw', `circle ${cx},${cy} ${cx + 48},${cy}`,
      '-fill', 'white', '-stroke', 'none',
      '-font', 'Helvetica-Bold', '-pointsize', '48',
      '-gravity', 'NorthWest',
      '-annotate', `+${cx - 15}+${cy - 22}`, initial,

      // Provider watermark
      '-fill', '#ffffff0a', '-stroke', 'none',
      '-font', 'Helvetica-Bold', '-pointsize', '240',
      '-gravity', 'SouthEast',
      '-annotate', '+10+-10', provInitial,

      // Tone accent bar (bottom)
      '(', '-size', `${SIZE}x5`, `xc:${tone0}`, ')',
      '-gravity', 'South', '-composite',

      // Vignette
      '(', '-size', `${SIZE}x${SIZE}`, 'radial-gradient:none-#00000033', ')',
      '-composite',

      // Output as optimized JPEG
      '-quality', QUALITY.toString(),
      outPath,
    ]);

    return 'ok';
  } catch (err) {
    console.error(`  FAIL: ${voice.name} — ${err.message.split('\n')[0]}`);
    return 'fail';
  }
}

function generatePlaceholder() {
  const outPath = join(OUT_DIR, 'placeholder.jpg');
  if (existsSync(outPath)) return;
  execFileSync('magick', [
    '-size', `${SIZE}x${SIZE}`, 'xc:black',
    '-sparse-color', 'Bilinear',
      `0,0,#1a3347 ${SIZE},0,#1f4060 0,${SIZE},#1f4060 ${SIZE},${SIZE},#2a5670`,
    '-fill', 'none',
    '-stroke', '#ffffff18', '-strokewidth', '3',
    '-draw', `polyline 0,380 75,320 150,360 225,300 300,350 375,280 450,330 525,270 600,320`,
    '-draw', `polyline 0,410 75,370 150,390 225,350 300,380 375,340 450,370 525,330 600,360`,
    '-fill', '#ffffff22', '-stroke', 'none',
    '-font', 'Helvetica-Bold', '-pointsize', '60',
    '-gravity', 'Center', '-annotate', '+0-20', '♪',
    '-quality', QUALITY.toString(),
    outPath,
  ]);
  console.log('  Created placeholder.jpg');
}

// ─── Run ───

console.log(`Generating voice images (${SIZE}x${SIZE} JPG, q${QUALITY})...`);
generatePlaceholder();

let ok = 0, skip = 0, fail = 0;
for (const voice of catalog.voices) {
  const result = generateVoiceImage(voice);
  if (result === 'ok') { ok++; if (ok % 20 === 0) console.log(`  ${ok} generated...`); }
  else if (result === 'skip') skip++;
  else fail++;
}

console.log(`\nDone: ${ok} generated, ${skip} skipped, ${fail} failed`);
