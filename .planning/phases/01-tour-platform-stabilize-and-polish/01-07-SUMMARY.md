---
phase: 01-tour-platform-stabilize-and-polish
plan: 07
subsystem: ui
tags: [analytics, convex, react, dashboard]

# Dependency graph
requires: []
provides:
  - totalUniqueVisitors computed in getDashboardOverview Convex query
  - avgSceneTime computed in getDashboardOverview Convex query
  - Analytics headline stats row showing Total Views, Unique Visitors, Avg. Scene Time, Total Leads
affects: [analytics, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - convex/analytics.ts
    - src/app/(dashboard)/analytics/page.tsx

key-decisions:
  - "Used durationEvents name (not allDurations) to avoid shadowing the existing allDurations variable already computed for totalViewingSeconds"
  - "Conversion Rate and Viewing Time removed from headline stats row per CONTEXT.md spec — replaced by Unique Visitors and Avg. Scene Time"

patterns-established:
  - "Unique visitors = distinct sessionIds from viewEvents Set — consistent with per-tour uniqueVisitors in getTourPerformance"

requirements-completed:
  - ANLT-01

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 01 Plan 07: Analytics Headline Stats Gap Closure Summary

**Added totalUniqueVisitors and avgSceneTime to getDashboardOverview, surfacing them as top-level headline stat cards replacing Conversion Rate and Viewing Time per the CONTEXT.md ANLT-01 spec.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T07:37:45Z
- **Completed:** 2026-03-09T07:39:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `getDashboardOverview` now returns `totalUniqueVisitors` (distinct session IDs across all view events) and `avgSceneTime` (average duration in seconds across events with a duration field)
- Analytics dashboard headline stats row updated to: Total Views, Unique Visitors, Avg. Scene Time, Total Leads — matching the CONTEXT.md ANLT-01 spec exactly
- Conversion Rate and Viewing Time removed from headline cards (Conversion Rate was not in the ANLT-01 headline spec; Viewing Time replaced by Avg. Scene Time)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add totalUniqueVisitors and avgSceneTime to getDashboardOverview** - `ab6b224` (feat)
2. **Task 2: Update analytics headline stats to match CONTEXT.md spec** - `63c312d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `convex/analytics.ts` - Added totalUniqueVisitors and avgSceneTime computations + return fields in getDashboardOverview
- `src/app/(dashboard)/analytics/page.tsx` - Replaced stats array: Conversion Rate → Unique Visitors, Viewing Time → Avg. Scene Time

## Decisions Made
- Used `durationEvents` as the variable name for the avgSceneTime filter to avoid shadowing the existing `allDurations` variable already in scope for `totalViewingSeconds` computation.
- Removed Conversion Rate and Viewing Time from headline stats per the CONTEXT.md spec, which lists exactly: total views, unique visitors, avg scene time, total leads.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing lint warnings in analytics files (unused imports, `any` types in exportCsv) were already present before this plan and not introduced by these changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ANLT-01 gap closed. Analytics headline metrics now match spec.
- Per-tour breakdown table unchanged and still shows uniqueVisitors and avgDuration per tour.

## Self-Check: PASSED

All files and commits verified present.

---
*Phase: 01-tour-platform-stabilize-and-polish*
*Completed: 2026-03-09*
