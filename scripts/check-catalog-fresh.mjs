#!/usr/bin/env node
/**
 * CI guard: fail if the published catalog artifacts (apps/web/static/api/*,
 * sitemap, robots, .well-known) are out of sync with the source catalog
 * (apps/web/static/data/voices.json).
 *
 * The Amplify build ships the *committed* static/api files as-is — it does not
 * run publish-catalog — so editing voices.json without regenerating leaves the
 * live site/API serving stale data. This check catches that.
 *
 * How: regenerate with the SAME generatedAt the committed catalog already has
 * (so the timestamp can't cause a false diff), then check git for changes to
 * the generated paths. Any change ⇒ the committed artifacts are stale. The
 * working tree is restored either way.
 *
 * Run: node scripts/check-catalog-fresh.mjs   (also `npm run check:catalog`)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const GENERATED_PATHS = [
  'apps/web/static/api',
  'apps/web/static/sitemap.xml',
  'apps/web/static/robots.txt',
  'apps/web/static/.well-known',
];

const PUBLISHED_CATALOG = 'apps/web/static/api/v1/voices.json';

function run(cmd, env) {
  return execSync(cmd, { encoding: 'utf-8', env: env ?? process.env });
}

// Reuse the committed catalog's generatedAt so regeneration is deterministic.
const committedStamp = JSON.parse(readFileSync(PUBLISHED_CATALOG, 'utf-8')).generatedAt;
if (!committedStamp) {
  console.error(`✗ ${PUBLISHED_CATALOG} has no generatedAt — cannot run freshness check.`);
  process.exit(2);
}

run('node scripts/publish-catalog.mjs', { ...process.env, CATALOG_GENERATED_AT: committedStamp });

const changed = run(`git status --porcelain -- ${GENERATED_PATHS.join(' ')}`).trim();

// Restore the working tree regardless of the outcome.
run(`git checkout -- ${GENERATED_PATHS.join(' ')}`);

if (changed) {
  console.error('✗ Published catalog artifacts are stale (out of sync with voices.json).');
  console.error('  Regenerate and commit:  node scripts/publish-catalog.mjs');
  console.error('  Stale paths:');
  for (const line of changed.split('\n')) console.error(`    ${line.trim()}`);
  process.exit(1);
}

console.log('✓ Published catalog artifacts are in sync with voices.json.');
