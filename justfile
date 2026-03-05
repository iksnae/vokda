# Vokda — Voice Discovery & Curation App
# SvelteKit + TypeScript + AWS Amplify Gen2

# ============================================================================
# Development
# ============================================================================

# Start SvelteKit dev server
dev:
  npm run dev:web

# Start admin API server
api:
  npm run dev:api

# Start both dev server and API
dev-all:
  #!/usr/bin/env bash
  trap 'kill 0' EXIT
  npm run dev:api &
  npm run dev:web &
  wait

# Install all dependencies
install:
  npm install

# ============================================================================
# Quality
# ============================================================================

# Run typecheck (svelte-check)
check:
  npm run check:web

# Build for production
build:
  npm run build:web

# Run lint (when configured)
lint:
  npm run lint

# Run tests (when configured)
test:
  npm run test

# Full verification pipeline
verify: check build

# ============================================================================
# Amplify
# ============================================================================

# Start Amplify sandbox (personal AWS account)
sandbox:
  . ./switch-aws-env.sh personal && npx ampx sandbox

# Generate Amplify outputs
outputs:
  . ./switch-aws-env.sh personal && npx ampx generate outputs --format json --out-dir .

# Deploy Amplify backend
amplify-deploy:
  . ./switch-aws-env.sh personal && npx ampx pipeline-deploy --branch main

# ============================================================================
# Code Quality Checks
# ============================================================================

# Check for console.log in source
check-logs:
  @echo "Checking for console.log in source..."
  @grep -rn "console\.log" apps/web/src/lib/ apps/web/src/routes/ 2>/dev/null && echo "⚠ Found console.log statements" || echo "✓ No console.log in source"

# Check for 'any' type usage
check-any:
  @echo "Checking for 'any' type usage..."
  @grep -rn ": any\b\|as any\b\|<any>" apps/web/src/ --include="*.ts" --include="*.svelte" 2>/dev/null && echo "⚠ Found 'any' usage (review per TS constitution)" || echo "✓ No 'any' found"

# Check for empty catch blocks
check-catches:
  @echo "Checking for empty catch blocks..."
  @grep -rn "catch\s*{" apps/web/src/ apps/api/src/ --include="*.ts" --include="*.mjs" --include="*.svelte" 2>/dev/null && echo "⚠ Found potentially empty catch blocks" || echo "✓ No empty catch blocks"

# Validate catalog JSON
check-catalog:
  @echo "Validating voices.json..."
  @node -e "const d=require('./apps/web/static/data/voices.json'); console.log('✓ ' + d.voices.length + ' voices, all valid JSON')"

# Run all quality checks
quality: check-logs check-any check-catches check-catalog

# ============================================================================
# Agent Tools
# ============================================================================

# Default pi
pi:
  pi

# Pi with damage control safety
pi-safe:
  pi -e extensions/damage-control.ts -e extensions/minimal.ts -e extensions/theme-cycler.ts

# Pi with agent team
pi-team:
  pi -e extensions/agent-team.ts -e extensions/theme-cycler.ts

# Claude with full capabilities
cld:
  claude --model opus --dangerously-skip-permissions

# Codex with full autonomy
cdx:
  codex --dangerously-bypass-approvals-and-sandbox

# ============================================================================
# Git
# ============================================================================

# Show project status
status:
  @echo "Vokda Project Status"
  @echo "━━━━━━━━━━━━━━━━━━━━"
  @echo ""
  @echo "Git:"
  @git branch --show-current
  @git status --short
  @echo ""
  @echo "Recent commits:"
  @git log -5 --oneline
  @echo ""
  @echo "Catalog: $(node -e "console.log(require('./apps/web/static/data/voices.json').voices.length)") voices"

# ============================================================================
# Utility
# ============================================================================

# List all recipes
recipes:
  @just --list

# Show help
help:
  @echo "Vokda — Voice Discovery & Curation App"
  @echo ""
  @echo "Development:"
  @echo "  just dev               SvelteKit dev server"
  @echo "  just api               Admin API server"
  @echo "  just dev-all           Both servers"
  @echo "  just install           Install dependencies"
  @echo ""
  @echo "Quality:"
  @echo "  just check             Typecheck (svelte-check)"
  @echo "  just build             Production build"
  @echo "  just verify            Full check + build"
  @echo "  just quality           Code quality checks"
  @echo ""
  @echo "Amplify:"
  @echo "  just sandbox           Start Amplify sandbox"
  @echo "  just outputs           Regenerate Amplify outputs"
  @echo ""
  @echo "Agents:"
  @echo "  just pi                Default pi session"
  @echo "  just pi-safe           Pi with damage control"
  @echo "  just cld               Claude Code"
  @echo "  just cdx               Codex"
  @echo ""
  @echo "Info:"
  @echo "  just status            Project status"
  @echo "  just recipes           List all recipes"
