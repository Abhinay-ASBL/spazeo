---
phase: 03-furniture-catalog-placement-and-room-sharing
verified: 2026-03-10T12:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Complete furniture placement flow end-to-end"
    expected: "Ghost preview follows cursor, click places item, Gold outline on selection, transform gizmo works, undo reverses, save generates share link, share page loads read-only"
    why_human: "3D interaction, real-time rendering, and visual behavior cannot be verified programmatically"
  - test: "Mobile bottom sheet catalog"
    expected: "On mobile viewport, catalog appears as swipeable bottom sheet instead of sidebar"
    why_human: "Responsive layout and touch gesture behavior needs device testing"
  - test: "Camera centering from cost tracker"
    expected: "Clicking an item in cost tracker list smoothly animates camera to center on that furniture piece"
    why_human: "Smooth camera animation is a visual/UX behavior"
---

# Phase 3: Furniture Catalog, Placement, and Room Sharing Verification Report

**Phase Goal:** Inside the reconstructed 3D room, a user can browse a curated catalog of 50+ GLB furniture items, drag and drop them onto the floor, scale and rotate them, track running cost in real time, undo mistakes, and save and share the furnished room as a public read-only link
**Verified:** 2026-03-10T12:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The furniture catalog contains at least 50 GLB items searchable by name and filterable by style and category | VERIFIED | `convex/furnitureItems.ts` seedCatalog mutation contains exactly 52 items across 6 categories (sofas:8, beds:8, tables:10, chairs:10, storage:8, decor:8). Schema has `search_name` searchIndex. `list` query accepts category/style filters. `search` query accepts searchTerm. |
| 2 | A user drags a catalog item into the 3D room and it snaps to the floor plane; they can select, scale, rotate, and delete | VERIFIED | `FurnitureGhost.tsx` uses THREE.Plane raycasting at y=0 for cursor tracking. `FurnitureLayer.tsx` handles click-to-place with `addItem`. `FurniturePiece.tsx` has TransformControls with rotate/scale modes, Gold emissive outline on selection. Delete key handler in FurnitureLayer removes selected item. |
| 3 | The cost tracker updates in real time showing running subtotal and itemized list | VERIFIED | `CostTracker.tsx` reads `placedItems` and `totalCost` from useFurnitureStore (Zustand -- instant local updates). Expandable itemized list with Amazon ExternalLink icons. Click calls both `setSelectedId` and `setCenterOnItem`. |
| 4 | Ctrl/Cmd+Z undoes the last placement action | VERIFIED | `useFurnitureStore.ts` implements full undo stack (capped at 50) with place/remove/transform action types. `FurnitureLayer.tsx` keyboard handler catches `z` with ctrlKey/metaKey and calls `undo()`. |
| 5 | Save furnished room and share link; anyone sees read-only with cost summary and product links | VERIFIED | `GaussianSplatViewer.tsx` has save flow using `furnishedRooms.create` + `savePlacements` mutations, clipboard copy of share URL. Share page at `src/app/tour/[slug]/furnished/[id]/page.tsx` loads `FurnishedRoomViewer` with public `getBySlug` query (no auth). `CostSummaryPanel.tsx` shows itemized costs with Amazon links and "View All on Amazon" button. Furniture toggle (Eye/EyeOff) in FurnishedRoomViewer. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | furnitureItems, furnishedRooms, placedFurniture tables | VERIFIED | Tables defined at lines 564, 598, 610 with search_name searchIndex |
| `convex/furnitureItems.ts` | Catalog CRUD + seed | VERIFIED (370 lines) | Exports: list, search, getById, seed, seedCatalog, setGlbStorageId, uploadTestGlbs, generateUploadUrl |
| `convex/furnishedRooms.ts` | Room persistence + placed furniture CRUD | VERIFIED (196 lines) | Exports: create, getBySlug, getByTourId, savePlacements, deleteRoom |
| `src/hooks/useFurnitureStore.ts` | Zustand store with full state management | VERIFIED (236 lines) | Exports: useFurnitureStore, GhostMetadata, PlacedItem, UndoAction, InteractionMode, TransformMode. Undo stack capped at 50. |
| `src/components/furniture/CatalogSidebar.tsx` | Search, category tabs, style filter, 2-col grid | VERIFIED (210 lines) | Uses useQuery for list/search, setGhostItem on click, category tabs, style dropdown |
| `src/components/furniture/CatalogItemCard.tsx` | Item card with thumbnail, price, dimensions | VERIFIED (104 lines) | Displays name, price, dimensions, style badge, Amazon link |
| `src/components/furniture/CostTracker.tsx` | Sticky footer with subtotal and itemized list | VERIFIED (133 lines) | Reads from store, expand/collapse, click-to-select-and-center |
| `src/components/furniture/CatalogBottomSheet.tsx` | Mobile bottom sheet with drag | VERIFIED (112 lines) | framer-motion drag="y" with dragConstraints |
| `src/components/viewer/FurnitureLayer.tsx` | R3F orchestrator for placement | VERIFIED (189 lines) | Ghost rendering, placed items, click-to-place, keyboard shortcuts (R, S, Delete, Ctrl+Z, Escape) |
| `src/components/viewer/FurnitureGhost.tsx` | Cursor-following ghost preview | VERIFIED (71 lines) | Floor plane raycasting, gold semi-transparent material |
| `src/components/viewer/FurniturePiece.tsx` | GLB with selection and TransformControls | VERIFIED (111 lines) | TransformControls from drei, Gold emissive outline (#D4A017) |
| `src/components/viewer/GaussianSplatViewer.tsx` | Extended with FurnitureLayer + CatalogSidebar | VERIFIED (508 lines) | Imports and renders FurnitureLayer, CatalogSidebar, FurnitureToolbar, FurnitureCameraController. Save/share flow with dialog. enableFurniture prop. |
| `src/components/viewer/ModeSwitcher.tsx` | Furnish mode toggle | VERIFIED (150 lines) | useFurnitureStore for mode, Furnish button with Gold bg when active, nav modes disabled |
| `src/components/viewer/FurnitureToolbar.tsx` | Floating mini toolbar | VERIFIED (147 lines) | Rotate, Scale, Delete buttons with framer-motion |
| `src/components/viewer/NavigationModes.tsx` | Disabled click-to-move in furnish mode | VERIFIED (185 lines) | Guards click handler with `furnitureMode === 'furnish'` check |
| `src/components/viewer/FurnitureCameraController.tsx` | Camera animation on centerOnItem | VERIFIED (54 lines) | Reads centerOnItem, lerps OrbitControls.target, clears when close |
| `src/app/tour/[slug]/furnished/[id]/page.tsx` | Public share page route | VERIFIED (42 lines) | Dynamic import of FurnishedRoomViewer, no auth required |
| `src/components/furnished/FurnishedRoomViewer.tsx` | Read-only 3D viewer | VERIFIED (245 lines) | Public query getBySlug, ReadOnlyFurniturePiece, furniture toggle (Eye/EyeOff) |
| `src/components/furnished/CostSummaryPanel.tsx` | Itemized cost with Amazon links | VERIFIED (224 lines) | Total cost, per-item Amazon ExternalLink, "View All on Amazon" button |
| `public/test-glbs/` | Test GLB primitives | VERIFIED | cube.glb (748B), cylinder.glb (1184B), sphere.glb (3148B) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CatalogSidebar | convex/furnitureItems.ts | useQuery(api.furnitureItems.list/search) | WIRED | Lines 64-70 use useQuery with category/style filters |
| CatalogSidebar | useFurnitureStore | setGhostItem on item click | WIRED | Line 86 calls setGhostItem with id, url, metadata |
| CostTracker | useFurnitureStore | placedItems, totalCost, setSelectedId, setCenterOnItem | WIRED | Lines 17-20 read store, line 25-26 call both on click |
| FurnitureLayer | useFurnitureStore | mode, ghost, placedItems, addItem | WIRED | Line 26 destructures all state, line 59 calls addItem |
| FurniturePiece | drei TransformControls | Wraps selected item | WIRED | Line 102 renders TransformControls |
| FurnitureGhost | THREE.Plane | Floor plane intersection | WIRED | Lines 16-17 create Plane/Raycaster, line 48 intersects |
| GaussianSplatViewer | FurnitureLayer | Rendered in Canvas | WIRED | Line 295 renders FurnitureLayer |
| GaussianSplatViewer | CatalogSidebar | DOM sibling | WIRED | Line 444 renders CatalogSidebar |
| ModeSwitcher | useFurnitureStore | setMode toggle | WIRED | Line 128 calls setFurnitureMode |
| NavigationModes | useFurnitureStore | Disables click in furnish | WIRED | Line 97 guards with furnish mode check |
| FurnitureCameraController | useFurnitureStore | centerOnItem + lerp | WIRED | Line 21 reads centerOnItem, line 41 lerps |
| Share page | furnishedRooms.getBySlug | Public query | WIRED | FurnishedRoomViewer line 43 uses useQuery |
| FurnishedRoomViewer | FurniturePiece | ReadOnlyFurniturePiece | WIRED | Line 153 renders ReadOnlyFurniturePiece (local variant) |
| CostSummaryPanel | Placement data | Amazon links | WIRED | Lines 115-124 render ExternalLink with amazonUrl |
| Tour editor | GaussianSplatViewer | enableFurniture={true} | WIRED | tours/[id]/edit/page.tsx line 1020 passes enableFurniture |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FURN-01 | 03-01, 03-06 | 50+ GLB items with dimensional metadata | SATISFIED | 52 items in seedCatalog with width/depth/height in meters, price, style tags, category |
| FURN-02 | 03-01, 03-06 | Amazon product links with affiliate tag | SATISFIED | ~60% of items have amazonUrl with spazeo-20 tag |
| FURN-03 | 03-02 | Search by name, filter by style and category | SATISFIED | CatalogSidebar has search bar (debounced), category tabs, style dropdown using Convex search index |
| FURN-04 | 03-03, 03-04 | Click catalog item and place onto 3D floor | SATISFIED | Ghost preview via FurnitureGhost, click-to-place in FurnitureLayer, snaps to y=0 floor plane |
| FURN-05 | 03-03, 03-04 | Transform controls: scale and rotate | SATISFIED | FurniturePiece uses drei TransformControls with rotate/scale modes, R/S keyboard shortcuts |
| FURN-06 | 03-03 | Undo last placement action (Ctrl/Cmd+Z) | SATISFIED | useFurnitureStore undo stack with place/remove/transform types, keyboard handler in FurnitureLayer |
| FURN-07 | 03-02 | Real-time cost tracker with subtotal and itemized list | SATISFIED | CostTracker reads from Zustand store, shows formatted subtotal and expandable item list |
| FURN-08 | 03-03 | Delete placed item with Delete key | SATISFIED | FurnitureLayer handles Delete/Backspace key, calls removeItem + clears selection |
| SHARE-01 | 03-05 | Save furnished room and generate share link | SATISFIED | GaussianSplatViewer save flow: create room mutation, savePlacements, clipboard copy of share URL |
| SHARE-02 | 03-05 | Read-only view without login via share link | SATISFIED | Public page at /tour/[slug]/furnished/[id], getBySlug is a public query (no auth check) |
| SHARE-03 | 03-05 | Itemized cost summary with product links on share page | SATISFIED | CostSummaryPanel shows per-item costs, Amazon ExternalLink icons, "View All on Amazon" button |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No blocker anti-patterns found. No TODO/FIXME/placeholder comments in any furniture files. No console.log statements. No empty implementations. |

### Human Verification Required

### 1. Complete Furniture Placement Flow

**Test:** Open a tour with a 3D splat in the editor. Click Furnish mode. Browse catalog, click an item with GLB, see ghost preview following cursor, click floor to place, select placed item, rotate/scale with gizmo, delete with Delete key, undo with Ctrl+Z. Save arrangement, copy share link, open in incognito.
**Expected:** Full placement flow works end-to-end. Ghost follows cursor at y=0. Items render solid after placement. Gold outline on selection. TransformControls gizmo appears. Share page loads read-only with cost summary.
**Why human:** 3D rendering, raycasting accuracy, visual feedback, and camera animation cannot be verified programmatically.

### 2. Mobile Bottom Sheet Catalog

**Test:** Open the editor on a mobile viewport (< 768px). Toggle furnish mode.
**Expected:** Catalog appears as a swipeable bottom sheet instead of a sidebar. Drag handle visible. Half-screen and full-screen states work.
**Why human:** Responsive layout and touch gesture behavior needs real device or emulator testing.

### 3. Camera Centering from Cost Tracker

**Test:** Place several items, expand cost tracker, click an item name in the list.
**Expected:** Camera smoothly animates to center on the clicked item. Item gets Gold selection outline.
**Why human:** Smooth lerp animation and camera behavior is visual.

### Gaps Summary

No gaps found. All 11 requirements (FURN-01 through FURN-08, SHARE-01 through SHARE-03) are satisfied. All 18 artifacts exist, are substantive (well above minimum line counts), and are properly wired to each other. The complete furniture placement pipeline -- from catalog browsing through 3D placement to save/share -- is fully connected. Three human verification items remain for visual/interactive behavior that cannot be checked programmatically.

---

_Verified: 2026-03-10T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
