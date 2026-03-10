# Phase 4: Floor Plan Extraction - Research

**Researched:** 2026-03-10
**Domain:** AI vision extraction, 2D canvas editing, PDF rendering, Convex data modeling
**Confidence:** MEDIUM

## Summary

Phase 4 requires building three distinct subsystems: (1) a multi-format file upload pipeline that accepts PDF, JPG/PNG, and sketch photos, (2) an AI extraction pipeline using DashScope qwen3.5-plus vision model with structured JSON output to extract room geometry, and (3) an interactive 2D diagram editor built with react-konva for user corrections.

The most critical architectural decision is handling PDF files. Convex actions run on Node 18, which cannot support pdfjs-dist v4+ (requires Node 20+) or v5+ (requires Node 22+). The solution is client-side PDF rendering: use `react-pdf` (wrapper around pdfjs-dist) to rasterize PDF pages to canvas in the browser, export as PNG, then upload the rasterized image to Convex storage. The AI vision model only accepts image URLs, not PDF files directly.

The DashScope OpenAI-compatible API supports `response_format: { type: "json_object" }` for structured JSON output with qwen3.5-plus. This eliminates the fragile regex-based JSON cleaning currently used in `aiActions.ts` for scene analysis. The existing `aiJobs` table already has a `floor_plan` type literal, and the `aiHelpers` pattern (createJob -> updateJobStatus -> deductCredits) can be reused directly.

**Primary recommendation:** Client-side PDF-to-image conversion, DashScope structured JSON mode for extraction, react-konva v19 for the interactive editor, and a new `floorPlanProjects` table for multi-floor grouping with expanded `floorPlans` table for per-floor geometry data.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Standalone page at `/floor-plans/new` -- floor plans are their own entity, not embedded in the tour editor
- Drag-and-drop dropzone + camera capture button for mobile sketch photos
- Multi-floor batch upload: user can upload multiple files (one per floor), label each with a floor number, grouped as one building/project
- 50MB per file size limit (matches existing panorama limit)
- Preview step after upload: show uploaded image/PDF with rotate (90 degree increments) and crop tools before triggering AI extraction
- Multi-page PDFs: AI processes all pages, extracts floor plans from each
- Hybrid split view: original floor plan image (left) with SVG overlay showing extracted walls, clean editable diagram (right) -- changes sync between both views
- Full drawing tools: add/delete walls, draw new rooms, add doors/windows markers, split/merge rooms, drag wall endpoints
- Measurement display: both auto-generated dimension lines on the diagram (architectural style arrows) AND editable dimension inputs in a sidebar properties panel
- Full zoom and pan: scroll to zoom, drag to pan, minimap in corner for orientation
- Canvas-based rendering (Konva.js/react-konva recommended for the interactive diagram side)
- Animated preview build-up: diagram drawn progressively as AI identifies walls, then rooms, then dimensions
- No numerical confidence scores -- uncertain walls/rooms highlighted in amber with tooltip "This wall may need correction"
- Error handling: show partial results if available with option to continue editing manually, plus "Start Over" button for retry/re-upload
- Plan limits: Free 3/month, Starter 15/month, Pro 50/month, Enterprise unlimited -- failed extractions don't count
- In-app notification only (toast + bell badge) when extraction completes if user navigates away
- Floor plans can exist independently (optional tourId) or be linked to a tour
- Full architectural data extraction: wall coordinates, door positions with swing direction, window positions, room type, floor material hints, fixture positions
- Dimensions stored in metric (meters) -- display can convert to feet/inches based on locale
- Full edit version history: every save tracked as a version, undo across sessions, "Reset to AI result" capability

### Claude's Discretion
- Dashboard sidebar placement (new entry vs sub-section)
- Canvas library final choice (Konva.js recommended but open to alternatives)
- Animated build-up implementation approach
- Version history storage strategy (separate table vs inline array)
- Floor plan project grouping structure for multi-floor buildings
- PDF page rendering library (pdfjs-dist v4.x per STATE.md note)

### Deferred Ideas (OUT OF SCOPE)
- DWG/CAD file import (FPAV-01 in v2 requirements) -- already scoped as v2
- Multi-floor navigation linking floor plans into a single navigable building (FPAV-02 in v2 requirements) -- already scoped as v2
- AI auto-detection of which PDF pages contain floor plans vs cover pages -- simplify by processing all pages for now
- Real-time collaboration on floor plan editing -- out of scope per project constraints
- 3D preview of extracted floor plan before committing -- belongs in Phase 5

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FP-01 | User can upload a floor plan in any format -- PDF, JPG/PNG, or a photo of a hand-drawn sketch | react-dropzone (already installed) with extended accept types; react-pdf for client-side PDF rendering; camera capture via `<input capture="environment">` |
| FP-02 | AI extracts room layout -- room names, wall boundaries, approximate dimensions -- as structured JSON | DashScope qwen3.5-plus vision model with `response_format: { type: "json_object" }` for reliable structured output; existing aiJobs pattern with floor_plan type |
| FP-03 | User sees extracted 2D floor plan as editable diagram and can correct room names, adjust wall positions, fix dimensions | react-konva v19 for canvas-based interactive editor; Konva Transformer for resize/drag; split view with original image reference |
| FP-04 | Corrected 2D floor plan data saved to Convex as structured room geometry | Expanded floorPlans table schema with walls, doors, windows, rooms arrays; new floorPlanVersions table for edit history; new floorPlanProjects table for multi-floor grouping |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-konva | ^19.2.0 | Interactive 2D canvas diagram editor | Official React binding for Konva; matches React 19; polygon editing, drag, transform, zoom/pan built-in |
| konva | ^9.x | Canvas rendering engine (peer dep of react-konva) | Industry standard HTML5 canvas 2D library; floor plan examples in official docs |
| react-pdf | ^9.x | PDF page rendering to React components | Wrapper around pdfjs-dist; handles worker setup, page rendering; client-side only |
| pdfjs-dist | ^4.7.x | PDF parsing engine (peer dep of react-pdf) | Pin to v4.x -- v5.x requires Node 22+ (Promise.withResolvers); client-side only, never in Convex actions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dropzone | ^15.0.0 | Drag-and-drop file upload | Already installed; extend accept config for PDF |
| use-image | ^1.1.x | Load images into Konva canvas | Needed to display the original floor plan image as background in the Konva Stage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-konva | fabric.js / react-fabricjs | fabric.js has more built-in drawing tools but worse React integration, heavier bundle, less active maintenance |
| react-konva | SVG-only (no canvas) | SVG works for display but struggles with complex interactive editing, hit detection on complex polygons, and performance with many shapes |
| react-pdf | raw pdfjs-dist | More control but significantly more boilerplate for worker setup, page management, rendering lifecycle |

**Installation:**
```bash
npm install react-konva konva react-pdf use-image
```

**Note:** `pdfjs-dist` is a peer dependency of `react-pdf` and will be installed automatically. Pin to `pdfjs-dist@^4.7.0` if needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/floor-plans/
│   ├── page.tsx               # Floor plan list/dashboard
│   ├── new/page.tsx            # Upload + preview page
│   └── [id]/
│       └── edit/page.tsx       # Editor page (split view)
├── components/floor-plan/
│   ├── FloorPlanUpload.tsx     # Dropzone + camera capture + PDF preview
│   ├── FloorPlanPreview.tsx    # Pre-extraction preview with rotate/crop
│   ├── FloorPlanEditor.tsx     # Main split-view editor container
│   ├── DiagramCanvas.tsx       # react-konva Stage with walls/rooms/doors
│   ├── OriginalOverlay.tsx     # Original image with SVG extraction overlay
│   ├── PropertiesPanel.tsx     # Right sidebar: room name, dimensions, type
│   ├── DrawingToolbar.tsx      # Tool selection: select, wall, room, door, window
│   ├── ExtractionProgress.tsx  # Animated build-up during AI extraction
│   └── MiniMap.tsx             # Corner minimap for zoom/pan orientation
convex/
├── floorPlanProjects.ts        # CRUD for multi-floor project grouping
├── floorPlans.ts               # CRUD for individual floor plans + geometry
├── floorPlanVersions.ts        # Version history for edit tracking
└── floorPlanActions.ts         # AI extraction action (DashScope vision call)
```

### Pattern 1: Client-Side PDF-to-Image Pipeline
**What:** PDF files are rasterized to PNG images in the browser before uploading
**When to use:** Always for PDF uploads -- Convex Node 18 runtime cannot run pdfjs-dist
**Why:** Convex actions run on Node 18, pdfjs-dist v4+ requires Node 20+. The AI vision model only accepts image URLs.
**Flow:**
```
User uploads PDF
  -> react-pdf renders each page to <canvas> in browser
  -> canvas.toBlob() exports as PNG
  -> Upload PNG to Convex storage (3-step pattern)
  -> AI action receives storage ID, gets URL, sends to vision API
```

### Pattern 2: AI Extraction with Structured JSON Output
**What:** Use DashScope `response_format: { type: "json_object" }` for reliable JSON
**When to use:** For the floor plan extraction call
**Why:** Eliminates fragile regex cleaning (`.replace(/```json/g, '')`) currently used in analyzeScene
**Example:**
```typescript
// In Convex action (floorPlanActions.ts)
const response = await fetch(DASHSCOPE_CHAT_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getDashScopeKey()}`,
  },
  body: JSON.stringify({
    model: 'qwen3.5-plus',
    messages: [
      {
        role: 'system',
        content: 'You are an architectural floor plan analyzer. Extract room geometry from floor plan images. Return JSON with the exact schema specified.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    // Do NOT set max_tokens -- may truncate JSON
  }),
})
// Result is guaranteed valid JSON, no cleaning needed
const extraction = JSON.parse(data.choices[0].message.content)
```

### Pattern 3: Konva Canvas Editor with Zoom/Pan
**What:** react-konva Stage with scroll-to-zoom, drag-to-pan, and a corner minimap
**When to use:** The right-side editable diagram
**Example:**
```typescript
// DiagramCanvas.tsx
'use client'
import { Stage, Layer, Line, Circle, Text, Transformer } from 'react-konva'

// Zoom via wheel event on Stage
function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
  e.evt.preventDefault()
  const stage = e.target.getStage()
  if (!stage) return
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  const scaleBy = 1.05
  const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
  stage.scale({ x: newScale, y: newScale })
  // Adjust position to zoom toward pointer
  const newPos = {
    x: pointer.x - (pointer.x - stage.x()) * (newScale / oldScale),
    y: pointer.y - (pointer.y - stage.y()) * (newScale / oldScale),
  }
  stage.position(newPos)
}
```

### Pattern 4: Version History via Separate Table
**What:** Each save creates a new version document; unlimited undo across sessions
**When to use:** Edit history for floor plans
**Why:** Inline arrays in Convex documents have size limits (~1MB); separate table scales better, enables querying specific versions, and supports "Reset to AI result" by marking version 0.
**Schema:**
```typescript
floorPlanVersions: defineTable({
  floorPlanId: v.id('floorPlans'),
  versionNumber: v.number(),
  geometry: v.object({ /* walls, rooms, doors, windows */ }),
  createdAt: v.number(),
  source: v.union(v.literal('ai'), v.literal('user')),
}).index('by_floorPlanId', ['floorPlanId'])
```

### Pattern 5: Animated Build-Up via Staged State Updates
**What:** Progressive diagram rendering as AI results arrive
**When to use:** After AI extraction completes, during the reveal animation
**Why:** User decision requires "visually impressive extraction experience"
**Approach:**
```
1. AI returns full extraction JSON in one response
2. Client receives result, stores full data
3. Animate in stages with requestAnimationFrame / setTimeout:
   Stage 1 (0-1s): Draw wall lines progressively (Line opacity 0->1)
   Stage 2 (1-2s): Fill room polygons with color + labels
   Stage 3 (2-3s): Add dimension annotations
4. After animation: enable editing tools
```

### Anti-Patterns to Avoid
- **Running pdfjs-dist in Convex actions:** Node 18 cannot support it. Always rasterize PDFs client-side.
- **Storing full geometry history in a single document:** Convex documents have ~1MB limit. Use a separate versions table.
- **Using max_tokens with structured JSON output:** DashScope may truncate the JSON mid-object, producing invalid output. Omit max_tokens entirely.
- **SSR for canvas components:** react-konva requires DOM APIs. Always use `dynamic(() => import(...), { ssr: false })`.
- **Streaming AI responses for structured JSON:** JSON output mode is not compatible with streaming. Use a standard request-response pattern with the aiJobs queue for async status updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF rendering | Custom PDF parser | react-pdf + pdfjs-dist v4 | PDF spec is enormous; font subsetting, transparency, form fields |
| Canvas hit detection | Custom point-in-polygon math | Konva built-in shape events (onClick, onDragEnd, onTransformEnd) | Konva handles hit regions, z-order, compound shapes automatically |
| Canvas zoom/pan | Manual transform matrix math | Konva Stage scale/position + wheel handler | Konva handles coordinate transforms between screen and canvas space |
| Image rotation/crop | Canvas manipulation code | CSS transforms for preview rotation; Konva Image + clipFunc for crop | Browser handles rotation efficiently; Konva clips natively |
| Drag-and-drop upload | Custom drag events | react-dropzone (already installed) | Handles browser compat, file validation, multiple files, accessibility |
| Undo/redo in editor | Custom history stack | Zustand store with history middleware pattern | Already using Zustand; Phase 3 proved the pattern with furniture undo (50-item stack) |

**Key insight:** The floor plan editor has significant interaction complexity. Using Konva's built-in Transformer, draggable shapes, and event system eliminates thousands of lines of custom geometry code.

## Common Pitfalls

### Pitfall 1: PDF Worker Loading in Next.js
**What goes wrong:** pdfjs-dist worker fails to load, PDF pages render blank or crash
**Why it happens:** Next.js SSR tries to import pdfjs-dist on the server; worker URL resolution differs between dev (Turbopack) and production
**How to avoid:** (1) Always use `'use client'` directive. (2) Use `dynamic(() => import(...), { ssr: false })`. (3) Set worker source to CDN URL: `pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs'`
**Warning signs:** "window is not defined" errors, blank canvas, worker timeout errors

### Pitfall 2: Convex Document Size Limits
**What goes wrong:** Mutation fails silently or throws when saving large geometry data
**Why it happens:** Convex documents have ~1MB limit; complex floor plans with many walls/rooms can produce large JSON
**How to avoid:** Keep geometry compact (coordinate arrays, not nested objects). Store version history in a separate table, not inline. Test with complex real-world floor plans during development.
**Warning signs:** Mutation errors on save, data truncation

### Pitfall 3: AI Extraction Quality Variance
**What goes wrong:** AI returns wildly different quality results for different input types (clean CAD vs. hand-drawn sketch vs. photo of paper)
**Why it happens:** Vision models trained on diverse data but floor plan interpretation is domain-specific
**How to avoid:** (1) Detailed extraction prompt with expected JSON schema. (2) Validate returned JSON against schema before accepting. (3) Always show results as editable -- never trust AI output as final. (4) Mark low-confidence elements with amber highlight per user decision.
**Warning signs:** Missing rooms, walls that don't connect, implausible dimensions

### Pitfall 4: Konva Performance with Complex Diagrams
**What goes wrong:** Editor becomes sluggish with many shapes (walls, doors, windows, labels, dimension lines)
**Why it happens:** Konva redraws entire canvas on any change; too many shapes on one layer
**How to avoid:** (1) Use multiple Konva Layers (walls layer, labels layer, dimension layer) -- only dirty layers redraw. (2) Use `listening: false` on decorative shapes (dimension lines, grid). (3) Batch state updates. (4) Keep the minimap on a separate, downscaled Stage.
**Warning signs:** Input lag when dragging walls, slow zoom response

### Pitfall 5: Coordinate System Confusion
**What goes wrong:** Wall positions don't match between original image overlay and clean diagram; dimensions are wrong
**Why it happens:** Multiple coordinate systems: image pixels, Konva canvas units, real-world meters. Scaling/offset errors compound.
**How to avoid:** Define a single canonical coordinate system (meters, origin at top-left of floor plan). All geometry stored in meters. Image overlay uses a known scale factor (pixels per meter). Konva diagram uses the same meter coordinates with a view scale.
**Warning signs:** Walls appear shifted, dimensions don't add up, zoom changes apparent positions

### Pitfall 6: aiJobs tourId Requirement
**What goes wrong:** Cannot create floor plan AI jobs for standalone floor plans (no tourId)
**Why it happens:** Current `aiJobs` schema requires `tourId: v.id('tours')` -- it's not optional
**How to avoid:** Either (a) create a separate `floorPlanJobs` table, or (b) make `tourId` optional in `aiJobs` (but this changes existing schema and may break existing queries). Recommendation: create a dedicated `floorPlanJobs` table to avoid touching the existing aiJobs schema.
**Warning signs:** Type errors when trying to create a floor_plan job without a tourId

## Code Examples

### AI Extraction Prompt (Verified Pattern from DashScope Docs)
```typescript
const EXTRACTION_PROMPT = `Analyze this floor plan image and extract the room geometry. Return JSON with this exact structure:

{
  "walls": [
    {
      "id": "w1",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 5.2, "y": 0 },
      "thickness": 0.15,
      "confidence": "high"
    }
  ],
  "rooms": [
    {
      "id": "r1",
      "name": "Living Room",
      "type": "living_room",
      "polygon": [
        { "x": 0, "y": 0 },
        { "x": 5.2, "y": 0 },
        { "x": 5.2, "y": 4.0 },
        { "x": 0, "y": 4.0 }
      ],
      "area": 20.8,
      "floorMaterial": "hardwood",
      "confidence": "high"
    }
  ],
  "doors": [
    {
      "id": "d1",
      "position": { "x": 2.5, "y": 0 },
      "width": 0.9,
      "swingDirection": "inward",
      "wallId": "w1"
    }
  ],
  "windows": [
    {
      "id": "win1",
      "position": { "x": 3.0, "y": 4.0 },
      "width": 1.2,
      "wallId": "w3"
    }
  ],
  "dimensions": {
    "unit": "meters",
    "overallWidth": 12.5,
    "overallHeight": 8.3
  },
  "fixtures": [
    {
      "type": "sink",
      "position": { "x": 8.0, "y": 2.0 },
      "roomId": "r3"
    }
  ]
}

Rules:
- All coordinates in meters from top-left origin
- Confidence is "high" or "low" -- mark uncertain elements as "low"
- Room types: living_room, bedroom, kitchen, bathroom, hallway, dining_room, closet, balcony, laundry, study, garage, other
- Include ALL visible walls, even partial ones
- Estimate dimensions from visual proportions if no scale is provided`
```

### Expanded Convex Schema
```typescript
// New tables for Phase 4
floorPlanProjects: defineTable({
  userId: v.id('users'),
  name: v.string(),
  tourId: v.optional(v.id('tours')),
  floorCount: v.number(),
  status: v.union(v.literal('uploading'), v.literal('extracting'), v.literal('editing'), v.literal('completed')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_userId', ['userId'])
  .index('by_tourId', ['tourId']),

// Expanded floorPlans table (replaces existing minimal version)
floorPlans: defineTable({
  projectId: v.optional(v.id('floorPlanProjects')),
  tourId: v.optional(v.id('tours')),
  userId: v.id('users'),
  floorNumber: v.number(),
  label: v.optional(v.string()),
  // Source image
  imageStorageId: v.id('_storage'),
  originalFileType: v.union(v.literal('pdf'), v.literal('image'), v.literal('sketch')),
  // Extraction status
  extractionStatus: v.union(
    v.literal('pending'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('failed')
  ),
  extractionJobId: v.optional(v.id('floorPlanJobs')),
  // Current geometry (latest version)
  geometry: v.optional(v.object({
    walls: v.array(v.any()),
    rooms: v.array(v.any()),
    doors: v.optional(v.array(v.any())),
    windows: v.optional(v.array(v.any())),
    fixtures: v.optional(v.array(v.any())),
    dimensions: v.optional(v.any()),
  })),
  // Scale factor: pixels per meter for the source image
  scale: v.optional(v.number()),
  currentVersion: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_projectId', ['projectId'])
  .index('by_tourId', ['tourId'])
  .index('by_userId', ['userId']),

floorPlanVersions: defineTable({
  floorPlanId: v.id('floorPlans'),
  versionNumber: v.number(),
  geometry: v.any(), // Same structure as floorPlans.geometry
  source: v.union(v.literal('ai'), v.literal('user')),
  createdAt: v.number(),
})
  .index('by_floorPlanId', ['floorPlanId']),

floorPlanJobs: defineTable({
  floorPlanId: v.id('floorPlans'),
  userId: v.id('users'),
  status: v.union(
    v.literal('pending'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('failed')
  ),
  imageStorageId: v.id('_storage'),
  output: v.optional(v.any()),
  error: v.optional(v.string()),
  duration: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_floorPlanId', ['floorPlanId'])
  .index('by_userId', ['userId'])
  .index('by_status', ['status']),
```

### Client-Side PDF Rasterization
```typescript
'use client'
import { Document, Page, pdfjs } from 'react-pdf'

// Set worker source -- must match pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

async function rasterizePdfPage(
  file: File,
  pageNumber: number,
  scale: number = 2.0
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!

  await page.render({ canvasContext: ctx, viewport }).promise

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSON cleaning from AI responses | `response_format: { type: "json_object" }` | DashScope 2025 | Reliable structured output; eliminates regex stripping |
| pdfjs-dist v3 (CommonJS, Node 16+) | pdfjs-dist v4 (ESM, Node 20+) | 2024 | Must use v4 client-side only; cannot run in Convex Node 18 |
| Konva v8 + react-konva v18 | Konva v9 + react-konva v19 | 2024-2025 | React 19 compatibility; improved performance |
| CubiCasa API for floor plan extraction | Vision LLM (qwen3.5-plus) with structured output | 2025-2026 | No external API dependency; works with any image input including sketches |

**Deprecated/outdated:**
- CubiCasa API: Referenced in CLAUDE.md but no longer needed. DashScope vision model handles extraction directly with structured JSON output. CubiCasa requires specific API integration and may not handle hand-drawn sketches.
- pdfjs-dist v3: End of life; security vulnerabilities.
- `aiJobs` with `floor_plan` type for standalone floor plans: The existing `aiJobs.tourId` is required (non-optional), making it unusable for standalone floor plans. Use a dedicated `floorPlanJobs` table instead.

## Open Questions

1. **AI extraction quality for hand-drawn sketches**
   - What we know: qwen3.5-plus handles structured document images well (invoices, forms, charts)
   - What's unclear: How well it handles hand-drawn sketches with irregular lines, no scale, and ambiguous room boundaries
   - Recommendation: Build the extraction pipeline, test with various sketch qualities, and rely on the mandatory editing step as a safety net. The amber confidence highlight covers this.

2. **Plan limit tracking granularity**
   - What we know: User wants Free 3/month, Starter 15/month, Pro 50/month, Enterprise unlimited
   - What's unclear: Whether to use existing aiCreditsUsed or a separate floorPlanCreditsUsed counter
   - Recommendation: Add a separate `floorPlanExtractionsUsed` field on the users table with a monthly reset. Floor plan extraction is a different feature with different limits than AI scene analysis credits.

3. **Multi-page PDF handling UX**
   - What we know: User wants all pages processed
   - What's unclear: Whether each page becomes a separate floor plan, or the user selects which pages to extract
   - Recommendation: Rasterize all pages client-side, show thumbnails, let user select pages and assign floor numbers before triggering extraction. This is simpler than AI auto-detection (deferred) and gives the user control.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test runner configured (vitest/playwright not in package.json) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FP-01 | Upload accepts PDF, JPG/PNG, sketch photo | manual-only | Manual: upload each format via UI | N/A -- no test framework |
| FP-02 | AI returns structured JSON with rooms, walls, dimensions | manual-only | Manual: trigger extraction, verify JSON shape | N/A |
| FP-03 | Editable 2D diagram with corrections | manual-only | Manual: drag walls, rename rooms, adjust dimensions | N/A |
| FP-04 | Corrected geometry saves to Convex | manual-only | Manual: save, reload, verify data persists | N/A |

### Sampling Rate
- **Per task commit:** Manual verification against requirement
- **Per wave merge:** Full manual walkthrough of upload -> extract -> edit -> save flow
- **Phase gate:** All 4 requirements demonstrated end-to-end

### Wave 0 Gaps
- [ ] No test framework installed (vitest or playwright)
- [ ] No automated tests possible until framework is configured
- [ ] Manual testing protocol should be documented for each requirement

*Note: All testing is manual-only due to no test runner. CLAUDE.md confirms "No test runner (vitest/playwright) is configured yet in package.json."*

## Sources

### Primary (HIGH confidence)
- [DashScope Structured Output Docs](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output) - JSON output mode, json_schema mode, model compatibility
- [DashScope Vision API](https://www.alibabacloud.com/help/en/model-studio/vision) - qwen3.5-plus vision capabilities
- [Konva.js Interactive Floor Plan](https://konvajs.org/docs/sandbox/Interactive_Building_Map.html) - Official floor plan example
- [react-konva GitHub](https://github.com/konvajs/react-konva) - React 19 compatibility, v19.2.0
- [react-pdf npm](https://www.npmjs.com/package/react-pdf) - PDF rendering wrapper
- Existing codebase: `convex/aiActions.ts`, `convex/aiHelpers.ts`, `convex/schema.ts` - Established patterns

### Secondary (MEDIUM confidence)
- [Konva Polygon Editor Tutorial](https://medium.com/@imamrasheedatahmad1993/how-to-build-an-interactive-polygon-editor-in-react-using-react-konva-1b085e0b04de) - Interactive polygon editing pattern
- [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist) - Version 4.7.76 current, v5 requires Node 22
- [Convex Runtimes](https://docs.convex.dev/functions/runtimes) - Node 18 limitation for actions

### Tertiary (LOW confidence)
- [Convex Node Version Issue](https://github.com/get-convex/convex-backend/issues/157) - Node 18 EOL concern
- AI extraction quality for hand-drawn sketches - No verified benchmarks found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-konva, react-pdf, pdfjs-dist are well-documented, version-matched, and verified compatible
- Architecture: MEDIUM - PDF-to-image pipeline is sound but untested in this specific Convex context; schema design follows established patterns
- AI extraction: MEDIUM - DashScope structured JSON output verified via docs; floor plan extraction quality from vision models is domain-specific and needs empirical validation
- Pitfalls: HIGH - Node 18 limitation, document size limits, SSR issues are well-documented constraints

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days -- libraries are stable, DashScope API is actively updated)
