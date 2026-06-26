#!/usr/bin/env bash
# Pre-build script: copies shared assets into Lambda function dirs before sam build.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📦 Copying voices.json into synthesis-router..."
mkdir -p "$SCRIPT_DIR/functions/synthesis-router/data"
cp "$REPO_ROOT/apps/web/static/data/voices.json" \
   "$SCRIPT_DIR/functions/synthesis-router/data/voices.json"

echo "📦 Copying shared .mjs helpers into synthesis-worker..."
for f in audio-duration.mjs waveform.mjs waveform-decode.mjs waveform-from-audio.mjs; do
  cp "$SCRIPT_DIR/functions/synthesis-router/lib/$f" \
     "$SCRIPT_DIR/functions/synthesis-worker/$f"
done

echo "✅ Pre-build complete. Run: sam build && sam deploy"
