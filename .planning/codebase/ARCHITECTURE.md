# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Reactive serverless full-stack with event-driven AI jobs

**Key Characteristics:**
- Convex is the entire backend — no separate REST API server; all data access is via Convex queries/mutations/actions called directly from React components
- Frontend is Next.js App Router (React Server Components by default, `'use client'` only where needed)
- All persistent state lives in Convex; client state (UI toggles, viewer controls) lives in component state or Zustand
- Real-time reactivity is automatic: `useQuery` hooks auto-refresh when backend data changes — no polling, no manual cache invalidation
- AI features are fully asynchronous via a job queue pattern; the UI auto-updates when jobs complete

## Layers

**Presentation Layer (Next.js pages + React components):**
- Purpose: Render UI, handle user interactions, compose Convex hooks
- Location: `src/app/`, `src/components/`
- Contains: Page components, layout wrappers, UI primitives, feature components
- Depends on: Convex hooks (`useQuery`, `useMutation`, `useAction`), custom hooks in `src/hooks/`, `src/lib/utils.ts`
- Used by: Vercel edge network (end users)

**Custom Hook Layer:**
- Purpose: Encapsulate Convex data access patterns per domain so pages stay clean
- Location: `src/hooks/`
- Contains: `useTour.ts`, `useViewer.ts`, `useAI.ts`, `useBuilding.ts`, `useDashboard.ts`, `useOnboarding.ts`
- Depends on: Convex `api.*` references from `convex/_generated/api`
- Used by: Page and feature components in `src/app/` and `src/components/`

**Convex Query/Mutation Layer:**
- Purpose: Typed, authenticated data reads and transactional writes to the Convex database
- Location: `convex/*.ts` (excluding `aiActions.ts`, `http.ts`)
- Contains: `tours.ts`, `scenes.ts`, `hotspots.ts`, `leads.ts`, `analytics.ts`, `subscriptions.ts`, `users.ts`, `buildings.ts`, etc.
- Depends on: `convex/schema.ts`, `convex/_generated/server`, internal helpers
- Used by: Frontend hooks via `useQuery`/`useMutation`, and Convex actions via `ctx.runQuery`/`ctx.runMutation`

**Convex Action Layer (AI + External APIs):**
- Purpose: Call external APIs (OpenAI, Replicate, Stripe). Actions are NOT transactional and CANNOT directly call DB — they use `ctx.runQuery`/`ctx.runMutation` as bridges
- Location: `convex/aiActions.ts`
- Contains: `analyzeScene`, `generateStaging`, `generateDescription`, `generateFloorPlan`
- Depends on: OpenAI API, Replicate API, `internal.*` mutations to persist results
- Used by: Frontend via `useAction(api.aiActions.*)` calls

**Convex HTTP Action Layer (Webhooks + Public API):**
- Purpose: Handle inbound webhooks and serve a lightweight public REST API for embeds
- Location: `convex/http.ts`
- Contains: Stripe webhook handler (`/stripe-webhook`), Clerk webhook handler (`/clerk-webhook`), public tour API (`GET /api/tour`), analytics tracking (`POST /api/analytics`), lead capture (`POST /api/leads`), building API (`GET /api/building`, `POST /api/building-analytics`)
- Depends on: `internal.*` mutations and `api.*` queries
- Used by: Stripe, Clerk (webhooks); embedded tour iframes (public API)

**Convex Schema (Data Model):**
- Purpose: Single source of truth for all database table definitions, field types, and indexes
- Location: `convex/schema.ts`
- Contains: 22 tables — users, tours, scenes, hotspots, floorPlans, leads, analytics, dailyAnalytics, activityLog, subscriptions, teamMembers, aiJobs, buildings, buildingBlocks, viewPositions, exteriorPanoramas, buildingUnits, conversionJobs, buildingAnalytics, blogPosts, consents, demoTours, pricingPlans, newsletterSubscriptions, notifications, contactSubmissions
- Depends on: Nothing (leaf node)
- Used by: All Convex functions and `convex/_generated/dataModel` (TypeScript types)

**Next.js API Routes (minimal):**
- Purpose: Handle operations that cannot go through Convex — currently only local dev image proxying
- Location: `src/app/api/`
- Contains: `src/app/api/proxy-image/route.ts` (proxies Convex local dev storage to fix cross-origin issues for Three.js), `src/app/api/webhooks/stripe/route.ts` (legacy — primary webhook handler is in `convex/http.ts`)
- Depends on: Next.js `NextRequest`/`NextResponse`
- Used by: `src/app/tour/[slug]/page.tsx` viewer (local dev only)

## Data Flow

**Tour Viewing (Public Visitor):**

1. Visitor opens `spazeo.io/tour/[slug]`
2. `src/app/tour/[slug]/page.tsx` (`'use client'`) calls `useQuery(api.tours.getBySlug, { slug })`
3. Convex query fetches tour + scenes + hotspot data and resolves `imageStorageId` → signed URL via `ctx.storage.getUrl()`
4. `PanoramaViewer` (`src/components/viewer/PanoramaViewer.tsx`) renders equirectangular image inside a Three.js sphere using `@react-three/fiber` + `OrbitControls`
5. `HotspotMarker` components are placed in 3D space; clicks trigger `setActiveSceneId()` client-side (no round-trip)
6. `useMutation(api.analytics.track)` fires on scene changes and tour load
7. Lead capture form calls `useMutation(api.leads.capture)` on submit

**Tour Creation (Authenticated Dashboard):**

1. User calls `useMutation(api.tours.create)` from the tour list page
2. Mutation checks `ctx.auth.getUserIdentity()` → looks up user by `clerkId` → enforces plan tour limits
3. User uploads scenes via 3-step pattern: `generateUploadUrl()` → `fetch(uploadUrl, { body: file })` → `useMutation(api.scenes.create, { imageStorageId })`
4. Optional: user triggers `useAction(api.aiActions.analyzeScene)` which creates an `aiJob` record (pending) → calls OpenAI → updates scene with analysis via `ctx.runMutation`
5. User publishes: `useMutation(api.tours.publish)` validates scenes exist, sets status, generates embed code
6. Tour is live at `spazeo.io/tour/[slug]`

**AI Job Flow:**

1. Frontend calls `useAction(api.aiActions.analyzeScene)` (or staging/description variants)
2. Action checks credits via `ctx.runQuery(internal.aiHelpers.checkCredits)`
3. Action creates `aiJob` record (pending) via `ctx.runMutation(internal.aiHelpers.createJob)`
4. Action calls external API (OpenAI/Replicate) directly
5. On success, action calls `ctx.runMutation(internal.scenes.updateAiAnalysis)` to persist result
6. Frontend `useQuery` watching the scene auto-updates — no polling needed

**Billing Flow:**

1. User selects plan → frontend calls Stripe Checkout endpoint
2. On payment, Stripe sends webhook to `convex/http.ts` → `/stripe-webhook`
3. HTTP action verifies Stripe signature → `ctx.runMutation(internal.subscriptions.upsertFromStripe)` updates subscription record
4. `ctx.runMutation(internal.subscriptions.syncPlanToUser)` updates user plan field
5. All `useQuery` calls watching user/subscription data auto-refresh

**Authentication Flow:**

1. `ClerkProvider` (inside `ConvexClientProvider`) manages session JWT
2. `ConvexProviderWithClerk` injects Clerk JWT into every Convex request
3. Every Convex function calls `ctx.auth.getUserIdentity()` to verify — throws if unauthenticated
4. User records are created/updated via Clerk webhook → `convex/http.ts` → `/clerk-webhook` → `internal.users.upsertFromClerk`
5. `middleware.ts` enforces route protection at the Next.js edge layer before React renders

**State Management:**

- **Server/persistent state:** Convex DB, accessed reactively via `useQuery`
- **Client/ephemeral state:** React `useState` for UI (modals, form state, viewer controls); Zustand for cross-component viewer state
- **No Redux, no manual fetch, no SWR** — Convex handles all data synchronization

## Key Abstractions

**Convex Query (reactive read):**
- Purpose: Fetch data that auto-refreshes when backend changes
- Examples: `convex/tours.ts` → `list`, `getById`, `getBySlug`; `convex/analytics.ts` → `getDashboard`
- Pattern: `export const list = query({ args: {...}, handler: async (ctx, args) => { ... } })`

**Convex Mutation (transactional write):**
- Purpose: Write to DB with auth enforcement and plan limit checks
- Examples: `convex/tours.ts` → `create`, `publish`, `duplicate`; `convex/leads.ts` → `capture`
- Pattern: Auth check via `getAuthUser(ctx)` at top of every handler; throws on failure

**Convex Action (external API bridge):**
- Purpose: Call OpenAI/Replicate/Stripe; bridge results back to DB via `ctx.runMutation`
- Examples: `convex/aiActions.ts` → `analyzeScene`, `generateStaging`
- Pattern: Check credits → create job (pending) → call external API → persist result → return

**HTTP Action (webhook endpoint):**
- Purpose: Handle raw HTTP requests from third-party services
- Examples: `convex/http.ts` → `/stripe-webhook`, `/clerk-webhook`, `/api/tour`
- Pattern: Verify signature → `ctx.runMutation(internal.*)` → return HTTP Response

**Custom Hook:**
- Purpose: Wrap Convex hooks behind domain-specific function names; keep pages thin
- Examples: `src/hooks/useTour.ts` → `useTourList`, `useTourById`, `useTourMutations`; `src/hooks/useViewer.ts`
- Pattern: Named export functions that call `useQuery(api.domain.action, args)`

**AI Job Record:**
- Purpose: Track async AI processing state so frontend can react when done
- Location: `aiJobs` table in `convex/schema.ts`
- Pattern: Insert as `pending` → set to `processing` → set to `completed`/`failed` with `output` field populated

## Entry Points

**Public Landing (`/`):**
- Location: `src/app/page.tsx`
- Triggers: Direct URL access, marketing links
- Responsibilities: Render marketing landing page with `src/components/landing/` sections

**Public Tour Viewer (`/tour/[slug]`):**
- Location: `src/app/tour/[slug]/page.tsx`
- Triggers: Published tour URL shared by real estate agent
- Responsibilities: Load tour data reactively, render 360° panorama, handle scene navigation, collect leads, track analytics

**Dashboard (protected, `/dashboard`):**
- Location: `src/app/(dashboard)/dashboard/page.tsx` + `src/app/(dashboard)/layout.tsx`
- Triggers: Authenticated user navigating to `/dashboard`
- Responsibilities: Show stats, recent tours, activity feed; render `DashboardLayoutClient` with sidebar

**Convex HTTP Router:**
- Location: `convex/http.ts`
- Triggers: Stripe/Clerk webhook POSTs, embedded tour API calls
- Responsibilities: Verify signatures, bridge to mutations

**Next.js Middleware:**
- Location: `middleware.ts`
- Triggers: Every non-static request
- Responsibilities: Protect `/dashboard/*`, `/tours/*`, `/analytics/*`, `/leads/*`, `/settings/*`, `/billing/*`, `/onboarding/*` — redirects unauthenticated to Clerk sign-in

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All page renders
- Responsibilities: Mount `ConvexClientProvider` (Clerk + Convex), `PostHogProvider`, global `Toaster`, `CookieConsent`

## Error Handling

**Strategy:** Throw errors in Convex functions; catch in frontend with `try/catch` + `toast.error()`

**Patterns:**
- Convex mutations throw `new Error('Not authenticated')` when `getUserIdentity()` returns null — Convex SDK surfaces this to the frontend as a rejected promise
- Convex mutations throw `new Error('Tour not found')` / `new Error('Not authorized')` on ownership violations
- Plan limit errors throw with user-readable messages: `Tour limit reached. Your ${plan} plan allows ${limit} active tours.`
- AI actions: on external API failure, update job status to `failed` with `error` field; frontend reads job status reactively
- Webhook handlers: return `400` on missing/invalid signature; `500` on processing errors
- PanoramaViewer: React error boundary (`PanoramaErrorBoundary` class component in `src/components/viewer/PanoramaViewer.tsx`) catches render errors and shows fallback UI

## Cross-Cutting Concerns

**Logging:** `console.error` in Convex actions and HTTP handlers (appears in Convex dashboard logs); PostHog for product analytics (`src/components/providers/PostHogProvider.tsx`)

**Validation:** Convex schema validators (`v.string()`, `v.union(...)`, etc.) enforce types at DB layer; input validation in mutation handlers (e.g., checking ownership before writes)

**Authentication:** Every Convex function calls `ctx.auth.getUserIdentity()` at the start; middleware protects dashboard routes at the Next.js edge; `ConvexClientProvider` gracefully degrades to passthrough when env vars are absent (dev mode)

**Plan Enforcement:** `TOUR_LIMITS` constant in `convex/tours.ts` maps plan → tour count limit; checked in `create` and `duplicate` mutations; AI credit limits checked in `convex/aiHelpers.ts` before every action

**File Uploads:** All file data goes directly to Convex storage via 3-step upload — never passed through mutations as binary. Storage IDs (not URLs) are persisted; URLs are resolved at query time via `ctx.storage.getUrl()`

**Scheduled Jobs:** `convex/crons.ts` — daily analytics rollup at 02:00 UTC; monthly AI credit reset on 1st of month

---

*Architecture analysis: 2026-03-09*
