---
description: Build, typecheck, or verify the Vokda app
argument-hint: [target: check|build|dev|api]
---

# Build & Verify

## Targets

### check
Run typecheck and Svelte diagnostics:
```bash
npm run check:web
```

### build
Production build (static adapter output to `apps/web/build/`):
```bash
npm run build:web
```

### dev
Start the SvelteKit dev server:
```bash
npm run dev:web
```

### api
Start the admin API server:
```bash
npm run dev:api
```

### all
Run full verification pipeline:
```bash
npm run check:web && npm run build:web
```

## Target
$ARGUMENTS
