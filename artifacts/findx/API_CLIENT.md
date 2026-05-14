# API Client — Architecture Decision

## Active Client: `src/lib/api.ts` (handwritten)

All pages and components import from **`src/lib/api.ts`**.

This client:
- Handles auth tokens (Supabase session)
- Shows toast notifications on 401 / 429 / 5xx / offline
- Exposes a `toastError(err, fallback)` helper for catch blocks
- Has a dedicated `exportLeads()` that returns a `Blob` (not JSON)
- Typed with the shared `src/lib/types.ts`

## Inactive Package: `@workspace/api-client-react`

This package (`lib/api-client-react/`) contains an **orval-generated** React Query
client, auto-generated from `lib/api-spec/openapi.yaml`.

**Why it is not used:** The OpenAPI spec only covers a small subset of endpoints
(health check). Expanding the spec to cover all endpoints would allow switching
to the generated client with full React Query caching support.

**If you want to migrate:**
1. Expand `lib/api-spec/openapi.yaml` to cover all endpoints
2. Run `pnpm --filter @workspace/api-spec run generate`
3. Replace imports of `src/lib/api.ts` with `@workspace/api-client-react`
4. Add `QueryClientProvider` to `main.tsx`

**For now:** The handwritten client is the source of truth. Do not add duplicate
functions to the generated client.
