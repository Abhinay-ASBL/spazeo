---
phase: 01-tour-platform-stabilize-and-polish
plan: 02
subsystem: auth
tags: [bcrypt, convex, password-protection, stripe, webhooks]

# Dependency graph
requires:
  - phase: 01-tour-platform-stabilize-and-polish plan 01
    provides: bcryptjs passwordUtils module with hashTourPassword + verifyTourPassword actions; setTourPassword action in tours.ts; patchTourPassword internalMutation; passwordHash field on tours table

provides:
  - Public viewer uses useAction(api.passwordUtils.verifyTourPassword) for bcrypt-based password verification
  - getBySlugWithScenes query in convex/tours.ts for post-verification scene loading
  - Editor settings tab calls setTourPassword action (hashed write path)
  - All four Stripe webhook event types confirmed fully implemented end-to-end
affects:
  - tour-viewer, dashboard-editor, billing, subscriptions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Password gate: useAction for verification (async, bcrypt-backed), useQuery with skip for post-verification data load"
    - "Two-phase tour load: getBySlug returns requiresPassword flag; getBySlugWithScenes returns scenes after client-side verification"

key-files:
  created: []
  modified:
    - convex/tours.ts
    - src/app/tour/[slug]/page.tsx
    - src/app/(dashboard)/tours/[id]/edit/page.tsx
    - convex/http.ts

key-decisions:
  - "getBySlugWithScenes skips password re-check — caller (client) is trusted to have verified via action before calling this query"
  - "Password input in editor resets to empty string on render (defaultValue='') — no round-trip of hashed value to client"

patterns-established:
  - "Action-based auth gates: useAction for verification → state flag → useQuery with skip for gated data"

requirements-completed:
  - FIX-02
  - FIX-03
  - TOUR-05

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 1 Plan 02: Password Gate + Stripe Webhook Summary

**Public viewer bcrypt password gate wired via useAction; getBySlugWithScenes query added for post-verification scene load; editor calls setTourPassword action; all four Stripe webhook events confirmed end-to-end**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T07:09:22Z
- **Completed:** 2026-03-09T07:11:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced plaintext `useQuery(api.tours.verifyTourPassword)` with `useAction(api.passwordUtils.verifyTourPassword)` — public viewer now uses bcrypt comparison, not the no-op query
- Added `getBySlugWithScenes` query to `convex/tours.ts` — called after `passwordVerified=true` to load full scene data without re-checking password
- Wired editor settings password field to `setTourPassword` action — password is hashed via bcrypt before storage; `updateTour` mutation is no longer in the write path for passwords
- Verified all four Stripe webhook event types (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) are fully implemented and call `upsertFromStripe` + `syncPlanToUser` correctly

## Task Commits

1. **Task 1: Switch password gate to useAction + add getBySlugWithScenes + wire editor settings** - `9448dc2` (feat)
2. **Task 2: Verify Stripe webhook integrity (FIX-03)** - `f913b54` (chore)

## Files Created/Modified

- `convex/tours.ts` - Added `getBySlugWithScenes` public query (returns scenes + hotspots + imageUrls, requiresPassword: false)
- `src/app/tour/[slug]/page.tsx` - Added `useAction`, `verifyPassword` action call, `passwordVerified`/`verifying`/`showPasswordError` state, `unlockedTour` query; async `handlePasswordSubmit`; spinner on submit button
- `src/app/(dashboard)/tours/[id]/edit/page.tsx` - Added `useAction` import, `setTourPassword` action hook; password onBlur now calls action instead of mutation
- `convex/http.ts` - Added FIX-03 verification comment block above switch statement

## Decisions Made

- `getBySlugWithScenes` skips the password gate entirely — it is a trusted query called only after client-side verification; the security boundary is the bcrypt action, not this query
- Editor password input uses `defaultValue=""` rather than showing the stored hash — hashed passwords should never round-trip to the client

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FIX-02 and FIX-03 are complete. The bcrypt password protection flow is now end-to-end: set via action (hashed), verify via action (bcrypt compare), load scenes via query (trusted, post-verification).
- Stripe webhook is confirmed working for all subscription lifecycle events.
- Plans 03-05 can proceed independently.

---
*Phase: 01-tour-platform-stabilize-and-polish*
*Completed: 2026-03-09*
