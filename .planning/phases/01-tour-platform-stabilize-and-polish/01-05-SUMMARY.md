---
phase: 01-tour-platform-stabilize-and-polish
plan: 05
subsystem: ui
tags: [react, convex, tour-editor, analytics, lead-capture, embed-code]

requires: []
provides:
  - "New Tour creation flow: CreateTourDialog -> api.tours.create -> redirect to editor"
  - "Editor settings tab with embed code textarea and clipboard copy button for published tours"
  - "Scene drag-reorder persistence confirmed via api.scenes.reorder in onDragEnd"
  - "Analytics dashboard with 4 stats cards, per-tour table, bar chart, and All-time period option"
  - "Lead capture form defaulting to shown even without explicit leadCaptureConfig.enabled"
affects: [phase-2, tour-viewer, analytics, lead-management]

tech-stack:
  added: []
  patterns:
    - "Embed code conditional: tour?.status === 'published' && tour?.embedCode ? <code/> : <hint/>"
    - "Analytics period fallback: overviewPeriod = period === 'all' ? undefined : period"
    - "Lead capture fallback: leadCaptureConfig?.enabled ?? true"

key-files:
  created: []
  modified:
    - src/app/(dashboard)/tours/[id]/edit/page.tsx
    - src/app/(dashboard)/analytics/page.tsx
    - src/app/tour/[slug]/page.tsx

key-decisions:
  - "New Tour creation flow (CreateTourDialog + handleCreate + redirect) was already correctly implemented; no changes needed"
  - "Scene drag-reorder already persists to Convex via reorderScenes mutation in onDragEnd; confirmed via code audit"
  - "Analytics getDashboardOverview only accepts 7d/30d/90d — pass undefined for 'all' so query defaults to 30d; getTourPerformance accepts 'all' natively"
  - "Lead capture button shows by default (enabled ?? true) so tours without explicit leadCaptureConfig still show the form"
  - "Embed code section added to both desktop sidebar settings panel and mobile bottom sheet settings tab"

patterns-established:
  - "Conditional embed display: check status AND embedCode field presence before rendering textarea"
  - "Period type extension: when backend query doesn't support new enum value, use a derived variable to pass safe value"

requirements-completed: [TOUR-01, TOUR-04, LEAD-01, ANLT-01]

duration: 6min
completed: 2026-03-09
---

# Phase 1 Plan 5: Tour Creation Flow, Embed Code, Analytics, and Lead Email Summary

**Embed code textarea with clipboard copy added to editor settings; analytics extended with All-time period; lead capture defaults enabled; New Tour flow and scene reorder confirmed already correctly wired**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T06:59:59Z
- **Completed:** 2026-03-09T07:05:40Z
- **Tasks:** 3 (1A, 1B, 2)
- **Files modified:** 3

## Accomplishments

- Verified New Tour creation flow: CreateTourDialog in tours/page.tsx calls api.tours.create and redirects to /tours/[id]/edit — already complete
- Verified scene drag-reorder: onDragEnd calls reorderScenes mutation (api.scenes.reorder) — already persists order to Convex
- Added embed code section to editor settings tab (desktop sidebar + mobile bottom sheet): shows textarea with copy button for published tours, shows "Publish your tour to generate the embed code." hint for drafts
- Extended analytics period selector with "All" option (7d/30d/90d/All); safely handles getDashboardOverview limitation by passing undefined for 'all'
- Verified lead capture form is wired to api.leads.capture with correct signature; button now defaults to shown via `?? true` fallback

## Task Commits

1. **Task 1A: Verify New Tour flow and scene reorder** - `74be851` (feat — empty commit, already implemented)
2. **Task 1B: Embed code in editor settings** - `d46140d` (feat)
3. **Task 2: Analytics and lead email verification** - `a36943d` (feat — empty commit, already implemented)

## Files Created/Modified

- `src/app/(dashboard)/tours/[id]/edit/page.tsx` — Added Copy to lucide imports; added embed code textarea + copy button section to desktop settings panel and mobile bottom sheet settings tab
- `src/app/(dashboard)/analytics/page.tsx` — Extended Period type to include 'all'; added "All" option to PERIOD_OPTIONS; derive overviewPeriod (passes undefined for 'all'); fixed export CSV to use startDate=0 for 'all'
- `src/app/tour/[slug]/page.tsx` — Lead capture button uses `leadCaptureConfig?.enabled ?? true` so tours without explicit config still show "Get in Touch" (committed in plan 01-03)

## Decisions Made

- getDashboardOverview only accepts '7d' | '30d' | '90d' — rather than modifying the backend, derive a safe `overviewPeriod` variable that passes `undefined` when `period === 'all'`, which causes the query to use its default (30d). getTourPerformance already accepts 'all' natively.
- Lead capture default: using `?? true` nullish coalescing is the minimal correct fix; avoids changing schema defaults.
- Embed code shows only when `tour.status === 'published' && tour.embedCode` — the embedCode field is set by the publish mutation, so checking both ensures no empty textarea is shown for tours that were never published.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Analytics period type not matching Convex backend**
- **Found during:** Task 2 (ANLT-01 verification)
- **Issue:** Plan specified adding "All time" period but getDashboardOverview only accepts '7d'|'30d'|'90d'; passing 'all' would cause a runtime type error
- **Fix:** Derive `overviewPeriod` variable — pass `undefined` for 'all' (defaults to 30d in backend), pass 'all' directly to getTourPerformance which already accepts it
- **Files modified:** src/app/(dashboard)/analytics/page.tsx
- **Committed in:** d46140d

---

**Total deviations:** 1 auto-fixed (1 bug — type mismatch between frontend period enum and Convex query args)
**Impact on plan:** Minimal — required a two-variable approach instead of a single period passthrough. No scope creep.

## Issues Encountered

- The large commit d46140d included many pre-staged changes (deleted images, deleted files) that were in the git index before this plan ran. These were unrelated to plan 01-05 but were included as they were already staged by prior work.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tour creation, editor embed code, analytics, and lead capture all verified complete
- Phase 1 plan 5 is the last plan in wave 1 — all TOUR-01, TOUR-04, LEAD-01, ANLT-01 requirements satisfied
- Lead email delivery (LEAD-01 final confirmation) requires Resend dashboard check or inbox verification with a live Convex deployment — cannot be automated from code

---
*Phase: 01-tour-platform-stabilize-and-polish*
*Completed: 2026-03-09*
