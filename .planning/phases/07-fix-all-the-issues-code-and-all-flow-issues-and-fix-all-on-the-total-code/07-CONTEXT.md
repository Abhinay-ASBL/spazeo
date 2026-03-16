# Phase 7: Fix All Issues — Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve the 3 major UAT failures from Phase 6 on navigation hotspots: icon/accent color support, selectable visual styles, and info panel capability. Also incorporate in-progress code-level fixes (null guards in floor plan editor, building viewer model scaling, Stripe API version update, CSP header additions) that are already staged but uncommitted.

No new features. No new capabilities outside navigation hotspot UX and committed code fixes.

</domain>

<decisions>
## Implementation Decisions

### Navigation Hotspot — Icon + Accent Color
- Use the same 17-icon ICON_REGISTRY already defined for info/media hotspots — no new registry needed
- Extend the icon picker in the tour editor form to appear when type = `navigation` (currently only shown for non-navigation types)
- Icon REPLACES the default arrow/chevron when set; falls back to default arrow if `iconName` is null/empty
- `None` (empty string sentinel) is the pre-selected default — existing navigation hotspots are unaffected
- Reuse the same `accentColor` field and color picker UI already in the editor form — just extend to navigation type
- No separate field or label for navigation vs info panel accent color

### Navigation Hotspot — Visual Style Selector
- Three selectable styles added via a new optional `navStyle` field on the hotspots Convex schema:
  - `ring` (default): animated gold pulse ring — current behavior, backward compatible
  - `arrow`: bare chevron pointing in the hotspot direction
  - `dot`: small minimal circle marker
- `navStyle` is `v.optional(v.union(v.literal('ring'), v.literal('arrow'), v.literal('dot')))` — undefined = ring
- Style selector rendered in the hotspot form, visible only when type = `navigation`
- Default for new navigation hotspots: `ring`

### Navigation Hotspot — Info Panel Behavior
- When a navigation hotspot has `title` OR `description` set, clicking the hotspot opens the info panel FIRST — scene transition does NOT happen automatically
- The panel shows title, description, optional CTA, and a **"Go to [scene name] →"** button at the bottom
- Clicking "Go to [scene name]" triggers the scene transition and closes the panel
- When `title` and `description` are both empty/null, clicking navigates immediately (existing behavior — backward compatible)
- Supported panel layouts: `compact` and `rich` only (no `video` for navigation hotspots)
- "Go to [scene]" button appears below the CTA button, or as the only action if no CTA is configured
- Scene-change `useEffect` in the public viewer still calls `setActiveHotspot(null)` — panel closes on any scene change (including via map or other means)

### In-Progress Code Fixes (to commit in Phase 7)
- **Floor plan null guards**: `DiagramCanvas.tsx` and `OriginalOverlay.tsx` already have `geometry?.walls ?? []` and `geometry?.rooms ?? []` guards preventing crashes when geometry is undefined — commit these
- **Building exterior viewer**: Model auto-centering now uses `useMemo` + `targetHeight = totalFloors * FLOOR_HEIGHT` scaling (removes debug `console.log`, removes Draco CDN) — commit this
- **Convex schema**: `overallWidth` and `overallHeight` optional fields added to `floorPlanDetails` — commit
- **Stripe API version**: Updated from `2026-01-28.clover` to `2026-02-25.clover` across 4 actions — commit
- **CSP headers**: `next.config.ts` adds `https://unpkg.com` to `script-src`, `img-src`, `connect-src`, `worker-src`; adds `blob:` to `connect-src` — commit

### Claude's Discretion
- Exact animation for the `arrow` style (pointing direction calculation reuses existing atan2 bearing formula from Phase 1)
- Exact animation for the `dot` style (likely a static or slow-pulse small circle)
- How `navStyle` affects `markerColor` computation (accentColor + navStyle both contribute to final marker appearance)
- Whether navStyle selector uses radio buttons, a segmented control, or a dropdown in the editor form

</decisions>

<specifics>
## Specific Ideas

- UAT user reference: "for Navigation i am not getting to select the and it should get different different option like this" — referenced Matterport/Kuula-style navigation markers with ring, arrow/chevron, and different sizes
- Info panel first + "Go to Kitchen →" CTA pattern: user explicitly wants room info shown before transition — treat as storytelling tool, not just navigation
- The `Go to [scene name]` button label should use the actual target scene title (not a generic "Navigate") so buyers know where they're going before clicking

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ICON_REGISTRY` in `HotspotMarker.tsx`: 17-entry map of Lucide icon names → components. Currently gated behind `hotspot.type !== 'navigation'`. Remove this gate.
- `markerColor` computed variable: `hotspot.accentColor ?? config.color`. Already handles accentColor for non-navigation; same logic applies to navigation.
- `HotspotInfoPanel.tsx`: Responsive drawer already handles `compact` and `rich` layouts, CTA button, X close. Add a "Go to [scene]" button at the bottom for navigation hotspot type.
- `useViewerStore.ts`: `setActiveHotspot(hotspot._id)` and `setActiveHotspot(null)` already manage panel state. Navigation hotspot click-to-open panel = same store call.
- `handleHotspotClick` in `src/app/tour/[slug]/page.tsx`: Currently routes navigation first (early return), then media, then info. Need to modify routing: if navigation type AND has title/description → open panel instead of navigate; else navigate directly.

### Established Patterns
- `panelLayout` union is stored in schema and read in `HotspotInfoPanel.tsx` for rendering decisions
- `accentColor` applied via inline style on marker button background
- Editor form: all hotspot field state (`hotspotIconName`, `hotspotPanelLayout`, etc.) is reset after create

### Integration Points
- `convex/schema.ts` hotspots table: add `navStyle` optional field
- `convex/hotspots.ts` create + update mutations: add `navStyle` arg
- `HotspotMarker.tsx`: extend icon and accent color to navigation type
- `HotspotInfoPanel.tsx`: add navigation-specific "Go to [scene]" button + accept `onNavigate` callback prop
- `src/app/tour/[slug]/page.tsx`: update `handleHotspotClick` routing logic
- `src/app/(dashboard)/tours/[id]/edit/page.tsx`: add navStyle selector + extend icon picker + extend color picker to navigation type

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-fix-all-the-issues-code-and-all-flow-issues-and-fix-all-on-the-total-code*
*Context gathered: 2026-03-16*
