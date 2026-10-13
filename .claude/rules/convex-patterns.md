---
paths:
  - "convex/**"
  - "src/**"
---

## Convex Backend (Core Concepts)

Convex is the entire backend — database, API server, file storage, and job scheduler.

### Function Types

| Type | Use For | Key Rule |
|---|---|---|
| **Query** | Reading data (reactive — auto-updates clients) | NO side effects, NO external APIs, pure reads only |
| **Mutation** | Writing data (transactional, auto-rollback on failure) | Can read/write DB, CANNOT call external APIs |
| **Action** | External APIs (OpenAI, Replicate, Stripe, Resend) | NOT transactional; must use `runQuery`/`runMutation` for DB |
| **HTTP Action** | Webhooks, public API endpoints | Raw HTTP request/response |
| **Cron Job** | Scheduled tasks (analytics rollup, cleanup) | Defined in `convex/crons.ts` |

### Frontend Usage

```ts
// Reading data (reactive — auto-refreshes)
const tours = useQuery(api.tours.list, { userId })

// Writing data
const createTour = useMutation(api.tours.create)

// Triggering actions (AI, external APIs)
const analyzeScene = useAction(api.ai.analyzeScene)
```

### Auth Pattern (Every Convex Function)

```ts
const identity = await ctx.auth.getUserIdentity()
if (!identity) throw new Error('Not authenticated')
```

### File Upload Pattern (3-Step)

```ts
// 1. Generate upload URL
const uploadUrl = await generateUploadUrl()
// 2. Upload file directly to storage
await fetch(uploadUrl, { method: 'POST', body: file })
// 3. Save storageId to document
await saveScene({ imageStorageId: storageId })
```

### AI Job Pattern

```
User triggers → Create job (status: pending) → Schedule Action →
Action calls external API → Action saves result via runMutation →
Frontend auto-updates (reactive query, no polling)
```
