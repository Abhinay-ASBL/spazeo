# SPAZEO

**Step Inside Any Space** — The AI-powered 360° virtual tour platform for real estate professionals.

Spazeo converts panorama photos into immersive, walkable 3D experiences using Gaussian Splatting, AI staging, depth estimation, and smart search.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Convex (reactive database, serverless functions, file storage) |
| Auth | Clerk (user management, JWT, social login, RBAC) |
| 3D Rendering | Three.js via @react-three/fiber + drei |
| AI | OpenAI GPT-4o Vision, Replicate (Stable Diffusion), Gaussian Splatting |
| Payments | Stripe (subscriptions, usage metering, webhooks) |
| Email | Resend (transactional emails via Convex) |
| Hosting | Vercel (frontend) + Convex Cloud (backend) |
| UI | Radix UI primitives, Framer Motion, Lucide React |

## Project Structure

```
spazeo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Clerk sign-in / sign-up
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── tour/[slug]/        # Public tour viewer
│   │   ├── pricing/            # Pricing page
│   │   └── api/webhooks/       # Stripe webhook
│   ├── components/
│   │   ├── ui/                 # Base UI components (Radix + Tailwind)
│   │   ├── layout/             # Navbar, Sidebar, Footer
│   │   ├── viewer/             # 360° panorama viewer, hotspots
│   │   ├── tour/               # Tour cards, upload, scene list
│   │   └── providers/          # ConvexClientProvider
│   ├── hooks/                  # useTour, useViewer, useAI
│   ├── lib/                    # utils, constants, stripe
│   └── types/                  # TypeScript interfaces
├── convex/                     # Convex backend
│   ├── schema.ts               # Database schema (10 tables)
│   ├── tours.ts                # Tour CRUD
│   ├── scenes.ts               # Scene management + file upload
│   ├── ai.ts                   # AI pipeline (OpenAI, Replicate)
│   ├── leads.ts                # Lead capture
│   ├── analytics.ts            # View tracking & aggregation
│   ├── subscriptions.ts        # Billing logic
│   ├── http.ts                 # Webhooks & public API
│   └── ...                     # users, hotspots, search, crons
├── middleware.ts                # Clerk route protection
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account
- (Optional) Stripe, OpenAI, and Replicate API keys

### Setup

```bash
# 1. Install dependencies
cd spazeo
npm install

# 2. Initialize Convex (link to your project)
npx convex init

# 3. Configure environment variables
#    Copy .env.local and fill in your keys:
#    - NEXT_PUBLIC_CONVEX_URL
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#    - CLERK_SECRET_KEY

# 4. Set Convex environment variables (in Convex dashboard):
#    - CLERK_ISSUER_URL
#    - OPENAI_API_KEY (optional, for AI features)
#    - STRIPE_SECRET_KEY (optional, for billing)

# 5. Start both servers
npx convex dev    # Convex dev server (syncs schema, deploys functions)
npm run dev       # Next.js dev server (localhost:3000)
```

### Scripts

```bash
npm run dev       # Start Next.js dev server with Turbopack
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
npx convex dev    # Start Convex dev server
npx convex deploy # Deploy Convex backend to production
```

## Key Features

- **360° Immersive Viewer** — WebGL-powered panorama rendering with click-drag navigation, zoom, and touch support
- **AI Scene Analysis** — GPT-4o Vision identifies room types, objects, and features from panoramas
- **AI Virtual Staging** — Transform empty rooms into furnished spaces via Stable Diffusion
- **AI Description Generation** — Auto-generate marketing copy from scene analysis data
- **Smart Hotspots** — Interactive navigation points linking rooms with smooth transitions
- **Lead Capture** — Built-in contact forms on public tours with email notifications
- **Analytics Dashboard** — Track views, engagement, and conversion per tour
- **Subscription Billing** — Stripe-powered plans (Free, Pro, Business)
- **Real-Time Sync** — Convex reactive queries auto-update the UI without polling
- **Role-Based Access** — Owner, Admin, Editor, Viewer roles with server-side enforcement

## Architecture Highlights

**Reactive Backend (Convex):** All data reads use reactive queries — when data changes, every subscribed client updates automatically. No polling, no websocket setup, no cache invalidation.

**Auth Flow:** `ClerkProvider` -> `ConvexProviderWithClerk` -> App. Clerk handles sessions, Convex verifies JWTs server-side. Every backend function checks `ctx.auth.getUserIdentity()`.

**File Upload (3-Step Pattern):**
1. Generate a short-lived upload URL via mutation
2. POST the file directly to Convex storage
3. Save the `storageId` reference to the document

**AI Pipeline:** Frontend creates a job record (pending) -> schedules a Convex Action -> Action calls external API (OpenAI/Replicate) -> saves result via internal mutation -> frontend auto-updates reactively.

## Deployment

**Frontend:** Push to `main` -> Vercel auto-builds and deploys.

**Backend:** Run `npx convex deploy` to push the `convex/` directory to Convex Cloud.

## License

Proprietary. All rights reserved.

---

Built by [Karthik Padidam](https://spazeo.io) | spazeo.io
