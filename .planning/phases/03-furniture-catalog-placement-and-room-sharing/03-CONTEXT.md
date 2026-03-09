# Phase 3: Furniture Catalog, Placement, and Room Sharing - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Inside the reconstructed 3D room (Phase 2's GaussianSplatViewer + R3F Canvas), build a browsable furniture catalog with 50+ curated GLB items, click-to-place 3D placement with transform controls, real-time cost tracking with Amazon product links, undo support, and shareable furnished room links accessible without login. No external marketplace search, no AI placement suggestions, no multi-room furnishing workflow.

</domain>

<decisions>
## Implementation Decisions

### Catalog Panel Layout
- Right sidebar (~320px), collapsible, persistent while furnishing
- Search bar at top, horizontal category tabs below (Sofas, Beds, Tables, Chairs, Storage, Decor)
- Style filter dropdown below tabs (Scandinavian, Modern, Luxury, Industrial, All)
- Item cards in a 2-column grid inside the sidebar
- Each item card shows: 3D thumbnail preview (pre-rendered), price, dimensions (W×D×H in meters), style tag badge, and Amazon link icon where available
- Mobile: catalog becomes a swipeable bottom sheet (half-screen default, drag up to full). Consistent with Phase 6's mobile bottom sheet pattern

### 3D Placement Interaction
- Click-to-place flow: user clicks item in catalog → ghost preview attaches to cursor and follows over the 3D floor → ghost snaps to floor plane → user clicks to confirm placement → item appears solid
- Mode toggle between "Navigate" and "Furnish" modes — explicit toggle button in the viewer
  - Furnish mode: clicks place/select furniture items, click empty area deselects
  - Navigate mode: click-to-move works as in Phase 2 (free-roam, dollhouse, hotspot)
- Floor snap (y=0) is primary; wall proximity detection and grid snap also desired — researcher should investigate feasibility given Gaussian Splat point clouds lack clean mesh geometry

### Transform Controls
- Click any placed item to select it — shows Gold (#D4A017) outline glow
- Transform gizmo with rotate ring and scale handles (drei TransformControls)
- Mini toolbar appears near selected item: [Rotate] [Scale] [Delete]
- Keyboard shortcuts: R = rotate mode, S = scale mode, Delete/Backspace = remove item
- Ctrl/Cmd+Z undoes last placement action (FURN-06)

### Snapping Behavior
- Floor plane snap: items always land on y=0 (primary, guaranteed)
- Wall proximity snap: items detect approximate wall boundaries when near edges (needs research — splat scenes are point clouds, not clean meshes)
- Grid snap: toggleable grid overlay for precise spacing alignment
- Note: wall and grid snap depend on research feasibility — floor snap is the minimum viable behavior

### Cost Tracker
- Sticky footer section at the bottom of the catalog sidebar
- Shows running subtotal and item count, expandable to full itemized list
- Each item row shows: name, price, and small Amazon icon/link (opens product page in new tab)
- "View All on Amazon" button at bottom of expanded list
- Clicking an item in the cost list selects it in the 3D scene (Gold outline) and centers camera on it
- Currency: auto-detect by user locale — researcher should investigate lightweight exchange rate approach or multi-currency catalog pricing
- Cost updates in real time as items are added/removed (Convex reactive query)

### Furnished Room Sharing
- URL structure: `/tour/[slug]/furnished/[id]` — nested under parent tour
- Multiple furnishing arrangements per tour (e.g., "Modern Living Room", "Budget Setup") — each gets a unique share link
- Read-only share page shows:
  - Full 3D room with placed furniture (orbit/zoom, all Phase 2 navigation modes)
  - Itemized cost summary panel (right sidebar on desktop, bottom sheet on mobile)
  - Amazon product links per item in the summary
  - Toggle to show/hide all furniture (compare empty vs furnished)
  - Parent tour's branding (logo, colors) — inherited from tour branding config
- No login required to view (SHARE-02)
- Furniture cannot be moved or modified in read-only mode

### Claude's Discretion
- GLB loading strategy and caching (useGLTF preloading, progressive loading)
- Ghost preview opacity and visual treatment during placement
- Transform gizmo exact styling and control sensitivity
- Undo stack implementation (in-memory vs persisted)
- Pre-rendered thumbnail generation pipeline for catalog items
- Exchange rate source and update frequency for multi-currency
- Exact category list and how many items per category in the initial 50+
- Grid snap spacing increment and grid visual style

</decisions>

<specifics>
## Specific Ideas

- Mode toggle (Navigate vs Furnish) keeps the interaction model clean — furnishing doesn't conflict with Phase 2's click-to-move navigation
- Furniture toggle on/off in the share view is a differentiator — buyers can compare empty vs furnished room instantly
- Multiple arrangements per tour serve the real estate agent use case: show clients 2-3 furnishing options at different price points
- "View All on Amazon" aggregated link at bottom of cost list maximizes affiliate conversion
- User expressed interest in web search integration for external furniture sources — captured as deferred idea

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GaussianSplatViewer.tsx`: R3F Canvas shell with OrbitControls, mode switcher, and fullscreen — furniture placement happens inside this canvas
- `NavigationModes.tsx`: Raycaster + click-to-move on floor plane — reusable pattern for floor-plane hit detection during furniture placement
- `useSplatViewerStore` (Zustand): 3D viewer state (navMode, transitioning, joystickVector) — extend with furniture mode state (selected item, placement ghost, furnish/navigate toggle)
- `ModeSwitcher.tsx`: Floating pill toolbar for navigation modes — add Furnish mode toggle alongside existing modes
- `SplatHotspot3D.tsx`: 3D marker rendering in R3F — pattern for rendering furniture items as 3D objects in the same scene
- `ViewerControls.tsx`: Zoom/fullscreen controls — reuse in share page viewer

### Established Patterns
- `dynamic(() => import(...), { ssr: false })` for all R3F components — must be used for any new 3D furniture components
- Convex reactive queries for real-time UI updates — cost tracker reads placed items via useQuery
- 3-step file upload for GLB files: generateUploadUrl → POST → save storageId
- `toast.success/error` for user feedback on save/share actions

### Integration Points
- New Convex tables needed: `furnitureItems` (catalog), `furnishedRooms` (saved arrangements), `placedFurniture` (items in a room with position/rotation/scale)
- `/tour/[slug]/furnished/[id]` — new Next.js route for share page
- `tours` table — link to furnishing arrangements
- `subscriptions` — may need furnishing limits per plan (researcher to determine)
- Catalog sidebar component lives outside the R3F Canvas (DOM) but interacts with Canvas state via Zustand store

</code_context>

<deferred>
## Deferred Ideas

- External furniture search (Amazon/web marketplace integration) — user expressed interest in browsing/searching external sources beyond the curated catalog. This is a new capability requiring API integration — future phase
- AI furniture placement suggestions (ADV3D-01 in v2 requirements) — already scoped as v2 requirement
- Style-based room presets (ADV3D-02 in v2 requirements) — already scoped as v2 requirement

</deferred>

---

*Phase: 03-furniture-catalog-placement-and-room-sharing*
*Context gathered: 2026-03-10*
