---
phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout
plan: 03
subsystem: ui
tags: [react, three-js, r3f, zustand, lucide-react, hotspot, panorama-viewer]

# Dependency graph
requires:
  - phase: 06-02
    provides: useViewerStore with setActiveHotspot and video modal state
provides:
  - Refactored HotspotMarker that renders button/tooltip only — no inline popup card
  - ICON_REGISTRY with 17 Lucide icon entries for custom icon rendering via iconName field
  - accentColor override on marker button background
  - Zustand setActiveHotspot delegation for non-navigation hotspot clicks
affects:
  - 06-04 (HotspotInfoPanel reads activeHotspotId from store — set by this component)
  - 06-05 (VideoModal reads videoModalUrl from store)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ICON_REGISTRY pattern: Record<string, ComponentType> lookup for custom Lucide icon selection by name string"
    - "Zustand delegation: non-navigation hotspot clicks set store state; panel component reads it outside Canvas"
    - "accentColor override: hotspot.accentColor ?? config.color — per-instance color without type system changes"

key-files:
  created: []
  modified:
    - src/components/viewer/HotspotMarker.tsx

key-decisions:
  - "HotspotMarker delegates panel-open to Zustand rather than rendering popup inline — eliminates Canvas z-index boundary constraints"
  - "ICON_REGISTRY uses string keys matching iconName field — allows any future icon without component changes"
  - "Navigation hotspot branch is completely isolated — calls onClick prop, never touches store"
  - "accentColor applied to both button background and ping ring (markerColor pattern)"

patterns-established:
  - "Store delegation: components inside R3F Canvas set Zustand state; panels outside Canvas read it"

requirements-completed:
  - HS6-03

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 06 Plan 03: HotspotMarker Refactor Summary

**Inline 240px popup card removed from HotspotMarker; panel-open delegated to Zustand store; ICON_REGISTRY added for 17 custom Lucide icons; accentColor per-marker override applied**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T08:59:09Z
- **Completed:** 2026-03-09T09:00:46Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed the entire 240px inline popup card block from HotspotMarker (isPopupOpen state, close button, title/description/media/link JSX all gone)
- Added ICON_REGISTRY constant with 17 Lucide icon entries (navigation, info, play, link, home, bed, bath, car, wifi, camera, star, price, area, garden, balcony, building, key)
- Extended HotspotData interface with Phase 6 optional fields: iconName, panelLayout, videoUrl, ctaLabel, ctaUrl, accentColor
- Non-navigation hotspot clicks now call setActiveHotspot(hotspot._id) via useViewerStore — panel component outside Canvas can respond
- Navigation hotspot remains exactly unchanged — still calls onClick prop for scene transitions

## Task Commits

1. **Task 1: Refactor HotspotMarker — ICON_REGISTRY, store delegation, remove popup card** - `507fcd0` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/components/viewer/HotspotMarker.tsx` - Refactored: popup card removed, ICON_REGISTRY added, Zustand delegation, accentColor override, Phase 6 interface fields

## Decisions Made
- HotspotMarker delegates panel-open to Zustand rather than rendering popup inline — eliminates Canvas z-index boundary constraints that limited the popup to ~240px
- ICON_REGISTRY uses string keys matching iconName field — allows any future icon without component changes
- Navigation hotspot branch is completely isolated — calls onClick prop, never touches store
- accentColor applied to both button background and ping ring via markerColor computed variable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HotspotMarker is now a focused marker-button component ready for Plan 04 (HotspotInfoPanel)
- activeHotspotId in useViewerStore is set when non-navigation hotspots are clicked — Plan 04 panel reads this to know which hotspot to display
- ICON_REGISTRY and Phase 6 interface fields are in place — Plan 04 panel can use iconName, panelLayout, videoUrl, ctaLabel, ctaUrl, accentColor data

---
*Phase: 06-hotspot-customization-options-icons-info-panels-video-support-and-adaptive-screen-layout*
*Completed: 2026-03-09*
