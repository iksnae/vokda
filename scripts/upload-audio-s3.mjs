#!/usr/bin/env node
/**
 * upload-audio-s3.mjs — Uploads audio samples to S3 and updates voice audioUrls.
 *
 * Usage:
 *   node scripts/upload-audio-s3.mjs [--dry-run]
 *
 * Reads:
 *   - apps/web/static/audio/samples/*.mp3
 *   - amplify_outputs.json (for bucket name)
 *
 * Uploads to:
 *   s3://{bucket}/catalog/{voiceId}.mp3
 *
 * Idempotent: skips files that already exist with matching size.
 * Also uploads voice profile images and OG images.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const DRY_RUN = process.argv.includes('--dry-run');
const AUDIO_ONLY = process.argv.includes('--audio-only');
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

// ─── Config ───

function loadConfig() {
  if (!existsSync('amplify_outputs.json')) {
    console.error('❌ amplify_outputs.json not found.');
    process.exit(1);
  }
  const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'));
  const bucket = outputs.storage?.bucket_name;
  if (!bucket) {
    console.error('❌ No storage bucket in amplify_outputs.json');
    process.exit(1);
  }
  return { bucket, region: outputs.storage?.aws_region || REGION };
}

const config = loadConfig();
const s3 = new S3Client({ region: config.region });

// ─── Upload helpers ───

async function objectExists(key, expectedSize) {
  try {
    const head = await s3.send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    return head.ContentLength === expectedSize;
  } catch {
    return false;
  }
}

async function uploadFile(localPath, s3Key, contentType) {
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: s3Key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

// ─── Upload a directory of files ───

async function uploadDirectory(localDir, s3Prefix, contentType, ext) {
  if (!existsSync(localDir)) {
    console.log(`  ⏭ ${localDir} not found, skipping`);
    return { uploaded: 0, skipped: 0 };
  }

  const files = readdirSync(localDir).filter(f => f.endsWith(ext));
  let uploaded = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const localPath = `${localDir}/${file}`;
    const s3Key = `${s3Prefix}/${file}`;
    const size = statSync(localPath).size;

    // Check if already uploaded with same size
    const exists = await objectExists(s3Key, size);
    if (exists) {
      skipped++;
    } else if (DRY_RUN) {
      skipped++;
    } else {
      await uploadFile(localPath, s3Key, contentType);
      uploaded++;
    }

    if ((i + 1) % 50 === 0 || i === files.length - 1) {
      process.stdout.write(`  ${i + 1}/${files.length} (${uploaded} new, ${skipped} existing)\r`);
    }
  }

  console.log(`  ${files.length} files: ${uploaded} uploaded, ${skipped} skipped`);
  return { uploaded, skipped };
}

// ─── Main ───

async function main() {
  console.log(`🪣 Bucket: ${config.bucket}`);
  console.log(`📍 Region: ${config.region}`);
  if (DRY_RUN) console.log('🏃 Dry run — no uploads');
  console.log();

  // 1. Audio samples
  console.log('🎵 Audio samples (catalog/audio/):');
  const audio = await uploadDirectory(
    'apps/web/static/audio/samples',
    'catalog/audio',
    'audio/mpeg',
    '.mp3'
  );

  if (!AUDIO_ONLY) {
    // 2. Voice profile images
    console.log('\n🖼️  Voice images (catalog/images/voices/):');
    const images = await uploadDirectory(
      'apps/web/static/images/voices',
      'catalog/images/voices',
      'image/jpeg',
      '.jpg'
    );

    // 3. OG images
    console.log('\n🖼️  OG images (catalog/og/voices/):');
    const og = await uploadDirectory(
      'apps/web/static/og/voices',
      'catalog/og/voices',
      'image/jpeg',
      '.jpg'
    );

    console.log(`\n✅ Total: ${audio.uploaded + images.uploaded + og.uploaded} uploaded, ${audio.skipped + images.skipped + og.skipped} skipped`);
  } else {
    console.log(`\n✅ Audio: ${audio.uploaded} uploaded, ${audio.skipped} skipped`);
  }

  // Print the base URL for env config
  const baseUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com/catalog`;
  console.log(`\n📎 Set PUBLIC_AUDIO_BASE_URL=${baseUrl}`);
  console.log('   (audio: {base}/audio/{id}.mp3, images: {base}/images/voices/{id}.jpg)');
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
