# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Spazeo — Claude Code Instructions

> AI coding assistant context for the Spazeo project.
> Read this before making any changes.

---

## Project Overview

**Spazeo** is an AI-powered 360° virtual tour platform for real estate professionals.
It converts panorama photos into immersive, walkable 3D experiences using
Gaussian Splatting, AI staging, depth estimation, and smart search.

- **Tagline:** "Step Inside Any Space"
- **Domain:** spazeo.io
- **Pronunciation:** spa·ZAY·oh
- **Architecture Philosophy:** Reactive, real-time, serverless, AI-native

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Next.js 16 (App Router) | Server/client components, routing, SSR, ISR, Turbopack |
| Language | TypeScript | Type safety across frontend and Convex backend |
| Styling | Tailwind CSS v4 + Radix UI | Utility-first CSS, accessible component primitives |
| Backend Platform | Convex | Reactive database, serverless functions, file storage, cron jobs, vector search |
| Authentication | Clerk + Convex Auth | User management, JWT tokens, social login, role-based access |
| Panorama Viewer | @photo-sphere-viewer (core, autorotate-plugin, markers-plugin) | 360° equirectangular panorama viewer, hotspot markers |
| 3D Building Viewer | Three.js via @react-three/fiber + drei | Interactive 3D building models, exterior views, floor/unit navigation |
| AI — Vision | Alibaba DashScope qwen3.5-plus | Scene analysis, object detection, room classification (OpenAI-compatible API) |
| AI — Image Edit | Alibaba DashScope qwen-image-edit-max | Virtual staging, style transfer, inpainting (DashScope native API) |
| AI — Image Gen | Alibaba DashScope qwen-image-2.0-pro | Image enhancement, 2K photorealistic output (DashScope native API) |
| AI — 3D | Gaussian Splatting pipeline | Point cloud to 3D scene, spark.js viewer |
| AI — NLP | Alibaba DashScope qwen3.5-plus | Tour descriptions, chatbot, marketing copy (OpenAI-compatible API) |
| AI — Floor Plans | CubiCasa API / Custom model | 2D panorama to floor plan generation |
| Payments | Stripe | Subscription billing, usage metering, webhooks via Convex HTTP Actions |
| Email | Resend (via Convex component) | Transactional emails, lead notifications, tour sharing |
| Hosting — Frontend | Vercel | Edge network, automatic deploys from Git |
| Hosting — Backend | Convex Cloud | Managed infrastructure, automatic scaling, real-time sync |
| Analytics | PostHog + Convex aggregates | Product analytics, tour view tracking, funnel analysis |
| Monitoring | Sentry | Error tracking, performance monitoring |
| Icons | Lucide React | UI icons |
| Animation | Framer Motion | Page transitions, micro-interactions |
| State (client) | Zustand | Client-side ephemeral state (viewer controls, UI toggles) |

---

## Project Structure

```
/Users/padidamabhinay/Desktop/UI/Spazeo/
├── src/
│   ├── app/                              # Next.js 16 App Router
│   │   ├── layout.tsx                    # Root layout (ClerkProvider → ConvexProvider)
│   │   ├── page.tsx                      # Landing page (/)
│   │   ├── globals.css                   # Tailwind CSS v4 imports + theme
│   │   ├── (auth)/                       # Auth route group
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/                  # Protected dashboard routes
│   │   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   │   ├── dashboard/page.tsx        # Main dashboard
│   │   │   ├── tours/page.tsx            # Tour management
│   │   │   ├── tours/[id]/page.tsx       # Tour detail
│   │   │   ├── tours/[id]/edit/page.tsx  # Tour editor
│   │   │   ├── analytics/page.tsx        # Analytics dashboard
│   │   │   ├── leads/page.tsx            # Lead management
│   │   │   ├── settings/page.tsx         # Account settings
│   │   │   └── billing/page.tsx          # Subscription management
│   │   ├── tour/[slug]/page.tsx          # Public tour viewer
│   │   ├── api/webhooks/stripe/route.ts  # Stripe webhook handler
│   │   ├── pricing/page.tsx              # Pricing page
│   │   ├── onboarding/page.tsx           # Post-signup onboarding wizard
│   │   ├── demo/page.tsx                 # Interactive demo viewer
│   │   ├── blog/[slug]/page.tsx          # Blog
│   │   ├── compare/[competitor]/page.tsx # Competitor comparison pages
│   │   ├── features/                     # Feature detail pages (ai-staging, ai-analysis, ai-descriptions, ...)
│   │   ├── about/, product/, enterprise/, india/  # Marketing pages
│   │   └── privacy/, terms/             # Legal pages
│   ├── components/
│   │   ├── ui/                           # Base UI (Radix + Tailwind)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/                       # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── DashboardShell.tsx
│   │   ├── tour/                         # Tour-specific components
│   │   │   ├── TourCard.tsx
│   │   │   ├── TourGrid.tsx
│   │   │   ├── TourEditor.tsx
│   │   │   └── SceneManager.tsx
│   │   ├── viewer/                       # 3D viewer components
│   │   │   ├── PanoramaViewer.tsx        # Main 360° viewer
│   │   │   ├── Hotspot.tsx               # Interactive hotspot
│   │   │   ├── MiniMap.tsx               # Floor plan mini-map
│   │   │   ├── ViewerControls.tsx        # Zoom, rotate, fullscreen
│   │   │   └── GaussianSplatViewer.tsx
│   │   ├── ai/                           # AI feature components
│   │   │   ├── AIStaging.tsx
│   │   │   ├── AIDescriptionGen.tsx
│   │   │   └── AIFloorPlan.tsx
│   │   ├── landing/                      # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   └── CTA.tsx
│   │   └── providers/
│   │       └── ConvexClientProvider.tsx   # ClerkProvider → ConvexProviderWithClerk
│   ├── lib/
│   │   ├── utils.ts                      # General utilities (cn, formatDate, etc.)
│   │   ├── stripe.ts                     # Stripe client config
│   │   └── constants.ts                  # App-wide constants
│   ├── hooks/
│   │   ├── useTour.ts
│   │   ├── useViewer.ts
│   │   └── useAI.ts
│   └── types/
│       └── index.ts
├── convex/                               # Convex backend (CRITICAL)
│   ├── _generated/                       # Auto-generated (DO NOT EDIT)
│   ├── schema.ts                         # Database schema definition
│   ├── auth.config.ts                    # Clerk JWT configuration
│   ├── users.ts, tours.ts, scenes.ts, hotspots.ts, leads.ts
│   ├── analytics.ts, subscriptions.ts, search.ts, crons.ts, http.ts
│   ├── ai.ts, aiActions.ts, aiHelpers.ts # AI pipeline
│   ├── buildings.ts, buildingBlocks.ts, buildingUnits.ts
│   ├── viewPositions.ts, exteriorPanoramas.ts, buildingAnalytics.ts, conversionJobs.ts
│   ├── activity.ts, notifications.ts, consents.ts
│   ├── blog.ts, demoTours.ts, pricing.ts, newsletter.ts, contact.ts, emails.ts
├── public/
├── middleware.ts                          # Clerk route protection
├── next.config.ts
├── convex.json                           # Convex project config
├── tsconfig.json
└── package.json
```

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

---

## Authentication Architecture

### Provider Chain (src/app/layout.tsx)

```
ConvexClientProvider → PostHogProvider → App
  └─ (inside ConvexClientProvider when env vars present)
     ClerkProvider → ConvexProviderWithClerk
```

- **ConvexClientProvider** (`src/components/providers/ConvexClientProvider.tsx`): wraps `ClerkProvider → ConvexProviderWithClerk`. **Renders children directly (passthrough) when `NEXT_PUBLIC_CONVEX_URL` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are missing/invalid** — this allows the app to render without auth in development.
- **PostHogProvider** (`src/components/providers/PostHogProvider.tsx`): wraps children inside the root layout for analytics.

### Route Protection

- `middleware.ts` uses Clerk's `clerkMiddleware` + `createRouteMatcher`
- Protects `/dashboard/*`, `/tours/*`, `/analytics/*`, `/leads/*`, `/settings/*`, `/billing/*`, `/onboarding/*`
- **Falls back to passthrough (no protection)** when Clerk env vars are missing — same pattern as ConvexClientProvider

### Role-Based Access

Roles: `owner`, `admin`, `editor`, `viewer` — stored in Convex `users` and `teamMembers` tables. Mutations check role before allowing writes.

### Frontend Auth Components

- Clerk: `SignInButton`, `SignUpButton`, `UserButton`, `SignedIn`, `SignedOut`
- Convex: `Authenticated`, `Unauthenticated`, `AuthLoading`

---

## Database Schema (Convex)

| Table | Key Fields | Indexes |
|---|---|---|
| users | clerkId, email, name, plan, role, onboardingComplete | by_clerkId, by_email |
| tours | userId, title, slug, status, settings, leadCaptureConfig, brandingConfig, seoConfig | by_userId, by_slug, by_status; searchIndex on title |
| scenes | tourId, title, imageStorageId, order, panoramaType, aiAnalysis | by_tourId |
| hotspots | sceneId, targetSceneId, type, position, tooltip | by_sceneId |
| floorPlans | tourId, imageStorageId, rooms, scale | by_tourId |
| leads | tourId, name, email, status, notes, deviceInfo, locationInfo | by_tourId, by_email |
| analytics | tourId, event, sessionId, sceneId, timestamp, deviceType | by_tourId, by_event, by_timestamp |
| dailyAnalytics | tourId, date, views, uniqueVisitors, avgDuration, leadsCount | by_tourId_date |
| activityLog | userId, type, tourId, message, timestamp | by_userId |
| subscriptions | userId, stripeCustomerId, plan, status, currentPeriodEnd | by_userId, by_stripeCustomerId |
| teamMembers | teamId, userId, role, invitedBy | by_teamId, by_userId |
| aiJobs | tourId, sceneId, type, status, input, output, provider, userId | by_tourId, by_status, by_userId |
| buildings | userId, name, slug, location, totalFloors, totalBlocks, status | by_userId, by_slug, by_status |
| buildingBlocks | buildingId, blockNumber, name, apartmentsPerFloor | by_buildingId |
| viewPositions | buildingId, blockId, floor, positionIndex, direction, coordinates | by_buildingId, by_blockId_floor |
| exteriorPanoramas | viewPositionId, buildingId, imageStorageId, timeOfDay | by_viewPositionId, by_buildingId |
| buildingUnits | buildingId, blockId, floor, unitNumber, type, tourId, status | by_buildingId, by_floor, by_tourId |
| conversionJobs | buildingId, inputStorageId, status, progress | by_buildingId, by_status |
| buildingAnalytics | buildingId, event, sessionId, floor, unitNumber | by_buildingId, by_event |
| blogPosts | title, slug, content, category, status | by_slug, by_category, by_status |
| consents | userId, consentType, version, granted | by_userId, by_userId_consentType |
| demoTours | title, slug, propertyType, tourId | by_slug, by_propertyType |
| pricingPlans | name, slug, priceUsd, priceInr, limits, stripePriceId | by_slug |
| newsletterSubscriptions | email, subscribedAt, confirmed | by_email |
| notifications | userId, type, title, message, read | by_userId, by_read |
| contactSubmissions | name, email, message, page | by_email |

---

## 360° Viewer Architecture

### Rendering Pipeline

The panorama viewer uses `@photo-sphere-viewer/core` (NOT Three.js/R3F directly):

- `PhotoSphereViewer` renders equirectangular panoramas
- `MarkersPlugin` (`@photo-sphere-viewer/markers-plugin`) — hotspot overlays
- `AutorotatePlugin` (`@photo-sphere-viewer/autorotate-plugin`) — auto-spin on idle
- Image loaded from Convex storage URLs

### 3D Building Viewer Architecture

The Building Viewer domain uses Three.js via `@react-three/fiber` + `drei`:

- Renders interactive 3D building models (`.glb`/`.gltf`)
- Users select floor + block + unit position → view exterior panoramas from that vantage point
- `buildingUnits` link back to `tours` (interior panorama tours for each apartment)
- `viewPositions` store camera coordinates/heading per floor/block/positionIndex
- `exteriorPanoramas` store rendered panorama images per viewPosition + timeOfDay
- `conversionJobs` track 3D model optimization status

---

## Design System Rules

### Colors — always use CSS variables, never hardcode

**Dark theme (default):**
```
Primary:   #D4A017  (Brand Gold — buttons, accents, active states)
Hover:     #E5B120  (Gold hover)
Teal:      #2DD4BF  (Spatial Teal — navigation, viewer, exploration)
Coral:     #FB7A54  (Warm Coral — urgent CTAs, promotions)
Dark bg:   #0A0908  (Carbon Base)
Surface:   #12100E  (Card backgrounds)
Elevated:  #1B1916  (Raised elements, inputs)
Overlay:   #2E2A24  (Dropdowns, overlays)
Text:      #F5F3EF  (Primary text)
Text 2:    #A8A29E  (Secondary text)
Muted:     #6B6560  (Helper text, captions)
Success:   #34D399
Warning:   #FBBF24
Error:     #F87171
```

**Light theme** (activate with `class="light"` or `data-theme="light"`):
```
Primary:   #B8860B  (Deeper Gold — WCAG AA on white)
Hover:     #D4A017
Teal:      #0D9488  (Darker Teal — legible on light)
Coral:     #F46036
Light bg:  #FAFAF7  (Warm Ivory base)
Surface:   #FFFFFF
Elevated:  #F5F3EF
Overlay:   #EDEAE4
Text:      #1C1917
Text 2:    #57534E
Muted:     #78716C
Success:   #059669
Warning:   #D97706
Error:     #DC2626
```

**Color rule:** 60-30-10 (60% neutrals, 30% text+teal, 10% gold+coral)

### Typography
- **Plus Jakarta Sans** for display/headings — `--font-jakarta`
- **DM Sans** for body text, labels, UI — `--font-dmsans`
- Type scale: Display 48px → H1 36px → H2 28px → H3 22px → Body 16px → Small 14px

### Spacing — 4px base grid
```
xs=4  sm=8  md=12  base=16  lg=24  xl=32  2xl=48  3xl=64
```

### Border Radius
```
4px  → inputs, text fields
8px  → buttons, cards, dropdowns
12px → modals, panels
9999px → pills, avatars, badges
```

### Shadows
```
sm: 0 1px 2px rgba(0,0,0,0.05)   → buttons, inputs
md: 0 4px 6px rgba(0,0,0,0.07)   → cards, dropdowns
lg: 0 10px 15px rgba(0,0,0,0.1)  → modals, popovers
xl: 0 20px 25px rgba(0,0,0,0.15) → tour viewer overlay
```

### Buttons
| Variant | Style |
|---|---|
| Primary | `#D4A017` bg, `#0A0908` text, 8px radius, 14px bold, 40px height |
| Teal | `#2DD4BF` bg, `#0A0908` text — spatial/navigation actions |
| CTA | `#FB7A54` bg, white text — urgent/promotional actions |
| Secondary | transparent bg, gold 1.5px border, gold text |
| Ghost | no bg, gold text — low-priority actions |

### Icons
- Lucide React only (`lucide-react`)
- 24px default, 1.5px stroke, rounded caps
- Gold `#D4A017` for interactive, Teal `#2DD4BF` for spatial/navigation, Grey `#6B6560` for decorative

---

## Coding Conventions

### General
- TypeScript strict mode — no `any`
- Prefer named exports over default exports for components
- Use `@/` path aliases for all internal imports
- Server Components by default; add `'use client'` only when needed
- Keep components small and focused — split at 150 lines

### Data Patterns
- **Always** use `useQuery()` for reading data — never fetch manually. Components re-render reactively.
- `useMutation()` handles optimistic updates automatically
- Use the Convex `api.*` references (from `convex/_generated/api`) for fully typed function calls
- Never pass file data through mutations — use the 3-step upload pattern
- AI features always use the job queue pattern (create job → schedule action → process → update)

### Tailwind
- Tailwind v4: all theme config in `src/app/globals.css` via `@theme {}` — NO tailwind.config.ts
- Use the 4px spacing scale: `p-1 p-2 p-3 p-4 p-6 p-8 p-12 p-16`
- Use `clsx` + `tailwind-merge` for conditional class composition

### Accessibility
- All interactive elements must have accessible labels
- All images need `alt` text
- Color combinations must meet WCAG AA (4.5:1 body, 3:1 large text)
- Never use red/green alone to convey meaning
- Maintain focus-visible outlines

### File Naming
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Pages/layouts: `page.tsx`, `layout.tsx` (Next.js convention)
- Convex functions: `camelCase.ts` (tours.ts, scenes.ts, etc.)

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Vercel | Connects frontend to Convex backend |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | Clerk frontend auth |
| `CLERK_SECRET_KEY` | Vercel | Clerk server-side auth (middleware) |
| `DASHSCOPE_API_KEY` | Convex | Alibaba Cloud Model Studio — qwen3.5-plus (vision/text), qwen-image-edit-max (staging), qwen-image-2.0-pro (enhancement) |
| `STRIPE_SECRET_KEY` | Both | Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Convex | Verify Stripe webhook signatures |
| `RESEND_API_KEY` | Convex | Send transactional emails |
| `CLERK_ISSUER_URL` | Convex | JWT verification domain |

---

## Brand Voice in UI Copy

| Do | Don't |
|---|---|
| Short, confident sentences | Jargon or buzzwords |
| "Your tour is ready" | "Leveraging our neural pipeline..." |
| "Upload. Process. Share." | "hey!! it's done lol" |
| Empowering, capability-first | Patronizing ("don't worry, it's easy!") |

**Personality keywords:** Immersive · Intelligent · Effortless · Premium · Seamless

---

## What NOT to Do

- Do not add colors outside the palette without explicit instruction
- Do not use decorative or script fonts — only Plus Jakarta Sans and DM Sans
- Do not use emojis in UI copy or error messages
- Do not hardcode spacing values outside the 4px grid
- Do not skip heading levels (H1 → H2 → H3 in order)
- Do not create files unless strictly necessary
- Do not over-engineer — minimum complexity for the task
- Do not commit `.env.local` or any secrets
- Do not auto-push or auto-commit without user confirmation
- Do not edit files in `convex/_generated/` — those are auto-generated

---

## Development Commands

```bash
# Start both servers simultaneously (run in separate terminals)
npx convex dev          # Convex dev server (watches convex/, syncs schema, deploys functions)
npm run dev             # Next.js dev server with Turbopack on localhost:3000

# Linting
npm run lint            # ESLint (eslint-config-next)

# Production deploy
npx convex deploy       # Deploy Convex backend
# Vercel auto-deploys on git push to main
```

> **Note:** `next.config.ts` sets `typescript.ignoreBuildErrors: true` because Convex-generated `api.d.ts` creates circular type references that break the Next.js build checker. The Convex CLI handles type-checking for `convex/` files separately via `npx convex dev`.

> **Note:** No test runner (vitest/playwright) is configured yet in `package.json`.

---

## Key Data Flows

### Tour Creation
User creates tour → mutation checks auth + subscription limits → user uploads 360° images (3-step pattern) → AI Action analyzes each scene → user arranges scenes + adds hotspots → publishes → live at spazeo.io/tour/[slug]

### Tour Viewing (Public)
Visitor opens tour URL → `useQuery` loads tour + scenes + hotspots → PanoramaViewer renders → hotspot clicks = client-side scene transitions → analytics mutation fires on interactions → lead form saves to leads table → Action emails tour owner

### AI Staging
Select scene → choose style → create aiJob (pending) → scheduled Action → downloads panorama from Convex → sends to Replicate → uploads result to Convex storage → job complete → frontend auto-updates reactively

### Billing
Select plan → Stripe Checkout → webhook to Convex HTTP Action → verify signature → mutation updates subscription → queries return updated limits → UI auto-updates

---

## Notion Workflow (How to Get Your Next Task)

Notion is the source of truth for all features. Claude Desktop writes the specs there.
Claude Code (you) reads them and builds.

### How to Start a Feature

When the user says "build Feature 01" or "work on scene transitions", do this:

1. Use the Notion MCP tool to fetch the feature page
2. Read Section 3 (Build Spec) and Section 4 (Done When)
3. Read the files listed under "Files to Read First"
4. Build the feature
5. When done, update the Notion page status to Done

### Feature Page IDs (Notion)

| # | Feature | Notion Page ID |
|---|---|---|
| 01 | Scene Transitions | 31b16b84-9ab6-811b-b07f-ee7309b15674 |
| 02 | Hotspot Editor | 31b16b84-9ab6-818c-b8ba-fc758f4e5419 |
| 03 | Mobile Touch Gestures | 31b16b84-9ab6-8187-87e2-d92e26ea6c4f |
| 04 | Tour Publish Flow | 31b16b84-9ab6-81bb-b557-e246f7cd2405 |
| 05 | Lead Capture Form | 31b16b84-9ab6-815b-89b4-d9e573d67e3e |
| 06 | AI Scene Analysis | 31b16b84-9ab6-81d6-a15b-e60e8dec813d |
| 07 | AI Virtual Staging | 31b16b84-9ab6-81ff-8c22-dc761fc32f8b |
| 08 | Analytics Dashboard | 31b16b84-9ab6-81d4-ac62-d78913fca860 |
| 09 | Lead Management CRM | 31b16b84-9ab6-811b-9dec-dc2616de2816 |
| 10 | Stripe Billing + Plan Limits | 31b16b84-9ab6-8131-abab-e2bd764f2cdb |
| 11 | Onboarding Flow | 31b16b84-9ab6-811c-859a-e800ed644921 |
| 12 | Tour Settings | 31b16b84-9ab6-81ec-b054-ef849bc3fff3 |
| 13 | 3D Building Viewer | 31b16b84-9ab6-81f8-ae73-db289a054c6b |
| 14 | Embed Code Generator | 31b16b84-9ab6-81d6-86ba-c54826917209 |
| 15 | Performance + Launch Polish | 31b16b84-9ab6-8149-89e4-c033217b8638 |

### Screen Requirements Page IDs (when fixing existing pages)

| Screen | Notion Page ID |
|---|---|
| Homepage (/) | 31b16b84-9ab6-8120-84fa-c7927fd0c155 |
| Pricing (/pricing) | 31b16b84-9ab6-81aa-87ce-e348e9d06d3f |
| Public Tour Viewer (/tour/[slug]) | 31b16b84-9ab6-81ef-a422-f58823745be8 |
| Sign In | 31b16b84-9ab6-8158-ae5a-c9ce7b65efd8 |
| Sign Up | 31b16b84-9ab6-8192-8243-f2db148744e4 |
| Dashboard (/dashboard) | 31b16b84-9ab6-81a2-93fa-d49715fd4a74 |
| Tour List (/tours) | 31b16b84-9ab6-81b2-8f10-ebb284a0271f |
| Tour Editor (/tours/[id]/edit) | 31b16b84-9ab6-815f-8984-e58482d585b5 |
| Analytics (/analytics) | 31b16b84-9ab6-819b-8973-e417119f86ce |
| Leads CRM (/leads) | 31b16b84-9ab6-81f2-b14b-e2ac049b2292 |
| Settings (/settings) | 31b16b84-9ab6-81bc-8c7c-dd35e087806f |
| Billing (/billing) | 31b16b84-9ab6-817a-b651-d372a5ddd1a2 |

### Command Examples

User says: "Build Feature 01"
-> Fetch page 31b16b84-9ab6-811b-b07f-ee7309b15674 from Notion
-> Read the Build Spec section
-> Read the files listed
-> Build it

User says: "Fix the dashboard page"
-> Fetch page 31b16b84-9ab6-81a2-93fa-d49715fd4a74 from Notion
-> Read the requirements (what is missing / needs improvement)
-> Fix those specific things

User says: "What should I build next?"
-> Fetch page 31b16b84-9ab6-81a0-ad30-e0f8f5355b86 (Build Queue)
-> Find the first feature that is not Done
-> Report back with the feature name and estimated time

---

## Reference

- Technical Architecture Doc: `Spazeo_Technical_Architecture.docx`
- Brand Guidelines: `BRAND.md`
- Lucide Icons: https://lucide.dev
- Convex Docs: https://docs.convex.dev
- Clerk Docs: https://clerk.com/docs
- Radix UI: https://www.radix-ui.com
