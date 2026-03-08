# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
/Users/padidamabhinay/Desktop/UI/Spazeo/
├── src/
│   ├── app/                              # Next.js 16 App Router pages and layouts
│   │   ├── layout.tsx                    # Root layout — mounts ConvexClientProvider + PostHogProvider
│   │   ├── page.tsx                      # Landing page (/)
│   │   ├── globals.css                   # Tailwind v4 @theme config + global base styles
│   │   ├── error.tsx                     # Root error boundary
│   │   ├── loading.tsx                   # Root loading skeleton
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── (auth)/                       # Auth route group (Clerk-rendered pages)
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/                  # Protected dashboard route group
│   │   │   ├── layout.tsx                # Dashboard layout wrapper → DashboardLayoutClient
│   │   │   ├── dashboard/page.tsx        # Main dashboard (/dashboard)
│   │   │   ├── tours/page.tsx            # Tour list + management (/tours)
│   │   │   ├── tours/[id]/page.tsx       # Tour detail view
│   │   │   ├── tours/[id]/edit/page.tsx  # Tour editor
│   │   │   ├── analytics/page.tsx        # Analytics dashboard (/analytics)
│   │   │   ├── leads/page.tsx            # Lead management CRM (/leads)
│   │   │   ├── settings/page.tsx         # Account settings (/settings)
│   │   │   └── billing/page.tsx          # Subscription management (/billing)
│   │   ├── tour/[slug]/page.tsx          # Public tour viewer — full-screen 360°
│   │   ├── api/
│   │   │   ├── proxy-image/route.ts      # Dev-only: proxies local Convex storage for CORS
│   │   │   └── webhooks/stripe/route.ts  # Legacy Stripe webhook (primary is convex/http.ts)
│   │   ├── pricing/page.tsx              # Public pricing page
│   │   ├── onboarding/page.tsx           # Post-signup onboarding wizard
│   │   ├── demo/[slug]/page.tsx          # Interactive demo viewer
│   │   ├── blog/[slug]/page.tsx          # Blog post page
│   │   ├── compare/[competitor]/page.tsx # SEO competitor comparison pages
│   │   ├── features/
│   │   │   ├── ai-analysis/page.tsx
│   │   │   ├── ai-descriptions/page.tsx
│   │   │   └── ai-staging/page.tsx
│   │   ├── about/page.tsx
│   │   ├── enterprise/page.tsx
│   │   ├── india/page.tsx
│   │   ├── product/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── terms/page.tsx
│   ├── components/
│   │   ├── ui/                           # Base UI primitives (Radix + Tailwind)
│   │   ├── layout/                       # Structural layout components
│   │   ├── viewer/                       # 360° panorama viewer components
│   │   ├── tour/                         # Tour management components
│   │   ├── ai/                           # AI feature components
│   │   ├── auth/                         # Auth-specific components
│   │   ├── dashboard/                    # Dashboard-specific components
│   │   ├── landing/                      # Marketing landing page sections
│   │   └── providers/                    # React context providers
│   ├── hooks/                            # Custom hooks wrapping Convex API
│   ├── lib/                              # Shared utilities and config
│   └── types/                            # TypeScript type definitions
├── convex/                               # Convex backend (entire backend lives here)
│   ├── _generated/                       # Auto-generated — DO NOT EDIT
│   │   ├── api.d.ts                      # Typed API references
│   │   ├── dataModel.d.ts                # Table row types (Id<'tours'>, etc.)
│   │   └── server.d.ts                   # query/mutation/action constructors
│   ├── schema.ts                         # All table definitions + indexes
│   ├── auth.config.ts                    # Clerk JWT domain configuration
│   ├── http.ts                           # HTTP router — webhooks + public API
│   ├── crons.ts                          # Scheduled jobs (analytics rollup, credit reset)
│   ├── tours.ts                          # Tour CRUD + publish/archive/duplicate
│   ├── scenes.ts                         # Scene CRUD + reorder + upload URL
│   ├── hotspots.ts                       # Hotspot CRUD
│   ├── leads.ts                          # Lead capture + CRM updates
│   ├── analytics.ts                      # Event tracking + daily rollup
│   ├── users.ts                          # User upsert, login tracking, credit reset
│   ├── subscriptions.ts                  # Subscription upsert, plan sync
│   ├── ai.ts                             # AI job queries
│   ├── aiActions.ts                      # AI actions (OpenAI/Replicate calls)
│   ├── aiHelpers.ts                      # Internal: credit check, job create/update
│   ├── search.ts                         # Full-text tour search
│   ├── activity.ts                       # Activity log writes
│   ├── notifications.ts                  # In-app notifications
│   ├── emails.ts                         # Email sending via Resend
│   ├── buildings.ts                      # 3D building CRUD
│   ├── buildingBlocks.ts                 # Building block management
│   ├── buildingUnits.ts                  # Apartment unit management
│   ├── buildingAnalytics.ts              # Building interaction tracking
│   ├── viewPositions.ts                  # Camera vantage point management
│   ├── exteriorPanoramas.ts              # Exterior panorama storage
│   ├── conversionJobs.ts                 # 3D model optimization job tracking
│   ├── blog.ts                           # Blog post queries
│   ├── demoTours.ts                      # Demo tour configuration
│   ├── pricing.ts                        # Pricing plan queries
│   ├── newsletter.ts                     # Newsletter subscription
│   ├── contact.ts                        # Contact form submissions
│   └── consents.ts                       # GDPR consent logging
├── public/
│   ├── images/                           # Static image assets
│   └── landing/                          # Landing page specific assets
├── Doc/
│   └── PRD/                              # Product requirement documents
├── middleware.ts                          # Clerk route protection (Next.js edge)
├── next.config.ts                        # Next.js config (ignoreBuildErrors: true)
├── convex.json                           # Convex project ID
├── tsconfig.json                         # TypeScript config
└── package.json                          # Dependencies + scripts
```

## Directory Purposes

**`src/app/(dashboard)/`:**
- Purpose: All protected dashboard routes — require authentication via middleware
- Contains: Page components only — all data access via Convex hooks, no server-side data fetching
- Key files: `layout.tsx` (wraps in `DashboardLayoutClient`), `tours/page.tsx` (most complex page — 700+ lines with filtering, sorting, bulk ops)

**`src/app/tour/[slug]/`:**
- Purpose: Public-facing full-screen 360° tour viewer
- Contains: `page.tsx` — single `'use client'` file with inline scene navigator component
- Key files: `src/app/tour/[slug]/page.tsx`

**`src/components/ui/`:**
- Purpose: Reusable base primitives shared across the entire app
- Contains: `Button.tsx`, `Input.tsx`, `Badge.tsx`, `Card.tsx`, `Modal.tsx`, `Spinner.tsx`, `EmptyState.tsx`, `StatsCard.tsx`, `Select.tsx`, `Toggle.tsx`, `SearchBar.tsx`, `UserAvatar.tsx`, `TableHeader.tsx`, `TableRow.tsx`, `Logo.tsx`, `ConnectionStatus.tsx`, `CookieConsent.tsx`

**`src/components/viewer/`:**
- Purpose: 360° panorama viewer components (Three.js/R3F based)
- Contains: `PanoramaViewer.tsx` (sphere mesh + OrbitControls), `HotspotMarker.tsx` (3D markers), `SceneNavigator.tsx`, `ViewerControls.tsx`

**`src/components/dashboard/`:**
- Purpose: Dashboard-specific feature components
- Contains: `DashboardLayoutClient.tsx` (sidebar + shell), `ActivityFeed.tsx`, `NotificationBell.tsx`, `OnboardingChecklist.tsx`, `ShortcutsOverlay.tsx`

**`src/components/providers/`:**
- Purpose: React context providers mounted at the root
- Contains: `ConvexClientProvider.tsx` (ClerkProvider → ConvexProviderWithClerk; passthrough when env vars absent)

**`src/hooks/`:**
- Purpose: Domain-specific hooks that wrap `useQuery`/`useMutation`/`useAction` calls — keeps pages thin
- Contains: `useTour.ts`, `useViewer.ts`, `useAI.ts`, `useBuilding.ts`, `useDashboard.ts`, `useOnboarding.ts`, `useKeyboardShortcuts.ts`, `useTrackPageView.ts`, `useUTMCapture.ts`

**`src/lib/`:**
- Purpose: Non-React utilities and config
- Contains: `utils.ts` (`cn`, `formatNumber`, `formatDate`, `slugify`, `truncate`), `stripe.ts` (lazy Stripe client init), `constants.ts` (app-wide constants)

**`src/types/`:**
- Purpose: Shared TypeScript types — domain enums and interfaces not auto-generated by Convex
- Contains: `index.ts` — exports `TourStatus`, `UserPlan`, `UserRole`, `HotspotType`, config objects (`LeadCaptureConfig`, `BrandingConfig`, `SeoConfig`), stats interfaces, viewer interfaces

**`convex/`:**
- Purpose: Entire backend — database schema, serverless functions, webhooks, scheduled jobs
- Contains: Schema, one file per domain (tours.ts, scenes.ts, etc.), AI pipeline (ai.ts + aiActions.ts + aiHelpers.ts), HTTP router, cron jobs
- Key rule: Never edit `convex/_generated/` — auto-regenerated by `npx convex dev`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout — all providers mount here
- `middleware.ts`: Route protection — edit here to change which routes require auth
- `convex/http.ts`: All webhook and public API endpoints
- `convex/crons.ts`: All scheduled background jobs

**Configuration:**
- `src/app/globals.css`: Tailwind v4 `@theme {}` block — all design tokens (colors, fonts, spacing)
- `convex/schema.ts`: Database schema — add new tables here
- `convex/auth.config.ts`: Clerk JWT issuer domain
- `next.config.ts`: Next.js build config + allowed image domains
- `convex.json`: Convex project deployment ID

**Core Business Logic:**
- `convex/tours.ts`: Tour lifecycle (create, publish, archive, duplicate, delete) with plan limit enforcement
- `convex/aiActions.ts`: All AI feature implementations (scene analysis, staging, description, floor plan)
- `convex/aiHelpers.ts`: AI credit checking and job state management (internal only)
- `convex/subscriptions.ts`: Subscription upsert + plan sync (called by Stripe webhook)

**Viewer:**
- `src/components/viewer/PanoramaViewer.tsx`: Core 360° renderer using Three.js sphere + R3F
- `src/app/tour/[slug]/page.tsx`: Public viewer page — scene navigation, lead capture, analytics

**Types:**
- `src/types/index.ts`: All domain TypeScript types
- `convex/_generated/dataModel.d.ts`: Auto-generated row types (`Id<'tours'>`, table shapes)

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `PanoramaViewer.tsx`, `DashboardLayoutClient.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useTour.ts`, `useViewer.ts`)
- Utilities: `camelCase.ts` (e.g., `utils.ts`, `constants.ts`)
- Convex backend: `camelCase.ts` per domain (e.g., `tours.ts`, `aiActions.ts`, `aiHelpers.ts`)
- Next.js pages/layouts: `page.tsx`, `layout.tsx`, `route.ts` (framework convention)

**Directories:**
- React component groups: `camelCase/` (e.g., `viewer/`, `landing/`, `providers/`)
- Route groups: `(groupName)/` — parentheses group routes without affecting URL (e.g., `(dashboard)/`, `(auth)/`)
- Dynamic segments: `[paramName]/` (e.g., `[slug]/`, `[id]/`, `[competitor]/`)
- Catch-all segments: `[[...paramName]]/` (e.g., `[[...sign-in]]/`)

**Convex functions:**
- Queries: descriptive verb+noun (e.g., `getBySlug`, `listJobs`, `getStats`, `getRecent`)
- Mutations: imperative verb (e.g., `create`, `update`, `publish`, `archive`, `duplicate`, `remove`)
- Internal functions: prefixed with context (e.g., `upsertFromClerk`, `upsertFromStripe`, `syncPlanToUser`)

**Exports:**
- All components use named exports: `export function ComponentName()` — no default exports (except Next.js page/layout files which require default exports)
- Convex functions use named exports: `export const list = query({...})`

## Where to Add New Code

**New dashboard page:**
- Create: `src/app/(dashboard)/[route-name]/page.tsx`
- Add `'use client'` at top if interactive
- Protect automatically via existing middleware route patterns
- Use `DashboardLayoutClient` via the group layout — no extra wrapping needed

**New public marketing page:**
- Create: `src/app/[route-name]/page.tsx` (Server Component by default — no `'use client'`)
- Add section components to `src/components/landing/` if reused

**New UI component:**
- Primitive/base: `src/components/ui/ComponentName.tsx`
- Feature-specific: `src/components/[domain]/ComponentName.tsx` (e.g., `src/components/tour/TourCard.tsx`)
- Use named export

**New Convex data domain:**
1. Add table to `convex/schema.ts`
2. Create `convex/[domain].ts` with queries and mutations
3. Run `npx convex dev` to regenerate `convex/_generated/`
4. Add hook to `src/hooks/use[Domain].ts`

**New AI feature:**
- Action: add to `convex/aiActions.ts` following the pattern: check credits → create job → call API → persist result
- Query: add to `convex/ai.ts`
- UI component: add to `src/components/ai/`

**New webhook endpoint:**
- Add to `convex/http.ts` using `http.route({ path, method, handler: httpAction(...) })`

**Shared types:**
- Enums and interfaces: add to `src/types/index.ts`
- DB row types: automatically available from `convex/_generated/dataModel`

**New utility:**
- General frontend: add function to `src/lib/utils.ts`
- Constants: add to `src/lib/constants.ts`
- Stripe-specific: `src/lib/stripe.ts`

## Special Directories

**`convex/_generated/`:**
- Purpose: Auto-generated TypeScript API types and server helpers
- Generated: Yes — by `npx convex dev` on every schema/function change
- Committed: Yes (checked into git for IDE support)
- Rule: Never edit manually

**`.convex/`:**
- Purpose: Local Convex dev server data and module cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`.planning/`:**
- Purpose: GSD workflow planning documents (architecture, concerns, phases)
- Generated: By GSD commands
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at root (images, landing graphics)
- Generated: No
- Committed: Yes

**`Doc/PRD/`:**
- Purpose: Product requirement documents
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-09*
