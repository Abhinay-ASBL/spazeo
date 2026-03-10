---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: UAT fixing
stopped_at: Completed 05-02-PLAN.md
last_updated: "2026-03-10T10:04:01.533Z"
last_activity: 2026-03-09 — Phase 6 all 6 plans executed, UAT found 3 issues to fix
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 35
  completed_plans: 32
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Upload any property input, walk through it in 3D, place real furniture, and see the cost — before a single item is purchased
**Current focus:** Phase 1 — Tour Platform Stabilize and Polish

## Current Position

Phase: 6 (inserted) — Hotspot Customization (UAT fixing — 3 issues)
Next up: Phase 2 — 3D Capture Pipeline and Splat Viewer
Completed: Phase 1 (Tour Platform), Phase 6 (Hotspot Customization — plans done, UAT in progress)
Status: UAT fixing
Last activity: 2026-03-09 — Phase 6 all 6 plans executed, UAT found 3 issues to fix

Progress: [███░░░░░░░] 33% (Phases 1+6 done, 2/3/4/5 remaining)

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
| Phase 02 P06 | 8m | 3 tasks | 11 files |
| Phase 02 P07 | 4m | 1 tasks | 1 files |
| Phase 03 P01 | 2m | 2 tasks | 4 files |
| Phase 03 P03 | 2m | 2 tasks | 3 files |
| Phase 03 P02 | 3m | 2 tasks | 4 files |
| Phase 03 P04 | 3m | 2 tasks | 5 files |
| Phase 03 P05 | 3m | 2 tasks | 5 files |
| Phase 03 P06 | 2m | 2 tasks | 8 files |
| Phase 04 P01 | 4m | 2 tasks | 7 files |
| Phase 04 P04 | 5m | 2 tasks | 9 files |
| Phase 04 P02 | 6m | 2 tasks | 7 files |
| Phase 04 P03 | 3m | 2 tasks | 4 files |
| Phase 05-floor-plan-to-3d-and-full-section-3-delivery P02 | 7m | 2 tasks | 2 files |
| Phase 05-floor-plan-to-3d-and-full-section-3-delivery P01 | 7m | 2 tasks | 7 files |

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
- [Phase 02-06]: Three navigation modes use lerp/slerp transitions instead of gsap — pure Three.js/R3F
- [Phase 02-06]: Public tour page conditionally renders GaussianSplatViewer vs PanoramaViewer based on splatStorageId
- [Phase 02-07]: Dual dropzone instances for video/photos switched via selectedType; video thumbnail at 1s via canvas.toDataURL; photo count double-enforced in dropzone and on submit
- [Phase 03]: Catalog queries (list, search, getById) are public — no auth required for browsing
- [Phase 03]: savePlacements uses delete-all-then-insert for idempotent room saves
- [Phase 03]: Undo stack capped at 50 with shift-oldest eviction strategy
- [Phase 03]: setGhostItem auto-switches mode to furnish for seamless catalog-to-placement flow
- [Phase 03]: TransformControls ref typed as any to avoid drei type incompatibility with THREE.Group
- [Phase 03]: Ghost material uses MeshBasicMaterial for consistent unlit semi-transparent look
- [Phase 03]: CatalogSidebar conditionally calls list vs search query based on debounced input
- [Phase 03]: CostTracker click handler calls both setSelectedId AND setCenterOnItem for combined behavior
- [Phase 03]: enableFurniture prop defaults to false — public share pages do not load furniture components
- [Phase 03]: OrbitControls makeDefault enables FurnitureCameraController access via useThree controls
- [Phase 03]: Click-to-move disabled in furnish mode via useFurnitureStore.getState() guard in NavigationModes
- [Phase 03]: furnishedRooms.getBySlug restructured to return { room, tour, placements } for share page context
- [Phase 03]: ReadOnlyFurniturePiece minimal wrapper instead of reusing FurniturePiece with disabled props
- [Phase 03]: priceUsd field used (not price) matching furnitureItems schema
- [Phase 03]: glbStorageId made optional in schema to allow catalog seeding without actual GLB files
- [Phase 04]: floorPlanJobs separate table from aiJobs because aiJobs requires non-optional tourId
- [Phase 04]: floorPlanDetails new table to avoid breaking existing floorPlans consumers
- [Phase 04]: DashScope response_format json_object for reliable structured AI output, no regex cleaning
- [Phase 04]: floorPlanExtractionsUsed separate counter from aiCreditsUsed for independent plan limits
- [Phase 04]: react-konva dynamically imported via lazy() to prevent SSR canvas API errors
- [Phase 04]: Floor plan coordinates stored in meters (canonical); PPM=50 conversion at Konva render boundary only
- [Phase 04]: Multi-layer Konva architecture with listening:false on non-interactive layers for performance
- [Phase 04]: Wall deletion cascades to attached doors/windows in Zustand store
- [Phase 04]: react-pdf v9 chosen over v10 for pdfjs-dist v4.x compatibility (v10 requires Node 20+)
- [Phase 04]: Canvas rotation applied before upload rather than storing rotation metadata for simpler downstream processing
- [Phase 04]: react-konva dynamically imported via lazy() to prevent SSR canvas API errors
- [Phase 04]: Floor plan coordinates stored in meters (canonical); PPM=50 conversion at Konva render boundary only
- [Phase 05-02]: FloorPlanMesh accepts overrides as Partial<FloorPlan3DOverrides> with defaults merged at component boundary
- [Phase 05-02]: geometryKey JSON.stringify used as useMemo dependency to prevent per-frame geometry rebuilds
- [Phase 05-02]: NavigationModes has no sceneBounds prop — Canvas camera prop handles initial dollhouse position directly
- [Phase 05-01]: createFromFloorPlan mutation creates Tour + Scene + hotspots atomically in one Convex mutation
- [Phase 05-01]: scenes.imageStorageId made optional — floor_plan scenes have no panorama image, null guards added to all storage.getUrl callers
- [Phase 05-01]: Generate 3D Space button uses extractionStatus==='completed' guard — prop passed from FloorPlanEditorShell

### Roadmap Evolution

- Phase 6 added: Hotspot customization options, icons, info panels, video support, and adaptive screen layout

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Luma AI 3D Capture API availability unconfirmed as of March 2026 — validate in first week of Phase 2 planning before committing to that path
- [Phase 2]: Gaussian Splatting quality on small interior rooms with reflective surfaces and windows needs early validation — depth estimation fallback (Depth Anything V2) may become primary
- [Phase 4]: pdfjs-dist Node 18 compatibility — pin to v4.x before building floor plan extraction action (v5.x requires Node 20+)

## Session Continuity

Last session: 2026-03-10T10:04:01.489Z
Stopped at: Completed 05-02-PLAN.md
Resume file: None
