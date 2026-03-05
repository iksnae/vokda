# Vokda API

> Current state: admin API scaffolded, synthesis is mock. See [ARCHITECTURE.md](./ARCHITECTURE.md) for context.

---

## Discovery Track APIs

### Catalog (public)

```
GET /voices
  ?provider=elevenlabs
  ?language=en-US
  ?sourceType=cloud_provider|local_model|hf_model
  ?tier=basic|standard|premium
  ?tags=narration,assistant
  ?q=<search>
  ?limit=50&offset=0

GET /voices/:voiceId
GET /voices/:voiceId/samples
GET /voices/:voiceId/variants
```

### Collections (authenticated — guest+)

```
GET  /collections
POST /collections
GET  /collections/:id
PUT  /collections/:id
DELETE /collections/:id

POST /collections/:id/voices         — add voice
DELETE /collections/:id/voices/:id   — remove voice
GET  /collections/:id/export         — download Voice Pack JSON
POST /collections/:id/share          — generate public share link (future)
```

### Synthesis (authenticated — guest+)

```
POST /synthesize
  body: { voiceId, variantId, text, format?, ssml? }
  returns: audio/mpeg stream
```

Rate limited per tier. Cloud provider credentials proxied server-side — users never touch API keys.

---

## Hub Track APIs

### News Feed

```
GET /news
  ?topic=release|research|benchmark|product
  ?provider=openai|elevenlabs|...
  ?limit=20&cursor=<cursor>

GET /news/:id
POST /news (admin — add curated item)
```

### Model Registry

```
GET /models
  ?provider=...
  ?status=active|deprecated|preview

GET /models/:id
GET /models/:id/changelog

GET /providers
GET /providers/:id
GET /providers/:id/voices
```

### Reviews

```
GET /voices/:id/reviews
POST /voices/:id/reviews  (curator+)
PUT  /voices/:id/reviews/:reviewId (own review only)

GET /voices/:id/ratings   — aggregated scores
```

---

## Admin APIs

```
GET  /v1/admin/users?email=<email>
POST /v1/admin/users/roles        — set Cognito group

POST /v1/admin/ingest/run         — trigger provider sync
POST /v1/admin/samples/regenerate — regenerate audio for voice(s)
POST /v1/admin/voices             — add voice manually
PUT  /v1/admin/voices/:id         — update voice metadata
DELETE /v1/admin/voices/:id       — remove voice from catalog

POST /v1/admin/news               — add curated news item
PUT  /v1/admin/news/:id
DELETE /v1/admin/news/:id
```

---

## Webhooks (future)

```
POST /webhooks/subscribe
  events: new_voice | model_release | provider_update
  url: <callback>
```

---

## Notes

- All public catalog endpoints are unauthenticated
- Synthesis requires `guest` tier or higher
- Admin endpoints require `admin` group claim in Cognito JWT
- Audio samples served directly from CDN (not through API) once CDN is set up
