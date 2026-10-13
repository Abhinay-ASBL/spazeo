# Spazeo — Project Structure

> Moved verbatim from `AGENTS.md`/`CLAUDE.md` to keep startup context small.

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
