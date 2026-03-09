---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 02-05-PLAN.md
last_updated: "2026-03-09T14:21:47.390Z"
last_activity: 2026-03-09 — Roadmap created; 41 requirements mapped across 5 phases
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 19
  completed_plans: 18
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
| Phase 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout P01 | 8m | 2 tasks | 2 files |
| Phase 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout P02 | 5m | 2 tasks | 2 files |
| Phase 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout P03 | 2m | 1 tasks | 1 files |
| Phase 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout P04 | 3m | 2 tasks | 2 files |
| Phase 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout P06 | 4m | 2 tasks | 1 files |
| Phase 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout P05 | 3m | 2 tasks | 1 files |
| Phase 02 P01 | 2m | 2 tasks | 3 files |
| Phase 02 P02 | 2m | 2 tasks | 6 files |
| Phase 02 P04 | 4m | 2 tasks | 4 files |
| Phase 02 P03 | 6m | 2 tasks | 4 files |
| Phase 02 P05 | 4m | 2 tasks | 4 files |

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
- [Phase 06-01]: All 6 Phase 6 hotspot fields use v.optional() — backward compatibility with existing documents, no data migration needed
- [Phase 06-01]: panelLayout is a typed union ('compact'|'rich'|'video') not a free string — constrains valid values at DB layer
- [Phase 06-01]: iconName is v.string() not a union enum — allows any Lucide icon name without schema changes for new icons
- [Phase 06-02]: parseVideoUrl returns type='unknown' for unrecognized URLs rather than throwing — callers render fallback text safely
- [Phase 06-02]: useViewerStore uses 'use client' directive — Zustand stores consumed exclusively in client components; prevents accidental server-side import
- [Phase 06-02]: videoModalTitle typed as string | undefined (not null) matching optional parameter semantics — undefined signals absence without explicit clearing
- [Phase Phase 06-03]: HotspotMarker delegates panel-open to Zustand setActiveHotspot — eliminates Canvas z-index boundary constraints on popup size
- [Phase Phase 06-03]: ICON_REGISTRY uses string key lookup for iconName — allows custom Lucide icon selection without component changes for new icons
- [Phase Phase 06-03]: accentColor applied via markerColor computed variable (hotspot.accentColor ?? config.color) — affects button background and ping ring
- [Phase 06-04]: HotspotInfoPanel and HotspotVideoModal rendered as DOM siblings outside R3F Canvas to avoid z-index stacking context conflicts
- [Phase 06-04]: No autoPlay on video element — mobile browsers block it; user clicks play manually
- [Phase 06-04]: z-50 for HotspotInfoPanel, zIndex 60 for HotspotVideoModal — video always renders above info panel
- [Phase Phase 06-06]: EDITOR_ICON_OPTIONS defined as module-level constant to avoid re-creation on each render
- [Phase Phase 06-06]: None button in icon grid uses empty string sentinel matching hotspotIconName initial state
- [Phase Phase 06-06]: CTA URL input only renders when CTA Label is non-empty — progressive disclosure keeps form compact
- [Phase 06-05]: AnimatePresence children require stable key props (hotspot._id and videoModalUrl) for exit animations to fire on unmount
- [Phase 06-05]: handleHotspotClick routes navigation first (early return), then media+video, then info panel fallback
- [Phase 02-01]: getRemainingQuota returns -1 for unlimited plans to avoid JSON Infinity serialization issues
- [Phase 02-01]: complete/fail find jobs by runpodJobId via collect+filter since runpodJobId is optional and set post-creation
- [Phase 02-01]: notifications type union extended with system literal to support reconstruction completion notifications
- [Phase 02-02]: Turbopack cannot bundle spark.js — serve patched spark.module.js from public/lib/ with globalThis.__THREE bridge and webpackIgnore dynamic import
- [Phase 02-02]: CSP requires data: in connect-src and wasm-unsafe-eval in script-src for spark.js WASM execution
- [Phase 02-04]: CaptureUpload uses showUpload boolean override to allow re-capture even when model is active
- [Phase 02-04]: getSplatUrl added as separate query rather than embedding URL resolution in getByTourId
- [Phase 02-04]: Failure state rendered inside ReconstructionProgress rather than separate component for state colocation
- [Phase 02]: CaptureUpload uses state machine pattern: upload UI -> active job progress -> completed preview -> accepted model status card
- [Phase 02]: 3D Capture added as third tab in editor right panel — consistent with existing Properties/Settings tab pattern
- [Phase 02-05]: failById uses Convex job ID directly; fail uses runpodJobId lookup — both needed for different callers
- [Phase 02-05]: RUNPOD_WEBHOOK_SECRET verification is optional in callback handler — skips check when unset for dev convenience
- [Phase 02-05]: Three-layer job reliability pattern: scheduler fire-and-forget + webhook callback + 10min cron polling

### Roadmap Evolution

- Phase 6 added: Hotspot customization options, icons, info panels, video support, and adaptive screen layout

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Luma AI 3D Capture API availability unconfirmed as of March 2026 — validate in first week of Phase 2 planning before committing to that path
- [Phase 2]: Gaussian Splatting quality on small interior rooms with reflective surfaces and windows needs early validation — depth estimation fallback (Depth Anything V2) may become primary
- [Phase 4]: pdfjs-dist Node 18 compatibility — pin to v4.x before building floor plan extraction action (v5.x requires Node 20+)

## Session Continuity

Last session: 2026-03-09T14:21:47.383Z
Stopped at: Completed 02-05-PLAN.md
Resume file: None
