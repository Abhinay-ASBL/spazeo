# Quick Deployment Reference

**TL;DR version of deployment process**

---

## 1️⃣ Local Setup (5 minutes)

```bash
# Copy environment template
cp .env.example .env.local

# Fill in your test API keys in .env.local
# Get them from:
# - Convex: https://dashboard.convex.dev
# - Clerk: https://dashboard.clerk.com
# - Stripe: https://dashboard.stripe.com

# Install and run locally
npm install
npm run dev

# Should be available at http://localhost:3000
```

---

## 2️⃣ Vercel Deployment (5 minutes)

```bash
# Push your code to GitHub (if not already done)
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

Then in Vercel Dashboard:
1. Connect your GitHub repository
2. Go to **Settings → Environment Variables**
3. Add these variables (get values from your dashboards):
   ```
   NEXT_PUBLIC_CONVEX_URL = https://your-deployment.convex.cloud
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_xxxxx
   CLERK_SECRET_KEY = sk_test_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_xxxxx
   STRIPE_SECRET_KEY = sk_test_xxxxx
   STRIPE_WEBHOOK_SECRET = whsec_xxxxx
   NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID = price_xxxxx
   NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID = price_xxxxx
   NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID = price_xxxxx
   NEXT_PUBLIC_SITE_URL = https://your-vercel-domain.com
   ```
4. Click "Deploy"
5. Wait ~2-5 minutes for build to complete

---

## 3️⃣ Post-Deploy Configuration (10 minutes)

### Update Clerk Redirect URLs
- Go to https://dashboard.clerk.com
- Add your Vercel domain as authorized origin
- Update redirect URLs if using Clerk-hosted pages

### Add Stripe Webhook
- Go to https://dashboard.stripe.com → Webhooks
- Add endpoint: `https://your-domain.com/api/webhooks/stripe`
- Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
- Copy signing secret to Vercel `STRIPE_WEBHOOK_SECRET`

---

## 4️⃣ Verify Deployment ✅

```bash
# Test webhook endpoint (should return 400 for missing signature, not 404)
curl -X POST https://your-domain.com/api/webhooks/stripe

# Should see a response, not a 404 error
```

Test in browser:
- [ ] App loads at domain
- [ ] Sign-in redirects to Clerk
- [ ] Can sign up and create account
- [ ] Dashboard loads after sign-in
- [ ] Billing page is accessible
- [ ] No errors in browser console

---

## 🔑 Environment Variables Quick Reference

| Variable | Where to Get | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex Dashboard | `https://xxx.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk API Keys | `pk_test_xxx` |
| `CLERK_SECRET_KEY` | Clerk API Keys | `sk_test_xxx` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe API Keys | `pk_test_xxx` |
| `STRIPE_SECRET_KEY` | Stripe API Keys | `sk_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks | `whsec_xxx` |
| `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` | Stripe Products | `price_xxx` |
| `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID` | Stripe Products | `price_xxx` |
| `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` | Stripe Products | `price_xxx` |
| `NEXT_PUBLIC_SITE_URL` | Your domain | `https://spazeo.io` |

---

## 🚨 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Module not found: Convex" | Run `npx convex deploy` first |
| Clerk sign-in redirects to 404 | Check Clerk redirect URLs in dashboard |
| Stripe webhook returns 404 | Verify webhook URL in Stripe dashboard |
| Environment vars undefined | Check Vercel dashboard has all vars added |
| Build fails with TypeScript errors | This is normal due to Convex types — check `next.config.ts` has `ignoreBuildErrors: true` |
| Images not loading | Check `next.config.ts` has correct remote patterns |
| Slow performance | Check Vercel Analytics dashboard |

---

## 📚 Full Documentation

For detailed setup instructions, see:
- **Full Deployment Guide:** `DEPLOYMENT.md`
- **Setup Summary:** `VERCEL_SETUP_SUMMARY.md`
- **Environment Template:** `.env.example`

---

## 🔗 Useful Links

- Vercel Dashboard: https://vercel.com
- Convex Dashboard: https://dashboard.convex.dev
- Clerk Dashboard: https://dashboard.clerk.com
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Webhook Testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## ⏱️ Time Estimates

- Setup & testing locally: **30 min**
- Create Vercel project: **5 min**
- Add environment variables: **5 min**
- Initial deploy: **5 min**
- Post-deploy config: **15 min**
- Testing & verification: **15 min**

**Total: ~75 minutes for complete deployment**

---

**Need help?** Check `DEPLOYMENT.md` for detailed troubleshooting and step-by-step instructions.
