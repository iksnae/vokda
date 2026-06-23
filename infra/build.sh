#!/usr/bin/env bash
# Pre-build script: copies shared assets into Lambda function dirs before sam build.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📦 Copying voices.json into synthesis-router..."
mkdir -p "$SCRIPT_DIR/functions/synthesis-router/data"
cp "$REPO_ROOT/apps/web/static/data/voices.json" \
   "$SCRIPT_DIR/functions/synthesis-router/data/voices.json"

echo "📦 Copying audio-duration.mjs into synthesis-worker..."
cp "$SCRIPT_DIR/functions/synthesis-router/lib/audio-duration.mjs" \
   "$SCRIPT_DIR/functions/synthesis-worker/audio-duration.mjs"

echo "✅ Pre-build complete. Run: sam build && sam deploy"
