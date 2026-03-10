# Phase 5: Floor Plan to 3D and Full Section 3 Delivery - Research

**Researched:** 2026-03-10
**Domain:** Three.js procedural geometry, R3F viewer composition, Convex schema extension, Next.js routing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 3D visual style: clean white walls, light grey floor, white ceiling — neutral matte architectural style
- Material picker panel after generation: user clicks a room and picks from preset material swatches (wall color, floor type)
- Phase 4 floor material hints (wood, tile, carpet, concrete) become defaults for each room; user can override
- Default ceiling height: 2.7m (most common residential international standard), adjustable per room in review step
- Doorways: open archways with subtle 3D door frame (no door panels, no animation); door positions from Phase 4 become wall gaps
- Dedicated review page: `/floor-plans/[id]/3d` — separate from Phase 4's `/floor-plans/[id]/edit`
- Entry: "Generate 3D Space" button in Phase 4 editor after saving corrected geometry — navigates to `/floor-plans/[id]/3d`
- Page loads with shimmer while Three.js builds geometry; 3D renders immediately (client-side generation, no job queue)
- Layout: full 3D preview (left) + properties panel (right) with global ceiling height slider, per-room overrides, doorway inputs, material picker
- Live regeneration: 3D mesh regenerates instantly (debounced ~300ms) on any property change — no Preview button
- "Finalize" button at bottom of properties panel
- Finalize creates a Tour record with `sourceType: 'floor_plan'` and `floorPlanId` field linking to the floor plan project
- After finalize, user navigated to `/tours/[id]/edit` — existing tour editor for branding, hotspot placement, publishing
- Auto-generated hotspot markers placed at each doorway from Phase 4 door positions; user can move/delete in tour editor
- Floor plan project stays linked to Tour via `tourId` field — user can re-edit 2D and regenerate
- Published public URL: `/tour/[slug]` — same route as panorama and splat tours
- Viewer auto-selects renderer based on `sourceType === 'floor_plan'` → floor plan 3D renderer
- All three navigation modes: dollhouse, free-roam, hotspot — same components as Section 2
- Furniture placement, cost tracker, share links (Phase 3) work identically inside floor-plan-derived rooms via same `enableFurniture` prop
- Full Phase 1 features apply: branding, lead capture, password protection, analytics, embed code
- 3D geometry generation: client-side only — Three.js BufferGeometry from wall coordinate arrays (instant, < 1 second, no server cost)
- Wall coordinates + ceiling heights → extruded wall meshes; floor polygon → floor plane; ceiling plane; door openings → gap in wall geometry
- Generated geometry renders in a new `FloorPlanViewer` component (mirrors GaussianSplatViewer architecture, not a fork)
- All three navigation modes reuse `NavigationModes.tsx` and `ModeSwitcher.tsx` directly

### Claude's Discretion
- Three.js wall geometry approach: use BoxGeometry per wall segment (simpler than ExtrudeGeometry for line-segment data — position+rotate each box to match wall start/end points); Earcut for complex floor polygon triangulation
- Ceiling: optional/toggle — overhead dollhouse view more useful when ceiling is absent
- Door openings: cut gap by splitting wall into two BoxGeometry segments flanking the opening
- Floor plan 3D mesh caching/storage strategy (persist GLB or regenerate on demand from Convex data)
- Material swatch library (built-in colors or Tailwind palette)
- Navigation mode auto-placement logic for dollhouse start position given variable room dimensions
- Window openings treatment (Phase 4 extracts window positions — ignore for v1)
- Ambient + directional lighting setup

### Deferred Ideas (OUT OF SCOPE)
- Window openings in generated 3D — v2 enhancement
- AI-generated textures from room type + style — future AI feature
- Export generated 3D as GLB for external tools — future export feature
- Multi-floor navigation: linking Phase 4's multi-floor plans into navigable multi-story building — already v2 in Phase 4
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FP3D-01 | AI generates 3D model from corrected 2D floor plan data by extruding walls to standard ceiling height in Three.js | Three.js BoxGeometry per wall segment, Earcut triangulation for floor polygon — client-side, instant, no server job |
| FP3D-02 | User reviews generated 3D space and can adjust (wall heights, doorways) before finalizing | `/floor-plans/[id]/3d` review page; properties panel with sliders; debounced live mesh regeneration from Convex geometry data |
| FP3D-03 | Finalized 3D model navigable in dollhouse, free-roam, and hotspot modes using same viewer as Section 2 | `NavigationModes.tsx` and `ModeSwitcher.tsx` directly reused inside new `FloorPlanViewer` R3F canvas |
| FP3D-04 | Furniture placement and cost tracking from Section 2 work unchanged inside floor-plan-generated 3D rooms | `enableFurniture` prop passes through to `FloorPlanViewer`; `FurnitureLayer`, `CatalogSidebar`, `CostTracker`, `useFurnitureStore` all unchanged |
| FP3D-05 | User can publish floor-plan-generated tour as a public share link | Finalize creates Tour with `sourceType: 'floor_plan'`; `/tour/[slug]` adds third conditional branch for `FloorPlanViewer`; publish flow identical to Phase 1 |
</phase_requirements>

## Summary

Phase 5 is primarily a **composition and wiring phase**. Almost every core system already exists: the Three.js/R3F canvas shell (GaussianSplatViewer), navigation modes (NavigationModes.tsx, ModeSwitcher.tsx), furniture system (FurnitureLayer, CatalogSidebar, useFurnitureStore), tour publishing (tours Convex backend), and floor plan geometry data (floorPlanDetails Convex table from Phase 4). The new work is: (1) a `FloorPlanViewer` component that builds Three.js meshes from wall coordinate arrays and plugs in the reusable navigation/furniture components, (2) a review page `/floor-plans/[id]/3d` with a live-updating properties panel, (3) schema additions (`sourceType` and `floorPlanId` on tours table), (4) auto-insertion of doorway hotspots on Tour creation, and (5) a third renderer branch in the public tour page.

The geometry generation algorithm is the only genuinely novel technical work. The locked decision is BoxGeometry per wall segment (position each box between start/end wall coordinates, rotate to match the wall direction, extrude to ceiling height). This is mathematically straightforward: one BoxGeometry sized to (wall_length, ceiling_height, wall_thickness), translated and rotated using wall start/end vectors. Door openings split a single wall into two shorter boxes flanking the opening. The floor polygon is triangulated with Three.js's built-in Earcut (ShapeGeometry from a THREE.Shape).

Material application uses MeshStandardMaterial with color assignment per room — no texture loading required for v1. The review page stores overrides in local React state (ceiling heights, door dimensions, material colors) and re-runs the geometry generation function on each debounced change. No Convex round-trip needed during review — the geometry was already loaded once from `floorPlanDetails`.

**Primary recommendation:** Implement FloorPlanViewer as a near-mirror of GaussianSplatViewer — same Canvas shell, same OrbitControls config, same component imports — with SplatScene replaced by a `FloorPlanMesh` component that builds geometry from props. Wire the review page, finalize mutation, and public viewer branch. All three navigation modes and furniture system plug in unchanged.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.170.0 | 3D geometry: BoxGeometry, ShapeGeometry, MeshStandardMaterial, BufferGeometry | Already in project (Phase 2/3); entire geometry pipeline built on it |
| @react-three/fiber | ^9.x | R3F Canvas shell, useFrame, useThree hooks | Already in project; GaussianSplatViewer pattern proven |
| @react-three/drei | ^10.x | OrbitControls, useGLTF (furniture), Bounds | Already in project; all navigation/camera patterns proven |
| convex/react | current | useQuery for floorPlanDetails, useMutation for tours.create | Reactive data — geometry loads automatically on page |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5 | useSplatViewerStore (nav mode, transitioning), useFurnitureStore | Already in project; reuse both stores unchanged |
| framer-motion | current | AnimatePresence for catalog sidebar slide, properties panel | Already in project; same pattern as GaussianSplatViewer |
| react-hot-toast | current | toast.success/error on finalize, hotspot auto-creation | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BoxGeometry per wall | ExtrudeGeometry with wall polygon | ExtrudeGeometry suits 2D polygon outlines; BoxGeometry suits line-segment wall data (start/end points + thickness) — the data shape matches BoxGeometry better |
| BoxGeometry per wall | Custom BufferGeometry | Custom gives more control but requires manual vertex/index arrays; BoxGeometry is simpler, performs identically for flat-faced walls |
| THREE.ShapeGeometry for floor | PlaneGeometry | PlaneGeometry is rectangular only; ShapeGeometry handles arbitrary polygons from room boundary coordinates |
| MeshStandardMaterial | MeshLambertMaterial | MeshStandardMaterial supports metalness/roughness for v2 material improvements; negligible perf difference on flat walls |

**No new npm installation required.** All libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/floor-plans/[id]/
│   └── 3d/page.tsx                    # Review & adjust page (NEW)
├── components/viewer/
│   ├── FloorPlanViewer.tsx             # New viewer (mirrors GaussianSplatViewer)
│   └── FloorPlanMesh.tsx              # R3F component: builds geometry from props
├── components/floor-plan/
│   └── FloorPlan3DPropertiesPanel.tsx  # Properties panel for review page (NEW)
convex/
├── schema.ts                           # Add sourceType, floorPlanId to tours table
├── tours.ts                            # Add create mutation for floor_plan tours
└── hotspots.ts                         # Add bulk-insert mutation for doorway auto-hotspots
```

### Pattern 1: FloorPlanViewer as GaussianSplatViewer Mirror
**What:** FloorPlanViewer wraps the same R3F Canvas shell and imports all the same navigation/furniture components. The only difference is it renders `FloorPlanMesh` instead of `SplatScene`.
**When to use:** Always for floor-plan-derived 3D spaces.
**Key design rule:** Do not fork GaussianSplatViewer — build FloorPlanViewer as a separate file that imports the same sub-components. This preserves independent evolution of both viewers.

```typescript
// src/components/viewer/FloorPlanViewer.tsx
'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { FloorPlanMesh } from './FloorPlanMesh'
import { NavigationModes } from './NavigationModes'     // reuse directly
import { ModeSwitcher } from './ModeSwitcher'           // reuse directly
import { VirtualJoystick } from './VirtualJoystick'    // reuse directly
import { FurnitureLayer } from './FurnitureLayer'       // reuse directly
import { FurnitureCameraController } from './FurnitureCameraController' // reuse
import { CatalogSidebar } from '@/components/furniture/CatalogSidebar'  // reuse

// Props mirror GaussianSplatViewerProps — same surface area for public viewer
interface FloorPlanViewerProps {
  floorPlanId: string
  geometry: FloorPlanGeometry   // walls, rooms, doors, dimensions
  tourTitle?: string
  tourSlug?: string
  tourId?: string
  hotspots?: Hotspot3D[]
  enableFurniture?: boolean
  furnishedRoomId?: string
}
```

### Pattern 2: Wall Geometry from Line Segments
**What:** Convert wall start/end coordinates + thickness + height into BoxGeometry instances. Each wall becomes one (or two for doorways) Three.js Box.
**When to use:** Inside FloorPlanMesh, called every time geometry props change.

```typescript
// src/components/viewer/FloorPlanMesh.tsx
import * as THREE from 'three'

interface Wall {
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  thickness: number
}

interface Door {
  wallId: string
  position: { x: number; y: number }
  width: number
}

function buildWallMesh(
  wall: Wall,
  ceilingHeight: number,
  doors: Door[]
): THREE.Mesh[] {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.y - wall.start.y  // Y in 2D maps to Z in 3D
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)

  // Find doors on this wall
  const wallDoors = doors.filter((d) => d.wallId === wall.id)

  if (wallDoors.length === 0) {
    // Solid wall box
    const geometry = new THREE.BoxGeometry(length, ceilingHeight, wall.thickness)
    const mesh = new THREE.Mesh(geometry, WALL_MATERIAL)
    // Center: midpoint of start/end
    mesh.position.set(
      (wall.start.x + wall.end.x) / 2,
      ceilingHeight / 2,
      (wall.start.y + wall.end.y) / 2
    )
    mesh.rotation.y = -angle
    return [mesh]
  }

  // Split wall into segments around each door opening
  // Returns array of segment meshes (2 per door: left segment + right segment)
  return buildWallWithOpenings(wall, wallDoors, ceilingHeight, angle)
}
```

### Pattern 3: Floor Polygon via THREE.Shape + ShapeGeometry
**What:** Room boundary polygons converted to THREE.Shape, then ShapeGeometry for the floor plane.
**When to use:** For the room floor surfaces.

```typescript
// In FloorPlanMesh
function buildFloorMesh(rooms: Room[]): THREE.Mesh[] {
  return rooms.map((room) => {
    const shape = new THREE.Shape()
    const [first, ...rest] = room.polygon
    shape.moveTo(first.x, first.y)
    rest.forEach((pt) => shape.lineTo(pt.x, pt.y))
    shape.closePath()

    const geometry = new THREE.ShapeGeometry(shape)
    // ShapeGeometry is in XY plane — rotate to XZ (horizontal)
    geometry.rotateX(-Math.PI / 2)

    const color = FLOOR_MATERIAL_COLORS[room.floorMaterial ?? 'default']
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0  // Floor at Y=0
    return mesh
  })
}
```

### Pattern 4: Live Regeneration with useRef Debounce
**What:** Properties panel changes (ceiling height, door width, material) trigger immediate mesh regeneration via debounced state update.
**When to use:** Review page `/floor-plans/[id]/3d`.

```typescript
// Review page component
const [overrides, setOverrides] = useState<FloorPlan3DOverrides>({
  globalCeilingHeight: 2.7,
  roomCeilingHeights: {},
  doorWidth: 0.9,
  doorHeight: 2.1,
  roomMaterials: {},    // roomId -> { wallColor, floorType }
})

// FloorPlanViewer receives both geometry (from Convex) and overrides (local state)
// No Convex round-trip during preview — geometry was loaded once on page mount
```

### Pattern 5: Tour Creation on Finalize
**What:** Finalize button triggers a Convex mutation that creates a Tour, inserts doorway hotspots, and returns the new tour ID for navigation.
**When to use:** Bottom of properties panel "Finalize" button.

```typescript
// New Convex mutation: tours.createFromFloorPlan
// Args: floorPlanId, title, doorPositions[], overrides
// Steps:
//   1. Create tour with sourceType: 'floor_plan', floorPlanId
//   2. Create one scene (the 3D room itself — no imageStorageId needed for floor plan tours)
//   3. Bulk-insert hotspots at doorway positions (type: 'navigation')
//   4. Update floorPlanProjects.tourId to link back
//   5. Return tourId
// Client navigates to /tours/[id]/edit after success
```

### Pattern 6: Third Renderer Branch in Public Tour Page
**What:** `/tour/[slug]/page.tsx` currently picks PanoramaViewer vs GaussianSplatViewer based on `splatStorageId`. Add a third branch: if `tour.sourceType === 'floor_plan'`, render FloorPlanViewer.
**When to use:** Public tour page rendering.

```typescript
// In /tour/[slug]/page.tsx — extend existing conditional

// Existing: const hasSplat = !!(tourData && tourData.splatStorageId)
// New: add floor plan detection
const hasFloorPlan = !!(tourData && 'sourceType' in tourData && tourData.sourceType === 'floor_plan')
const floorPlanId = hasFloorPlan ? tourData.floorPlanId : undefined

// Render:
{hasFloorPlan && floorPlanData ? (
  <FloorPlanViewer
    floorPlanId={floorPlanId}
    geometry={floorPlanData.geometry}
    tourTitle={currentTour.title}
    tourSlug={currentTour.slug}
    tourId={currentTour._id}
    hotspots={doorwayHotspots}
    enableFurniture={true}
  />
) : splatUrl ? (
  <GaussianSplatViewer ... />
) : (
  <PanoramaViewer ... />
)}
```

### Pattern 7: Dollhouse Start Position for Variable Room Sizes
**What:** On dollhouse mode, camera must auto-position above the center of all rooms at a height that shows all geometry without cropping.
**When to use:** Inside NavigationModes; FloorPlanViewer needs to compute bounds and pass them to the camera initial setup.

```typescript
// Compute scene bounding box from floor plan dimensions
function computeSceneBounds(geometry: FloorPlanGeometry): THREE.Box3 {
  const box = new THREE.Box3()
  geometry.walls.forEach((wall) => {
    box.expandByPoint(new THREE.Vector3(wall.start.x, 0, wall.start.y))
    box.expandByPoint(new THREE.Vector3(wall.end.x, 0, wall.end.y))
  })
  return box
}

// Dollhouse camera: above center, height = max(width, depth) * 0.8
const center = box.getCenter(new THREE.Vector3())
const size = box.getSize(new THREE.Vector3())
const dollhouseHeight = Math.max(size.x, size.z) * 0.8
```

### Anti-Patterns to Avoid
- **Forking GaussianSplatViewer:** Duplicating the entire viewer creates maintenance debt. FloorPlanViewer imports NavigationModes, ModeSwitcher, FurnitureLayer etc. directly.
- **Server-side geometry generation:** Wall extrusion is instant client-side. A Convex Action for this adds latency, cost, and job queue complexity for no benefit.
- **Storing overrides in Convex during review:** Local React state is sufficient for the review step. Only the finalized Tour record goes to Convex.
- **Re-creating geometry objects every frame:** Build geometry once in useMemo (keyed on the relevant override values), attach to scene, replace only when overrides change. Three.js geometry creation is not free.
- **Using a single BoxGeometry for walls with doors:** Must split into two segments. A single box cannot have a hole punched in it via standard Three.js primitives.
- **Setting wall color via vertex color on shared geometry:** Walls with the same height share geometry but different rooms need different material colors. Create separate material instances per room, or use instanced meshes with per-instance color.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Room polygon triangulation | Custom polygon triangulator | THREE.ShapeGeometry (uses Earcut internally) | Earcut is built into Three.js; handles concave/L-shaped rooms, holes |
| Camera fly-to transitions | Custom lerp loop | NavigationModes.tsx (already has lerp loop + LERP_FACTOR) | Already proven in Phase 2/3; same useFrame pattern |
| Furniture drag/drop/transform | Rebuild placement system | FurnitureLayer.tsx + FurnitureGhost.tsx + useFurnitureStore (Phase 3) | Fully working, tested, handles raycasting, TransformControls, undo |
| Virtual joystick | New joystick | VirtualJoystick.tsx (Phase 2) | Already mobile-tested |
| Share/save arrangement | New save flow | GaussianSplatViewer save pattern + api.furnishedRooms.create | Identical flow — same tour ID model |
| Hotspot 3D markers | New marker component | SplatHotspot3D.tsx (Phase 2) | R3F 3D hotspot with label, click handler already built |

**Key insight:** This phase is 70% wiring and 30% new code. The geometry generation algorithm is the only novel technical contribution. Everything else is composition of Phase 2/3 output.

## Common Pitfalls

### Pitfall 1: Coordinate System Mismatch (2D → 3D)
**What goes wrong:** Floor plan coordinates from Phase 4 are in 2D (x,y in meters) with Y pointing "down" on the floor plan image. Three.js uses right-hand Y-up coordinates. Naively mapping 2D x→3D x and 2D y→3D y places walls on the wall surface rather than the floor.
**Why it happens:** 2D floor plan Y-axis = depth into the room (maps to 3D Z-axis). 3D Y-axis = vertical height.
**How to avoid:** Use the mapping: 2D x → 3D x, 2D y → 3D z (negative or positive depending on convention). Verify with a simple test: a wall from (0,0) to (5,0) in floor plan should produce a horizontal wall running east-west at z=0 in 3D.
**Warning signs:** Walls appearing vertical or at 90° wrong angle; rooms rendering as walls.

### Pitfall 2: Wall Segment Orientation After Rotation
**What goes wrong:** BoxGeometry is axis-aligned by default (longest axis = X). Rotating to match wall direction via `mesh.rotation.y = -angle` works only if the box's length is along X. If the wall data is vertical (start.x === end.x), the angle calculation via `atan2` must still produce a valid rotation.
**Why it happens:** atan2(0, dx) for a vertical wall (dx=0) returns 0 or ±PI/2 depending on dz. The rotation must account for this correctly.
**How to avoid:** Always compute `const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)`. Place the center of the box at the midpoint of start/end. Test with horizontal walls (angle=0), vertical walls (angle=PI/2), and diagonal walls.
**Warning signs:** Some walls appear perpendicular to their expected direction.

### Pitfall 3: R3F Dynamic Import Required for FloorPlanViewer
**What goes wrong:** FloorPlanViewer uses Three.js and R3F which require DOM APIs. SSR in Next.js App Router will fail with "window is not defined" or "document is not defined".
**Why it happens:** Same issue as GaussianSplatViewer — R3F Canvas creates a WebGL context on mount, which requires the browser DOM.
**How to avoid:** Always import FloorPlanViewer with `dynamic(() => import(...), { ssr: false })`. This pattern is already established for GaussianSplatViewer in `/tour/[slug]/page.tsx`.
**Warning signs:** Build errors about `window is not defined`; hydration errors.

### Pitfall 4: Geometry Rebuild Performance on Debounced Input
**What goes wrong:** Properties panel slider fires 60 events per second. Rebuilding Three.js geometry on every event causes jank.
**Why it happens:** Geometry creation involves CPU-side vertex computation + GPU buffer upload. Even simple BoxGeometry for 20 walls involves hundreds of vertices.
**How to avoid:** (1) Debounce slider `onInput` to 300ms (per the locked decision). (2) Dispose previous geometry before creating new (`geometry.dispose()`). (3) Use `useMemo` for geometry creation keyed on serialized override values.
**Warning signs:** UI freezes when dragging ceiling height slider; memory leaks from undisposed geometry.

### Pitfall 5: tours Table Missing sourceType Field
**What goes wrong:** FloorPlanViewer branch in public viewer cannot differentiate floor plan tours from panorama tours without a `sourceType` field.
**Why it happens:** Current tours schema only has `splatStorageId` for 3D tours — no general `sourceType` discriminator.
**How to avoid:** Add `sourceType: v.optional(v.union(v.literal('panorama'), v.literal('splat'), v.literal('floor_plan')))` and `floorPlanId: v.optional(v.id('floorPlanDetails'))` to tours table. Make both optional for backward compatibility with all existing tours.
**Warning signs:** Floor plan tours render nothing in public viewer; `tour.sourceType` is undefined.

### Pitfall 6: useSplatViewerStore Name Collision
**What goes wrong:** FloorPlanViewer reuses `useSplatViewerStore` — the name implies it is splat-specific but it is actually a generic nav mode + camera transition store.
**Why it happens:** The store was named during Phase 2 for the Gaussian Splat viewer. Both viewers share the same nav modes.
**How to avoid:** Reuse `useSplatViewerStore` as-is — do not rename or fork it. The store's state (navMode, transitioning, joystickVector, controlsVisible) applies equally to both viewers. If future phases need viewer-specific state, extend the store at that time.
**Warning signs:** Two separate Zustand stores for nav modes causing sync issues between FloorPlanViewer and GaussianSplatViewer instances.

### Pitfall 7: Hotspot Auto-Insertion Schema Dependency
**What goes wrong:** Auto-inserted doorway hotspots need a `sceneId` (hotspots.sceneId is required in schema). But floor plan tours may not have traditional scenes with panorama images.
**Why it happens:** The existing hotspots schema is designed for panorama-based scene navigation. Floor plan tours have a different scene model.
**How to avoid:** Create exactly one scene document per floor plan tour (representing the 3D room itself, `panoramaType: 'gaussian'` or a new literal). Set `imageStorageId` to a placeholder or omit it if schema allows optional. Insert doorway hotspots referencing that scene. Alternatively, add `panoramaType: v.optional(v.literal('floor_plan'))` to the scenes table to represent floor-plan-derived scenes.
**Warning signs:** Mutation throws because sceneId is required; hotspots not visible in tour editor.

## Code Examples

### Wall Geometry Builder (Client-Side, No Dependencies Beyond Three.js)
```typescript
// Source: Three.js docs BoxGeometry + Math
import * as THREE from 'three'

const WALL_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#FFFFFF',
  roughness: 0.9,
  metalness: 0,
})

export function buildWallGeometry(
  wall: { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number },
  ceilingHeight: number,
  doorOpenings: Array<{ center: number; width: number }>  // center = distance along wall
): THREE.Mesh[] {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)

  const midX = (wall.start.x + wall.end.x) / 2
  const midZ = (wall.start.y + wall.end.y) / 2

  if (doorOpenings.length === 0) {
    const geo = new THREE.BoxGeometry(wallLength, ceilingHeight, wall.thickness)
    const mesh = new THREE.Mesh(geo, WALL_MATERIAL)
    mesh.position.set(midX, ceilingHeight / 2, midZ)
    mesh.rotation.y = -angle
    return [mesh]
  }

  // For each door: create left segment, right segment, and header above door
  const meshes: THREE.Mesh[] = []
  let cursor = 0
  const sorted = [...doorOpenings].sort((a, b) => a.center - b.center)

  for (const door of sorted) {
    const segStart = cursor
    const segEnd = door.center - door.width / 2
    const segLength = segEnd - segStart
    if (segLength > 0.01) {
      const geo = new THREE.BoxGeometry(segLength, ceilingHeight, wall.thickness)
      const mesh = new THREE.Mesh(geo, WALL_MATERIAL)
      // Position relative to wall start, then rotate
      const localCenter = segStart + segLength / 2
      mesh.position.set(
        wall.start.x + Math.cos(angle) * localCenter,
        ceilingHeight / 2,
        wall.start.y + Math.sin(angle) * localCenter
      )
      mesh.rotation.y = -angle
      meshes.push(mesh)
    }
    cursor = door.center + door.width / 2
  }

  // Final segment after last door
  const finalLength = wallLength - cursor
  if (finalLength > 0.01) {
    const geo = new THREE.BoxGeometry(finalLength, ceilingHeight, wall.thickness)
    const mesh = new THREE.Mesh(geo, WALL_MATERIAL)
    const localCenter = cursor + finalLength / 2
    mesh.position.set(
      wall.start.x + Math.cos(angle) * localCenter,
      ceilingHeight / 2,
      wall.start.y + Math.sin(angle) * localCenter
    )
    mesh.rotation.y = -angle
    meshes.push(mesh)
  }

  return meshes
}
```

### Floor Polygon via THREE.Shape
```typescript
// Source: Three.js docs ShapeGeometry
import * as THREE from 'three'

export function buildFloorGeometry(
  polygon: Array<{ x: number; y: number }>,
  color: string = '#E5E4E0'
): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(polygon[0].x, polygon[0].y)
  for (let i = 1; i < polygon.length; i++) {
    shape.lineTo(polygon[i].x, polygon[i].y)
  }
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape)
  // ShapeGeometry lies in XY plane — rotate to lie flat (XZ plane)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    side: THREE.DoubleSide,  // Visible from below in dollhouse mode
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = 0
  return mesh
}
```

### Convex Schema Addition for tours Table
```typescript
// Add to tours defineTable in convex/schema.ts
// Both fields optional — backward compatible with all existing tours

// Inside tours defineTable({...}):
sourceType: v.optional(
  v.union(
    v.literal('panorama'),
    v.literal('splat'),
    v.literal('floor_plan')
  )
),
floorPlanId: v.optional(v.id('floorPlanDetails')),
```

### Dynamic Import for FloorPlanViewer in Public Tour Page
```typescript
// Extend /tour/[slug]/page.tsx
const FloorPlanViewer = dynamic(
  () =>
    import('@/components/viewer/FloorPlanViewer').then((m) => ({
      default: m.FloorPlanViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: '#0A0908' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    ),
  }
)
```

### Doorway Hotspot Auto-Insertion Mutation
```typescript
// convex/hotspots.ts — add bulk insert mutation
export const insertDoorwayHotspots = mutation({
  args: {
    sceneId: v.id('scenes'),
    doors: v.array(v.object({
      position: v.object({ x: v.number(), y: v.number() }),
      width: v.number(),
    })),
  },
  handler: async (ctx, { sceneId, doors }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    for (const door of doors) {
      await ctx.db.insert('hotspots', {
        sceneId,
        type: 'navigation',
        position: { x: door.position.x, y: 0, z: door.position.y },
        tooltip: 'Room entrance',
        visible: true,
      })
    }
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate viewer implementation per source type | Shared NavigationModes + ModeSwitcher + FurnitureLayer across all viewer types | Phase 2/3 pattern | Zero re-implementation for floor plan navigation and furniture |
| ExtrudeGeometry for floor plan walls | BoxGeometry per wall segment with rotation | Standard since Three.js r50+ | Simpler for line-segment wall data; easier door opening splits |
| Server-side 3D geometry generation | Client-side Three.js geometry from coordinate data | Browser-capable since Three.js r1 | Instant generation, no job queue, no server cost |
| Separate scene model for floor plan viewer | Single scene document pointing to floor plan data | Phase 5 decision | Enables all Phase 1 hotspot/lead/analytics features on floor plan tours |

**Deprecated/outdated:**
- Job queue pattern for 3D geometry generation: Not needed. Client-side generation is instant. Keep job queue for GPU reconstruction (Phase 2) only.
- Separate furniture store for floor plan: Not needed. useFurnitureStore works identically because it is room-agnostic.

## Open Questions

1. **scenes table panoramaType literal for floor_plan tours**
   - What we know: `scenes.panoramaType` currently accepts `'equirectangular' | 'cubemap' | 'gaussian'`
   - What's unclear: Whether to add `'floor_plan'` as a fourth literal, or repurpose `'gaussian'` for floor plan scenes
   - Recommendation: Add `v.literal('floor_plan')` to the union. Reusing `'gaussian'` would conflate splat scenes with floor plan scenes, making query filtering ambiguous.

2. **Floor plan geometry caching strategy**
   - What we know: Generation is instant (< 1s for typical apartments). Context says Claude has discretion here.
   - What's unclear: Whether to cache generated GLB in Convex storage, or always regenerate from floorPlanDetails data on viewer load
   - Recommendation: Always regenerate from Convex data — no GLB caching. Rationale: (a) generation is instant, (b) avoids cache invalidation when user goes back to edit 2D geometry, (c) no additional storage cost, (d) user overrides (ceiling height, materials) are stored in tour record, not GLB. If generation ever becomes slow (e.g. complex multi-room buildings), caching can be added in v2.

3. **Overrides persistence on the Tour record**
   - What we know: User sets ceiling heights, door sizes, material colors in review step. These must persist to the published tour.
   - What's unclear: Exact schema field for storing overrides on the tours table vs. a separate overrides table
   - Recommendation: Add a `floorPlan3DConfig` optional object to the tours table: `{ globalCeilingHeight: number, roomOverrides: array, materialOverrides: array }`. This keeps all tour config in one document, consistent with existing `settings`, `leadCaptureConfig`, `brandingConfig` pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test runner configured (vitest/playwright not in package.json — confirmed in CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FP3D-01 | Wall extrusion generates visible 3D geometry from floor plan coordinates | manual-only | Manual: open review page, verify walls/floors render in 3D | N/A |
| FP3D-02 | Ceiling height slider updates 3D geometry live; door width input updates opening size | manual-only | Manual: adjust slider, verify mesh updates within 300ms | N/A |
| FP3D-03 | All three nav modes work in floor plan viewer: dollhouse overhead, free-roam click-to-move, hotspot markers | manual-only | Manual: switch modes, verify camera transitions, click doorway hotspot | N/A |
| FP3D-04 | Furniture catalog opens, item drags to floor plane, cost tracker updates, undo works (Ctrl+Z) | manual-only | Manual: enter furnish mode, drag item, verify cost, undo | N/A |
| FP3D-05 | Finalize creates Tour; public link at /tour/[slug] opens without login and shows 3D viewer | manual-only | Manual: finalize, copy public link, open in incognito, verify viewer | N/A |

### Sampling Rate
- **Per task commit:** Manual verification against the specific requirement addressed
- **Per wave merge:** Full flow walkthrough — upload floor plan → extract → edit 2D → generate 3D → review → finalize → publish → open public link
- **Phase gate:** All 5 FP3D requirements demonstrated end-to-end before `/gsd:verify-work`

### Wave 0 Gaps
- None — no test framework is planned for this project (CLAUDE.md confirms). All validation is manual.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/viewer/GaussianSplatViewer.tsx` — canonical viewer pattern to mirror
- Existing codebase: `src/components/viewer/NavigationModes.tsx` — camera transitions, click-to-move, joystick (directly reused)
- Existing codebase: `src/components/viewer/ModeSwitcher.tsx` — mode pill toolbar (directly reused)
- Existing codebase: `convex/floorPlanDetails.ts` — geometry data source (walls, rooms, doors, dimensions fields confirmed)
- Existing codebase: `convex/schema.ts` — tours table schema; confirmed `splatStorageId` pattern for conditional rendering
- Existing codebase: `src/app/tour/[slug]/page.tsx` — confirmed two-branch renderer pattern; third branch addition is straightforward
- [Three.js BoxGeometry docs](https://threejs.org/docs/#api/en/geometries/BoxGeometry) — confirmed constructor and usage
- [Three.js ShapeGeometry docs](https://threejs.org/docs/#api/en/geometries/ShapeGeometry) — confirmed Earcut triangulation for arbitrary polygons
- [Three.js MeshStandardMaterial docs](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial) — confirmed color, roughness, metalness
- Phase 4 RESEARCH.md — confirmed floorPlanDetails schema (walls, rooms, doors, dimensions), coordinate system (meters, origin top-left)

### Secondary (MEDIUM confidence)
- Phase 4 STATE.md decisions: `Floor plan coordinates stored in meters (canonical); PPM=50 conversion at Konva render boundary only` — confirms Phase 5 receives meters as canonical unit
- Phase 3 STATE.md decisions: `enableFurniture prop defaults to false — public share pages do not load furniture components` — confirmed prop interface

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase or official Three.js docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all dependencies already installed and proven in Phases 2/3
- Architecture (FloorPlanViewer composition): HIGH — verified against actual GaussianSplatViewer source code; import pattern is direct reuse
- Geometry algorithm (wall extrusion): HIGH — standard Three.js BoxGeometry; pattern well-established in architectural viz
- Schema changes: HIGH — tours table pattern matches existing `splatStorageId` field; optional fields are backward-compatible
- Pitfalls: HIGH — coordinate system mismatch, SSR issues, geometry disposal are well-documented Three.js concerns verified in existing codebase

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days — stable library ecosystem; no external API dependencies for geometry generation)
