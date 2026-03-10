# Phase 5: Floor Plan to 3D and Full Section 3 Delivery - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert corrected 2D floor plan geometry (wall coordinates, door positions, room types, dimensions — all from Phase 4's Convex data) into a navigable 3D space using procedural Three.js extrusion; plug the Phase 3 furniture placement and cost tracking system in unchanged; finalize and publish as a shareable public Tour. No new viewer implementation — reuse GaussianSplatViewer with all three navigation modes. No new furniture system — reuse Phase 3's enableFurniture prop and all supporting components.

</domain>

<decisions>
## Implementation Decisions

### 3D Visual Style
- Clean white walls, light grey floor, white ceiling — neutral matte style (standard architectural visualization, consistent with Planner 5D and HomeByMe defaults)
- Material picker panel available after generation: user can click a room and pick from preset material swatches (wall color, floor type)
- Phase 4's extracted floor material hints (wood, tile, carpet, concrete) become the defaults for each room — user can override
- Default ceiling height: **2.7m** (most common residential international standard), adjustable per room in the review step
- Doorways: open archways with subtle 3D door frame (no door panels, no animation) — door positions from Phase 4 extraction become wall gaps

### Review & Adjust Step
- Dedicated page: `/floor-plans/[id]/3d` — separate from Phase 4's 2D editor
- Entry: "Generate 3D Space" button in Phase 4 editor (`/floor-plans/[id]/edit`) after the user saves corrected geometry — navigates to `/floor-plans/[id]/3d`
- Page loads with a brief shimmer/loading indicator while Three.js builds geometry from Convex data; 3D renders immediately (no job queue — client-side generation)
- Layout: full 3D preview (left) + properties panel (right) with:
  - Global ceiling height slider (default 2.7m)
  - Per-room ceiling height overrides (list of rooms with individual inputs)
  - Doorway width and height inputs
  - Material picker per room (wall color swatch + floor type swatch)
- Live regeneration: 3D mesh regenerates instantly (debounced ~300ms) as the user changes any property — no Preview button
- "Finalize" button at the bottom of the properties panel

### After Finalize → Publishing Path
- Finalize creates a **Tour record** with `sourceType: 'floor_plan'` and `floorPlanId` linking it to the floor plan project
- User is navigated to `/tours/[id]/edit` — the existing tour editor (Phase 1) for branding, hotspot placement, and publishing
- Auto-generated hotspot markers placed at each doorway from Phase 4 door positions; user can move/delete them in the tour editor like any hotspot
- Floor plan project stays in Convex, linked to Tour via `tourId` field — user can go back, re-edit 2D geometry in Phase 4, and regenerate 3D

### Published Tour
- Public URL: `/tour/[slug]` — same route as panorama and splat tours
- Viewer auto-selects the right renderer based on tour data (`sourceType === 'floor_plan'` → floor plan 3D renderer)
- All three navigation modes: dollhouse (overhead orthographic of the generated mesh), free-roam (walking through rooms at eye height), hotspot (doorway markers)
- Furniture placement, cost tracker, and share links (Phase 3) work identically inside floor-plan-derived rooms via the same `enableFurniture` prop
- Full Phase 1 features apply automatically: branding, lead capture form, password protection, analytics, embed code

### Generation Architecture
- 3D geometry generation is **client-side only** — Three.js BufferGeometry extrusion from wall coordinate arrays (instant, < 1 second, no server cost)
- Wall coordinates + ceiling heights → extruded wall meshes; floor polygon → floor plane; ceiling → ceiling plane; door openings → gap cut into wall geometry
- The generated geometry renders inside a Three.js/R3F canvas — same pattern as GaussianSplatViewer but a new `FloorPlanViewer` component (extends same architecture, not a fork)
- All three navigation modes reuse `NavigationModes.tsx` and `ModeSwitcher.tsx` directly

### Claude's Discretion
- Exact Three.js extrusion approach for non-rectangular wall polygons
- How door openings are cut from wall geometry (CSG vs manual gap)
- Floor plan 3D mesh caching/storage strategy (persist GLB or regenerate on demand)
- Material swatch library (built-in colors or Tailwind palette)
- Navigation mode auto-placement logic for dollhouse start position given variable room dimensions
- Window openings treatment (Phase 4 extracts window positions — render as inset holes or ignore for v1)
- Ambient + directional lighting setup for the generated space

</decisions>

<specifics>
## Specific Ideas

- "Generate 3D Space" button in Phase 4 editor is the explicit handoff point — no auto-trigger on save
- Live re-generation on property change (debounced) is the key interaction — user should feel in control of their space
- Material picker defaults to Phase 4's extracted hints so the 3D immediately reflects AI-detected materials (wood floors, tile in bathrooms) with zero manual input
- Hotspot auto-generation from door positions is a differentiator — zero manual setup required for room navigation
- Floor plan project stays linked to Tour — user can always go back to fix the 2D extraction and regenerate without re-uploading

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GaussianSplatViewer.tsx`: R3F Canvas shell with OrbitControls, mode switcher, fullscreen, furniture layer, save/share — architecture to mirror (not reuse directly, since it loads .spz splats, but all structural patterns apply)
- `NavigationModes.tsx`: Camera controller with dollhouse/free-roam/hotspot modes, lerp transitions, joystick support — **directly reusable** inside the new FloorPlanViewer canvas
- `ModeSwitcher.tsx`: Floating pill toolbar for navigation modes — **directly reusable** in FloorPlanViewer
- `FurnitureLayer.tsx`, `CatalogSidebar.tsx`, `CostTracker`, `useFurnitureStore`: All Phase 3 furniture components — plug in via `enableFurniture` prop, same pattern as GaussianSplatViewer
- `SplatHotspot3D.tsx`: 3D hotspot marker rendering in R3F — reuse or mirror for doorway hotspot markers in floor plan space
- `VirtualJoystick.tsx`, `FurnitureCameraController.tsx`, `FurnitureToolbar.tsx`: All reusable from Phase 3
- `useSplatViewerStore` (Zustand): Nav mode, transitioning, joystick state — reuse directly (rename or alias for floor plan viewer)
- `ViewerControls.tsx`: Zoom + fullscreen UI — reuse in FloorPlanViewer

### Established Patterns
- `dynamic(() => import(...), { ssr: false })` — required for all Three.js/R3F components in Next.js App Router
- `useQuery(api.*)` reactive reads — fetch floor plan geometry from Convex on `/floor-plans/[id]/3d` page load
- `useMutation(api.tours.create)` — create Tour record on finalize
- `toast.success/error` — user feedback on finalize/publish
- Phase 3 `enableFurniture` prop pattern — pass through to FloorPlanViewer for furniture mode

### Integration Points
- `floorPlanProjects` / `floorPlanDetails` Convex tables (Phase 4) — source of wall coordinates, door positions, room types, dimensions
- `tours` table needs: `sourceType` field ('panorama' | 'splat' | 'floor_plan'), `floorPlanId` optional reference
- `hotspots` table: auto-insert doorway hotspots on Tour creation, same schema as Phase 1 hotspots
- `/tour/[slug]/page.tsx`: Add third conditional branch — if `tour.sourceType === 'floor_plan'` → render dynamic FloorPlanViewer instead of PanoramaViewer or GaussianSplatViewer
- `/floor-plans/[id]/edit` (Phase 4): Add "Generate 3D Space" CTA button that navigates to `/floor-plans/[id]/3d`
- New Next.js route: `src/app/(dashboard)/floor-plans/[id]/3d/page.tsx`

</code_context>

<deferred>
## Deferred Ideas

- Window openings in generated 3D — Phase 4 extracts window positions; rendering them as wall insets is a v2 enhancement
- AI-generated textures from room type + style (e.g., generate realistic wall/floor textures for "modern bedroom") — future AI feature
- Export generated 3D as GLB for use in external tools — future export feature
- Multi-floor navigation: linking floor plans from Phase 4's multi-floor upload into a navigable multi-story 3D building — already flagged as v2 in Phase 4

</deferred>

---

*Phase: 05-floor-plan-to-3d-and-full-section-3-delivery*
*Context gathered: 2026-03-10*
