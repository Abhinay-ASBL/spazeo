# Phase 3: Furniture Catalog, Placement, and Room Sharing - Research

**Researched:** 2026-03-10
**Domain:** 3D furniture placement in React Three Fiber, GLB asset management, Convex data modeling, shareable 3D scenes
**Confidence:** HIGH

## Summary

This phase adds a furniture catalog, click-to-place 3D placement with transform controls, real-time cost tracking, undo, and shareable furnished room links to the existing GaussianSplatViewer R3F canvas. The core technical challenge is integrating interactive GLB furniture objects alongside the Gaussian Splat point cloud, managing a catalog of 50+ items in Convex storage, and building a share page that renders the furnished room without authentication.

The existing codebase already has the R3F Canvas (`GaussianSplatViewer.tsx`), floor-plane raycasting (`NavigationModes.tsx` uses `THREE.Plane` with y=0), Zustand store for viewer state (`useSplatViewerStore.ts`), and a mode-switching UI (`ModeSwitcher.tsx`). Furniture placement extends these patterns: add a "Furnish" mode to the mode switcher, reuse the floor-plane raycast for click-to-place, use drei's `TransformControls` for rotate/scale, and store placement state in Convex for persistence and sharing.

**Primary recommendation:** Use `useGLTF` + `useGLTF.preload` for GLB loading with draco compression, drei `TransformControls` (mode: 'rotate' | 'scale') for gizmos, Zustand for in-memory undo stack and placement ghost state, and Convex tables (`furnitureItems`, `furnishedRooms`, `placedFurniture`) for persistence. The catalog sidebar and cost tracker live in the DOM layer (outside the R3F Canvas) and communicate with the 3D scene via Zustand.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Right sidebar (~320px), collapsible, persistent while furnishing
- Search bar at top, horizontal category tabs below (Sofas, Beds, Tables, Chairs, Storage, Decor)
- Style filter dropdown below tabs (Scandinavian, Modern, Luxury, Industrial, All)
- Item cards in a 2-column grid inside the sidebar
- Each item card shows: 3D thumbnail preview (pre-rendered), price, dimensions (W x D x H in meters), style tag badge, and Amazon link icon where available
- Mobile: catalog becomes a swipeable bottom sheet (half-screen default, drag up to full)
- Click-to-place flow: user clicks item in catalog -> ghost preview attaches to cursor and follows over the 3D floor -> ghost snaps to floor plane -> user clicks to confirm placement -> item appears solid
- Mode toggle between "Navigate" and "Furnish" modes with explicit toggle button
- Floor snap (y=0) is primary snapping behavior
- Transform gizmo with rotate ring and scale handles (drei TransformControls)
- Gold (#D4A017) outline glow on selected items
- Mini toolbar near selected item: [Rotate] [Scale] [Delete]
- Keyboard shortcuts: R = rotate mode, S = scale mode, Delete/Backspace = remove, Ctrl/Cmd+Z = undo
- Sticky footer in catalog sidebar for cost tracker with running subtotal and item count
- Expandable itemized list with Amazon links per item
- "View All on Amazon" button at bottom of expanded list
- Clicking item in cost list selects it in 3D and centers camera
- URL structure: `/tour/[slug]/furnished/[id]`
- Multiple furnishing arrangements per tour
- Read-only share page with 3D room, itemized cost panel, Amazon links, furniture toggle on/off, parent tour branding
- No login required for share view

### Claude's Discretion
- GLB loading strategy and caching (useGLTF preloading, progressive loading)
- Ghost preview opacity and visual treatment during placement
- Transform gizmo exact styling and control sensitivity
- Undo stack implementation (in-memory vs persisted)
- Pre-rendered thumbnail generation pipeline for catalog items
- Exchange rate source and update frequency for multi-currency
- Exact category list and how many items per category in the initial 50+
- Grid snap spacing increment and grid visual style

### Deferred Ideas (OUT OF SCOPE)
- External furniture search (Amazon/web marketplace integration)
- AI furniture placement suggestions (ADV3D-01 in v2)
- Style-based room presets (ADV3D-02 in v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FURN-01 | Internal furniture catalog with 50+ GLB items, metadata (dimensions, price, style, category) | Convex `furnitureItems` table schema, useGLTF for loading, Convex file storage for GLBs |
| FURN-02 | Each catalog item has Amazon product link where available | Optional `amazonUrl` field in `furnitureItems` table |
| FURN-03 | Search by name, filter by style and category | Convex search index on name, indexed queries by category/style |
| FURN-04 | Drag from catalog panel, drop onto 3D floor plane to place | Floor-plane raycasting (existing pattern in NavigationModes.tsx), ghost preview via Zustand, useGLTF for rendering |
| FURN-05 | Select placed item, transform controls for scale and rotate | drei TransformControls with mode='rotate'/'scale', Gold outline via meshStandardMaterial emissive |
| FURN-06 | Undo last placement action (Ctrl/Cmd+Z) | In-memory undo stack in Zustand store |
| FURN-07 | Real-time cost tracker showing subtotal and itemized list | Convex reactive query on `placedFurniture`, computed in sidebar DOM component |
| FURN-08 | Delete placed item with Delete key | Keyboard event listener, remove from Convex via mutation |
| SHARE-01 | Save furnished room state and generate public share link | `furnishedRooms` + `placedFurniture` Convex tables, slug generation |
| SHARE-02 | Anyone with share link views furnished room read-only, no login | Public Convex query (no auth check), `/tour/[slug]/furnished/[id]` route |
| SHARE-03 | Share page shows itemized cost summary with product links | Reactive query joining `placedFurniture` with `furnitureItems` for price/link data |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-three/fiber | ^9.5.0 | R3F Canvas (already installed) | Project standard for all 3D rendering |
| @react-three/drei | ^10.7.7 | TransformControls, useGLTF, Clone (already installed) | Standard R3F helpers ecosystem |
| three | ^0.183.1 | THREE.js core (already installed) | Required by R3F |
| zustand | ^5.0.11 | Furniture placement state, undo stack, mode state (already installed) | Project standard for client state |
| convex | ^1.32.0 | Furniture catalog storage, placement persistence, reactive queries (already installed) | Project backend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | ^12.34.3 (already installed) | Sidebar slide-in/out, bottom sheet gesture | Catalog panel animations |
| lucide-react | ^0.575.0 (already installed) | Toolbar icons (RotateCw, Maximize2, Trash2, etc.) | UI icons |
| react-hot-toast | ^2.6.0 (already installed) | Feedback on save/share/delete actions | User notifications |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drei TransformControls | Custom gizmo with DragControls | TransformControls is battle-tested, supports mode switching (rotate/scale), integrates with OrbitControls automatically |
| In-memory undo stack | Convex mutation log | In-memory is simpler, faster, no DB overhead; lost on page reload but that is acceptable for furniture editing session |
| Convex file storage for GLBs | CDN/S3 | Convex already handles file storage with the 3-step upload pattern; keeps architecture consistent |

**Installation:**
No new packages needed. All dependencies are already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── viewer/
│   │   ├── GaussianSplatViewer.tsx    # Extend: add FurnitureLayer inside Canvas
│   │   ├── FurnitureLayer.tsx         # NEW: renders all placed furniture in R3F
│   │   ├── FurnitureGhost.tsx         # NEW: cursor-following ghost preview during placement
│   │   ├── FurniturePiece.tsx         # NEW: individual placed GLB with selection outline
│   │   ├── FurnitureToolbar.tsx       # NEW: mini toolbar near selected item (DOM overlay)
│   │   ├── ModeSwitcher.tsx           # Extend: add "Furnish" mode
│   │   └── NavigationModes.tsx        # Extend: disable click-to-move in Furnish mode
│   ├── furniture/
│   │   ├── CatalogSidebar.tsx         # NEW: right sidebar with search, filters, grid
│   │   ├── CatalogItemCard.tsx        # NEW: individual item card in catalog grid
│   │   ├── CostTracker.tsx            # NEW: sticky footer with subtotal + itemized list
│   │   └── CatalogBottomSheet.tsx     # NEW: mobile bottom sheet variant
│   └── furnished/
│       ├── FurnishedRoomViewer.tsx     # NEW: read-only 3D viewer for share page
│       └── CostSummaryPanel.tsx       # NEW: itemized cost for share page
├── hooks/
│   └── useFurnitureStore.ts           # NEW: Zustand store for furniture placement state
├── app/
│   └── tour/
│       └── [slug]/
│           └── furnished/
│               └── [id]/
│                   └── page.tsx       # NEW: public share page route
convex/
├── furnitureItems.ts                  # NEW: catalog CRUD + queries
├── furnishedRooms.ts                  # NEW: save/load furnished arrangements
└── schema.ts                          # Extend: add furnitureItems, furnishedRooms, placedFurniture tables
```

### Pattern 1: DOM-Canvas Communication via Zustand
**What:** The catalog sidebar (DOM) and the furniture placement (R3F Canvas) share state through a Zustand store, not props or context.
**When to use:** Always when DOM UI needs to trigger 3D scene behavior or vice versa.
**Example:**
```typescript
// hooks/useFurnitureStore.ts
import { create } from 'zustand'

interface PlacedItem {
  instanceId: string
  furnitureItemId: string  // Convex ID ref
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  name: string
  price: number
  amazonUrl?: string
  glbUrl: string
}

interface UndoEntry {
  type: 'place' | 'remove' | 'transform'
  item: PlacedItem
  prevState?: PlacedItem  // for transform undo
}

interface FurnitureState {
  mode: 'navigate' | 'furnish'
  setMode: (mode: 'navigate' | 'furnish') => void

  // Ghost preview (item being placed)
  ghostItemId: string | null
  ghostGlbUrl: string | null
  setGhostItem: (id: string | null, url: string | null) => void

  // Placed items
  placedItems: PlacedItem[]
  addItem: (item: PlacedItem) => void
  removeItem: (instanceId: string) => void
  updateTransform: (instanceId: string, updates: Partial<PlacedItem>) => void

  // Selection
  selectedId: string | null
  setSelectedId: (id: string | null) => void

  // Transform mode for gizmo
  transformMode: 'rotate' | 'scale'
  setTransformMode: (mode: 'rotate' | 'scale') => void

  // Undo
  undoStack: UndoEntry[]
  undo: () => void

  // Cost
  totalCost: number
}
```

### Pattern 2: Click-to-Place with Floor Plane Raycasting
**What:** Reuse the existing `THREE.Plane(new THREE.Vector3(0, 1, 0), 0)` pattern from NavigationModes.tsx for furniture placement.
**When to use:** When user is in Furnish mode and has selected a catalog item (ghostItemId is set).
**Example:**
```typescript
// Inside FurnitureLayer.tsx (R3F component)
const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
const raycaster = useRef(new THREE.Raycaster())
const intersectPoint = useRef(new THREE.Vector3())

// onPointerMove: update ghost position
// onClick: confirm placement (add to store + push to undo stack)
```

### Pattern 3: GLB Loading with useGLTF + Clone
**What:** Load GLB models with drei's useGLTF hook, use Clone component for multiple instances of the same model.
**When to use:** Every furniture piece rendered in the scene.
**Example:**
```typescript
import { useGLTF, Clone } from '@react-three/drei'

function FurniturePiece({ glbUrl, position, rotation, scale, selected }: Props) {
  const { scene } = useGLTF(glbUrl)
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Clone object={scene} />
      {selected && <SelectionOutline />}
    </group>
  )
}
```

### Pattern 4: TransformControls Integration
**What:** Wrap selected furniture piece with drei TransformControls, disable OrbitControls while dragging gizmo.
**When to use:** When a placed item is selected in Furnish mode.
**Example:**
```typescript
import { TransformControls } from '@react-three/drei'

// TransformControls automatically disables OrbitControls when user
// is interacting with the gizmo (makeDefault behavior)
<TransformControls
  mode={transformMode}  // 'rotate' or 'scale'
  object={selectedMeshRef}
  onObjectChange={() => {
    // Update Zustand store with new transform values
  }}
/>
```

### Anti-Patterns to Avoid
- **Placing DOM elements inside R3F Canvas:** The catalog sidebar, cost tracker, and mini toolbar must be DOM siblings of the Canvas, not Html components inside it. Use Zustand for communication.
- **Loading all 50+ GLBs at mount:** Only load GLBs that are visible in the catalog viewport or already placed. Use `useGLTF.preload()` for items about to be placed, not all items.
- **Using translate mode in TransformControls:** Per CONTEXT.md, items snap to floor (y=0). Translate would let users move items off the floor. Instead, after placement, only allow rotate and scale via TransformControls. Re-positioning can be done by delete + re-place.
- **Storing undo stack in Convex:** The undo stack is session-ephemeral. Convex mutations for every undo entry would add latency and unnecessary DB writes. Keep it in Zustand.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D transform gizmo | Custom rotate/scale handles | drei `TransformControls` | Handles mouse/touch, camera-aware sizing, automatic OrbitControls disable |
| GLB loading + caching | Manual THREE.GLTFLoader + cache map | drei `useGLTF` | Built-in caching, draco/meshopt support, Suspense integration |
| Multiple instances of same GLB | Manual scene.clone() | drei `Clone` component | Handles deep cloning of materials/geometries correctly |
| Floor plane raycasting | Custom ray math | `THREE.Raycaster` + `THREE.Plane.intersectRay` | Already proven in NavigationModes.tsx |
| Mobile bottom sheet | Custom touch gesture handler | framer-motion `motion.div` with drag="y" constraints | Already in project, handles gesture physics |
| Unique IDs for placed items | UUID library | `crypto.randomUUID()` | Built into browsers, already used in tour viewer for sessionId |

**Key insight:** The drei ecosystem provides all the 3D interaction primitives needed. The only custom code is the placement flow logic (ghost preview, floor snap, mode switching) and the Convex data layer.

## Common Pitfalls

### Pitfall 1: TransformControls + OrbitControls Conflict
**What goes wrong:** Both controls try to handle pointer events simultaneously, causing erratic camera movement while transforming objects.
**Why it happens:** OrbitControls captures pointer events globally on the canvas.
**How to avoid:** drei TransformControls automatically disables OrbitControls when the user is dragging the gizmo. Ensure OrbitControls uses `makeDefault` or that TransformControls is rendered after OrbitControls in the component tree.
**Warning signs:** Camera orbits when trying to rotate furniture.

### Pitfall 2: GLB Memory Leaks
**What goes wrong:** Placing and removing many furniture items leaks GPU memory because geometries/textures are not disposed.
**Why it happens:** THREE.js does not garbage-collect GPU resources automatically.
**How to avoid:** useGLTF handles caching, and Clone shares geometry references. When removing items, do not manually dispose cached geometry. Let useGLTF's cache manage lifecycle. Only dispose if the component tree for that item is fully unmounted.
**Warning signs:** Browser tab memory usage grows continuously during a furnishing session.

### Pitfall 3: Ghost Preview Performance
**What goes wrong:** Rendering a full GLB model at 60fps while following the cursor causes frame drops on lower-end devices.
**Why it happens:** Complex GLB models with many polygons are expensive to re-render every frame.
**How to avoid:** For the ghost preview, render the GLB with reduced material (e.g., MeshBasicMaterial with semi-transparent gold tint) instead of full PBR materials. Alternatively, use a simplified bounding-box placeholder for the ghost and only render the full model on placement confirmation.
**Warning signs:** FPS drops below 30 when moving cursor with ghost active.

### Pitfall 4: Convex Query Reactivity for Cost Tracker
**What goes wrong:** Cost tracker shows stale data or flickers during rapid add/remove operations.
**Why it happens:** Each placement triggers a Convex mutation, and the reactive query re-fires. During rapid operations, multiple query updates arrive in quick succession.
**How to avoid:** Compute cost from the Zustand store (in-memory placedItems array) for instant UI updates. Use Convex data as the source of truth for persistence and sharing, but derive the cost display from local state during the editing session.
**Warning signs:** Cost tracker lags behind user actions by 200-500ms.

### Pitfall 5: GLB File Size and Loading Times
**What goes wrong:** Large uncompressed GLB files (5-20MB each) cause slow initial load and high bandwidth usage.
**Why it happens:** Furniture models from free sources often have unoptimized geometry and high-res textures.
**How to avoid:** Pre-process all GLBs with gltf-pipeline and draco compression before uploading to Convex storage. Target under 500KB per item for web performance. Use `useGLTF.preload()` to start loading a model when the user hovers over it in the catalog, before they click to place.
**Warning signs:** 3+ second delays when placing furniture for the first time.

### Pitfall 6: Gaussian Splat Raycasting Incompatibility
**What goes wrong:** Attempting to raycast against the Gaussian Splat point cloud for wall detection fails because splats are not mesh geometry.
**Why it happens:** Gaussian Splats render as point primitives, not triangulated meshes. THREE.Raycaster cannot intersect them.
**How to avoid:** Use only the y=0 floor plane for snapping (as CONTEXT.md specifies as the guaranteed minimum). Wall proximity detection would require either: (a) extracting a rough bounding mesh from the splat point cloud, or (b) using a depth buffer readback. Both are complex and not required for v1. Floor snap at y=0 is sufficient.
**Warning signs:** Wall snap features silently fail or produce incorrect positions.

## Code Examples

### Convex Schema Extension
```typescript
// convex/schema.ts additions

furnitureItems: defineTable({
  name: v.string(),
  category: v.union(
    v.literal('sofas'), v.literal('beds'), v.literal('tables'),
    v.literal('chairs'), v.literal('storage'), v.literal('decor')
  ),
  style: v.union(
    v.literal('scandinavian'), v.literal('modern'),
    v.literal('luxury'), v.literal('industrial')
  ),
  glbStorageId: v.id('_storage'),
  thumbnailStorageId: v.optional(v.id('_storage')),
  dimensions: v.object({
    width: v.number(),   // meters
    depth: v.number(),   // meters
    height: v.number(),  // meters
  }),
  priceUsd: v.number(),
  amazonUrl: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
})
  .index('by_category', ['category'])
  .index('by_style', ['style'])
  .searchIndex('search_name', { searchField: 'name', filterFields: ['category', 'style'] }),

furnishedRooms: defineTable({
  tourId: v.id('tours'),
  userId: v.id('users'),
  title: v.string(),
  slug: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_tourId', ['tourId'])
  .index('by_slug', ['slug'])
  .index('by_userId', ['userId']),

placedFurniture: defineTable({
  furnishedRoomId: v.id('furnishedRooms'),
  furnitureItemId: v.id('furnitureItems'),
  position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
  rotation: v.object({ x: v.number(), y: v.number(), z: v.number() }),
  scale: v.object({ x: v.number(), y: v.number(), z: v.number() }),
})
  .index('by_furnishedRoomId', ['furnishedRoomId']),
```

### Furniture Piece Component with Selection Outline
```typescript
// Source: drei docs (useGLTF, Clone, TransformControls)
import { useGLTF, Clone, TransformControls } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface FurniturePieceProps {
  glbUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  selected: boolean
  transformMode: 'rotate' | 'scale'
  onSelect: () => void
  onTransformChange: (pos: [number,number,number], rot: [number,number,number], scl: [number,number,number]) => void
}

function FurniturePiece({ glbUrl, position, rotation, scale, selected, transformMode, onSelect, onTransformChange }: FurniturePieceProps) {
  const { scene } = useGLTF(glbUrl)
  const groupRef = useRef<THREE.Group>(null!)

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <Clone object={scene} />
      </group>
      {selected && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          onObjectChange={() => {
            if (!groupRef.current) return
            const p = groupRef.current.position
            const r = groupRef.current.rotation
            const s = groupRef.current.scale
            onTransformChange(
              [p.x, p.y, p.z],
              [r.x, r.y, r.z],
              [s.x, s.y, s.z]
            )
          }}
        />
      )}
    </>
  )
}
```

### Ghost Preview Following Cursor
```typescript
// Inside R3F Canvas, reads pointer position and snaps to floor plane
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Clone } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function FurnitureGhost({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl)
  const groupRef = useRef<THREE.Group>(null!)
  const { camera, pointer } = useThree()
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef(new THREE.Raycaster())
  const intersection = useRef(new THREE.Vector3())

  useFrame(() => {
    raycaster.current.setFromCamera(pointer, camera)
    const hit = raycaster.current.ray.intersectPlane(plane.current, intersection.current)
    if (hit && groupRef.current) {
      groupRef.current.position.set(intersection.current.x, 0, intersection.current.z)
    }
  })

  return (
    <group ref={groupRef}>
      <Clone object={scene} inject={<meshBasicMaterial transparent opacity={0.5} color="#D4A017" />} />
    </group>
  )
}
```

### Keyboard Shortcuts
```typescript
// Effect hook for furniture keyboard shortcuts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const store = useFurnitureStore.getState()
    if (store.mode !== 'furnish') return

    if (e.key === 'r' || e.key === 'R') {
      store.setTransformMode('rotate')
    } else if (e.key === 's' || e.key === 'S') {
      store.setTransformMode('scale')
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (store.selectedId) {
        store.removeItem(store.selectedId)
        store.setSelectedId(null)
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault()
      store.undo()
    }
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual GLTFLoader + cache | useGLTF with built-in cache + draco | drei v9+ (2024) | Automatic caching, preloading, compression |
| Custom drag handlers | drei DragControls with axisLock | drei v9.88+ (2024) | Cleaner API, plane-constrained drag |
| THREE.TransformControls manual setup | drei TransformControls component | drei v1+ | Declarative, auto-disables OrbitControls |
| Clone via scene.clone() | drei Clone component | drei v9+ | Deep clone with material injection support |

**Deprecated/outdated:**
- Manual `THREE.GLTFLoader` usage: replaced by `useGLTF` hook
- `useLoader(GLTFLoader, url)`: `useGLTF` adds draco/meshopt support automatically

## Discretionary Recommendations

### GLB Loading Strategy
**Recommendation:** Lazy load with hover-preload. When user hovers a catalog item card, call `useGLTF.preload(url)`. When they click to place, the model is already cached. This provides near-instant placement feel without loading all 50+ models upfront.

### Ghost Preview Visual Treatment
**Recommendation:** Render the full GLB clone but override all materials with a semi-transparent gold `MeshBasicMaterial` (opacity: 0.5, color: #D4A017). This gives a clear "preview" feel while maintaining the item's silhouette. If performance is an issue on mobile, fall back to a wireframe bounding box.

### Undo Stack
**Recommendation:** In-memory Zustand array. Each action pushes an `UndoEntry` with enough data to reverse it. Stack is capped at 50 entries. Lost on page reload, which is acceptable since the user explicitly saves to Convex when done. This avoids Convex mutation overhead for every undo-able action.

### Thumbnail Generation
**Recommendation:** Generate thumbnails offline using a script (Node.js + puppeteer + headless R3F or Blender CLI). Pre-render each GLB to a 200x200 PNG and upload to Convex storage alongside the GLB. Store `thumbnailStorageId` in the `furnitureItems` table. This avoids runtime 3D rendering for catalog cards.

### Currency / Exchange Rates
**Recommendation:** Store prices in USD in the database. For display, use `Intl.NumberFormat` with the user's locale to format the currency symbol. For actual currency conversion, use a static exchange rate table updated weekly (store in Convex as a simple document). This avoids external API calls at view time. Initial implementation can be USD-only with locale-aware formatting.

### Category Distribution for 50+ Items
**Recommendation:**
- Sofas: 8 items (sectional, loveseat, 3-seater, etc.)
- Beds: 8 items (king, queen, single, bunk, etc.)
- Tables: 10 items (dining, coffee, side, desk, console, etc.)
- Chairs: 10 items (dining, office, accent, bar stool, etc.)
- Storage: 8 items (bookshelf, dresser, TV unit, wardrobe, etc.)
- Decor: 8 items (lamp, rug, plant, mirror, art frame, etc.)
Total: 52 items across 6 categories, each with 2-3 style variants.

### Grid Snap
**Recommendation:** Optional grid snap with 0.25m increment. Toggle via a small grid icon button in the toolbar. When active, render a subtle grid overlay on the floor plane using drei `Grid` component (opacity 0.15, color #D4A017). Snap positions during ghost preview by rounding to nearest 0.25.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test runner configured (noted in CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FURN-01 | Catalog has 50+ items with metadata | manual-only | Verify count via Convex dashboard or query | N/A |
| FURN-02 | Amazon links present where available | manual-only | Visual check in catalog UI | N/A |
| FURN-03 | Search and filter work | manual-only | Type in search, click filters, verify results | N/A |
| FURN-04 | Click-to-place on floor plane | manual-only | Click catalog item, move cursor, click floor | N/A |
| FURN-05 | Transform controls rotate/scale | manual-only | Select item, use gizmo, verify transform | N/A |
| FURN-06 | Ctrl/Cmd+Z undoes last action | manual-only | Place item, press Ctrl+Z, verify removal | N/A |
| FURN-07 | Cost tracker updates in real time | manual-only | Add/remove items, verify subtotal changes | N/A |
| FURN-08 | Delete key removes selected item | manual-only | Select item, press Delete, verify removal | N/A |
| SHARE-01 | Save and generate share link | manual-only | Click save, verify link generated | N/A |
| SHARE-02 | Share link works without login | manual-only | Open link in incognito, verify room loads | N/A |
| SHARE-03 | Cost summary with product links on share page | manual-only | Open share link, verify itemized list with Amazon links | N/A |

### Sampling Rate
- **Per task commit:** Manual verification of affected requirement
- **Per wave merge:** Full manual walkthrough of all requirements
- **Phase gate:** Complete manual UAT checklist

### Wave 0 Gaps
- No test framework configured. All requirements are 3D interaction + visual, making them manual-only for validation.
- Convex schema changes can be validated by running `npx convex dev` (schema sync).

## Open Questions

1. **GLB Model Sourcing**
   - What we know: Free sources exist (Free3D, itch.io, CGTrader) with CC0/royalty-free licenses. Models need draco compression and optimization to under 500KB each.
   - What's unclear: Whether 52 suitable models across all 6 categories are available for free with appropriate licenses, or if some need to be created/purchased.
   - Recommendation: Start with free CC0 models from itch.io (KayKit furniture packs are low-poly and web-ready). Supplement from Free3D. Budget 1-2 days for model curation and compression.

2. **Wall Proximity Snapping Feasibility**
   - What we know: Gaussian Splats are point clouds, not meshes. Standard raycasting does not work against them.
   - What's unclear: Whether a rough bounding geometry can be extracted from the splat data to enable wall proximity detection.
   - Recommendation: Defer wall snapping entirely. Floor snap (y=0) is the guaranteed behavior per CONTEXT.md. Wall snapping is a nice-to-have that can be added later if a mesh extraction approach is found.

3. **Clone Material Override for Ghost Preview**
   - What we know: drei's Clone component has an `inject` prop for adding children, but material override across all meshes in a complex GLB may require traversal.
   - What's unclear: Whether `inject` with a single material replaces all materials or only adds a new mesh.
   - Recommendation: Test with a simple GLB first. Fallback: traverse the cloned scene and override each mesh's material manually in a useEffect.

## Sources

### Primary (HIGH confidence)
- [drei docs - TransformControls](https://drei.docs.pmnd.rs/gizmos/drag-controls) - API props, mode switching, autoTransform
- [drei docs - useGLTF](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf) - Hook API, preload, draco support, caching
- [drei source - TransformControls.tsx](https://github.com/pmndrs/drei/blob/master/src/core/TransformControls.tsx) - Implementation details
- Existing codebase: `GaussianSplatViewer.tsx`, `NavigationModes.tsx`, `ModeSwitcher.tsx`, `useSplatViewerStore.ts` - Established patterns
- Convex schema (`convex/schema.ts`) - Existing table patterns and conventions

### Secondary (MEDIUM confidence)
- [Convex File Storage docs](https://docs.convex.dev/file-storage) - Upload limits, 3-step pattern
- [Convex Limits](https://docs.convex.dev/production/state/limits) - File size no hard limit, 2min upload timeout
- [pmndrs/gltfjsx](https://github.com/pmndrs/gltfjsx) - GLB to JSX conversion tool
- [R3F Events docs](https://r3f.docs.pmnd.rs/api/events) - Pointer events, raycasting in R3F

### Tertiary (LOW confidence)
- [Free3D furniture models](https://free3d.com/3d-models/furniture) - License terms vary per model
- [itch.io KayKit furniture](https://itch.io/game-assets/free/tag-furniture/tag-low-poly) - CC0 models, needs size/quality verification
- [react-three-drag-controls](https://github.com/yalsayid/react-three-drag-controls/) - Alternative drag approach, not needed given TransformControls

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and proven in the project
- Architecture: HIGH - extends existing patterns (Zustand store, R3F Canvas, Convex tables, floor raycasting)
- Pitfalls: HIGH - TransformControls/OrbitControls conflict is well-documented, GLB performance is a known concern
- Convex schema: HIGH - follows exact patterns from existing tables (indexes, optional fields, v.id references)
- GLB sourcing: MEDIUM - free sources exist but curation effort uncertain
- Wall snapping: LOW - technically infeasible with Gaussian Splats, correctly deferred

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable ecosystem, no fast-moving dependencies)
