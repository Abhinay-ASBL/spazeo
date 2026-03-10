# Phase 4: Floor Plan Extraction - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Accept any floor plan file (PDF, JPG/PNG, or sketch photo), extract structured room geometry via AI vision, render an editable 2D diagram for user corrections, and save the corrected geometry to Convex as structured wall coordinates and room metadata ready for Phase 5 3D generation. No 3D generation, no furniture placement — extraction and correction only.

</domain>

<decisions>
## Implementation Decisions

### Upload Experience
- Standalone page at `/floor-plans/new` — floor plans are their own entity, not embedded in the tour editor
- Drag-and-drop dropzone + camera capture button for mobile sketch photos
- Multi-floor batch upload: user can upload multiple files (one per floor), label each with a floor number, grouped as one building/project
- 50MB per file size limit (matches existing panorama limit)
- Preview step after upload: show uploaded image/PDF with rotate (90° increments) and crop tools before triggering AI extraction
- Multi-page PDFs: AI processes all pages, extracts floor plans from each
- Dashboard navigation: Claude's discretion (sidebar entry vs sub-section under Tours)

### 2D Diagram Editor
- Hybrid split view: original floor plan image (left) with SVG overlay showing extracted walls, clean editable diagram (right) — changes sync between both views
- Full drawing tools: add/delete walls, draw new rooms, add doors/windows markers, split/merge rooms, drag wall endpoints
- Measurement display: both auto-generated dimension lines on the diagram (architectural style arrows) AND editable dimension inputs in a sidebar properties panel
- Full zoom and pan: scroll to zoom, drag to pan, minimap in corner for orientation
- Canvas-based rendering (Konva.js/react-konva recommended for the interactive diagram side)

### AI Extraction Feedback
- Animated preview build-up: diagram drawn progressively as AI identifies walls, then rooms, then dimensions — visually impressive extraction experience
- No numerical confidence scores — uncertain walls/rooms highlighted in amber with tooltip "This wall may need correction" (industry best practice)
- Error handling: show partial results if available with option to continue editing manually, plus "Start Over" button for retry/re-upload
- Plan limits: Free 3/month, Starter 15/month, Pro 50/month, Enterprise unlimited — failed extractions don't count
- In-app notification only (toast + bell badge) when extraction completes if user navigates away — no email

### Data Model
- Floor plans can exist independently (optional tourId) or be linked to a tour — both creation paths supported
- Full architectural data extraction: wall coordinates, door positions with swing direction, window positions, room type (bedroom/kitchen/bathroom), floor material hints, fixture positions
- Dimensions stored in metric (meters) — display can convert to feet/inches based on locale
- Full edit version history: every save tracked as a version, undo across sessions, "Reset to AI result" capability

### Claude's Discretion
- Dashboard sidebar placement (new entry vs sub-section)
- Canvas library final choice (Konva.js recommended but open to alternatives)
- Animated build-up implementation approach
- Version history storage strategy (separate table vs inline array)
- Floor plan project grouping structure for multi-floor buildings
- PDF page rendering library (pdfjs-dist v4.x per STATE.md note)

</decisions>

<specifics>
## Specific Ideas

- CubiCasa-style measurement lines along walls for professional architectural feel
- Planner 5D-style AI recognition with drag-and-drop editing capability
- Split view reference: original image always available for comparison while editing the clean diagram
- Multi-floor support matches CubiCasa's hosted floor plan feature — group floors into a single building project
- Progressive animated extraction gives a "magic" feel — walls appear, then rooms fill in, then dimensions annotate

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UploadZone.tsx`: react-dropzone based upload component — needs extension for PDF accept type and camera capture button
- `floorPlans` table in schema.ts: existing table with tourId, imageStorageId, rooms (polygon array), scale — needs significant schema expansion for walls, doors, windows, room types
- `aiJobs` pattern: pending -> processing -> completed/failed job queue — reuse for floor plan extraction jobs
- `CaptureUpload.tsx`: video/photo upload with preview and validation — pattern reference for the upload flow
- `ReconstructionProgress.tsx`: multi-stage progress display — pattern reference for extraction progress
- `notifications` table: existing in-app notification system — reuse for extraction completion alerts

### Established Patterns
- 3-step file upload: generateUploadUrl → POST file → save storageId
- `useQuery(api.*)` reactive reads for real-time progress updates
- `dynamic(() => import(...), { ssr: false })` for canvas/heavy components
- `toast.success/error` for user feedback
- Convex actions for external API calls (AI vision) — cannot be mutations

### Integration Points
- New standalone route: `/floor-plans/new` and `/floor-plans/[id]/edit`
- `floorPlans` table schema expansion (or new `floorPlanProjects` table for multi-floor grouping)
- New `floorPlanExtractions` job table (or extend `aiJobs` with floor_plan type — already has the literal)
- Dashboard sidebar: new nav entry or sub-section
- AI vision call: Alibaba DashScope qwen3.5-plus via OpenAI-compatible API (structured JSON output mode)
- Phase 5 downstream: corrected geometry data feeds directly into 3D wall extrusion

</code_context>

<deferred>
## Deferred Ideas

- DWG/CAD file import (FPAV-01 in v2 requirements) — already scoped as v2
- Multi-floor navigation linking floor plans into a single navigable building (FPAV-02 in v2 requirements) — already scoped as v2
- AI auto-detection of which PDF pages contain floor plans vs cover pages — simplify by processing all pages for now
- Real-time collaboration on floor plan editing — out of scope per project constraints
- 3D preview of extracted floor plan before committing — belongs in Phase 5

</deferred>

---

*Phase: 04-floor-plan-extraction*
*Context gathered: 2026-03-10*
