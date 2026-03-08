# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- TypeScript 5.x - All frontend (`src/`) and Convex backend (`convex/`) code
- CSS (Tailwind v4) - Styling via `src/app/globals.css`

**Secondary:**
- HTML - Email templates rendered in `convex/emails.ts` as inline strings

## Runtime

**Environment:**
- Node.js (target: ES2017, module resolution: bundler)
- Package Manager: npm (lockfile: `package-lock.json` present as `package.json` references it)

**TypeScript Config:**
- `strict: true`, `noEmit: true`
- Path alias `@/*` maps to `./src/*`
- `typescript.ignoreBuildErrors: true` in `next.config.ts` — Convex-generated `api.d.ts` creates circular type references incompatible with Next.js build checker

## Frameworks

**Core:**
- Next.js 16.1.6 (App Router) - SSR, routing, server/client components, ISR
- React 19.2.3 - UI rendering
- Convex 1.32.0 - Reactive serverless backend (database, functions, file storage, cron jobs)

**3D / Panorama Viewers:**
- `@photo-sphere-viewer/core` 5.14.1 - 360° equirectangular panorama rendering
- `@photo-sphere-viewer/autorotate-plugin` 5.14.1 - Idle auto-spin for panoramas
- `@photo-sphere-viewer/markers-plugin` 5.14.1 - Hotspot overlays on panoramas
- `three` 0.183.1 + `@react-three/fiber` 9.5.0 + `@react-three/drei` 10.7.7 - 3D building model viewer (`.glb`/`.gltf`)

**UI / Styling:**
- Tailwind CSS 4.x - Utility-first CSS; all theme config in `src/app/globals.css` via `@theme {}` — NO `tailwind.config.ts`
- `@tailwindcss/postcss` 4.x - PostCSS integration for Tailwind v4
- Radix UI - Accessible component primitives:
  - `@radix-ui/react-dialog` 1.1.15
  - `@radix-ui/react-dropdown-menu` 2.1.16
  - `@radix-ui/react-slot` 1.2.4
  - `@radix-ui/react-tooltip` 1.2.8
- `lucide-react` 0.575.0 - Icon system (24px, 1.5px stroke)
- `framer-motion` 12.34.3 - Page transitions and micro-interactions
- `clsx` 2.1.1 + `tailwind-merge` 3.5.0 - Conditional class composition via `cn()`

**State Management:**
- Zustand 5.0.11 - Client-side ephemeral state (viewer controls, UI toggles)
  - Import pattern: `import { create } from 'zustand'`

**Auth:**
- `@clerk/nextjs` 6.38.2 - User management, JWT, social login, route protection
- `convex/react-clerk` (bundled with `convex`) - Bridges Clerk JWTs to Convex auth

**Payments:**
- `stripe` 20.3.1 - Stripe SDK for subscription billing; lazy-initialized via proxy in `src/lib/stripe.ts` to prevent build-time crash without env vars

**UX Utilities:**
- `react-hot-toast` 2.6.0 - Toast notifications (configured in `src/app/layout.tsx`)
- `react-dropzone` 15.0.0 - File upload drag-and-drop zones

**Fonts (Google Fonts via `next/font`):**
- Plus Jakarta Sans - Display/heading font (`--font-jakarta`)
- DM Sans - Body/UI font (`--font-dmsans`)

**Build / Dev:**
- Turbopack - Dev server bundler (configured in `next.config.ts` under `turbopack.root`)
- ESLint 9.x with `eslint-config-next` 16.1.6 - Linting via `npm run lint`
- `@types/three` 0.183.1, `@types/react` 19, `@types/node` 20 - Type definitions

## Key Dependencies

**Critical (app cannot function without):**
- `convex` 1.32.0 - Entire backend: database, auth bridge, file storage, cron jobs, vector search
- `@clerk/nextjs` 6.38.2 - All authentication and user identity
- `stripe` 20.3.1 - Subscription billing and payment processing
- `next` 16.1.6 + `react` 19.2.3 - Core rendering framework

**AI Pipeline:**
- OpenAI GPT-4o - Scene analysis, descriptions (called via `fetch` in `convex/aiActions.ts`, model: `gpt-4o`)
- Replicate (Stable Diffusion) - Virtual staging, image enhancement (model versions hardcoded in `convex/aiActions.ts`)

**Infrastructure:**
- Resend - Transactional email delivery (called via direct REST `fetch` to `https://api.resend.com/emails` in `convex/emails.ts`)
- PostHog - Product analytics (accessed via `window.posthog` runtime bridge, no npm package; abstracted in `src/lib/posthog.ts`)

## Configuration

**Environment:**
- Frontend env vars prefixed `NEXT_PUBLIC_` stored in `.env.local`
- Convex-specific secrets (OpenAI, Replicate, Resend, Stripe, Clerk issuer) stored in Convex environment via `npx convex env set`
- `.env.example` documents all required variables

**Required env vars (frontend):**
- `NEXT_PUBLIC_CONVEX_URL` - Connects Next.js to Convex deployment
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk frontend auth (must start with `pk_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe frontend key
- `NEXT_PUBLIC_SITE_URL` - Production domain

**Required env vars (server/middleware):**
- `CLERK_SECRET_KEY` - Clerk server-side verification
- `STRIPE_SECRET_KEY` - Stripe API calls
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification
- `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID`, etc. - Plan price ID matching in `convex/http.ts`

**Required env vars (Convex):**
- `OPENAI_API_KEY` - GPT-4o Vision and chat completions
- `REPLICATE_API_TOKEN` - Stable Diffusion predictions
- `RESEND_API_KEY` - Transactional email
- `CLERK_ISSUER_URL` - JWT verification domain for Convex auth

**Build:**
- `next.config.ts` - Security headers (CSP, HSTS, X-Frame-Options), image remote patterns, Turbopack root, `typescript.ignoreBuildErrors: true`
- `tsconfig.json` - `@/*` alias, strict mode, bundler module resolution
- `convex/schema.ts` - Convex database schema (source of truth for all tables)
- `convex/auth.config.ts` - Clerk JWT domain for Convex JWT verification

## Platform Requirements

**Development:**
- Run two servers simultaneously: `npx convex dev` (Convex functions) and `npm run dev` (Next.js on localhost:3000)
- Convex CLI required: `npx convex dev` watches `convex/`, syncs schema, deploys functions
- Both servers required for full functionality; app renders in passthrough mode (no auth) when env vars are absent

**Production:**
- Frontend: Vercel (auto-deploys on git push to main)
- Backend: Convex Cloud (`npx convex deploy`)
- Domain: spazeo.io (Clerk domain: clerk.spazeo.io)
- No test runner configured (vitest/playwright absent from `package.json`)

---

*Stack analysis: 2026-03-09*
