---
phase: 04-floor-plan-extraction
verified: 2026-03-11T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Upload a PDF file and verify page thumbnails appear"
    expected: "PdfPageSelector renders page thumbnails with select/deselect, user assigns floor numbers, pages are rasterized client-side to PNG before upload"
    why_human: "PDF.js canvas rendering requires a browser; cannot verify rasterization or thumbnail UI programmatically"
  - test: "Upload a hand-drawn sketch photo via camera capture button on mobile"
    expected: "Camera button opens device camera, photo is accepted as 'sketch' file type, assigned floor number 1, appears in preview"
    why_human: "Camera capture requires device hardware; cannot test capture flow programmatically"
  - test: "Trigger extraction on an uploaded floor plan and observe animated build-up"
    expected: "Spinner shows during extraction, then walls fade in staggered (80ms each), room polygons appear with type-based colors, dimension annotations appear — total ~3.5 seconds — then editor opens"
    why_human: "Animation timing, visual appearance, and state machine transitions require interactive observation"
  - test: "Select a wall endpoint in the editor and drag it to a new position"
    expected: "Wall moves in Konva diagram AND the SVG overlay on the original image moves synchronously via shared Zustand store"
    why_human: "Konva drag interaction and cross-view sync cannot be verified from static code inspection alone"
  - test: "Click Save, reload the page, and reopen the editor"
    expected: "Corrected geometry persists; editor opens in 'editing' state (skip extracting/build-up); Version History shows at least v1 (AI) and v2 (Manual)"
    why_human: "Persistence across page reloads requires a live Convex connection and browser session"
  - test: "Click 'Reset to AI Result' in the Version History panel"
    expected: "Confirmation prompt appears; on confirm, geometry reverts to version 1 (AI) immediately without a flash of stale state"
    why_human: "UI confirmation flow and immediate store update (no refetch delay) require live interaction"
---

# Phase 4: Floor Plan Extraction — Verification Report

**Phase Goal:** A user can upload any floor plan file (PDF, JPG/PNG, or sketch photo), the AI extracts structured room geometry as a validated JSON payload, and the user reviews and corrects the extracted 2D diagram before the data is committed to Convex

**Verified:** 2026-03-11
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User uploads PDF, JPG/PNG, or sketch photo and upload is accepted for all three formats | VERIFIED | `FloorPlanUpload.tsx` uses react-dropzone with `image/*` and `application/pdf` accept types; camera capture with `capture="environment"` handles sketch; file type assigned as `'pdf' | 'image' | 'sketch'` at detection time |
| 2 | AI returns extracted floor plan with room names, wall boundaries, and approximate dimensions as a validated structured JSON payload | VERIFIED | `floorPlanActions.ts` calls DashScope qwen3.5-plus with `response_format: { type: 'json_object' }`, validates `Array.isArray(extraction.walls) && Array.isArray(extraction.rooms)`, normalizes doors/windows, and saves structured geometry to Convex |
| 3 | User sees the extracted 2D floor plan rendered as an editable diagram and can correct room names, adjust wall positions, and fix dimensions before proceeding | VERIFIED | `DiagramCanvas.tsx` (684 lines) renders 8-layer Konva Stage with draggable wall endpoints and all drawing tools; `PropertiesPanel.tsx` dispatches `updateWall`/`updateRoom` to Zustand store; `OriginalOverlay.tsx` syncs via shared store |
| 4 | Corrected room geometry is saved to Convex as structured wall coordinates and room metadata, ready for 3D generation | VERIFIED | `FloorPlanEditor.tsx` calls `useMutation(api.floorPlanDetails.updateGeometry)`; `floorPlanDetails.ts` patches geometry and inserts a version record into `floorPlanVersions`; `FloorPlanEditorShell.tsx` auto-saves on floor tab switch |

**Score:** 4/4 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | floorPlanProjects, floorPlanDetails, floorPlanVersions, floorPlanJobs tables | VERIFIED | All 4 tables present (lines 650–713), `floorPlanExtractionsUsed` on users (line 57), correct indexes |
| `convex/floorPlanProjects.ts` | CRUD for multi-floor project grouping | VERIFIED | Exports: create, getById, listByUser, update, remove — all with auth checks |
| `convex/floorPlanDetails.ts` | CRUD with geometry, version saves, AI reset | VERIFIED | 314 lines; exports: create, getById, listByProject, listByProjectWithUrls, updateGeometry, saveVersion (internal), resetToAiVersion, updateExtractionResult (internal), updateExtractionStatus (internal) |
| `convex/floorPlanVersions.ts` | Version history queries | VERIFIED | Exports: listByFloorPlan, getVersion |
| `convex/floorPlanJobs.ts` | Extraction job lifecycle mutations | VERIFIED | Exports: create (internal), updateStatus (internal), complete (internal), fail (internal), getByFloorPlan |
| `convex/floorPlanActions.ts` | AI extraction action with DashScope | VERIFIED | 294 lines; full lifecycle: plan limits check, job creation, DashScope call with `response_format json_object`, validation, geometry save, version 1 creation, usage increment, notification |
| `convex/users.ts` | incrementFloorPlanExtractions internal mutation | VERIFIED | Line 828; `floorPlanExtractionsUsed` counter incremented only on success |
| `src/components/floor-plan/FloorPlanUpload.tsx` | Drag-drop with camera capture, multi-file | VERIFIED | 353 lines; react-dropzone with PDF+image accept; camera capture button with `capture="environment"`; sketch type detection |
| `src/components/floor-plan/PdfPageSelector.tsx` | PDF page thumbnails with floor number assignment | VERIFIED | 213 lines; react-pdf Document+Page; pdfjs worker configured; rasterizePdfPages utility |
| `src/components/floor-plan/FloorPlanPreview.tsx` | Preview with rotate, extract trigger | VERIFIED | 293 lines; 90-degree rotation via canvas; extract buttons per file and batch |
| `src/app/(dashboard)/floor-plans/page.tsx` | Floor plan list page | VERIFIED | useQuery(api.floorPlanProjects.listByUser); status-specific badge colors with animate-pulse for extracting |
| `src/app/(dashboard)/floor-plans/new/page.tsx` | Standalone upload page wired to Convex | VERIFIED | useMutation(api.floorPlanProjects.create), useAction(api.floorPlanActions.extractFloorPlan) |
| `src/components/floor-plan/ExtractionProgress.tsx` | Reactive job status with error handling | VERIFIED | 180 lines; useQuery(api.floorPlanJobs.getByFloorPlan); Continue Editing and Start Over buttons on failure |
| `src/components/floor-plan/AnimatedBuildUp.tsx` | Progressive diagram rendering walls->rooms->dimensions | VERIFIED | 420 lines; lazy-loaded Stage/Layer from react-konva; 3-stage animation (walls 0-1.2s, rooms 1.2-2.4s, dimensions 2.4-3.5s); amber for low-confidence; Skip button |
| `src/app/(dashboard)/floor-plans/[id]/edit/FloorPlanEditorShell.tsx` | State machine routing | VERIFIED | 5-state machine (loading/extracting/build-up/editing/error); auto-save on floor tab switch; redirect on missing project |
| `src/stores/floorPlanEditorStore.ts` | Zustand store with geometry, undo, tool state | VERIFIED | 382 lines; geometry, undoStack/redoStack (50-cap), activeTool, selection, drawingPoints, viewport; all geometry mutations (addWall, updateWall, deleteWall, addRoom, updateRoom, deleteRoom, addDoor, addWindow, deleteDoor, deleteWindow, undo, redo) |
| `src/components/floor-plan/FloorPlanEditor.tsx` | Split-view editor container | VERIFIED | 235 lines; useMutation(api.floorPlanDetails.updateGeometry); Ctrl+S; beforeunload warning; Reset to AI Result |
| `src/components/floor-plan/DiagramCanvas.tsx` | Konva Stage with 8 layers, all drawing tools | VERIFIED | 684 lines; 8 layers (grid, rooms, walls, doors/windows, dimensions, preview, selection, tooltip); all 6 tools; zoom/pan with scale clamp 0.1-5.0; amber for low-confidence |
| `src/components/floor-plan/OriginalOverlay.tsx` | Original image with synchronized SVG overlay | VERIFIED | 207 lines; reads walls/rooms from Zustand store; viewport transform synced; semi-transparent Gold SVG wall lines |
| `src/components/floor-plan/PropertiesPanel.tsx` | Context-sensitive property editor | VERIFIED (partial) | 224 lines; wall, room, door, window properties all wired to store dispatches; NOTE: overall dimensions fields (when nothing selected) have placeholder onChange handlers — does not block core editing |
| `src/components/floor-plan/DrawingToolbar.tsx` | Tool selection bar | VERIFIED | 134 lines; 6 tools with active state; undo/redo buttons; save and reset buttons |
| `src/components/floor-plan/EditorMiniMap.tsx` | Corner minimap with viewport indicator | VERIFIED | 92 lines; downscaled wall rendering; Gold-bordered viewport rectangle; click-to-navigate |
| `src/components/floor-plan/VersionHistory.tsx` | Collapsible version history with restore | VERIFIED | 132 lines; useQuery(api.floorPlanVersions.listByFloorPlan); AI (teal) / Manual (gold) badges; inline restore confirmation |
| `src/components/layout/Sidebar.tsx` | Floor Plans entry in nav | VERIFIED | `{ label: 'Floor Plans', href: '/floor-plans', icon: Map }` at line 35 |
| `middleware.ts` | /floor-plans routes protected | VERIFIED | '/floor-plans(.*)' in isProtectedRoute matcher (line 11) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `convex/floorPlanActions.ts` | DashScope API | fetch with `response_format: { type: 'json_object' }` | WIRED | Line 185: `response_format: { type: 'json_object' }` present; model `qwen3.5-plus`; no max_tokens |
| `convex/floorPlanActions.ts` | `convex/floorPlanJobs.ts` | runMutation to create/update/complete/fail job | WIRED | Lines 126, 140, 207, 279 call `internal.floorPlanJobs.*` mutations |
| `convex/floorPlanDetails.ts` | `floorPlanVersions` table | saveVersion creates version document | WIRED | Lines 168, 186, 229 insert into `floorPlanVersions`; `updateGeometry` also inserts directly |
| `src/components/floor-plan/FloorPlanUpload.tsx` | react-dropzone | useDropzone with PDF + image accept types | WIRED | Line 4: `import { useDropzone }`, line 99: `useDropzone({ accept: { 'application/pdf': ... 'image/*': ... } })` |
| `src/components/floor-plan/PdfPageSelector.tsx` | react-pdf | Document + Page components | WIRED | Line 4: `import { Document, Page, pdfjs } from 'react-pdf'`; pdfjs worker configured |
| `src/components/layout/Sidebar.tsx` | /floor-plans | New nav entry in MAIN_NAV | WIRED | Line 35: `{ label: 'Floor Plans', href: '/floor-plans', icon: Map }` |
| `src/app/(dashboard)/floor-plans/new/page.tsx` | `convex/floorPlanProjects.ts` | useMutation for project creation | WIRED | Lines 17, 19: `useMutation(api.floorPlanProjects.create)`, `useAction(api.floorPlanActions.extractFloorPlan)` |
| `src/components/floor-plan/ExtractionProgress.tsx` | `convex/floorPlanJobs.ts` | useQuery for reactive job status | WIRED | Line 42: `useQuery(api.floorPlanJobs.getByFloorPlan, { floorPlanId })` |
| `src/components/floor-plan/AnimatedBuildUp.tsx` | react-konva | Stage/Layer with animated opacity | WIRED | Lines 8–21: lazy-loaded Stage, Layer, Line, Text, Rect; lines 282–415: Stage with 5 Layers |
| `src/components/floor-plan/DiagramCanvas.tsx` | `floorPlanEditorStore.ts` | Zustand store for geometry, selection, tool | WIRED | Lines 7, 65–68: `useFloorPlanEditorStore` for geometry, activeTool, selection, drawingPoints |
| `src/components/floor-plan/FloorPlanEditor.tsx` | `convex/floorPlanDetails.ts` | useMutation for updateGeometry (save) | WIRED | Line 41: `useMutation(api.floorPlanDetails.updateGeometry)` |
| `src/components/floor-plan/VersionHistory.tsx` | `convex/floorPlanVersions.ts` | useQuery for version list | WIRED | Line 30: `useQuery(api.floorPlanVersions.listByFloorPlan, { floorPlanId })` |
| `src/app/(dashboard)/floor-plans/[id]/edit/FloorPlanEditorShell.tsx` | `FloorPlanEditor` component | Renders editor after extraction + build-up | WIRED | Lines 16–19: lazy import; line 305: `<FloorPlanEditor .../>` in editing state |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FP-01 | 04-01, 04-02 | User can upload floor plan in any format — PDF, JPG/PNG, or hand-drawn sketch photo | SATISFIED | FloorPlanUpload.tsx handles all three types; PdfPageSelector rasterizes PDF pages; camera capture handles sketch; 50MB size limit enforced |
| FP-02 | 04-01, 04-03 | AI extracts room layout — room names, wall boundaries, approximate dimensions — as structured JSON | SATISFIED | floorPlanActions.ts uses DashScope qwen3.5-plus with `response_format: { type: 'json_object' }`; validates walls/rooms arrays; geometry object with walls, rooms, doors, windows, dimensions, fixtures persisted to Convex. Note: REQUIREMENTS.md says "GPT-4o Vision" but DashScope is the project-standard AI provider per CLAUDE.md — functional behavior is met |
| FP-03 | 04-04, 04-05 | User sees extracted 2D floor plan as editable diagram and can correct room names, adjust wall positions, and fix dimensions | SATISFIED | DiagramCanvas (684 lines) with 6 drawing tools; PropertiesPanel dispatches updateWall/updateRoom; 50-item undo history; Split view with SVG overlay sync. Minor gap: overall dimensions fields (overallWidth/overallHeight when nothing selected) have placeholder onChange handlers |
| FP-04 | 04-01, 04-05 | Corrected 2D floor plan data saved to Convex as structured room geometry | SATISFIED | updateGeometry mutation patches floorPlanDetails with geometry object; every save creates floorPlanVersions entry; resetToAiVersion restores version 1 |

No orphaned requirements — all 4 Phase 4 requirements (FP-01 through FP-04) are claimed by plans and have implementation evidence.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/floor-plan/PropertiesPanel.tsx` | 37, 46 | `onChange={() => {/* Placeholder - will dispatch in Task 2 */}}` and `onChange={() => {/* Placeholder */}}` | Warning | Affects only the "Overall Width" and "Overall Height" inputs shown when no element is selected. Core element editing (walls, rooms, doors, windows) is fully wired. Does not block any Success Criterion. |

---

## Human Verification Required

### 1. PDF Upload with Page Selection

**Test:** Upload a multi-page PDF floor plan via drag-and-drop on `/floor-plans/new`
**Expected:** PdfPageSelector renders thumbnails for each page, user selects pages and assigns floor numbers, clicking Extract rasterizes selected pages to PNG blobs and uploads them to Convex storage
**Why human:** PDF.js canvas rendering requires a browser environment; rasterization and thumbnail UI cannot be verified programmatically

### 2. Sketch Photo via Camera Capture

**Test:** On a mobile device (or using browser DevTools mobile emulation), tap the "Capture Sketch Photo" button
**Expected:** Device camera opens, photo taken is accepted as sketch type, assigned floor number 1, appears in FloorPlanPreview with rotate option
**Why human:** Camera capture requires device hardware and mobile browser; `capture="environment"` attribute behavior cannot be verified statically

### 3. Animated Build-Up Visual Verification

**Test:** Trigger an extraction on an uploaded floor plan and wait for completion
**Expected:** Animated spinner shows during extraction, then the animated build-up plays: walls fade in with staggered delays (~80ms each), then room polygons appear with type-based colors (kitchen amber, bedroom blue, etc.), then dimension lines with measurement labels — total ~3.5 seconds — then FloorPlanEditor opens in split-view
**Why human:** Animation timing, color accuracy, state machine visual transitions require interactive browser observation

### 4. Draggable Wall Endpoints with Overlay Sync

**Test:** In the FloorPlanEditor, use the Select tool to drag a wall endpoint on the Konva diagram
**Expected:** The wall moves in real time on the right panel (Konva); the corresponding SVG line on the original image overlay (left panel) moves simultaneously via the shared Zustand store
**Why human:** Konva drag interaction and cross-view synchronization require live rendering to confirm

### 5. Geometry Persistence Across Page Reloads

**Test:** Edit room names and wall positions in the editor, click Save (or Ctrl+S), reload the page, reopen the same floor plan project
**Expected:** Editor opens directly in editing state (skipping extraction and build-up), showing the corrected geometry; Version History panel shows at least v1 (AI) with teal badge and v2 (Manual) with gold badge
**Why human:** Persistence requires a live Convex connection and browser session

### 6. Reset to AI Result Flow

**Test:** After making corrections and saving, open Version History and click "Reset to AI Result"
**Expected:** An inline confirmation prompt appears (no modal); on confirm, geometry immediately reverts to the original AI extraction without a visible flash of stale content; a new version entry appears in the history
**Why human:** The inline confirmation UI pattern and immediate store update (geometry returned from mutation, no refetch wait) require live interaction to verify

---

## Summary

All four phase requirements (FP-01 through FP-04) have complete implementation evidence. The backend data layer is fully deployed with all required tables, migrations, job lifecycle mutations, and a functional DashScope AI extraction action with structured JSON output mode. The upload UI handles all three file formats. The interactive 2D editor has a multi-layer Konva architecture with 6 drawing tools, zoom/pan, an SVG overlay synced via Zustand, and save/version history wired to Convex.

The only automated finding worth noting is that the "Overall Dimensions" inputs in PropertiesPanel (shown when no element is selected) have placeholder `onChange` handlers — this is a minor gap that does not block any success criterion since room names, wall positions, and individual element dimensions are all editable and properly dispatched.

All 10 commits documented in the SUMMARYs are verified present in the git log.

Automated checks are complete. Human verification is needed for the interactive flows: PDF page rasterization, camera capture, animated build-up visual appearance, Konva drag interactions, and persistence/restore behavior.

---

_Verified: 2026-03-11_
_Verifier: Claude (gsd-verifier)_
