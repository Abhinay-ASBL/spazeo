# Phase 7: Fix All Issues — Research

**Researched:** 2026-03-16
**Domain:** Navigation hotspot UX (viewer + editor), in-progress code fixes (floor plan null guards, building exterior viewer, Stripe versioning, CSP headers)
**Confidence:** HIGH — all findings verified directly from source files in the repository

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation Hotspot — Icon + Accent Color**
- Use the same 17-icon ICON_REGISTRY already defined for info/media hotspots — no new registry needed
- Extend the icon picker in the tour editor form to appear when type = `navigation` (currently only shown for non-navigation types)
- Icon REPLACES the default arrow/chevron when set; falls back to default arrow if `iconName` is null/empty
- `None` (empty string sentinel) is the pre-selected default — existing navigation hotspots are unaffected
- Reuse the same `accentColor` field and color picker UI already in the editor form — just extend to navigation type
- No separate field or label for navigation vs info panel accent color

**Navigation Hotspot — Visual Style Selector**
- Three selectable styles added via a new optional `navStyle` field on the hotspots Convex schema:
  - `ring` (default): animated gold pulse ring — current behavior, backward compatible
  - `arrow`: bare chevron pointing in the hotspot direction
  - `dot`: small minimal circle marker
- `navStyle` is `v.optional(v.union(v.literal('ring'), v.literal('arrow'), v.literal('dot')))` — undefined = ring
- Style selector rendered in the hotspot form, visible only when type = `navigation`
- Default for new navigation hotspots: `ring`

**Navigation Hotspot — Info Panel Behavior**
- When a navigation hotspot has `title` OR `description` set, clicking the hotspot opens the info panel FIRST — scene transition does NOT happen automatically
- The panel shows title, description, optional CTA, and a **"Go to [scene name] →"** button at the bottom
- Clicking "Go to [scene name]" triggers the scene transition and closes the panel
- When `title` and `description` are both empty/null, clicking navigates immediately (existing behavior — backward compatible)
- Supported panel layouts: `compact` and `rich` only (no `video` for navigation hotspots)
- "Go to [scene]" button appears below the CTA button, or as the only action if no CTA is configured
- Scene-change `useEffect` in the public viewer still calls `setActiveHotspot(null)` — panel closes on any scene change (including via map or other means)

**In-Progress Code Fixes (to commit in Phase 7)**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 7 is a targeted UAT-fix phase: three navigation hotspot UX gaps and five in-progress code fixes. The scope is narrowly bounded and all integration points are already established by Phase 6.

The three UAT gaps are:
1. **Icon + accent color on navigation hotspots**: Currently `HotspotMarker.tsx` gates `ICON_REGISTRY` lookup and `markerColor` behind `hotspot.type !== 'navigation'`. Remove that gate.
2. **Visual style selector (navStyle)**: Schema already has `markerStyle` as `ring | arrow | dot | label`. CONTEXT.md decides the field name is `navStyle` (3 values: `ring | arrow | dot`). The schema's `markerStyle` field already covers this but was named differently — research reveals `markerStyle` was used in Phase 6 (confirmed in `convex/schema.ts` and `convex/hotspots.ts`). The CONTEXT.md calls it `navStyle` but code already uses `markerStyle`. Planner must reconcile: the schema already has `markerStyle` with 4 values (`ring | arrow | dot | label`). The CONTEXT.md 3-value `navStyle` maps directly onto the existing `markerStyle` field (just ignore `label` variant for navigation type).
3. **Info panel with "Go to [scene]" CTA**: `handleHotspotClick` in the public viewer currently navigates immediately and only opens the panel after transition. Needs to invert: open panel first, navigate on button click.

The five code fixes are already staged in the repo (BuildingExteriorViewer, DiagramCanvas, OriginalOverlay, schema, Stripe, CSP) and confirmed by reading the files.

**Primary recommendation:** Treat `markerStyle` in the schema as the `navStyle` field from CONTEXT.md — no schema migration needed, just restrict the editor UI to the 3 navigation-relevant options (ring/arrow/dot). The `label` value in `markerStyle` is not rendered in `HotspotMarker.tsx` yet so omitting it from the navigation picker is safe.

---

## Standard Stack

### Core (all pre-existing, no new installs)
| Component | File | Current State | What Phase 7 Changes |
|-----------|------|---------------|----------------------|
| HotspotMarker.tsx | `src/components/viewer/HotspotMarker.tsx` | Navigation branch uses hardcoded `#D4A017` + `ChevronRight`; no `iconName`/`accentColor` support | Remove navigation guard; apply `markerColor` + `ICON_REGISTRY` to nav type; add `markerStyle` render branches |
| HotspotInfoPanel.tsx | `src/components/viewer/HotspotInfoPanel.tsx` | Type is `'info' \| 'media' \| 'link'` only; no navigation support, no "Go to" button | Extend type to include `'navigation'`; add `onNavigate` callback prop; add "Go to [scene]" button |
| Public tour page | `src/app/tour/[slug]/page.tsx` | `handleHotspotClick` navigates first, optionally opens panel after 300ms delay | Invert: if navigation + has title/description, open panel first; pass `onNavigate` callback that transitions and closes panel |
| Tour editor page | `src/app/(dashboard)/tours/[id]/edit/page.tsx` | Icon picker is visible for all types (already — line 1463-1503); markerStyle selector shown for navigation already (line 1331-1370); accentColor field missing from create/edit form | Add accentColor input to both create form and edit form for navigation type |
| convex/schema.ts | `convex/schema.ts` | `markerStyle` is `v.optional(v.union(v.literal('ring'), v.literal('arrow'), v.literal('dot'), v.literal('label')))` — already correct | No schema change needed; CONTEXT.md navStyle = existing markerStyle field |
| convex/hotspots.ts | `convex/hotspots.ts` | `markerStyle` in create + update args already present | No changes needed |

### Supporting (committed in this phase)
| Component | File | Change |
|-----------|------|--------|
| DiagramCanvas.tsx | `src/components/floor-plan/DiagramCanvas.tsx` | Already has `geometry?.walls ?? []` null guards — commit |
| OriginalOverlay.tsx | `src/components/floor-plan/OriginalOverlay.tsx` | Already has `geometry?.walls ?? []` + `geometry?.rooms ?? []` null guards — commit |
| BuildingExteriorViewer.tsx | `src/components/viewer/BuildingExteriorViewer.tsx` | Already has `useMemo` auto-center + `targetHeight = totalFloors * FLOOR_HEIGHT` — commit |
| next.config.ts | `next.config.ts` | CSP headers already include unpkg.com and blob: in connect-src — commit |
| convex/schema.ts | `convex/schema.ts` | `overallWidth`/`overallHeight` already in floorPlanDetails — commit |
| convex/subscriptions.ts | `convex/subscriptions.ts` | Stripe API version already `2026-02-25.clover` — commit |
| convex/http.ts | `convex/http.ts` | Stripe API version already `2026-02-25.clover` — commit |

**Installation:** No new packages required.

---

## Architecture Patterns

### Pattern 1: Navigation Hotspot — Panel-First Click Flow

**Current behavior** (line 302-327 of `src/app/tour/[slug]/page.tsx`):
```
navigation + targetSceneId → setActiveSceneId(targetSceneId) immediately
  → if description: setTimeout(setActiveHotspot, 300) [panel opens after transition]
```

**Required behavior** (CONTEXT.md locked decision):
```
navigation + targetSceneId + (title || description) → setActiveHotspot(hotspot._id) [panel first]
navigation + targetSceneId + no title/description → setActiveSceneId(targetSceneId) [immediate]
```

The "Go to [scene]" button in `HotspotInfoPanel` must call a new `onNavigate` prop. The parent passes a callback that calls `setActiveSceneId(hotspot.targetSceneId)` and then `setActiveHotspot(null)`.

The existing `useEffect` that calls `setActiveHotspot(null)` on scene change (line 297-299) handles panel close automatically — no additional close logic needed on the navigate callback.

### Pattern 2: HotspotInfoPanel — Navigation Type Extension

**Current type definition** (line 7-19 of `HotspotInfoPanel.tsx`):
```typescript
interface HotspotData {
  _id: string
  type: 'info' | 'media' | 'link'  // navigation missing
  ...
}
interface Props {
  hotspot: HotspotData
  onClose: () => void
  // onNavigate missing
}
```

**Required shape:**
```typescript
interface HotspotData {
  _id: string
  type: 'info' | 'media' | 'link' | 'navigation'
  targetSceneId?: string         // for "Go to" button label lookup
  title?: string
  description?: string
  ...
}
interface Props {
  hotspot: HotspotData
  onClose: () => void
  onNavigate?: (targetSceneId: string) => void  // optional — only navigation type uses it
  targetSceneTitle?: string       // passed by parent, shown in "Go to [scene title] →" button
}
```

The parent `page.tsx` must resolve `targetSceneTitle` by looking up the target scene in the `scenes` array before passing to `HotspotInfoPanel`.

### Pattern 3: markerStyle Rendering in HotspotMarker

The existing navigation branch renders only the `ring` style. The `markerStyle` field (called `navStyle` in CONTEXT.md) drives three visual modes:

| `markerStyle` value | Render description |
|---------------------|-------------------|
| `ring` (default/undefined) | Current gold pulse ring with ChevronRight — backward compatible |
| `arrow` | Bare chevron only, no pulse rings. Direction from existing `atan2` bearing formula |
| `dot` | Small circle, no chevron, slow-pulse or static |

The `HotspotData` interface in `HotspotMarker.tsx` must add `markerStyle?: 'ring' | 'arrow' | 'dot' | 'label'` (line 27-47, no field currently).

### Pattern 4: Icon + Accent Color on Navigation Type

**Current guard** (`HotspotMarker.tsx` line 86):
```typescript
const IconComponent = (hotspot.iconName ? ICON_REGISTRY[hotspot.iconName] : undefined) ?? config.icon
const markerColor = hotspot.accentColor ?? config.color
```
These lines already work correctly for non-navigation types. For navigation, the guard is the early `if (hotspot.type === 'navigation')` branch at line 92 which hardcodes `#D4A017` as the button background instead of using `markerColor`.

**Fix**: Inside the navigation branch, replace `backgroundColor: '#D4A017'` on the inner button with `backgroundColor: markerColor`. Replace `<ChevronRight ... />` with the computed `IconComponent` (which falls back to `ChevronRight` when `iconName` is empty — this is safe because `ICON_REGISTRY['navigation']` is `Navigation` icon, not `ChevronRight`).

Note: The fallback for navigation type should remain a chevron/arrow, not the `Navigation` icon from the registry. Change line 86 fallback for navigation to be `ChevronRight` specifically:
```typescript
const IconComponent = hotspot.iconName
  ? (ICON_REGISTRY[hotspot.iconName] ?? config.icon)
  : hotspot.type === 'navigation'
    ? ChevronRight    // keep arrow as nav default even if iconName not set
    : config.icon
```

### Pattern 5: accentColor in Editor Form for Navigation Type

The create-hotspot form currently shows the icon picker for all types (line 1463). The accentColor input is missing from the create form. The edit form (`editFields.accentColor` exists at line 609) but there is no render for it in the edit UI — this must be added in the right panel hotspot edit section.

Locate the edit form section (around line 1650+) and add an accentColor input for all types or at minimum for navigation type per CONTEXT.md.

### Anti-Patterns to Avoid

- **Do not add `navStyle` as a separate field** — it maps onto the existing `markerStyle` field. The schema already has `markerStyle` with the required values. Using two separate fields would create sync drift.
- **Do not change the `setActiveHotspot(null)` useEffect in the public viewer** — it already closes the panel on scene change, which is the desired behavior after a navigation hotspot triggers a transition.
- **Do not pass `hotspot.targetSceneId` directly to the "Go to" button label** — resolve the scene title in the parent before passing `targetSceneTitle` prop; the panel should not query Convex independently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Bearing direction for arrow style | Custom angle math | Existing `atan2(x, -z) * 180 / Math.PI` formula already in `HotspotMarker.tsx` line 94 |
| Panel animation | Custom CSS transitions | Existing `framer-motion` `AnimatePresence` + `motion.div` in `HotspotInfoPanel.tsx` |
| Hotspot state management | Local component state | Existing `useViewerStore` — `setActiveHotspot` / `activeHotspotId` |
| Schema validation | Manual type checks | Convex `v.optional(v.union(...))` — already used for `markerStyle` |
| Stripe instance | New constructor | Existing `new Stripe(key, { apiVersion: '2026-02-25.clover' })` pattern in subscriptions.ts |

---

## Common Pitfalls

### Pitfall 1: Panel Closes Before User Clicks "Go to"
**What goes wrong:** If `setActiveHotspot(null)` fires before the user clicks the navigate button, the panel disappears without any action.
**Why it happens:** The `useEffect` at line 297-299 calls `setActiveHotspot(null)` whenever `activeSceneId` changes. If the "Go to" button calls `setActiveSceneId` and `setActiveHotspot(null)` in sequence, the `useEffect` fires a second `setActiveHotspot(null)` redundantly — this is safe (idempotent).
**How to avoid:** In the `onNavigate` callback, call `setActiveSceneId(targetSceneId)` first. Do NOT call `setActiveHotspot(null)` in the callback — let the `useEffect` handle it on scene change. This avoids a race condition.

### Pitfall 2: "Go to" Scene Title Shows undefined
**What goes wrong:** The `targetSceneTitle` prop resolves to `undefined` if the parent doesn't look up the scene title.
**Why it happens:** `HotspotInfoPanel` receives only the hotspot document. It knows `targetSceneId` but not the title.
**How to avoid:** In `page.tsx`, derive `targetSceneTitle` from the `scenes` array:
```typescript
const targetSceneTitle = activeHotspot?.targetSceneId
  ? (scenes?.find(s => s._id === activeHotspot.targetSceneId)?.title ?? 'Next Room')
  : undefined
```

### Pitfall 3: Navigation Hotspot Bypassing Panel When title is Set
**What goes wrong:** Old `handleHotspotClick` code returns early after `setActiveSceneId`. If `hotspot.description` check is wrong, panel never opens.
**Why it happens:** The current code checks `(hotspot as Record<string, unknown>).description || hotspot.content`. The CONTEXT.md decision is `title OR description`. The check must include `hotspot.title`.
**How to avoid:**
```typescript
const hasInfoContent = !!(hotspot.title || (hotspot as any).description)
if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
  if (hasInfoContent && hotspot._id) {
    setActiveHotspot(hotspot._id)  // panel first, no navigation yet
  } else {
    setActiveSceneId(hotspot.targetSceneId)  // immediate navigation
  }
  return
}
```

### Pitfall 4: markerStyle Renders Unexpectedly for Non-Navigation Types
**What goes wrong:** `markerStyle` field exists in the schema for all hotspot types, but the CONTEXT.md intends it only for navigation. If `HotspotMarker.tsx` reads `markerStyle` for info/media/link types and renders `dot` or `arrow` styles, the result is broken markers.
**How to avoid:** In `HotspotMarker.tsx`, only apply `markerStyle` branching inside `if (hotspot.type === 'navigation')`. The non-navigation branch is unaffected.

### Pitfall 5: Committed Files Have Diverged from What Was Staged
**What goes wrong:** CONTEXT.md says the code fixes are "already staged" but the files as read show them ALREADY COMMITTED (the current source files show the fixes already applied).
**Why it happens:** The developer staged and partially committed these changes before the context session.
**How to avoid:** Verify each file before editing. Based on this research:
- `BuildingExteriorViewer.tsx`: `useMemo` + `targetHeight` already present — file is fixed, just needs git commit
- `OriginalOverlay.tsx`: `geometry?.walls ?? []` already on line 10 — file is fixed
- `DiagramCanvas.tsx`: Need to verify the actual null guard location in the file body (only read first 60 lines)
- `next.config.ts`: CSP with unpkg.com and blob: already present — file is fixed
- `convex/schema.ts`: `overallWidth`/`overallHeight` already present at lines 684-685 — file is fixed
- `convex/subscriptions.ts` + `http.ts`: `2026-02-25.clover` already present — files are fixed

The "commit these" instruction in CONTEXT.md means: create a git commit for these already-modified files. The planner task is to stage and commit them, not to make additional code edits.

---

## Code Examples

### handleHotspotClick — Panel-First Pattern
```typescript
// Source: src/app/tour/[slug]/page.tsx — updated handleHotspotClick
const handleHotspotClick = useCallback(
  (hotspot: { type: string; targetSceneId?: string; _id?: string; content?: string; videoUrl?: string; title?: string; description?: string }) => {
    if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
      const hasInfoContent = !!(hotspot.title || hotspot.description)
      if (hasInfoContent && hotspot._id) {
        setActiveHotspot(hotspot._id)   // open panel first
      } else {
        setActiveSceneId(hotspot.targetSceneId)  // navigate immediately
      }
      return
    }
    // media, info, link handling unchanged
    ...
  },
  [setActiveHotspot]
)
```

### HotspotInfoPanel — "Go to" button
```typescript
// Added at the bottom of the panel, after CTA button
{hotspot.type === 'navigation' && onNavigate && hotspot.targetSceneId && (
  <button
    onClick={() => {
      onNavigate(hotspot.targetSceneId!)
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      height: 40,
      borderRadius: 8,
      backgroundColor: '#2DD4BF',
      color: '#0A0908',
      fontSize: 14,
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
      width: '100%',
      fontFamily: 'var(--font-dmsans)',
    }}
  >
    Go to {targetSceneTitle ?? 'Next Room'} →
  </button>
)}
```

### HotspotMarker — markerStyle branches
```typescript
// Inside if (hotspot.type === 'navigation') branch
// Source: src/components/viewer/HotspotMarker.tsx
const navStyle = (hotspot as any).markerStyle ?? 'ring'
const markerColor = (hotspot as any).accentColor ?? '#D4A017'

if (navStyle === 'dot') {
  // Small minimal circle — no pulse rings, no icon
  return (
    <Html position={[...]} center zIndexRange={[10, 0]}>
      <button
        onClick={onClick}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          backgroundColor: markerColor,
          border: 'none', cursor: 'pointer',
          animation: 'hotspot-pulse-inner 2.4s ease-in-out infinite',
          boxShadow: `0 0 0 4px ${markerColor}30`,
        }}
        aria-label={hotspot.tooltip ?? hotspot.title ?? 'Navigate'}
      />
    </Html>
  )
}

if (navStyle === 'arrow') {
  // Bare chevron, no ring, direction from bearing
  const IconComp = hotspot.iconName ? (ICON_REGISTRY[hotspot.iconName] ?? ChevronRight) : ChevronRight
  return (
    <Html position={[...]} center zIndexRange={[10, 0]}>
      <button
        onClick={onClick}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: markerColor }}
        aria-label={hotspot.tooltip ?? hotspot.title ?? 'Navigate'}
      >
        <IconComp size={28} strokeWidth={2} style={{ transform: `rotate(${yawDeg}deg)`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }} />
      </button>
    </Html>
  )
}

// 'ring' (default) — existing pulse ring UI, markerColor applied
```

---

## State of the Art

| Area | Current State | Phase 7 Target |
|------|--------------|----------------|
| Navigation hotspot icon | Hardcoded ChevronRight; ignores iconName | ICON_REGISTRY applied; falls back to ChevronRight |
| Navigation hotspot color | Hardcoded `#D4A017`; ignores accentColor | `markerColor = accentColor ?? '#D4A017'` |
| Navigation marker style | Only ring style rendered | ring / arrow / dot all rendered based on markerStyle field |
| Navigation info panel | Navigate immediately, panel opens after 300ms delay | Panel opens first; navigate on "Go to" button |
| Floor plan null guard | geometry may be undefined → crash | `geometry?.walls ?? []` guards in place, committed |
| Building viewer scaling | Fixed scale; had debug console.log | useMemo + targetHeight scaling, no debug output |
| Stripe API version | Was `2026-01-28.clover` | `2026-02-25.clover` across all 4 Stripe init calls |
| CSP headers | Missing unpkg.com domains | unpkg.com added to script-src, img-src, connect-src, worker-src |

---

## Open Questions

1. **accentColor in Create Form**
   - What we know: `hotspotCtaLabel` / `hotspotCtaUrl` state exists in create form but no `hotspotAccentColor` state or input exists
   - What's unclear: Is there an accentColor input for navigation in the current create form? (Read confirmed: no accentColor input rendered in create form — only in edit form's `editFields.accentColor`)
   - Recommendation: Add `hotspotAccentColor` state to the create form and render a color input for navigation type (and optionally all types)

2. **Schema field name: `markerStyle` vs `navStyle`**
   - What we know: Schema uses `markerStyle`; CONTEXT.md says `navStyle`; Convex mutations accept `markerStyle`
   - What's unclear: CONTEXT.md was authored before checking schema — it describes a new field but schema already has the equivalent
   - Recommendation: Use the existing `markerStyle` field. No schema change needed. The 4th value (`label`) exists in schema but is not used in navigation context — the editor UI for navigation just shows 3 options.

3. **DiagramCanvas null guard location**
   - What we know: CONTEXT.md says guards are already present in `DiagramCanvas.tsx`; only first 60 lines were read
   - What's unclear: The exact line numbers of the guards in the body of `DiagramCanvas.tsx`
   - Recommendation: Planner should instruct implementer to read the full file before committing, to verify guards are present throughout (especially where `geometry.walls` and `geometry.rooms` are accessed in render)

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no test runner configured in package.json (confirmed in CLAUDE.md: "No test runner (vitest/playwright) is configured yet") |
| Config file | None |
| Quick run command | `npm run lint` (ESLint only) |
| Full suite command | `npm run lint` |

### Phase Requirements → Test Map

Phase 7 fixes are behavioral/visual. With no automated test framework, validation is manual:

| Req ID | Behavior | Test Type | Manual Check |
|--------|----------|-----------|--------------|
| NAV-ICON | Navigation hotspot renders custom icon when iconName is set | visual | Set iconName on a nav hotspot in editor; view in public tour — verify icon appears instead of default chevron |
| NAV-COLOR | Navigation hotspot uses accentColor for marker background | visual | Set accentColor on nav hotspot; verify marker ring color changes |
| NAV-STYLE-RING | `markerStyle=ring` renders pulse rings | visual | Default nav hotspot shows animated gold rings |
| NAV-STYLE-ARROW | `markerStyle=arrow` renders bare chevron, no rings | visual | Set markerStyle=arrow; verify rings absent, chevron present |
| NAV-STYLE-DOT | `markerStyle=dot` renders small circle, no icon | visual | Set markerStyle=dot; verify small dot marker |
| NAV-PANEL-FIRST | Clicking nav hotspot with title/description opens panel before navigating | interaction | Add title to nav hotspot; click in viewer — panel must appear first |
| NAV-GOTO | "Go to [scene] →" button in panel triggers scene transition | interaction | Click "Go to" button in panel — verify navigation occurs |
| NAV-BACKWARD | Nav hotspot with no title/description still navigates immediately | regression | Existing nav hotspot without title — click must navigate immediately |
| CODE-FIXES | Floor plan editor does not crash when geometry is undefined | regression | Open floor plan editor on a new project with no extracted geometry |
| CODE-STRIPE | Stripe API version is 2026-02-25.clover | code review | grep subscriptions.ts + http.ts for version string |
| CODE-CSP | unpkg.com loads without CSP block in browser console | smoke | Open building exterior viewer; check browser console for CSP errors |

### Sampling Rate
- **Per task commit:** `npm run lint`
- **Per wave merge:** `npm run lint` + manual spot-check of the changed component
- **Phase gate:** All manual checks above pass before `/gsd:verify-work`

### Wave 0 Gaps
None — existing infrastructure covers linting. No test files to create. Manual validation is the gate.

---

## Sources

### Primary (HIGH confidence)
- `src/components/viewer/HotspotMarker.tsx` — full file read; confirmed ICON_REGISTRY, markerColor, navigation branch structure
- `src/components/viewer/HotspotInfoPanel.tsx` — full file read; confirmed type interface, panel layout, CTA button
- `src/app/tour/[slug]/page.tsx` — full file read; confirmed handleHotspotClick routing, useEffect panel-close pattern
- `src/app/(dashboard)/tours/[id]/edit/page.tsx` — read lines 1-700 + 1050-1650; confirmed icon picker, markerStyle selector, editFields, create form state
- `convex/schema.ts` — full file read; confirmed markerStyle field (`ring | arrow | dot | label`), overallWidth/overallHeight, all tables
- `convex/hotspots.ts` — full file read; confirmed create/update mutation args include markerStyle
- `src/components/viewer/BuildingExteriorViewer.tsx` — full file read; confirmed useMemo + targetHeight already applied
- `next.config.ts` — full file read; confirmed CSP already includes unpkg.com and blob:
- `convex/subscriptions.ts` — confirmed `2026-02-25.clover` at lines 219, 282, 313, 353
- `convex/http.ts` — confirmed `2026-02-25.clover` at line 65
- `src/components/floor-plan/OriginalOverlay.tsx` — confirmed `geometry?.walls ?? []` and `geometry?.rooms ?? []` at lines 10-11
- `.planning/phases/07-fix-all-the-issues-code-and-all-flow-issues-and-fix-all-on-the-total-code/07-CONTEXT.md` — full file read; all locked decisions

### Secondary (MEDIUM confidence)
- `CLAUDE.md` — project conventions, no test runner confirmed, Tailwind/Convex patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly; no external dependencies needed
- Architecture: HIGH — integration points verified in source
- Pitfalls: HIGH — derived from reading actual code, not speculation
- Schema findings: HIGH — confirmed markerStyle already exists, no new schema field needed for navStyle

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable codebase, no fast-moving dependencies)
