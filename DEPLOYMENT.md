# Spazeo Deployment Guide (SPA-96)

This document provides a complete checklist for deploying the Spazeo Next.js 15 application with Convex backend, Clerk authentication, and Stripe billing to Vercel.

## Prerequisites

- [ ] Node.js 18+ installed locally
- [ ] Git repository initialized and committed
- [ ] Vercel account created (https://vercel.com)
- [ ] All required third-party accounts and API keys obtained

---

## Phase 1: Pre-Deployment Setup

### 1.1 Convex Backend Setup

- [ ] Navigate to [Convex Dashboard](https://dashboard.convex.dev)
- [ ] Create a new project or select your existing "spazeo-17eef" project
- [ ] Copy the `NEXT_PUBLIC_CONVEX_URL` from your deployment settings
  - Format: `https://your-deployment.convex.cloud`
- [ ] Generate and copy the `CONVEX_DEPLOY_KEY` from Settings → Deploy Keys
- [ ] Push Convex functions to production:
  ```bash
  npx convex deploy
  ```
- [ ] Verify Convex functions are accessible from your Vercel domain

### 1.2 Clerk Authentication Setup

- [ ] Go to [Clerk Dashboard](https://dashboard.clerk.com)
- [ ] Create a new application (if not already created)
- [ ] Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
- [ ] Copy `CLERK_SECRET_KEY` (starts with `sk_`)
- [ ] In Clerk Dashboard → API Keys → Copy these keys
- [ ] Configure Redirect URLs in Clerk Dashboard:
  - **Development:** `http://localhost:3000`
  - **Production:** `https://your-domain.com`
- [ ] Add authorized origins:
  - **Production:** `https://your-domain.com`
  - Make sure to include both www and non-www variants if applicable
- [ ] Create sign-in and sign-up pages in your app (or use Clerk's hosted pages)

### 1.3 Stripe Billing Setup

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Copy `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
- [ ] Copy `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
- [ ] Create three subscription products and price tiers:
  - **Starter Plan** → Copy Price ID to `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
  - **Professional Plan** → Copy Price ID to `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID`
  - **Business Plan** → Copy Price ID to `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID`
- [ ] Set up Stripe Webhook:
  - In Stripe Dashboard → Webhooks → Add endpoint
  - URL: `https://your-domain.com/api/webhooks/stripe`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
  - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook in development with Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

### 1.4 Domain Configuration

- [ ] Purchase or reserve your domain (e.g., spazeo.io)
- [ ] Note your production domain URL for use in environment variables
- [ ] Update `NEXT_PUBLIC_SITE_URL` environment variable with your domain
- [ ] (Optional) Set up a custom domain in Vercel:
  - Vercel Dashboard → Project Settings → Domains
  - Follow Vercel's instructions to add DNS records

---

## Phase 2: Vercel Deployment

### 2.1 Connect to Vercel

- [ ] Go to [Vercel Dashboard](https://vercel.com)
- [ ] Click "New Project"
- [ ] Select your Spazeo GitHub repository
- [ ] Configure project settings:
  - **Framework Preset:** Next.js
  - **Build Command:** `next build` (should be pre-filled)
  - **Install Command:** `npm install` (should be pre-filled)
  - **Output Directory:** `.next` (should be pre-filled)

### 2.2 Add Environment Variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables, add all variables:

**Convex:**
- [ ] `NEXT_PUBLIC_CONVEX_URL` = (your Convex deployment URL)
- [ ] `CONVEX_DEPLOY_KEY` = (from Convex Settings)

**Clerk:**
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = (from Clerk Dashboard)
- [ ] `CLERK_SECRET_KEY` = (from Clerk Dashboard)

**Stripe:**
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = (from Stripe Dashboard)
- [ ] `STRIPE_SECRET_KEY` = (from Stripe Dashboard)
- [ ] `STRIPE_WEBHOOK_SECRET` = (from Stripe Webhook)
- [ ] `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` = (price ID)
- [ ] `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID` = (price ID)
- [ ] `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` = (price ID)

**Site Configuration:**
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://your-domain.com`

**Visibility Settings:**
- Mark variables starting with `NEXT_PUBLIC_` as "Exposed to Browser"
- Mark all secret keys (those starting with `sk_`, `CLERK_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) as "Production" environment only
- Keep `CONVEX_DEPLOY_KEY` as "Production" only

### 2.3 Deploy

- [ ] Click "Deploy" in Vercel Dashboard
- [ ] Wait for the build to complete (typically 2-5 minutes)
- [ ] Check build logs for any errors related to:
  - TypeScript compilation (especially Convex type generation)
  - Image optimization with remote patterns
  - Environment variable loading

### 2.4 Post-Deployment Verification

- [ ] Verify Vercel deployment URL is accessible
- [ ] Check that the app loads without errors in browser console
- [ ] Test Clerk sign-in/sign-up flow
- [ ] Test webhook endpoint returns 200 OK:
  ```bash
  curl -X POST https://your-domain.com/api/webhooks/stripe \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  ```
  (Should return 400 for invalid signature, not 404)

---

## Phase 3: Environment-Specific Configuration

### 3.1 Update Clerk Redirect URLs

After deploying, update Clerk Dashboard with final production URLs:
- [ ] Development: `http://localhost:3000`
- [ ] Production: `https://your-vercel-domain.com` (initial Vercel deployment)
- [ ] Production: `https://your-custom-domain.com` (if using custom domain)

### 3.2 Update Stripe Webhook Endpoint

- [ ] In Stripe Dashboard → Webhooks:
  - [ ] Add production webhook: `https://your-domain.com/api/webhooks/stripe`
  - [ ] Keep development webhook for local testing with Stripe CLI
  - [ ] Test webhook delivery from Stripe Dashboard

### 3.3 Configure DNS (if using custom domain)

- [ ] Point your domain DNS to Vercel's nameservers, or
- [ ] Add CNAME records pointing to Vercel (see Vercel's domain instructions)
- [ ] Wait for DNS propagation (typically 5 minutes to 24 hours)
- [ ] Verify SSL certificate is auto-generated (Vercel handles this)

---

## Phase 4: Security & Performance

### 4.1 Security Headers

The `vercel.json` file includes:
- [ ] `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- [ ] `X-Frame-Options: SAMEORIGIN` — Prevents clickjacking
- [ ] `X-XSS-Protection: 1; mode=block` — Enables browser XSS filtering
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` — Controls referrer leaking
- [ ] `Permissions-Policy` — Disables camera, microphone, geolocation

### 4.2 Image Optimization

The `next.config.ts` includes remote patterns for:
- [ ] Convex Cloud images (`*.convex.cloud`)
- [ ] Clerk images (`img.clerk.com`)
- [ ] Google OAuth avatars (`lh3.googleusercontent.com`)
- [ ] GitHub avatars (`avatars.githubusercontent.com`)
- [ ] Demo images (`picsum.photos`)

### 4.3 Performance Optimization

- [ ] Enable "Web Analytics" in Vercel Dashboard to monitor performance
- [ ] Monitor Core Web Vitals (LCP, FID, CLS)
- [ ] Check that Convex requests are properly cached
- [ ] Verify image optimization is working (check Network tab)

### 4.4 Monitoring & Logging

- [ ] Set up error monitoring (e.g., Sentry, LogRocket)
- [ ] Monitor Stripe webhook delivery in Stripe Dashboard
- [ ] Monitor Convex function execution in Convex Dashboard
- [ ] Set up email alerts for deployment failures

---

## Phase 5: Testing

### 5.1 Functional Testing

- [ ] Test unauthenticated access (should redirect to sign-in)
- [ ] Test sign-in flow with Clerk
- [ ] Test sign-up flow with Clerk
- [ ] Test authenticated dashboard access
- [ ] Test all protected routes (`/dashboard`, `/tours`, `/analytics`, `/leads`, `/settings`, `/billing`, `/onboarding`)
- [ ] Test billing page and subscription flow
- [ ] Test webhook by triggering a test event from Stripe Dashboard

### 5.2 API Testing

- [ ] Test Convex queries and mutations from the browser
- [ ] Test Stripe webhook endpoint with Stripe CLI:
  ```bash
  stripe trigger charge.succeeded
  ```
- [ ] Verify webhook logs in Stripe Dashboard show successful deliveries

### 5.3 Error Handling

- [ ] Test with invalid/expired Clerk session
- [ ] Test with invalid Stripe credentials (should fail gracefully)
- [ ] Test with missing environment variables (should show appropriate errors)
- [ ] Test network errors and timeouts (should retry appropriately)

---

## Troubleshooting

### Build Failures

**Problem:** TypeScript errors related to Convex types
- **Solution:** Run `npx convex codegen` locally, ensure `convex/` directory is in `.gitignore`, check that Convex CLI is up to date

**Problem:** Image optimization errors
- **Solution:** Verify all remote hostname patterns in `next.config.ts` are correct, ensure domains are accessible

**Problem:** Environment variables not loading
- **Solution:** Check Vercel dashboard that all variables are added, ensure visibility settings are correct (`NEXT_PUBLIC_*` are exposed)

### Runtime Issues

**Problem:** 401 errors on protected routes
- **Solution:** Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct, check Clerk redirect URLs are configured

**Problem:** Stripe webhook not triggering
- **Solution:** Verify webhook URL in Stripe Dashboard, check webhook signing secret matches, test with Stripe CLI locally first

**Problem:** Convex queries returning undefined
- **Solution:** Verify `NEXT_PUBLIC_CONVEX_URL` points to correct deployment, check Convex functions are deployed with `npx convex deploy`

### Domain Issues

**Problem:** Custom domain not resolving
- **Solution:** Wait for DNS propagation (up to 24 hours), verify DNS records in domain registrar, check Vercel domain settings

**Problem:** SSL certificate not issuing
- **Solution:** Usually automatic with Vercel; if stuck, try removing and re-adding domain in Vercel settings

---

## Rollback Plan

If deployment fails or needs rollback:

1. [ ] Go to Vercel Dashboard → Deployments
2. [ ] Find the previous successful deployment
3. [ ] Click the three-dot menu → "Promote to Production"
4. [ ] Verify previous version is now live
5. [ ] Investigate failure in build logs
6. [ ] Fix issues locally and commit to git
7. [ ] Re-deploy by pushing to main branch (if auto-deploy enabled)

---

## Maintenance & Updates

### Regular Tasks

- [ ] Monitor Vercel Analytics weekly
- [ ] Check Convex function logs in Convex Dashboard
- [ ] Review Stripe billing reports monthly
- [ ] Keep dependencies updated (check `package.json` and run `npm update`)
- [ ] Monitor error tracking service (if configured)

### Security Updates

- [ ] Monitor dependency security vulnerabilities
- [ ] Keep Vercel deployment up-to-date
- [ ] Rotate Stripe webhook signing secret periodically
- [ ] Review Clerk security settings monthly
- [ ] Check for exposed environment variables (e.g., in git history)

---

## Configuration Files Reference

- **`vercel.json`** — Deployment configuration with security headers
- **`.env.example`** — Template for environment variables
- **`next.config.ts`** — Next.js configuration (image patterns, type-checking rules)
- **`package.json`** — Build scripts and dependencies
- **`middleware.ts`** — Clerk authentication middleware

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Convex Docs:** https://docs.convex.dev
- **Clerk Docs:** https://clerk.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Your Project Issues:** Check Linear (SPA-96) for deployment-specific tasks

---

**Last Updated:** 2026-03-05
**Project:** Spazeo (SPA-96)
**Stack:** Next.js 15 + Convex + Clerk + Stripe
