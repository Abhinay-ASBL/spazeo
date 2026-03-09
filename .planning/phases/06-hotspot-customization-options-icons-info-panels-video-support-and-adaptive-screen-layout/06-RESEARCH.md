# Phase 6: Hotspot Customization, Icons, Info Panels, Video Support, and Adaptive Screen Layout — Research

**Researched:** 2026-03-09
**Domain:** @react-three/drei Html markers, Framer Motion panels, responsive viewer layout, Convex schema extensions, Zustand ephemeral state
**Confidence:** HIGH

---

## Summary

Phase 6 builds on a fully working hotspot system from Phase 1. The existing `HotspotMarker.tsx` already handles four hotspot types (navigation, info, media, link), inline popup cards, YouTube/Vimeo video embedding, and directional arrow rotation. The main gaps are: richer info panel UI (larger card with image+text+CTA, not just 240px popup), explicit icon customization per hotspot, full-screen video modal experience, consistent adaptive layout at mobile breakpoints, and a Convex schema that stores new customization fields without breaking existing data.

The viewer renders hotspots via `@react-three/drei`'s `Html` component inside a React Three Fiber `Canvas`. This means hotspot popups live in a DOM sub-tree projected over the WebGL canvas. Rich panel UIs (wide sliding panels, modals) work best rendered outside the Canvas in normal React DOM and driven by state. The architecture choice for Phase 6 is: keep the hotspot marker (the circle/button) inside `Html`, but lift rich panel content outside the Canvas into a portal rendered at the page root level — driven by Zustand viewer state.

**Primary recommendation:** Extend the hotspot schema with `iconName`, `panelLayout`, and `videoUrl` fields; add a Zustand `useViewerStore` slice for `activeHotspotId`; render the info panel as a normal React component outside the R3F Canvas (not inside `Html`); use Framer Motion `AnimatePresence` for panel enter/exit; handle mobile breakpoints with CSS container queries or Tailwind responsive classes on the outer viewer wrapper.

---

## What Already Exists (Do Not Rebuild)

| Component | Location | What It Does |
|-----------|----------|--------------|
| `HotspotMarker` | `src/components/viewer/HotspotMarker.tsx` | Renders all 4 hotspot types; has navigation arrow with atan2 rotation; has popup card with video embed (YouTube/Vimeo/mp4) and image support |
| `PanoramaViewer` | `src/components/viewer/PanoramaViewer.tsx` | R3F Canvas with `OrbitControls`, texture loading with fade transition, renders `HotspotMarker` array |
| `ViewerControls` | `src/components/viewer/ViewerControls.tsx` | Zoom, auto-rotate, fullscreen — glassmorphism bar |
| `convex/hotspots.ts` | `convex/hotspots.ts` | `listByScene`, `listByTour`, `create`, `update`, `remove` mutations with auth |
| Convex schema | `convex/schema.ts` lines 153–169 | `hotspots` table: type, position, tooltip, icon, content, title, description, imageStorageId, visible |
| Public tour viewer | `src/app/tour/[slug]/page.tsx` | Full viewer page: password gate, scene nav, lead capture, idle auto-rotate, fullscreen |
| Tour editor | `src/app/(dashboard)/tours/[id]/edit/page.tsx` | Hotspot type picker, placement mode, editor sidebar |

**Key decision from Phase 1 (STATE.md):** Popup card uses IIFE JSX pattern for media branching — keep this pattern consistent.

---

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| `@react-three/drei` | installed | `Html` component projecting DOM over canvas | Already used for hotspot markers |
| `framer-motion` | installed | `AnimatePresence`, `motion.div` for panel animations | Already in package.json |
| `zustand` v5 | installed | `create` for viewer state store | Pattern: `import { create } from 'zustand'` |
| `lucide-react` | installed | Icon set for hotspot icons | 24px / 1.5px stroke standard |
| `tailwindcss` v4 | installed | Responsive classes (sm:, md:, lg:) | Config in globals.css via @theme {} |
| `convex` | installed | Schema, queries, mutations | `v.optional()` for backward compat |

### No New Libraries Required
All required libraries are already installed. Do not add new dependencies for this phase.

---

## Architecture Patterns

### Recommended Project Structure (Phase 6 additions)
```
src/
├── components/
│   └── viewer/
│       ├── HotspotMarker.tsx          # Extend: keep marker, delegate panel open to store
│       ├── HotspotInfoPanel.tsx       # NEW: rich panel rendered OUTSIDE canvas
│       ├── HotspotVideoModal.tsx      # NEW: full-screen video modal
│       ├── PanoramaViewer.tsx         # Extend: pass activeHotspot state up
│       └── ViewerControls.tsx         # No changes needed
├── hooks/
│   └── useViewerStore.ts              # NEW or extend: activeHotspotId slice
convex/
├── schema.ts                          # Extend hotspots table with new fields
├── hotspots.ts                        # Extend create/update args to accept new fields
```

### Pattern 1: Panel Lifted Outside Canvas

**What:** The `HotspotMarker` inside R3F `Html` handles click → sets `activeHotspotId` in Zustand. The `HotspotInfoPanel` is a normal React component rendered outside `<Canvas>` in the viewer page, reads from Zustand, and renders the rich panel.

**Why:** R3F `Html` component creates a separate DOM sub-tree projected into the canvas. Popups wider than ~280px, modals, or panels with focus traps inside `Html` cause z-index fights and portal rendering issues. Rendering the rich panel as a normal DOM sibling to the Canvas avoids all these issues. The existing 240px popup card in `Html` can remain for tooltip-level info; rich expanded panels should be DOM-level.

**When to use:** Any panel wider than 300px, any modal, any element requiring focus management (forms, video controls), any element that must slide in from screen edge.

**Example:**
```typescript
// Source: Zustand v5 pattern (zustand.docs.pmnd.rs)
// src/hooks/useViewerStore.ts (extend existing if present, create if not)
import { create } from 'zustand'

interface ViewerState {
  activeHotspotId: string | null
  setActiveHotspot: (id: string | null) => void
  videoModalUrl: string | null
  setVideoModalUrl: (url: string | null) => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  activeHotspotId: null,
  setActiveHotspot: (id) => set({ activeHotspotId: id }),
  videoModalUrl: null,
  setVideoModalUrl: (url) => set({ videoModalUrl: url }),
}))
```

```typescript
// In HotspotMarker.tsx — click opens panel via store, not local state
import { useViewerStore } from '@/hooks/useViewerStore'

// Navigation type: call onClick prop (scene transition)
// Info/media/link types: set activeHotspotId in store
const setActiveHotspot = useViewerStore((s) => s.setActiveHotspot)
// On click: setActiveHotspot(hotspot._id)
```

```typescript
// In viewer page (tour/[slug]/page.tsx or editor) — outside Canvas
import { AnimatePresence, motion } from 'framer-motion'
import { useViewerStore } from '@/hooks/useViewerStore'
import { HotspotInfoPanel } from '@/components/viewer/HotspotInfoPanel'

const activeHotspotId = useViewerStore((s) => s.activeHotspotId)
const activeHotspot = hotspots.find(h => h._id === activeHotspotId) ?? null

return (
  <>
    <PanoramaViewer ... />
    <AnimatePresence>
      {activeHotspot && (
        <HotspotInfoPanel
          key={activeHotspot._id}
          hotspot={activeHotspot}
          onClose={() => useViewerStore.getState().setActiveHotspot(null)}
        />
      )}
    </AnimatePresence>
  </>
)
```

### Pattern 2: Framer Motion Panel Variants

**What:** `HotspotInfoPanel` uses `motion.div` with `initial`, `animate`, `exit` variants for smooth slide-in on desktop and bottom-sheet on mobile.

**Example:**
```typescript
// Source: Framer Motion AnimatePresence docs (motion.dev/docs/react-animate-presence)
const panelVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, x: 40, transition: { duration: 0.18, ease: 'easeIn' } },
}

// Mobile (bottom sheet):
const mobileVariants = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: '100%', transition: { duration: 0.2 } },
}

// Use CSS media query or useMediaQuery hook to switch variant set
```

### Pattern 3: Icon Customization

**What:** The existing `icon` field in the Convex schema stores a string. Treat it as a Lucide icon name string. Map icon name to component at render time.

**Icon name to component map (don't hand-roll a full registry, use a curated subset for real estate):**
```typescript
// Source: lucide.dev — icon names are kebab-case, React components are PascalCase
import {
  Navigation, Info, Play, ExternalLink, Home, Bed, Bath, Car, Wifi,
  Camera, Star, DollarSign, Ruler, Trees, Sun, Building2, Key
} from 'lucide-react'

const ICON_REGISTRY: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  navigation: Navigation,
  info: Info,
  play: Play,
  link: ExternalLink,
  home: Home,
  bed: Bed,
  bath: Bath,
  car: Car,
  wifi: Wifi,
  camera: Camera,
  star: Star,
  price: DollarSign,
  area: Ruler,
  garden: Trees,
  balcony: Sun,
  building: Building2,
  key: Key,
}

// Fallback to type-based icon if iconName not found
```

### Pattern 4: Video Modal (Full Screen)

**What:** For `type === 'media'`, clicking the hotspot opens a full-screen overlay with the video player, not just a 135px iframe in a 240px card.

**When to use:** Video content that benefits from full attention (property walkthrough video, room detail video).

**Implementation:** `HotspotVideoModal` is a `fixed inset-0 z-50` overlay with backdrop blur. Video URL already stored in `content` field. Existing URL detection logic (YouTube/Vimeo/mp4) in `HotspotMarker.tsx` should be extracted to a shared `parseVideoUrl(url)` utility.

```typescript
// Extract from HotspotMarker.tsx into src/lib/videoUtils.ts
export function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | 'unknown'; embedSrc: string } {
  const isYoutube = /youtube\.com|youtu\.be/.test(url)
  const isVimeo = /vimeo\.com/.test(url)
  const isDirect = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
  // ... build embed src
}
```

### Pattern 5: Convex Schema Extension (Backward Compatible)

**What:** Add new optional fields to `hotspots` table using `v.optional()`. Existing documents without these fields remain valid — Convex treats missing optional fields as `undefined`.

**Schema additions:**
```typescript
// convex/schema.ts — hotspots table additions (all v.optional for compat)
hotspots: defineTable({
  // ... existing fields unchanged ...
  // NEW fields for Phase 6:
  iconName: v.optional(v.string()),         // lucide icon name override (e.g. 'bed', 'bath')
  panelLayout: v.optional(               // rich panel layout variant
    v.union(v.literal('compact'), v.literal('rich'), v.literal('video'))
  ),
  videoUrl: v.optional(v.string()),         // explicit video URL (separate from content)
  ctaLabel: v.optional(v.string()),         // call-to-action button label
  ctaUrl: v.optional(v.string()),           // call-to-action button URL
  accentColor: v.optional(v.string()),      // per-hotspot color override (#hex)
})
```

**Mutation updates:** Add same optional fields to `create` and `update` mutation args in `convex/hotspots.ts`.

### Pattern 6: Adaptive Screen Layout

**What:** The viewer already uses `fixed inset-0` at full screen. Adaptive layout means:
1. Hotspot info panel: right-side drawer on desktop (≥768px), bottom sheet on mobile (<768px)
2. Scene navigator thumbnails: scroll horizontally, shrink on mobile
3. Viewer controls bar: move closer to bottom on mobile, avoid overlapping thumb-reach zones
4. Lead capture panel: full-width slide-in on mobile instead of 280px fixed

**How:** Use Tailwind responsive prefixes (`sm:`, `md:`) on the viewer page wrapper divs. The `PanoramaViewer` itself is already `width: 100%, height: 100%` so it fills its container correctly on all sizes. The `touchAction: 'none'` on the canvas wrapper already prevents scroll interference.

**Mobile-specific considerations:**
- Bottom sheet height: `max-h-[70vh]` with overflow scroll for long info panels
- Safe area insets: `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator
- Touch targets: minimum 44x44px for all hotspot buttons (existing 36px buttons need +4px padding at minimum or size increase to 44px on mobile)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video URL parsing | Custom regex parser | Extract existing regex from `HotspotMarker.tsx` into `lib/videoUtils.ts` | Logic already written and tested; just refactor |
| Icon registry | Dynamic import or complex registry | Static import map of ~15-20 real-estate-relevant icons | Only ~15 icon types needed; tree-shaking handles bundle size |
| Panel animation | CSS keyframe animations | Framer Motion `AnimatePresence` + `motion.div` | Already installed; handles exit animations which CSS cannot do cleanly on React unmount |
| State management | React Context or local useState chains | Zustand store with `activeHotspotId` | Already installed v5; avoids prop drilling through Canvas component tree |
| Mobile detection | `navigator.userAgent` parsing | CSS media queries + Tailwind responsive prefixes | Server-safe, no hydration mismatch |
| Video player | Custom HTML5 player | Native `<video controls>` or iframe embed | Sufficient for real estate use case; custom players are maintenance burden |

**Key insight:** The existing popup card in `HotspotMarker.tsx` is 200 lines of working, tested code. Do not rewrite it — extend it. Move the "open rich panel" responsibility to Zustand and keep the small tooltip-level popup in the Html component for quick info glances.

---

## Common Pitfalls

### Pitfall 1: Z-Index Fights Between Html Component and DOM Panels

**What goes wrong:** `@react-three/drei`'s `Html` component creates a DOM sub-tree inside the canvas container with a specific z-index range (`zIndexRange` prop). DOM elements outside the canvas rendered with high z-index may still appear behind or inconsistently above the Html-projected content depending on stacking contexts.

**Why it happens:** The R3F canvas uses a CSS transform stacking context. HTML elements positioned relative to the canvas vs. relative to the viewport behave differently.

**How to avoid:** Render the info panel outside the Canvas entirely (at the viewer page level), not inside an `Html` component. Use `position: fixed` on the panel container to escape all stacking contexts.

**Warning signs:** Panel renders behind the 3D canvas, or flickers when camera moves.

### Pitfall 2: Video Autoplay on Mobile Blocked

**What goes wrong:** Video inside a popup that auto-plays on open is blocked by browser policy on iOS and Android.

**Why it happens:** All major mobile browsers block autoplay with sound. iOS Safari additionally blocks autoplay entirely without user gesture, even muted.

**How to avoid:** Never auto-play video. Set `autoPlay={false}` on `<video>` elements. For the `<iframe>` embed, do not append `?autoplay=1` to the embed URL. The user must explicitly press play.

**Warning signs:** Video shows spinner forever or shows black screen on mobile.

### Pitfall 3: AnimatePresence exit Animation Not Firing

**What goes wrong:** Panel disappears instantly without exit animation.

**Why it happens:** `AnimatePresence` only animates exit when the child conditionally renders via `{condition && <Component />}`. If the component stays mounted but changes content, exit does not fire. Also, each child needs a stable `key` prop.

**How to avoid:** Wrap the conditional render in `AnimatePresence`. Give the `motion.div` a `key` tied to the hotspot ID. When closing (setting `activeHotspotId` to null), `AnimatePresence` will keep the component in DOM until exit animation completes before unmounting.

```typescript
// Source: motion.dev/docs/react-animate-presence
<AnimatePresence mode="wait">
  {activeHotspot && (
    <motion.div key={activeHotspot._id} variants={panelVariants} initial="initial" animate="animate" exit="exit">
      ...
    </motion.div>
  )}
</AnimatePresence>
```

### Pitfall 4: Convex Schema Migration Breaking Existing Hotspots

**What goes wrong:** Adding new required fields to the hotspots table schema without `v.optional()` causes Convex to reject existing documents as invalid on push.

**Why it happens:** Convex validates all documents against schema on `convex dev` and `convex deploy`. Existing documents without new required fields fail validation.

**How to avoid:** All new hotspot fields MUST use `v.optional()`. Never add required fields to an existing table that has live data.

**Warning signs:** `convex dev` fails with schema validation error after schema change.

### Pitfall 5: HotspotMarker onClick Conflict (Navigation vs. Panel)

**What goes wrong:** Clicking a navigation hotspot opens an info panel instead of transitioning scenes, or both happen simultaneously.

**Why it happens:** If panel-open logic is added without branching on hotspot type, all types trigger it.

**How to avoid:** Maintain explicit type branching: `navigation` type calls the `onClick` prop (scene transition). All other types set `activeHotspotId` in Zustand. Never merge these paths.

### Pitfall 6: Html Component Performance with Many Hotspots

**What goes wrong:** With 10+ hotspots per scene, the R3F `Html` component creates 10+ DOM sub-trees inside the canvas, each running position calculations every frame.

**Why it happens:** `Html` from drei computes world-to-screen projection on every R3F render frame for each instance.

**How to avoid:** Only render hotspots for the active scene (already done — `activeHotspots = activeScene?.hotspots`). Limit to reasonable counts (10 hotspots per scene max). For hotspots that are not visible (`visible === false`), return null early (already done in Phase 1).

### Pitfall 7: Mobile Touch Target Size

**What goes wrong:** Users on mobile cannot reliably tap small hotspot buttons (existing 36px circles).

**Why it happens:** WCAG 2.5.5 and Apple HIG both recommend 44px minimum touch target.

**How to avoid:** Increase hotspot button to 44px on mobile, or add invisible padding around the 36px button using `padding: 4px` on the wrapping div.

---

## Code Examples

### Info Panel Component Structure
```typescript
// src/components/viewer/HotspotInfoPanel.tsx
// Source: Framer Motion AnimatePresence (motion.dev/docs/react-animate-presence)
// Renders OUTSIDE R3F Canvas — fixed positioned DOM overlay

'use client'
import { motion } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'

interface HotspotData {
  _id: string
  type: 'info' | 'media' | 'link'
  title?: string
  description?: string
  content?: string
  imageUrl?: string | null
  iconName?: string
  panelLayout?: 'compact' | 'rich' | 'video'
  ctaLabel?: string
  ctaUrl?: string
}

interface Props {
  hotspot: HotspotData
  onClose: () => void
}

export function HotspotInfoPanel({ hotspot, onClose }: Props) {
  return (
    // Desktop: right-side panel. Mobile: bottom sheet (CSS responsive)
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        width: 320,
        backgroundColor: '#12100E',
        borderLeft: '1px solid rgba(212,160,23,0.15)',
        zIndex: 50,
        overflowY: 'auto',
        fontFamily: 'var(--font-dmsans)',
        padding: '24px',
      }}
      // Mobile bottom-sheet adjustments via className with Tailwind responsive
      className="w-full max-w-xs sm:max-w-[320px] sm:h-full h-auto max-h-[75vh] sm:max-h-full bottom-0 sm:bottom-auto sm:right-0 sm:top-0"
    >
      {/* content */}
    </motion.div>
  )
}
```

### Video Modal Component Structure
```typescript
// src/components/viewer/HotspotVideoModal.tsx
// Full-screen overlay — fixed inset-0 z-50

'use client'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { parseVideoUrl } from '@/lib/videoUtils'

export function HotspotVideoModal({ url, title, onClose }: { url: string; title?: string; onClose: () => void }) {
  const { type, embedSrc } = parseVideoUrl(url)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(10,9,8,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ width: '90vw', maxWidth: 900, aspectRatio: '16/9', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        {type === 'direct' ? (
          <video src={embedSrc} controls style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        ) : (
          <iframe src={embedSrc} style={{ width: '100%', height: '100%', borderRadius: 12, border: 'none' }}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen title={title || 'Video'} />
        )}
      </div>
    </motion.div>
  )
}
```

### Convex Schema Extension (hotspots table)
```typescript
// convex/schema.ts — hotspots table — add v.optional() fields
hotspots: defineTable({
  sceneId: v.id('scenes'),
  targetSceneId: v.optional(v.id('scenes')),
  type: v.union(v.literal('navigation'), v.literal('info'), v.literal('media'), v.literal('link')),
  position: v.object({ x: v.number(), y: v.number(), z: v.number() }),
  tooltip: v.optional(v.string()),
  icon: v.optional(v.string()),          // existing (kept)
  content: v.optional(v.string()),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  imageStorageId: v.optional(v.id('_storage')),
  visible: v.optional(v.boolean()),
  // Phase 6 additions — all optional for backward compatibility:
  iconName: v.optional(v.string()),      // lucide icon name key (e.g. 'bed', 'bath', 'key')
  panelLayout: v.optional(v.union(v.literal('compact'), v.literal('rich'), v.literal('video'))),
  videoUrl: v.optional(v.string()),      // dedicated video field (supplements content)
  ctaLabel: v.optional(v.string()),
  ctaUrl: v.optional(v.string()),
  accentColor: v.optional(v.string()),
}).index('by_sceneId', ['sceneId']),
```

### Zustand Viewer Store
```typescript
// src/hooks/useViewerStore.ts
// Source: Zustand v5 docs (zustand.docs.pmnd.rs)
import { create } from 'zustand'

interface ViewerStore {
  // Hotspot panel
  activeHotspotId: string | null
  setActiveHotspot: (id: string | null) => void
  // Video modal
  videoModalUrl: string | null
  videoModalTitle: string | undefined
  openVideoModal: (url: string, title?: string) => void
  closeVideoModal: () => void
}

export const useViewerStore = create<ViewerStore>((set) => ({
  activeHotspotId: null,
  setActiveHotspot: (id) => set({ activeHotspotId: id }),
  videoModalUrl: null,
  videoModalTitle: undefined,
  openVideoModal: (url, title) => set({ videoModalUrl: url, videoModalTitle: title }),
  closeVideoModal: () => set({ videoModalUrl: null, videoModalTitle: undefined }),
}))
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Panel inside Html (drei) | Panel outside Canvas in normal DOM | Standard by 2024 | Eliminates z-index fights, enables focus management |
| useState for open/close panels | Zustand store `activeHotspotId` | v5 released 2024 | Works across Canvas boundary without prop drilling |
| Autoplay video on hotspot open | Manual play only | Browser policy 2021+ | Avoids iOS/Android blocked autoplay |
| Fixed-width popups (240px) | Responsive panel (width adapts) | CSS media query | Bottom sheet on mobile, side drawer on desktop |
| `visible` boolean only | `visible` + `panelLayout` + `iconName` | Phase 6 | Richer per-hotspot customization without type-level overrides |

**Deprecated/outdated:**
- Do not use `Html` component `portal` prop to fight z-index — lift panel fully outside Canvas
- Do not use `?autoplay=1` on YouTube/Vimeo embed src — mobile will silently block
- Do not store icon as SVG string in database — store icon name key, resolve to component at render

---

## Open Questions

1. **Should the existing 240px inline popup card in HotspotMarker remain?**
   - What we know: It works for compact info. The rich panel is additive.
   - What's unclear: Whether two interaction patterns (tooltip popup + rich panel) will confuse users.
   - Recommendation: Keep compact popup for `type === 'info'` with short description only. Use rich panel when `panelLayout === 'rich'` or when content + image both present. Navigation type keeps its existing directional arrow behavior unchanged.

2. **Icon customization in the editor UI**
   - What we know: Convex stores `iconName` as string. The editor needs a picker UI.
   - What's unclear: Whether a dropdown with icon previews or a grid picker is better UX.
   - Recommendation: A small grid picker with the ~15 real-estate icons shown as icons + labels. Keep it simple — this is a nice-to-have, not a core feature.

3. **Per-hotspot accent color (`accentColor` field)**
   - What we know: Current colors are type-based (Gold/Teal/Coral/Purple). Per-hotspot override adds flexibility.
   - What's unclear: Whether agents will actually use this; design consistency risk.
   - Recommendation: Include schema field but make it optional in editor. Only apply if explicitly set; fall back to type color.

4. **Mobile bottom sheet vs. full-screen panel**
   - What we know: `max-h-[70vh]` bottom sheet pattern is standard for mobile. Doesn't work well for video.
   - What's unclear: Whether video should open full-screen modal on mobile regardless of panel layout.
   - Recommendation: Video always opens full-screen modal (`fixed inset-0 z-60`) on all screen sizes. Info/link content uses the responsive drawer (side on desktop, bottom sheet on mobile).

---

## Implementation Scope

Phase 6 adds these specific deliverables:

1. **Convex schema + mutations** — extend hotspots table with `iconName`, `panelLayout`, `videoUrl`, `ctaLabel`, `ctaUrl`, `accentColor` (all optional)
2. **`lib/videoUtils.ts`** — extract and centralize video URL parsing from `HotspotMarker.tsx`
3. **`hooks/useViewerStore.ts`** — Zustand store with `activeHotspotId` and `videoModalUrl` slices
4. **`HotspotMarker.tsx` refactor** — keep marker button and tooltip in Html; on click for non-navigation types, call `setActiveHotspot` instead of local `setIsPopupOpen`; support `iconName` field for custom icon
5. **`HotspotInfoPanel.tsx`** — new component, outside Canvas, responsive side-drawer/bottom-sheet with Framer Motion, handles info/link/media panel layouts
6. **`HotspotVideoModal.tsx`** — new full-screen video modal component
7. **Public tour viewer page** — wire `AnimatePresence` + panel/modal components
8. **Tour editor hotspot form** — add `iconName` picker, `panelLayout` select, `videoUrl` field, `ctaLabel`/`ctaUrl` fields, `accentColor` input
9. **Adaptive layout** — add Tailwind responsive classes to viewer page wrapper; safe-area-inset padding; 44px touch targets on mobile

---

## Sources

### Primary (HIGH confidence)
- `src/components/viewer/HotspotMarker.tsx` — full existing implementation read
- `src/components/viewer/PanoramaViewer.tsx` — full existing implementation read
- `convex/schema.ts` — full schema read; hotspots table lines 153–169
- `convex/hotspots.ts` — full mutations read
- `src/app/tour/[slug]/page.tsx` — full public viewer read
- [drei Html docs](https://drei.docs.pmnd.rs/misc/html) — props verified: `zIndexRange`, `occlude`, `portal`
- [Framer Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) — `AnimatePresence`, `mode="wait"`, exit animation requirements

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase 1 decisions: IIFE JSX pattern, atan2 bearing formula, Gold pulse ring design
- `.planning/REQUIREMENTS.md` — TOUR-03 requirement (already complete): hotspot customization scope confirmed
- [Zustand v5 selectors discussion](https://github.com/pmndrs/zustand/discussions/2867) — selector patterns verified

### Tertiary (LOW confidence — needs validation)
- WebSearch findings on video autoplay browser restrictions: consistent across multiple sources, treat as HIGH but verify on iOS Safari before shipping
- WebSearch findings on mobile touch target 44px: WCAG 2.5.5, Apple HIG — should be treated as standard practice

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; verified via source code
- Architecture patterns: HIGH — Html-outside-canvas pattern verified via drei docs and R3F discussions; Zustand store pattern from existing codebase (`import { create } from 'zustand'` already confirmed)
- Pitfalls: HIGH for schema/animation/z-index (all verified by source); MEDIUM for video autoplay (browser policy, consistent cross-source)
- Schema changes: HIGH — v.optional() backward compatibility is a Convex fundamental

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (stable ecosystem — next.js, drei, framer-motion, convex change slowly)
