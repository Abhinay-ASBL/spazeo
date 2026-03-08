# Architecture Research

**Domain:** AI-powered 3D room reconstruction and furniture placement platform (real estate SaaS)
**Researched:** 2026-03-09
**Confidence:** MEDIUM-HIGH (pipeline topology confirmed by multiple sources; Luma AI 3D API availability LOW confidence — docs show video/image only)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js App Router)                    │
│                                                                         │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  360° Tour Viewer │  │  3D Room Editor  │  │  Floor Plan Uploader │  │
│  │  (Section 1)      │  │  (Section 2)     │  │  (Section 3)         │  │
│  │  PhotoSphereViewer│  │  R3F + Splat.js  │  │  GPT-4o extraction   │  │
│  └────────┬──────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                      │                        │              │
│    useQuery / useMutation / useAction (Convex SDK)        │              │
└───────────┼──────────────────────┼────────────────────────┼─────────────┘
            │                      │                        │
┌───────────▼──────────────────────▼────────────────────────▼─────────────┐
│                    CONVEX CLOUD (Reactive Backend)                       │
│                                                                         │
│  ┌────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │  Queries / Mutations       │  │  Actions (External API Bridge)    │  │
│  │  tours, scenes, hotspots   │  │  aiActions.ts                     │  │
│  │  rooms, furnitureItems     │  │  floorPlanActions.ts              │  │
│  │  reconstructionJobs        │  │  reconstructionActions.ts         │  │
│  └────────────────────────────┘  └──────────────────┬────────────────┘  │
│                                                      │                  │
│  ┌────────────────────────────┐  ┌────────────────────▼──────────────┐  │
│  │  HTTP Actions (Webhooks)   │  │  Convex File Storage              │  │
│  │  /gpu-callback             │  │  panoramas, splat files, GLBs     │  │
│  │  /stripe-webhook           │  │  floor plan images, depth maps    │  │
│  └────────────────────────────┘  └───────────────────────────────────┘  │
└──────────────────────────────────────────────────────┬──────────────────┘
                                                       │ HTTP calls
           ┌───────────────────────────────────────────┼────────────────┐
           │                                           │                │
  ┌────────▼──────────┐  ┌────────────────┐  ┌────────▼────────────────┐
  │  OpenAI GPT-4o    │  │  Replicate API │  │  RunPod Serverless GPU  │
  │  Floor plan read  │  │  Depth est.    │  │  Gaussian Splatting     │
  │  Room structured  │  │  AI Staging    │  │  (nerfstudio / gsplat)  │
  │  JSON output      │  │  Image gen     │  │  Calls back via HTTP    │
  └───────────────────┘  └────────────────┘  └─────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `PanoramaViewer` | Renders equirectangular images in sphere; hotspot navigation | Convex queries (scenes), Zustand (viewer state) |
| `GaussianSplatViewer` | Renders `.splat`/`.ply`/`.spz` files via spark.js inside R3F canvas | Convex storage URLs, scene state |
| `RoomEditor3D` | Three.js scene for furniture placement; raycasting for floor snap; drag/transform controls | Convex mutations (furnitureItems), GLTF catalog loader |
| `FloorPlan3DViewer` | Renders procedurally generated Three.js geometry from floor plan JSON; same navigation modes as RoomEditor3D | Convex queries (roomGeometry), R3F |
| `FurnitureCatalog` | Browse/search internal GLB catalog; add item to scene | Convex query (catalog), useAction (place item) |
| `CostTracker` | Reactive sum of placed furniture prices | Convex query (furnitureItems by roomId) |
| Convex `reconstructionActions.ts` | Trigger GPU job on RunPod; poll or receive webhook; store result splat file | RunPod HTTP API, Convex storage, internal mutations |
| Convex `floorPlanActions.ts` | Send floor plan image to GPT-4o Vision; parse structured JSON; store room geometry | OpenAI API, internal mutations |
| Convex `reconstructionJobs` table | Track GPU job lifecycle (pending → processing → complete/failed) | Queried reactively by frontend |
| RunPod GPU worker | Execute nerfstudio/gsplat on uploaded panoramas; output `.splat` file; call Convex mutation to deliver result | Convex HTTP action or direct mutation via Convex Python client |
| Convex HTTP action `/gpu-callback` | Receive callback from RunPod worker; update job status; store splat storageId | Internal mutations, Convex storage upload URL |

---

## Recommended Project Structure

Extensions to the existing codebase for Sections 2 and 3:

```
src/
├── app/
│   └── (dashboard)/
│       ├── rooms/                   # Section 2 — 3D room management
│       │   ├── page.tsx             # Room list
│       │   ├── [id]/page.tsx        # Room detail + viewer
│       │   └── [id]/edit/page.tsx   # Room editor with furniture placement
│       └── floor-plans/             # Section 3 — floor plan upload + 3D gen
│           ├── page.tsx
│           └── [id]/page.tsx
├── components/
│   ├── viewer/
│   │   ├── GaussianSplatViewer.tsx  # spark.js SplatMesh inside R3F canvas
│   │   └── SplatLoadingState.tsx    # Progress indicator during GPU processing
│   ├── room/
│   │   ├── RoomEditor3D.tsx         # Main Three.js furniture placement canvas
│   │   ├── FurnitureCatalog.tsx     # Browse + search GLB items
│   │   ├── FurnitureItem.tsx        # Placed item in scene (draggable, rotatable)
│   │   ├── FloorSnapGrid.tsx        # Raycasting floor target plane
│   │   ├── CostTracker.tsx          # Running total display
│   │   └── RoomShareModal.tsx       # Generate shareable link
│   └── floor-plan/
│       ├── FloorPlanUploader.tsx    # File upload (PDF, PNG, JPG, sketch)
│       ├── FloorPlan3DViewer.tsx    # Procedural Three.js geometry viewer
│       └── ExtractionProgress.tsx   # GPT-4o + geometry gen status
├── hooks/
│   ├── useRoom.ts                   # Room queries + mutations
│   ├── useFurniture.ts              # Catalog + placed items
│   └── useReconstruction.ts         # Job status reactive subscription
convex/
├── rooms.ts                         # CRUD for reconstructed rooms
├── furnitureCatalog.ts              # Internal GLB catalog (name, url, price, dims)
├── furnitureItems.ts                # Placed items per room (position, rotation, scale)
├── reconstructionJobs.ts            # Job tracking table queries + mutations
├── reconstructionActions.ts         # Trigger RunPod; poll; store result
├── floorPlanActions.ts              # GPT-4o Vision call; parse JSON; store geometry
└── roomGeometry.ts                  # Store extracted room geometry (walls, dims)
```

---

## Architectural Patterns

### Pattern 1: GPU Job Queue with Webhook Callback

**What:** For GPU-intensive workloads (Gaussian Splatting reconstruction) that take 5-20 minutes and cannot complete within a Convex action's 10-minute timeout, use an external GPU service (RunPod) with a callback pattern. The GPU worker calls back into Convex mutations when done.

**When to use:** Any AI job exceeding ~5 minutes, or requiring dedicated GPU resources not available on Replicate.

**Trade-offs:** More complex setup than direct Replicate calls; RunPod workers need the Convex URL and a service key to call back; adds operational complexity. Payoff is true async processing without polling overhead.

**Data flow:**
```
Frontend calls useMutation(api.rooms.startReconstruction)
    ↓
Mutation inserts reconstructionJob {status: "pending"} → schedules action
    ↓
Action POSTs panorama storageIds to RunPod endpoint → gets jobId back
    ↓
Action updates job {status: "processing", runpodJobId}
    ↓
RunPod worker processes (nerfstudio/gsplat) → generates .splat file
    ↓
Worker POSTs result to Convex HTTP action /gpu-callback
    ↓
HTTP action calls ctx.runMutation(internal.reconstructionJobs.complete, {splatStorageId})
    ↓
Frontend useQuery watching the job auto-refreshes → viewer renders splat
```

**Key insight from Convex docs (HIGH confidence):** Convex actions have a hard 10-minute timeout. Gaussian Splatting on a single scene typically takes 10-30 minutes on GPU. The job MUST be offloaded to RunPod (or similar) with a callback, not processed inline in the Convex action.

**Schema pattern:**
```typescript
// convex/schema.ts addition
reconstructionJobs: defineTable({
  tourId: v.id("tours"),
  sceneIds: v.array(v.id("scenes")),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("complete"),
    v.literal("failed")
  ),
  runpodJobId: v.optional(v.string()),
  splatStorageId: v.optional(v.id("_storage")),
  errorMessage: v.optional(v.string()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
}).index("by_tourId", ["tourId"]).index("by_status", ["status"])
```

### Pattern 2: Floor Plan Extraction via GPT-4o Structured Output

**What:** Send a floor plan image (PDF rendered to PNG, or uploaded JPG/sketch) to GPT-4o Vision with a strict JSON schema. GPT-4o returns room dimensions, wall coordinates, door/window positions, and room labels. This JSON is stored in Convex and consumed by a Three.js geometry builder.

**When to use:** Any floor plan input regardless of format — PDF, JPG, hand-drawn sketch photo. GPT-4o handles all without specialized parsers.

**Trade-offs:** Cost per extraction (~$0.02-0.05 per image at current GPT-4o pricing); accuracy varies for hand-drawn sketches vs CAD plans; coordinate precision is AI-estimated, not measured. Avoids DWG parser complexity entirely.

**Extraction schema to request:**
```typescript
// The JSON schema passed to GPT-4o structured outputs
const floorPlanSchema = {
  type: "object",
  properties: {
    rooms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },       // "Living Room", "Bedroom 1"
          widthMeters: { type: "number" },
          heightMeters: { type: "number" },
          walls: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x1: { type: "number" },    // normalized 0-1 coordinates
                y1: { type: "number" },
                x2: { type: "number" },
                y2: { type: "number" },
                hasWindow: { type: "boolean" },
                hasDoor: { type: "boolean" }
              }
            }
          }
        }
      }
    },
    totalAreaSqM: { type: "number" },
    estimatedCeilingHeightM: { type: "number" }
  }
}
```

**Three.js geometry generation from extracted JSON:**
```typescript
// Pattern: extrude walls from 2D coordinates
function buildRoomGeometry(room: ExtractedRoom, ceilingHeight: number) {
  const group = new THREE.Group()

  // Floor
  const floorShape = new THREE.Shape()
  // ... trace room outline from wall coords

  // Walls: for each wall segment, create a box geometry
  room.walls.forEach(wall => {
    const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
    const wallGeo = new THREE.BoxGeometry(length, ceilingHeight, 0.1)
    // position + rotate to match segment
    group.add(new THREE.Mesh(wallGeo, wallMaterial))
  })

  // Ceiling
  const ceilingGeo = new THREE.PlaneGeometry(room.widthMeters, room.heightMeters)
  // ...

  return group
}
```

### Pattern 3: Gaussian Splat + Mesh Coexistence in R3F

**What:** spark.js `SplatMesh` is a subclass of `THREE.Object3D` and integrates directly with the R3F scene. The splat background (reconstructed room) and overlaid Three.js geometry (furniture GLB models) coexist in the same R3F `<Canvas>`. Raycasting works against furniture meshes for selection and dragging; the splat is background-only.

**When to use:** Section 2 — whenever the user is in the "place furniture in reconstructed room" mode.

**Trade-offs:** Splats are view-dependent radiance fields; they look photorealistic from captured angles but degrade at novel extreme angles. Furniture placed as GLB meshes will look geometrically clean but may not match the lighting of the splat background. Acceptable tradeoff for v1.

**Setup:**
```tsx
// GaussianSplatViewer.tsx
import { SplatMesh } from '@sparkjsdev/spark'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

function SplatBackground({ url }: { url: string }) {
  const { scene } = useThree()
  const splatRef = useRef<SplatMesh>()

  useEffect(() => {
    const splat = new SplatMesh({ url })
    scene.add(splat)
    splatRef.current = splat
    return () => { scene.remove(splat) }
  }, [url, scene])

  return null
}

// Furniture GLBs are standard R3F <primitive> or useGLTF components
// Raycasting targets only the furniture meshes, not the splat
```

### Pattern 4: Furniture Placement with Floor-Snap Raycasting

**What:** An invisible floor plane (Three.js `PlaneGeometry` matching room dimensions) acts as the raycasting target. On pointer move/click, cast a ray from camera through pointer, intersect the floor plane, and snap the dragged furniture model to the intersection point.

**When to use:** All furniture placement in both Section 2 (splat room) and Section 3 (procedural room).

**Trade-offs:** Works reliably for flat floors; does not handle multi-level or sloped surfaces in v1. Simple raycasting (`THREE.Raycaster`) is sufficient — no physics engine needed.

**Key implementation detail:** GLTF models loaded via `useGLTF` return a `scene` group with potentially deep nested meshes. Set `isDraggable = true` on the root group after loading; traverse parent chain on pointer events to find the root draggable object. Three.js `DragControls` or custom raycasting both work; custom gives more control over snapping behavior.

---

## Data Flow

### Section 2 — Panorama to Navigable 3D Room

```
User triggers "Reconstruct 3D" on a published tour
    ↓
useMutation(api.rooms.startReconstruction, { tourId })
    ↓ (Convex mutation)
Insert reconstructionJob {status: "pending"}
Schedule reconstructionAction after 0ms
    ↓ (Convex action — within 10 min window)
Download panorama storageIds → resolve signed URLs
POST to RunPod endpoint: { panoramaUrls[], webhookUrl: convexHttpUrl + "/gpu-callback" }
Receive RunPod jobId → update job {status: "processing", runpodJobId}
Action exits (does not wait for GPU)
    ↓ (RunPod GPU worker — minutes later)
Process panoramas through nerfstudio/gsplat pipeline
Output: .splat binary file
Upload .splat to Convex storage via workerGenerateUploadUrl mutation
Call workerCompleteJob mutation with {splatStorageId}
    ↓ (Convex HTTP action or direct mutation from RunPod Python client)
Update reconstructionJob {status: "complete", splatStorageId}
    ↓ (Frontend — auto-reactive)
useQuery watching job auto-refreshes
GaussianSplatViewer receives storageId → fetches signed URL → renders splat
```

### Section 3 — Floor Plan to Navigable 3D Room

```
User uploads floor plan file (PDF/PNG/JPG/sketch)
    ↓
3-step Convex upload: generateUploadUrl → PUT file → save storageId
useMutation(api.floorPlans.create, { storageId, format })
Schedule floorPlanExtractionAction
    ↓ (Convex action — fast, ~10-30 seconds)
Resolve signed URL for uploaded file
Send to GPT-4o Vision with structured JSON schema prompt
Parse response → validate against schema
Store extracted geometry via ctx.runMutation(internal.roomGeometry.save)
    ↓ (Convex mutation)
Insert roomGeometry document {rooms, walls, dimensions}
    ↓ (Frontend — auto-reactive)
FloorPlan3DViewer receives geometry → buildRoomGeometry() → Three.js scene
User navigates procedural 3D room, adds furniture (same as Section 2 furniture flow)
```

### Furniture Placement Flow (shared by Section 2 + 3)

```
User opens furniture catalog → browses / searches
    ↓
useQuery(api.furnitureCatalog.list, { category, search })  [reactive]
    ↓
User clicks "Place" on a catalog item
    ↓
useMutation(api.furnitureItems.place, { roomId, catalogItemId, position: defaultCenter })
    ↓ (Convex mutation)
Insert furnitureItem {roomId, catalogItemId, position: {x,y,z}, rotation: 0, scale: 1}
    ↓ (Frontend — auto-reactive)
RoomEditor3D renders new GLTF mesh at default position
User drags item on floor plane (raycasting) → new position
useMutation(api.furnitureItems.updateTransform, { id, position, rotation }) fires on drag end
    ↓
CostTracker useQuery(api.furnitureItems.getTotalCost, { roomId }) auto-refreshes
```

### State Management

```
Convex DB (persistent, reactive)
    → reconstructionJobs, rooms, furnitureItems, roomGeometry, furnitureCatalog
    → Auto-updates all subscribed components when any mutation runs

Zustand (ephemeral viewer state)
    → selectedFurnitureId (which item is being dragged/selected)
    → viewerMode: "dollhouse" | "firstPerson" | "topDown"
    → isDragging, cameraPosition

React useState
    → Catalog search term, filter state, modal open/close
    → Upload progress percentage (local, not stored in Convex)
```

---

## Component Boundaries

| Boundary | What crosses it | Direction | Notes |
|----------|----------------|-----------|-------|
| Browser ↔ Convex | `useQuery`, `useMutation`, `useAction` SDK calls | Bidirectional (reactive push from Convex) | Never raw fetch to Convex DB |
| Convex Action ↔ OpenAI | HTTPS POST with image URL + JSON schema | Action → OpenAI | Store API key in Convex env vars |
| Convex Action ↔ RunPod | HTTPS POST to RunPod endpoint | Action → RunPod (fire and forget) | RunPod job ID returned immediately |
| RunPod Worker ↔ Convex | RunPod Python client calls Convex mutation | RunPod → Convex (callback) | Worker needs CONVEX_URL + service key |
| R3F Canvas ↔ React UI | React `useState` / Zustand shared store | Bidirectional | Don't put Three.js state in Convex |
| Convex Storage ↔ Browser | Signed URL resolved in query, passed to viewer | Convex → Browser (URL) | URLs expire; resolve fresh on each query |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single RunPod serverless endpoint; default Convex plan; internal furniture catalog only |
| 1k-10k users | Add RunPod worker pool scaling; CDN-cache splat files (splats are static after gen); consider Convex caching for catalog queries |
| 10k+ users | Dedicated RunPod workers per tenant tier; serve splat files from CDN (not Convex storage per-request); furniture catalog in Convex vector search for semantic query |

**First bottleneck:** GPU processing queue depth — RunPod auto-scales, but cold start adds 30-90 seconds. Mitigate with warm pool on paid RunPod plan.

**Second bottleneck:** Convex storage bandwidth for splat file delivery. Splat files are 8-20MB each. At 1k concurrent viewers that is significant bandwidth. Solved by generating a CDN-cached public URL after reconstruction completes.

---

## Anti-Patterns

### Anti-Pattern 1: Polling for GPU Job Status in Convex Action

**What people do:** After triggering RunPod, loop inside the Convex action with `await sleep(30000)` checking RunPod status until complete, then write result.

**Why it's wrong:** Convex actions time out at 10 minutes. Gaussian Splatting takes 10-30 minutes. The action will time out before the GPU job completes, leaving the job in a broken state. Even if fast enough, holding an action connection open for minutes is wasteful.

**Do this instead:** Fire-and-forget to RunPod; use webhook callback to a Convex HTTP action, or have the RunPod Python worker call a Convex mutation directly when done.

### Anti-Pattern 2: Passing Three.js Scene State Through Convex

**What people do:** Store `camera.position`, `selectedObject.uuid`, or `isDragging` in Convex mutations, triggering unnecessary DB writes on every animation frame.

**Why it's wrong:** Three.js viewer state changes at 60fps. Convex mutations are transactional writes to a persistent database. Writing at 60fps will exhaust rate limits and cause severe performance degradation.

**Do this instead:** Viewer ephemeral state (camera position, selection, drag state) lives in Zustand or React state. Only write to Convex on discrete user intent: furniture item placed, transform committed on drag-end, room saved.

### Anti-Pattern 3: Loading Full GLTF Catalog on Every Render

**What people do:** Call `useQuery(api.furnitureCatalog.listAll)` returning every model in the catalog (potentially hundreds of entries with model URLs) whenever the catalog panel is open.

**Why it's wrong:** Downloading URLs for hundreds of GLTF models on every catalog open is slow and wasteful. React re-renders trigger repeated data loads.

**Do this instead:** Paginate the catalog query. Load GLTF binary files lazily only when the user clicks "Place" — not when browsing. Use `useGLTF.preload()` only for top 10 frequently placed items.

### Anti-Pattern 4: Rendering Gaussian Splats with Legacy Three.js Viewer

**What people do:** Try to render `.ply` or `.splat` files using standard Three.js `PLYLoader` or raw mesh geometry.

**Why it's wrong:** Gaussian Splats are NOT polygon meshes. They are collections of 3D Gaussians with opacity and color harmonics. Standard mesh loaders will produce garbled output. Sorting and blending of Gaussians requires specialized render passes.

**Do this instead:** Use spark.js (`@sparkjsdev/spark`) or `mkkellogg/GaussianSplats3D`. Both are purpose-built Three.js-compatible renderers that handle sorting, blending, and format conversion. spark.js supports `.ply`, `.splat`, `.ksplat`, `.spz`, and streams large files via `ReadableStream`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes | Confidence |
|---------|---------------------|-------|------------|
| RunPod Serverless GPU | Convex action POSTs job; RunPod worker calls back via Convex HTTP action or Python client mutation | Worker needs `CONVEX_URL` + deploy key in RunPod env vars | HIGH — documented at stack.convex.dev |
| OpenAI GPT-4o Vision | Convex action sends base64 image or URL + JSON schema; uses `response_format: {type: "json_schema", ...}` | Supported from GPT-4o-2024-08-06 onwards; structured outputs are stable | HIGH — official OpenAI docs |
| Replicate (depth estimation) | Convex action POSTs to Replicate; polls or uses webhook; saves depth map to Convex storage | Alternative to RunPod for lighter GPU tasks (depth maps); simpler than RunPod for one-shot models | MEDIUM — Replicate supports webhooks but depth estimation model availability for equirectangular panoramas needs validation |
| Luma AI 3D API | NOT confirmed available — current Luma API docs show video/image generation only, not 3D capture API | If Luma 3D API becomes available, it would replace the RunPod/nerfstudio pipeline. Do not build on this assumption. | LOW — docs checked March 2026, no 3D API found |
| spark.js (`@sparkjsdev/spark`) | Import `SplatMesh` from npm; add to R3F scene as `THREE.Object3D` subclass | Actively maintained; Hacker News launch June 2025; supports streaming for large files | MEDIUM-HIGH — official docs verified |
| Convex + RunPod Workflow | Documented pattern: Convex triggers RunPod, worker calls Convex mutations via Python client | Full tutorial at stack.convex.dev/convex-gpu-runpod-workflows | HIGH — official Convex documentation |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `RoomEditor3D` ↔ `FurnitureCatalog` | Zustand store (`selectedCatalogItem`) | Catalog selection triggers placement in editor |
| `GaussianSplatViewer` ↔ `RoomEditor3D` | Same R3F `<Canvas>`; splat is background layer, furniture is foreground | Cannot separate into different canvases — must share WebGL context |
| `FloorPlan3DViewer` ↔ `RoomEditor3D` | Shared `<RoomEditorCanvas>` component with mode prop | Section 3 rooms use the same furniture placement UI as Section 2 |
| `reconstructionActions.ts` ↔ `rooms.ts` | `ctx.runMutation(internal.rooms.attachSplat, {...})` | Action cannot write DB directly; must bridge via internal mutation |
| `floorPlanActions.ts` ↔ `roomGeometry.ts` | `ctx.runMutation(internal.roomGeometry.save, {...})` | Same pattern — action bridges to mutation for DB write |

---

## Build Order Implications

The architecture has clear dependency chains that determine phase ordering:

**Phase 1 dependencies (must be first):**
- Convex schema additions (`reconstructionJobs`, `rooms`, `furnitureItems`, `furnitureCatalog`, `roomGeometry`) — everything else depends on the data model
- RunPod + Convex callback wiring — the GPU pipeline backbone; Section 2 viewer cannot render without it
- spark.js integration into the existing R3F canvas — viewer foundation

**Phase 2 depends on Phase 1:**
- `GaussianSplatViewer` component (requires spark.js + splat file delivery)
- Furniture placement system (requires rooms schema + R3F canvas foundation)
- Internal furniture catalog seed data (requires `furnitureCatalog` table)

**Phase 3 depends on Phase 2:**
- Floor plan extraction pipeline (independent of Section 2 GPU pipeline, but shares furniture placement UI)
- `FloorPlan3DViewer` with procedural geometry (requires confirmed JSON schema from GPT-4o testing)
- Published shareable links for furnished rooms (requires rooms schema + viewer)

**Parallel tracks (can build simultaneously):**
- OpenAI floor plan extraction action (no GPU dependency)
- Furniture catalog population (no viewer dependency)
- CostTracker UI component (only needs `furnitureItems` query)

---

## Sources

- Convex GPU + RunPod integration pattern: [stack.convex.dev/convex-gpu-runpod-workflows](https://stack.convex.dev/convex-gpu-runpod-workflows) — HIGH confidence
- Convex background job management: [stack.convex.dev/background-job-management](https://stack.convex.dev/background-job-management) — HIGH confidence
- Convex action timeout (10 min): [docs.convex.dev/functions/actions](https://docs.convex.dev/functions/actions) — HIGH confidence
- spark.js SplatMesh documentation: [sparkjs.dev/docs/splat-mesh](https://sparkjs.dev/docs/splat-mesh/) — MEDIUM-HIGH confidence
- spark.js GitHub (v2.0, June 2025): [github.com/sparkjsdev/spark](https://github.com/sparkjsdev/spark) — MEDIUM-HIGH confidence
- GaussianSplats3D Three.js renderer: [github.com/mkkellogg/GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) — MEDIUM confidence
- OpenAI structured outputs (JSON schema): [platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs) — HIGH confidence
- Luma AI API (video/image only, no 3D API found): [docs.lumalabs.ai/docs/api](https://docs.lumalabs.ai/docs/api) — checked March 2026
- Blockade Labs Skybox API (skybox/360 generation, not room reconstruction): [api-documentation.blockadelabs.com](https://api-documentation.blockadelabs.com/api/) — MEDIUM confidence (different use case)
- Three.js GLTF drag and DragControls: [discourse.threejs.org](https://discourse.threejs.org/t/gltf-loaded-object-drag-and-drop/2285) — MEDIUM confidence (community, not official)
- Floor plan JSON to Three.js geometry — Blueprint3D reference: [github.com/furnishup/blueprint3d](https://github.com/furnishup/blueprint3d) — MEDIUM confidence

---

*Architecture research for: Spazeo — AI 3D room reconstruction, furniture placement, floor plan generation*
*Researched: 2026-03-09*
