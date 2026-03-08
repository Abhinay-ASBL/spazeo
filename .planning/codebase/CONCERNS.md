# Codebase Concerns

**Analysis Date:** 2026-03-09

---

## Tech Debt

**Stripe Webhook Stub — Next.js Route Handler:**
- Issue: The Next.js webhook route at `src/app/api/webhooks/stripe/route.ts` has all event handlers as empty `break` stubs. Checkout completion, subscription updates, cancellations, and payment failures all do nothing.
- Files: `src/app/api/webhooks/stripe/route.ts`
- Impact: Billing events sent to this endpoint (if configured as a Stripe webhook) are silently ignored. The real webhook logic lives in `convex/http.ts` — there are two webhook paths and only one works.
- Fix approach: Remove `src/app/api/webhooks/stripe/route.ts` or add a redirect/proxy to the Convex HTTP action. Document that `convex/http.ts:/stripe-webhook` is the canonical handler.

**3D Building Conversion Pipeline is Not Implemented:**
- Issue: `triggerConversion` in `convex/conversionJobs.ts` creates a job record but then logs a placeholder message and returns. The comment reads `// TODO: Call external Docker worker for actual conversion`.
- Files: `convex/conversionJobs.ts` (line 169)
- Impact: The 3D Building Viewer's model optimization flow is entirely non-functional. Any UI that calls `triggerConversion` will appear to start a job, but nothing will ever process it.
- Fix approach: Implement the external worker call (Docker/external API), or add clear UI feedback that this feature is not yet available.

**Duplicate AI Action Implementations:**
- Issue: Each AI operation (`analyzeScene`, `stageScene`, `enhanceImage`, `generateDescription`) exists twice in `convex/aiActions.ts`: once as a public `action` and once as an `internalAction` (prefixed `process`). The logic is nearly identical — same prompts, same model versions, same polling loops.
- Files: `convex/aiActions.ts`
- Impact: Bug fixes and prompt changes must be applied in two places. Replicate model version `db21e45...` and Real-ESRGAN version `42fed1c4...` are hardcoded in both variants.
- Fix approach: Refactor so the public `action` delegates to the `internalAction` after auth/credit checks, or unify into a single path.

**`leads.ts` Calls `internal.emails.sendLeadNotification` with Missing `tourSlug` Argument:**
- Issue: `convex/leads.ts` line 216 calls `internal.emails.sendLeadNotification` but does not pass the required `tourSlug` field. The action signature at line 369 declares `tourSlug: v.string()` as required.
- Files: `convex/leads.ts` (lines 216–224), `convex/leads.ts` (lines 360–426)
- Impact: Every lead capture will fail when Resend is configured, throwing a Convex validation error and leaving the email unsent.
- Fix approach: Pass `tourSlug: tour.slug` in the `scheduler.runAfter` call at line 216.

**`getAuthUser` Helper Uses `any` Types in `convex/tours.ts`:**
- Issue: The `getAuthUser` function signature uses `ctx: { auth: ..., db: any }` to work around Convex's generated type system.
- Files: `convex/tours.ts` (lines 14–24)
- Impact: Disables type safety for all callers of this helper. DB queries inside are untyped.
- Fix approach: Use Convex's `QueryCtx` / `MutationCtx` types from `'./_generated/server'` as the parameter type.

**Backup File Committed to Repository:**
- Issue: `src/app/(dashboard)/tours/[id]/edit/page.tsx.backup` (1317 lines) is present in the repository and tracked by git.
- Files: `src/app/(dashboard)/tours/[id]/edit/page.tsx.backup`
- Impact: Confusion about which file is canonical, increased repo size, potential for stale code to be referenced.
- Fix approach: Delete the file and add `*.backup` to `.gitignore`.

---

## Known Bugs

**Tour Password Stored as Plaintext:**
- Symptoms: Querying `verifyTourPassword` in `convex/tours.ts` performs a direct string equality check `tour.password !== args.password`. The password is stored verbatim in the `tours` table.
- Files: `convex/tours.ts` (lines 184), `convex/schema.ts` (line 92)
- Trigger: Any user with database read access can see all tour passwords in plaintext.
- Workaround: None currently. Future fix should hash passwords server-side before storage.

**`analytics.track` is Called as a Mutation from the Public Viewer — No Rate Limiting or Auth:**
- Symptoms: `src/app/tour/[slug]/page.tsx` calls `trackAnalytics` (a mutation) directly from a `'use client'` component. The `analytics.track` mutation in `convex/analytics.ts` has no authentication check — any caller with a valid tourId can write analytics events.
- Files: `convex/analytics.ts` (lines 5–34), `src/app/tour/[slug]/page.tsx` (line 145)
- Trigger: Anyone can spam fake analytics events for any tour, inflating view counts.
- Workaround: None. Fix approach: move public analytics tracking to the Convex HTTP action (`/api/analytics`) which at least validates required fields, or add rate limiting.

**`leads.listByTour` Has No Auth Check:**
- Symptoms: The `listByTour` query in `convex/leads.ts` (lines 5–13) fetches all leads for a tourId without verifying the caller owns that tour.
- Files: `convex/leads.ts` (lines 5–13)
- Trigger: Any authenticated Convex user can call `api.leads.listByTour` with any tourId and read another user's leads.
- Workaround: None currently. Fix: add auth check matching `tour.userId === identity.subject`.

---

## Security Considerations

**API Key Generated with `Math.random` (Not Cryptographically Secure):**
- Risk: API keys use `Math.random` for character selection in `convex/users.ts`. This is not a CSPRNG.
- Files: `convex/users.ts` (lines 282–286)
- Current mitigation: Keys have a `spz_` prefix and 32 random chars, but the entropy source is weak.
- Recommendations: Use `crypto.getRandomValues()` or a UUID-based approach for key generation.

**API Keys Stored Plaintext in Convex DB:**
- Risk: The `apiKey` field on the `users` table is stored verbatim. If the DB is compromised, all keys are exposed.
- Files: `convex/schema.ts` (line 44), `convex/users.ts`
- Current mitigation: None.
- Recommendations: Store only a hashed version; display the full key only once on generation.

**Clerk Webhook Has No Signature Verification:**
- Risk: The Clerk webhook handler in `convex/http.ts` (lines 272–349) accepts any POST to `/clerk-webhook` and processes `user.created`, `user.updated`, and `user.deleted` events without verifying the Svix signature.
- Files: `convex/http.ts` (lines 272–349)
- Current mitigation: None — anyone can send a spoofed `user.deleted` event and trigger user data deletion.
- Recommendations: Verify `svix-id`, `svix-timestamp`, and `svix-signature` headers using the Clerk webhook secret before processing.

**Tour Password Verification Exposed as Public Query:**
- Risk: `verifyTourPassword` is a public `query` in `convex/tours.ts`. Queries can be called by anyone. There is no brute-force protection (rate limiting, lockout) on password attempts.
- Files: `convex/tours.ts` (lines 172–208)
- Current mitigation: None.
- Recommendations: Convert to an HTTP Action with rate limiting, or add attempt tracking per session.

**CORS Wildcard on Convex HTTP Actions:**
- Risk: `convex/http.ts` sets `'Access-Control-Allow-Origin': '*'` on all public API endpoints including lead capture and analytics.
- Files: `convex/http.ts` (lines 10–21)
- Current mitigation: None — any website can call the lead capture endpoint and spam leads.
- Recommendations: Restrict origin to `https://spazeo.io` and embed domains.

---

## Performance Bottlenecks

**`analytics.getDashboardOverview` Loads All Events for All Tours in a Single Query:**
- Problem: For a user with many tours, this query fetches every analytics event ever recorded for every tour, then filters in-memory.
- Files: `convex/analytics.ts` (lines 491–630)
- Cause: No index on `analytics.timestamp`; filtering happens after a full `by_tourId` index scan per tour.
- Improvement path: Use the existing `dailyAnalytics` table (which the cron job populates) as the primary data source for dashboard queries instead of raw events.

**`analytics.getTourPerformance` Has an N+1 Query Pattern:**
- Problem: For each tour, it runs two separate queries (analytics events + leads). With 10 tours this is 20+ queries per reactive subscription.
- Files: `convex/analytics.ts` (lines 747–816)
- Cause: `for (const tour of tours)` loop with `await ctx.db.query` calls inside.
- Improvement path: Batch queries or use `dailyAnalytics` aggregate table.

**`analytics.getDashboardStats` Runs N+N Queries Per Dashboard Load:**
- Problem: Fetches events and leads separately for every tour in a `for` loop. Called reactively on the dashboard, so it re-runs on any analytics write.
- Files: `convex/analytics.ts` (lines 340–387)
- Cause: Identical N+1 anti-pattern as `getTourPerformance`.
- Improvement path: Replace with a single aggregated query using `dailyAnalytics`.

**`leads.listAll` Loads All Leads for All Tours In-Memory:**
- Problem: When no tourId filter is provided, it fetches all tours and all their leads, flattens the array, and sorts in JS. No pagination.
- Files: `convex/leads.ts` (lines 56–73)
- Cause: Convex has no cross-table join index; filtering/sorting must happen in application code.
- Improvement path: Add a `by_userId` index on the `leads` table to allow direct user-scoped queries. Add cursor-based pagination.

---

## Fragile Areas

**`convex/aiActions.ts` — Hardcoded Replicate Model Versions:**
- Files: `convex/aiActions.ts` (lines 299, 507, 601)
- Why fragile: Model version hashes `db21e45d3f7023...` (Stable Diffusion inpainting) and `42fed1c497...` (Real-ESRGAN) are hardcoded strings. If Replicate deprecates these versions (they do regularly), all staging and enhancement calls will silently fail or return errors.
- Safe modification: Store model versions as Convex environment variables or in a config document in the DB.
- Test coverage: None — no tests exist for AI action pipelines.

**`convex/aiActions.ts` — OpenAI JSON Parse Without Validation:**
- Files: `convex/aiActions.ts` (lines 74, 174)
- Why fragile: `JSON.parse(data.choices[0].message.content)` will throw if OpenAI returns non-JSON (which happens on content policy refusals, rate limits, or network errors). The outer `try/catch` will mark the job as failed, but the error message will be cryptic.
- Safe modification: Wrap in a try/catch with a descriptive error message and validate the parsed structure before using fields.

**`convex/http.ts` — Stripe Subscription Update Uses Env Vars for Price ID Matching:**
- Files: `convex/http.ts` (lines 138–154)
- Why fragile: `customer.subscription.updated` handler reads `STRIPE_STARTER_MONTHLY_PRICE_ID` etc. from env vars at runtime. If these env vars are not set in Convex, all plan upgrades via subscription update events will silently downgrade to `free`.
- Safe modification: Validate that env vars are defined on startup, or fall back to the `pricingPlans` table for price ID lookup.

**`typescript.ignoreBuildErrors: true` in `next.config.ts`:**
- Files: `next.config.ts` (line 48)
- Why fragile: TypeScript build errors in all `src/` files are silently ignored during `next build`. Regressions that would be caught by the type checker go undetected until runtime.
- Safe modification: Resolve the Convex circular type reference using a path alias or type assertion at the import site in affected files, then remove `ignoreBuildErrors`.

**Large Monolithic Page Files:**
- Files:
  - `src/app/(dashboard)/tours/[id]/edit/page.tsx` (2164 lines)
  - `src/app/(dashboard)/settings/page.tsx` (1422 lines)
  - `src/app/onboarding/page.tsx` (1038 lines)
- Why fragile: Changes to any section require navigating a file that far exceeds the 150-line convention. Multiple concerns are co-located making isolated testing impossible.
- Safe modification: Extract feature sections into dedicated components under `src/components/tour/`, `src/components/settings/`, `src/components/onboarding/`.

---

## Scaling Limits

**Raw `analytics` Table Will Grow Unbounded:**
- Current capacity: No TTL, no archival, no purge strategy.
- Limit: Convex imposes document read limits per query. A tour with 100k+ events will cause queries like `getByTour` (which calls `.collect()` without a limit) to fail or time out.
- Scaling path: Rely on the `dailyAnalytics` rollup table for all dashboard queries; add a cron job to purge raw `analytics` events older than 90 days.

**`bulkDelete` and `duplicate` Mutations Are O(n) Unbounded Loops:**
- Current capacity: Works fine for tours with < 100 scenes.
- Limit: Convex mutations have a 1-second execution limit. A tour with hundreds of scenes and hotspots will cause the mutation to abort mid-delete, leaving orphaned records.
- Files: `convex/tours.ts` (lines 467–514, 516–624)
- Scaling path: Process deletions in batches using scheduled actions, or implement soft-delete with a background cleanup job.

---

## Dependencies at Risk

**Replicate Model Version Hashes Are Static References:**
- Risk: Replicate can deprecate or remove model versions. The hardcoded versions `db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf` and `42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b` may become unavailable.
- Files: `convex/aiActions.ts` (lines 299, 413, 507, 601)
- Impact: Staging and enhancement features break silently — jobs fail with Replicate 404 errors.
- Migration plan: Move model version strings to Convex environment variables so they can be updated without a code deploy.

---

## Missing Critical Features

**No Input Validation or Sanitization on Lead Capture:**
- Problem: `convex/leads.ts` `capture` mutation inserts name and email directly without validation. No email format check, no length limits, no XSS sanitization.
- Blocks: Prevents reliable lead data quality; allows junk/spam leads at zero cost.

**No Idempotency on Stripe Webhook Events:**
- Problem: `convex/http.ts` processes Stripe webhook events without storing processed event IDs. Stripe retries events on non-2xx responses; processing the same `checkout.session.completed` twice would create duplicate subscription records.
- Blocks: Billing reliability at any scale.

**No Pagination on Any Dashboard List Query:**
- Problem: `analytics.getTourPerformance`, `leads.listAll`, `tours.list` all call `.collect()` without cursor-based pagination or result limits.
- Blocks: Dashboard pages will become slow and potentially unusable for power users with large datasets.

---

## Test Coverage Gaps

**No Test Runner Configured:**
- What's not tested: Everything.
- Files: `package.json` — no `vitest`, `jest`, or `playwright` dependency present.
- Risk: Any refactor or new feature can introduce regressions with no automated safety net.
- Priority: High

**AI Action Pipeline (Credit Deduction, Job Status, External API Calls):**
- What's not tested: `convex/aiActions.ts` — credit check, job creation, OpenAI/Replicate calls, result persistence, error handling.
- Files: `convex/aiActions.ts`
- Risk: Credit double-deduction or race conditions go undetected. External API changes break silently.
- Priority: High

**Stripe Billing Webhook Flow:**
- What's not tested: `convex/http.ts` webhook handler — plan upsert, downgrade on cancellation, past_due handling.
- Files: `convex/http.ts`
- Risk: Billing state corruption on edge cases (concurrent webhook delivery, missing metadata).
- Priority: High

**Tour Password Verification:**
- What's not tested: Password gate logic in `convex/tours.ts` and `src/app/tour/[slug]/page.tsx`.
- Files: `convex/tours.ts` (lines 172–208)
- Risk: Logic regressions expose password-protected tours.
- Priority: Medium

---

*Concerns audit: 2026-03-09*
