# Chore: Close Data Layer Gaps

## Gaps Found

1. **`renameCollection`** — UI scaffolded (edit button, name input) on `/collections/[id]` but store function missing; never persists
2. **CartItem model** — In Amplify schema, unused everywhere (no store, data layer, or UI)  
   → Remove from schema: cart concept was replaced by collections + voice pack export
3. **CurationShelf model** — In Amplify schema, unused (no store, data layer, or UI)  
   → Wire up: shelves are curated featured voice lists (e.g. "Best for Podcasts")
4. **AdminAuditEvent model** — In Amplify schema, unused  
   → Wire up: log admin actions (role changes, provider CRUD, curation publishes)
5. **Collection voice images** — Collection cards show text avatars, should show voice profile images
6. **No `renameCollection` remote sync** — `user-library.ts` has no rename function

## Plan

### A. Store: add `renameCollection`
- Add to `app-state.ts`, sync to Amplify via `user-library.ts`

### B. Wire rename in collection detail UI
- `startEditName` → save on blur/Enter → call `renameCollection`

### C. Remove CartItem from schema
- Dead model, replaced by collections workflow

### D. Wire CurationShelf
- Data layer CRUD in `curation-workspace.ts`
- Store functions: `createShelf`, `updateShelf`, `deleteShelf`
- Surface on curation page

### E. Wire AdminAuditEvent
- Data layer: `logAuditEvent(action, targetType, targetId, payload)`
- Call from: provider CRUD, role changes (admin page), curation publishes

### F. Collection detail polish
- Show voice profile images
- Drag-to-reorder voices (store + remote sync)
