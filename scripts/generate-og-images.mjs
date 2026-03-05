#!/usr/bin/env node
/**
 * Generate per-voice OG images (1200x630) for social link previews.
 * Uses ImageMagick via execFileSync to avoid shell escaping issues.
 */

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const OUT_DIR = join(import.meta.dirname, '..', 'apps/web/static/og/voices');
const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

mkdirSync(OUT_DIR, { recursive: true });

// Provider accent colors
const ACCENTS = {
  'aws-polly':    '#d4870b',
  'azure-speech': '#1a5fb4',
  'gcp-tts':      '#1a8a3e',
  elevenlabs:     '#7c3aad',
  openai:         '#555555',
  kokoro:         '#ad1457',
  'qwen3-tts':    '#00838f',
  soprano:        '#7b1fa2',
  chatterbox:     '#283593',
  dia:            '#e65100',
  outetts:        '#00695c',
  'pocket-tts':   '#ad1457',
  'spark-tts':    '#f57f17',
  voxcpm:         '#2e7d32',
};

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

let generated = 0;
let skipped = 0;

for (const voice of catalog.voices) {
  const outPath = join(OUT_DIR, `${voice.id}.png`);
  if (existsSync(outPath)) { skipped++; continue; }

  const pid = voice.providerId || '';
  const accent = ACCENTS[pid] || '#1c5c76';
  const name = truncate(voice.name, 36);
  const provider = voice.provider;
  const desc = truncate(voice.description, 110);
  const shortLabel = voice.metadata?.shortLabel || '';
  const isLocal = voice.tags?.includes('mlx');
  const tier = voice.qualityTier || '';
  const tags = (voice.metadata?.toneTags || []).slice(0, 4).join('  ·  ');
  const providerLine = `${provider}${tier ? '  ·  ' + tier : ''}${isLocal ? '  ·  local MLX' : ''}`;

  try {
    // Step 1: Create gradient background
    execFileSync('magick', [
      '-size', '1200x630', `gradient:#0b4d63-#1a7a96`, '/tmp/og-base.png'
    ]);

    // Step 2: Draw accent bar on left
    execFileSync('magick', [
      '/tmp/og-base.png',
      '(', '-size', '8x630', `xc:${accent}`, ')',
      '-gravity', 'West', '-composite',
      '/tmp/og-step1.png'
    ]);

    // Step 3: Draw provider initial circle
    execFileSync('magick', [
      '/tmp/og-step1.png',
      '(', '-size', '88x88', `xc:${accent}`,
        '-fill', 'white', '-font', 'Helvetica-Bold', '-pointsize', '40',
        '-gravity', 'Center', '-annotate', '+0+0', provider.charAt(0),
      ')',
      '-gravity', 'NorthWest', '-geometry', '+60+60', '-composite',
      '/tmp/og-step2.png'
    ]);

    // Step 4: Add all text
    execFileSync('magick', [
      '/tmp/og-step2.png',
      // Voice name
      '-fill', 'white', '-font', 'Helvetica-Bold', '-pointsize', '52',
      '-gravity', 'NorthWest', '-annotate', '+170+55', name,
      // Provider line
      '-fill', '#ffffffbb', '-font', 'Helvetica', '-pointsize', '24',
      '-annotate', '+170+120', providerLine,
      // Short label
      '-fill', '#ffffffdd', '-font', 'Helvetica', '-pointsize', '22',
      '-annotate', '+170+158', shortLabel,
      // Separator line
      '-stroke', '#ffffff44', '-strokewidth', '1',
      '-draw', 'line 170,200 1100,200',
      '-stroke', 'none',
      // Description
      '-fill', '#ffffffaa', '-font', 'Helvetica', '-pointsize', '20',
      '-annotate', '+170+220', desc,
      // Tone tags
      ...(tags ? [
        '-fill', '#ffffff77', '-font', 'Helvetica', '-pointsize', '18',
        '-annotate', '+170+260', tags,
      ] : []),
      // Vokda branding
      '-fill', '#ffffff55', '-font', 'Helvetica-Bold', '-pointsize', '20',
      '-gravity', 'SouthEast', '-annotate', '+40+30', 'vokda.iksnae.com',
      // Audio icon hint (bottom left)
      '-fill', '#ffffff44', '-font', 'Helvetica', '-pointsize', '16',
      '-gravity', 'SouthWest', '-annotate', '+170+30', '♪  Listen to audio sample',
      outPath
    ]);

    generated++;
    if (generated % 20 === 0) console.log(`  Generated ${generated}...`);
  } catch (err) {
    console.error(`Failed: ${voice.name} — ${err.stderr?.toString().split('\n')[0] || err.message}`);
  }
}

console.log(`Done: ${generated} generated, ${skipped} skipped`);
