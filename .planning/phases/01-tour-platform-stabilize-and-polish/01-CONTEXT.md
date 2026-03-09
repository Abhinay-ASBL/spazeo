# Phase 1: Tour Platform — Stabilize and Polish - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix three live security/bug issues (lead email, plaintext passwords, Stripe stubs), build the complete tour creation editor end-to-end, and polish the 360° public viewer for mobile and production. No new AI features, no 3D reconstruction — stabilize and ship what exists.

</domain>

<decisions>
## Implementation Decisions

### Tour Editor Routing and Layout
- Editor lives at a separate `/tours/[id]/edit` route (not inline on the detail page)
- Layout: left panel (~280px, fixed) + right panorama viewer (remaining width)
- Left panel default state: draggable scene thumbnail list with 'Add Scene' button at top
- Editor header contains a 'Publish' button — one-click status change, autosaves changes
- Scene upload happens via 'Add Scene' in the left panel (uses existing UploadZone component)

### Hotspot Placement (Editor)
- 'Add Hotspot' button enters placement mode: crosshair cursor, viewer shows teal banner ("Click to place hotspot" — already exists in PanoramaViewer `isEditing` mode)
- User clicks panorama → hotspot placed at that 3D coordinate
- Left panel slides to a config panel: target scene selector, hotspot type, tooltip text, visibility toggle
- Existing hotspots in edit mode: same visual marker + teal (#2DD4BF) glow/border when selected + Delete button on selection

### Hotspot Visual Design (Public Viewer)
- Navigation hotspots: HTML overlay positioned via 3D→screen projection (not Three.js sprites)
  - Pulsing glow ring + chevron/arrow icon, Gold (#D4A017), CSS keyframe animation
  - "Animated directional arrow" = pulse ring that expands outward, chevron center pointing direction
- Info popup card: HTML overlay panel anchored near the hotspot's screen position (or slides in from right)
  - Can contain rich content: text, image, video — React HTML, not Three.js billboard
- Hotspot rendering approach: replace existing Three.js HotspotMarker sprites with HTML overlay system (project 3D positions to 2D screen coordinates)

### Analytics Dashboard
- Global overview at `/analytics` with per-tour drill-down
- Top section: 4 StatsCard components (total views, unique visitors, avg scene time, total leads — aggregated across all tours)
- Below top stats: table of tours with individual metrics per row
- Bar chart showing views over time (below the table or beside it)
- Default time range: last 30 days; user can switch between 7d / 30d / 90d / All time

### Auto-rotate Idle Behavior
- Auto-rotate always restarts after 5 seconds of user inactivity (idle timer pattern)
- Idle timer resets on: mouse move, click, scroll, and touch events on the viewer
- Manual toggle button (already in ViewerControls) permanently disables auto-rotate for the session — if user clicks it off, idle timer is suspended; if user clicks it back on, idle timer re-activates
- OrbitControls `autoRotate` prop is driven by this idle state (not just the manual toggle alone)

### Critical Bug Fixes (Specified — No Ambiguity)
- FIX-01: Pass `tourSlug` correctly in the leads.ts scheduler call so email fires
- FIX-02: Hash password with bcrypt before storing in tours table; compare server-side
- FIX-03: Complete empty Stripe webhook stubs in convex/http.ts for checkout.session.completed, subscription updates, cancellations

### Claude's Discretion
- Exact drag-and-drop library for scene reordering (react-beautiful-dnd or native HTML5 drag)
- Bar chart implementation (recharts, or simple CSS bars — no chart library specified)
- Exact iframe attributes exposed in the embed code generator (TOUR-04)
- Error state designs for the editor
- Compression/optimization of uploaded panorama images

</decisions>

<specifics>
## Specific Ideas

- The existing PanoramaViewer `isEditing` + `onSphereClick` + crosshair cursor + "Click to place hotspot" banner should be reused directly — it's already built for this
- Hotspot overlays should feel like premium tour platforms (e.g., Matterport-style pulsing rings)
- Analytics StatsCard component already exists in `src/components/ui/StatsCard.tsx` — reuse it

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PanoramaViewer.tsx`: Already has `isEditing`, `onSphereClick`, crosshair cursor, "Click to place hotspot" teal banner — hotspot placement is done
- `HotspotMarker.tsx`: Existing Three.js sprite marker — will be replaced by HTML overlay system
- `ViewerControls.tsx`: Standalone zoom/rotate/fullscreen control bar — reuse in both editor and viewer
- `UploadZone.tsx`: Upload component — use for 'Add Scene' in editor left panel
- `ShareDialog.tsx`: Share/password dialog — reuse for tour sharing settings
- `StatsCard.tsx`: Stat display card — use for analytics aggregates
- `EmptyState.tsx`: Empty state component — use in analytics and editor empty scenes

### Established Patterns
- `useQuery(api.*)` for all reactive data reads — never manual fetch
- `useMutation(api.*)` for all writes with optimistic updates
- `toast.success/error` (react-hot-toast) for all user feedback
- Tailwind v4 with `@theme {}` in globals.css — no tailwind.config.ts
- Named exports for all components
- `dynamic()` with `ssr: false` for PanoramaViewer (Three.js can't SSR)
- Brand colors via inline `style` props (CSS variables defined in globals.css)

### Integration Points
- `/tours/[id]/edit` page needs to be created (route doesn't exist yet)
- Tour editor connects to: `api.scenes.listByTour`, `api.hotspots.*`, `api.tours.update`, `api.scenes.upload`
- Analytics page at `/analytics` connects to `api.analytics.*` and `api.tours.list`
- Idle timer logic lives inside the public viewer page (`tour/[slug]/page.tsx`) — wraps the existing `isAutoRotating` state
- Mobile touch (pinch-to-zoom, swipe) — OrbitControls handles touch natively; may need `enableZoom: true` for mobile and pinch events

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-tour-platform-stabilize-and-polish*
*Context gathered: 2026-03-09*
