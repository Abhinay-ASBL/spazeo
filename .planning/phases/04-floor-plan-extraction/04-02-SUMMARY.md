---
phase: 04-floor-plan-extraction
plan: 02
subsystem: ui
tags: [react-pdf, react-dropzone, floor-plan, upload, pdf-rasterization, camera-capture]

# Dependency graph
requires:
  - phase: 04-floor-plan-extraction
    provides: Convex schema (floorPlanProjects, floorPlanDetails), CRUD mutations, extractFloorPlan action
provides:
  - Floor plan upload UI with drag-drop, camera capture, PDF page selection
  - FloorPlanPreview with rotate, floor number assignment, extract trigger
  - Floor plan list page with project cards and status badges
  - Dashboard sidebar entry for Floor Plans
  - Route protection for /floor-plans
affects: [04-03, 04-04]

# Tech tracking
tech-stack:
  added: [react-pdf@9.2.1, pdfjs-dist@4.8.69, react-konva, konva, use-image]
  patterns: [PDF client-side rasterization via pdfjs canvas, canvas rotation before upload, multi-step upload-preview-extract flow]

key-files:
  created:
    - src/components/floor-plan/FloorPlanUpload.tsx
    - src/components/floor-plan/PdfPageSelector.tsx
    - src/components/floor-plan/FloorPlanPreview.tsx
    - src/app/(dashboard)/floor-plans/page.tsx
    - src/app/(dashboard)/floor-plans/new/page.tsx
  modified:
    - src/components/layout/Sidebar.tsx
    - middleware.ts

key-decisions:
  - "react-pdf v9 chosen over v10 for pdfjs-dist v4.x compatibility (v10 requires pdfjs-dist v5 which needs Node 20+)"
  - "PdfPageSelector dynamically imported with ssr:false to avoid server-side PDF rendering issues"
  - "Canvas-based image rotation applied before upload rather than storing rotation metadata"
  - "PDF rasterization at 2x scale for quality preservation"

patterns-established:
  - "Floor plan upload uses upload-preview-extract three-step flow"
  - "PDF pages rasterized client-side to PNG blobs via pdfjs canvas rendering"
  - "Image rotation applied via createImageBitmap + canvas before Convex storage upload"

requirements-completed: [FP-01]

# Metrics
duration: 6m
completed: 2026-03-10
---

# Phase 4 Plan 02: Upload UI and Sidebar Summary

**Floor plan upload UI with drag-drop, PDF page rasterization, camera capture, rotate preview, multi-floor batch upload, and sidebar navigation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-10T09:06:21Z
- **Completed:** 2026-03-10T09:12:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Three upload components: FloorPlanUpload (drag-drop + camera), PdfPageSelector (page thumbnails + rasterization), FloorPlanPreview (rotate + extract)
- Floor plan list page with project grid, status badges, and empty state
- Upload page with two-step flow (upload then preview) connecting to Convex backend
- Sidebar Floor Plans entry with Map icon positioned after Tours

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create upload components** - `7fda6c4` (feat)
2. **Task 2: Create floor plan pages and add sidebar navigation** - `fc9449a` (feat)

## Files Created/Modified
- `src/components/floor-plan/FloorPlanUpload.tsx` - Drag-drop upload with camera capture, multi-file support, PDF detection
- `src/components/floor-plan/PdfPageSelector.tsx` - PDF page thumbnails with select/deselect, client-side rasterization to PNG
- `src/components/floor-plan/FloorPlanPreview.tsx` - Preview cards with 90-degree rotation, floor number/label editing, extract buttons
- `src/app/(dashboard)/floor-plans/page.tsx` - Floor plan project list with status badges and empty state
- `src/app/(dashboard)/floor-plans/new/page.tsx` - Upload page with upload-preview-extract flow, Convex storage upload, extraction trigger
- `src/components/layout/Sidebar.tsx` - Added Floor Plans entry with Map icon in MAIN_NAV
- `middleware.ts` - Added /floor-plans route to protected routes

## Decisions Made
- react-pdf v9 used instead of v10 because v10 requires pdfjs-dist v5 which needs Node 20+; Convex targets Node 18
- PdfPageSelector uses dynamic import with ssr:false to avoid server-side PDF.js issues
- Canvas rotation applied before upload (not stored as metadata) for simpler downstream processing
- PDF pages rasterized at 2x scale to preserve detail quality

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added /floor-plans to middleware route matcher**
- **Found during:** Task 2
- **Issue:** Floor plans pages are at /floor-plans not /dashboard/floor-plans, so existing /dashboard(..) matcher doesn't cover them
- **Fix:** Added '/floor-plans(.*)' to the isProtectedRoute matcher in middleware.ts
- **Files modified:** middleware.ts
- **Committed in:** fc9449a

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for route protection. No scope creep.

## Issues Encountered
- react-pdf v10 requires pdfjs-dist v5 (Node 20+), incompatible with project Node 18 target. Downgraded to react-pdf v9 + pdfjs-dist v4.8.69.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Upload UI complete and connected to Convex backend from Plan 01
- Ready for Plan 03 (floor plan editor) and Plan 04 (advanced features)
- All Convex mutations/actions called correctly from upload flow

---
*Phase: 04-floor-plan-extraction*
*Completed: 2026-03-10*
