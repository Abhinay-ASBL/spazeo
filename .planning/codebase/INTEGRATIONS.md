# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**AI — Vision & NLP:**
- OpenAI GPT-4o - Scene analysis (vision), tour description generation, per-scene descriptions
  - SDK/Client: Direct `fetch` to `https://api.openai.com/v1/chat/completions`
  - Auth: `OPENAI_API_KEY` (Convex env var)
  - Called from: `convex/aiActions.ts` — `analyzeScene`, `generateDescription`, `generateSceneDescription`, `processAnalyzeScene`, `processGenerateDescription`
  - Model used: `gpt-4o`

**AI — Image Generation:**
- Replicate (Stable Diffusion) - Virtual staging and image enhancement
  - SDK/Client: Direct `fetch` to `https://api.replicate.com/v1/predictions`
  - Auth: `REPLICATE_API_TOKEN` (Convex env var), passed as `Token ${token}` header
  - Called from: `convex/aiActions.ts` — `stageScene`, `enhanceImage`, `processStageScene`, `processEnhanceImage`
  - Model versions hardcoded: staging `db21e45d3f7023...`, enhancement `42fed1c497414...`
  - Uses polling pattern: prediction created → poll `GET /v1/predictions/{id}` every 2s until `succeeded`/`failed`

**360° Panorama Viewer:**
- `@photo-sphere-viewer/core` - Equirectangular panorama rendering
  - Images loaded from Convex storage URLs (`*.convex.cloud`)
  - Components: `src/components/viewer/PanoramaViewer.tsx`

**3D Building Viewer:**
- Three.js via `@react-three/fiber` + `@react-three/drei` - Interactive 3D building models
  - Loads `.glb`/`.gltf` models from Convex storage
  - Components: `src/components/viewer/GaussianSplatViewer.tsx` and building viewer components

## Data Storage

**Databases:**
- Convex Cloud (managed document DB)
  - Connection: `NEXT_PUBLIC_CONVEX_URL` (frontend), auto-configured for Convex functions
  - Client (frontend): `ConvexReactClient` in `src/components/providers/ConvexClientProvider.tsx`
  - Client (backend): `ctx.db` in all Convex functions
  - Schema: `convex/schema.ts` — 20+ tables
  - Search: Convex built-in search index on `tours.title` (`search_tours` in `convex/schema.ts`)

**File Storage:**
- Convex File Storage (built-in)
  - All user uploads (panorama images, thumbnails, floor plans, blog images, building models) stored as `_storage` IDs in Convex
  - Upload pattern: 3-step — `generateUploadUrl()` → `POST file to URL` → save `storageId` to document
  - Retrieval: `ctx.storage.getUrl(storageId)` in Convex actions; `useQuery(api.*.getStorageUrl)` from frontend
  - Image delivery: `*.convex.cloud` URLs (allowlisted in `next.config.ts` `remotePatterns`)

**Caching:**
- None - Convex reactive queries provide real-time updates without caching layer

## Authentication & Identity

**Auth Provider:**
- Clerk (`@clerk/nextjs` 6.38.2)
  - Implementation: `ClerkProvider → ConvexProviderWithClerk` chain in `src/components/providers/ConvexClientProvider.tsx`
  - Route protection: `middleware.ts` uses `clerkMiddleware` + `createRouteMatcher`
  - Protected routes: `/dashboard/*`, `/tours/*`, `/analytics/*`, `/leads/*`, `/settings/*`, `/billing/*`, `/onboarding/*`
  - Graceful degradation: both `ConvexClientProvider` and `middleware.ts` passthrough when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent/invalid
  - Convex auth: `convex/auth.config.ts` registers Clerk's JWKS domain (`neutral-meerkat-0.clerk.accounts.dev`) — hardcoded dev domain; override via `CLERK_ISSUER_URL` in Convex env
  - Every Convex function checks: `ctx.auth.getUserIdentity()` → throws if null
  - UI components used: `SignInButton`, `SignUpButton`, `UserButton`, `SignedIn`, `SignedOut` (Clerk); `Authenticated`, `Unauthenticated`, `AuthLoading` (Convex)
  - Social login: Google (`lh3.googleusercontent.com`) and GitHub (`avatars.githubusercontent.com`) avatar domains allowlisted in `next.config.ts`

**Roles:**
- `owner`, `admin`, `editor`, `viewer` — stored in `users.role` and `teamMembers.role` in Convex

## Monitoring & Observability

**Product Analytics:**
- PostHog - Page views, custom events, user identification
  - Integration: runtime `window.posthog` bridge (no npm package), loaded externally
  - Abstraction layer: `src/lib/posthog.ts` — `trackEvent()`, `identifyUser()`, `resetUser()`, `registerProperties()`
  - Provider: `src/components/providers/PostHogProvider.tsx`
  - Page tracking hook: `src/hooks/useTrackPageView.ts`
  - CSP allows: `https://us.i.posthog.com`
  - Env vars: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (optional, from `.env.example`)

- Convex aggregates (`convex/analytics.ts`, `convex/dailyAnalytics` table) — internal tour-level analytics (views, leads, scene interactions, device breakdown)

**Error Tracking:**
- Sentry - Referenced in `CLAUDE.md` as planned but no Sentry npm package in `package.json` or import found in source. Not yet implemented.

**Logs:**
- `console.error` / `console.warn` patterns throughout `convex/` functions; no structured logging library

## CI/CD & Deployment

**Hosting — Frontend:**
- Vercel
  - Auto-deploys on git push to `main`
  - Env vars set in Vercel dashboard

**Hosting — Backend:**
- Convex Cloud
  - Deploy: `npx convex deploy`
  - Dev: `npx convex dev` (watches `convex/`, syncs schema, hot-reloads functions)

**CI Pipeline:**
- None detected — no `.github/workflows/`, no CI config files found

## Email

**Provider:**
- Resend - Transactional email delivery
  - SDK/Client: Direct `fetch` to `https://api.resend.com/emails` (no npm package)
  - Auth: `RESEND_API_KEY` (Convex env var)
  - From address: `Spazeo <noreply@spazeo.io>`
  - Implementation: `convex/emails.ts` — all email logic as `internalAction` functions
  - Templates: HTML strings rendered in `convex/emails.ts` using brand tokens

**Email types sent:**
- Welcome email (on `user.created` Clerk webhook via `convex/http.ts`)
- Lead notification email (when lead captured via `convex/leads.ts`)
- Weekly summary email (via cron job in `convex/crons.ts`)

## Webhooks & Callbacks

**Incoming Webhooks (handled in `convex/http.ts`):**
- Stripe webhook at `/stripe-webhook` (POST)
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Verification: `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
  - Result: calls `internal.subscriptions.upsertFromStripe` + `syncPlanToUser` mutations
- Clerk webhook at `/clerk-webhook` (POST)
  - Events: `user.created`, `user.updated`, `user.deleted`, `session.created`
  - Result: calls `internal.users.upsertFromClerk`, `deleteByClerkId`, `recordLogin` mutations; triggers welcome email on `user.created`

**Public HTTP API (Convex HTTP actions, `convex/http.ts`):**
- `GET /api/tour?slug=` — public tour data lookup (no auth)
- `POST /api/analytics` — event tracking (no auth, for embedded viewers)
- `POST /api/leads` — lead capture (no auth, for embedded viewers)
- `GET /api/building?slug=` — public building data lookup (no auth)
- `POST /api/building-analytics` — building event tracking (no auth)
- All routes include CORS headers (`Access-Control-Allow-Origin: *`)

**Outgoing:**
- OpenAI API: `https://api.openai.com/v1/chat/completions`
- Replicate API: `https://api.replicate.com/v1/predictions`
- Resend API: `https://api.resend.com/emails`
- Stripe API: via `stripe` SDK (server-side) and `https://api.stripe.com` (from frontend CSP)

## Cron Jobs (`convex/crons.ts`)

- Daily at 02:00 UTC: `internal.analytics.rollupDaily` — rolls up raw analytics events into `dailyAnalytics` table
- Monthly on 1st at 00:00 UTC: `internal.users.resetMonthlyCredits` — resets `aiCreditsUsed` per user per plan limits

## Environment Configuration

**Required env vars summary:**

| Variable | Location | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Vercel / `.env.local` | Connects frontend to Convex |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel / `.env.local` | Clerk frontend auth |
| `CLERK_SECRET_KEY` | Vercel / `.env.local` | Clerk server middleware |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel / `.env.local` | Stripe frontend |
| `STRIPE_SECRET_KEY` | Vercel + Convex env | Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Convex env | Stripe webhook verification |
| `STRIPE_STARTER_MONTHLY_PRICE_ID` | Convex env | Plan matching in webhook handler |
| `STRIPE_STARTER_ANNUAL_PRICE_ID` | Convex env | Plan matching in webhook handler |
| `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID` | Convex env | Plan matching in webhook handler |
| `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID` | Convex env | Plan matching in webhook handler |
| `STRIPE_BUSINESS_MONTHLY_PRICE_ID` | Convex env | Plan matching in webhook handler |
| `STRIPE_BUSINESS_ANNUAL_PRICE_ID` | Convex env | Plan matching in webhook handler |
| `OPENAI_API_KEY` | Convex env | GPT-4o scene analysis and descriptions |
| `REPLICATE_API_TOKEN` | Convex env | Virtual staging and enhancement |
| `RESEND_API_KEY` | Convex env | Transactional email |
| `CLERK_ISSUER_URL` | Convex env | JWT verification domain |
| `NEXT_PUBLIC_POSTHOG_KEY` | Vercel / `.env.local` | PostHog analytics (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Vercel / `.env.local` | PostHog host (optional) |

**Secrets location:**
- Frontend secrets: Vercel environment dashboard + local `.env.local` (gitignored)
- Backend secrets: Convex environment (`npx convex env set KEY value`)

---

*Integration audit: 2026-03-09*
