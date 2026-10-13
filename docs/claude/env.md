# Spazeo — Environment Variables

> Moved verbatim from `AGENTS.md`/`CLAUDE.md` to keep startup context small.

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
