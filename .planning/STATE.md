---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 01-07-PLAN.md
last_updated: "2026-03-09T07:40:33.336Z"
last_activity: 2026-03-09 — Roadmap created; 41 requirements mapped across 5 phases
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 7
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Upload any property input, walk through it in 3D, place real furniture, and see the cost — before a single item is purchased
**Current focus:** Phase 1 — Tour Platform Stabilize and Polish

## Current Position

Phase: 1 of 5 (Tour Platform — Stabilize and Polish)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-09 — Roadmap created; 41 requirements mapped across 5 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-tour-platform-stabilize-and-polish P03 | 4 | 2 tasks | 2 files |
| Phase 01 P01 | 4m | 2 tasks | 5 files |
| Phase 01-tour-platform-stabilize-and-polish P05 | 6 | 3 tasks | 3 files |
| Phase 01 P04 | 7m | 2 tasks | 5 files |
| Phase 01-tour-platform-stabilize-and-polish P02 | 3m | 2 tasks | 4 files |
| Phase 01-tour-platform-stabilize-and-polish P06 | 5 | 2 tasks | 1 files |
| Phase 01-tour-platform-stabilize-and-polish P07 | 2 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Three sections built in order — Section 1 bugs gate Section 2 start
- [Roadmap]: Phase 4 (floor plan extraction) depends only on Phase 1, not Phase 2/3 — can begin after Phase 1 ships
- [Roadmap]: Phase 5 depends on both Phase 3 (furniture system) and Phase 4 (geometry data)
- [Roadmap]: RunPod + nerfstudio/gsplat is primary reconstruction pipeline; Luma AI is secondary until API availability confirmed
- [Phase 01-03]: OrbitControls distance zoom and CameraController FOV zoom kept independent — operate on different camera properties without conflict for panorama use
- [Phase 01-03]: Idle timer pattern: manualRotate (user intent) + idleActive (timer state) derive isAutoRotating — clean separation of concerns
- [Phase 01]: bcryptjs (pure JS) chosen over native bcrypt — Convex Node runtime has no native binaries
- [Phase 01]: setTourPassword is an action so it can call bcrypt and internal mutations in one flow; mutations cannot call actions
- [Phase 01-05]: Pass undefined to getDashboardOverview for 'all' period (query only accepts 7d/30d/90d); getTourPerformance accepts 'all' natively
- [Phase 01-05]: Embed code conditional: show textarea only when status===published AND embedCode is set; show publish hint otherwise
- [Phase 01-04]: Navigation hotspot uses Gold pulse ring with two staggered rings for depth effect — separate from Teal ping used previously
- [Phase 01-04]: visible field added as optional boolean in Convex schema — undefined defaults to visible for backward compatibility
- [Phase 01-02]: getBySlugWithScenes skips password re-check — caller (client) is trusted to have verified via action before calling this query
- [Phase 01-02]: Editor password input uses defaultValue='' — hashed passwords must not round-trip to client
- [Phase 01-06]: atan2(x,-z) bearing formula for equirectangular panorama hotspot arrow direction
- [Phase 01-06]: IIFE JSX pattern for media content branching in popup card — readable without extracting named function
- [Phase 01-07]: Used durationEvents name (not allDurations) to avoid shadowing existing allDurations in getDashboardOverview
- [Phase 01-07]: Conversion Rate and Viewing Time removed from analytics headline stats per CONTEXT.md spec — replaced by Unique Visitors and Avg. Scene Time

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Luma AI 3D Capture API availability unconfirmed as of March 2026 — validate in first week of Phase 2 planning before committing to that path
- [Phase 2]: Gaussian Splatting quality on small interior rooms with reflective surfaces and windows needs early validation — depth estimation fallback (Depth Anything V2) may become primary
- [Phase 4]: pdfjs-dist Node 18 compatibility — pin to v4.x before building floor plan extraction action (v5.x requires Node 20+)

## Session Continuity

Last session: 2026-03-09T07:40:33.332Z
Stopped at: Completed 01-07-PLAN.md
Resume file: None
