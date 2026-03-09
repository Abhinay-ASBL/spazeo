---
phase: 02-3d-capture-pipeline-and-splat-viewer
plan: 02
subsystem: viewer
tags: [spark.js, gaussian-splatting, r3f, wasm, turbopack, three.js]

# Dependency graph
requires:
  - phase: 02-3d-capture-pipeline-and-splat-viewer
    provides: "reconstructionJobs schema and CRUD (plan 01)"
provides:
  - "GaussianSplatViewer component shell for rendering .spz files"
  - "SplatScene R3F component with spark.js extend() registration"
  - "Turbopack compatibility pattern for WASM/Worker libraries"
  - "Patched spark.module.js served from public/lib/"
affects: [02-04-full-viewer, 02-06-navigation-modes]

# Tech tracking
tech-stack:
  added: ["@sparkjsdev/spark"]
  patterns: ["public/lib CDN-style loader for Turbopack-incompatible WASM modules", "globalThis.__THREE bridge for tree-shaken Three.js builds", "webpackIgnore dynamic import for Turbopack bypass"]

key-files:
  created:
    - "src/components/viewer/SplatScene.tsx"
    - "src/components/viewer/GaussianSplatViewer.tsx"
    - "src/app/tour/[slug]/splat-test/page.tsx"
    - "public/lib/spark.module.js"
  modified:
    - "next.config.ts"
    - "package.json"

key-decisions:
  - "Turbopack cannot bundle spark.js directly due to inline Worker + WASM patterns — serve patched spark.module.js from public/lib/"
  - "globalThis.__THREE bridge connects spark.js to R3F's tree-shaken Three.js instance"
  - "CSP requires data: in connect-src and wasm-unsafe-eval in script-src for WASM execution"
  - "Demo URL changed from sparkjsdev.github.io (404) to sparkjs.dev/assets/splats/butterfly.spz"
  - "Dynamic import with webpackIgnore comment bypasses Turbopack module analysis"

patterns-established:
  - "Public lib pattern: WASM/Worker libraries incompatible with Turbopack are patched and served from public/lib/ with dynamic import"
  - "globalThis bridge pattern: when bundler tree-shakes Three.js, expose R3F's instance via globalThis for external libs"

requirements-completed: [VIEW3D-01]

# Metrics
duration: 2m
completed: 2026-03-09
---

# Phase 02 Plan 02: Spark.js Compatibility Spike Summary

**Validated spark.js + R3F + Next.js Turbopack compatibility via patched public/lib loader with globalThis.__THREE bridge for Gaussian Splat rendering**

## Performance

- **Duration:** 2m (continuation from checkpoint approval)
- **Started:** 2026-03-09T13:04:15Z
- **Completed:** 2026-03-09T13:04:30Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- Confirmed spark.js renders Gaussian Splats (.spz) inside R3F Canvas in Next.js 16 Turbopack dev environment
- Discovered and resolved Turbopack bundling incompatibility with spark.js inline Worker/WASM patterns
- Established reusable pattern for serving WASM-heavy libraries from public/ directory
- Human-verified butterfly splat rendering with orbit controls at /tour/test/splat-test

## Task Commits

Each task was committed atomically:

1. **Task 1: Install spark.js, create SplatScene and GaussianSplatViewer, build test page** - `a8629ec` (feat)
2. **Task 2: Verify spark.js renders correctly in browser** - human-verify checkpoint, APPROVED

## Files Created/Modified
- `src/components/viewer/SplatScene.tsx` - R3F scene component with spark.js extend() registration for SplatMesh and SparkRenderer
- `src/components/viewer/GaussianSplatViewer.tsx` - Dynamic-imported R3F Canvas wrapper, SSR-safe, accepts splatUrl prop
- `src/app/tour/[slug]/splat-test/page.tsx` - Test page loading butterfly.spz demo splat for compatibility validation
- `public/lib/spark.module.js` - Patched spark.js module served as static asset to bypass Turbopack bundling
- `next.config.ts` - Added CSP headers for WASM execution (data: connect-src, wasm-unsafe-eval script-src)
- `package.json` - Added @sparkjsdev/spark dependency

## Decisions Made
- **Turbopack bypass via public/lib/**: spark.js uses inline Worker construction and WASM loading patterns that Turbopack cannot bundle. The solution is to serve a patched copy from public/lib/ and import it dynamically with a webpackIgnore comment. This is the established pattern for future WASM-heavy libraries.
- **globalThis.__THREE bridge**: R3F tree-shakes Three.js, but spark.js expects the full THREE namespace. The bridge exposes R3F's Three.js instance on globalThis so spark.js can access it without a duplicate bundle.
- **CSP headers for WASM**: spark.js requires `data:` in connect-src (for WASM blob URLs) and `wasm-unsafe-eval` in script-src (for WASM compilation). These are added to next.config.ts headers.
- **Demo URL correction**: The plan's suggested URL (sparkjsdev.github.io) returned 404. The working demo URL is sparkjs.dev/assets/splats/butterfly.spz.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Turbopack cannot bundle spark.js WASM/Worker patterns**
- **Found during:** Task 1
- **Issue:** Direct npm import of @sparkjsdev/spark fails with Turbopack due to inline Worker construction and WASM loading
- **Fix:** Patched spark.module.js served from public/lib/, loaded via dynamic import with webpackIgnore comment, globalThis.__THREE bridge connects to R3F Three.js
- **Files modified:** public/lib/spark.module.js, src/components/viewer/SplatScene.tsx, next.config.ts
- **Verification:** Butterfly splat renders correctly at /tour/test/splat-test
- **Committed in:** a8629ec

**2. [Rule 1 - Bug] Demo SPZ URL returned 404**
- **Found during:** Task 1
- **Issue:** Plan's suggested URL (sparkjsdev.github.io/spark/examples/guitar/bonsai.spz) returned 404
- **Fix:** Changed to working URL: sparkjs.dev/assets/splats/butterfly.spz
- **Files modified:** src/app/tour/[slug]/splat-test/page.tsx
- **Verification:** Butterfly splat loads and renders correctly
- **Committed in:** a8629ec

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for the spike to succeed. The Turbopack bypass pattern is the key finding of this spike and is documented for future plans.

## Issues Encountered
- Turbopack's module analysis cannot handle spark.js's inline Worker/WASM patterns. This was the primary risk identified in the research phase (Open Question #1). The public/lib pattern resolves it.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GaussianSplatViewer component shell is ready for Plan 04 (full viewer) and Plan 06 (navigation modes)
- The Turbopack compatibility pattern is established and documented
- spark.js confirmed working with R3F in Next.js 16 — no need to pivot to alternative libraries

## Self-Check: PASSED

All created files verified on disk. Task 1 commit a8629ec verified in git log.

---
*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Completed: 2026-03-09*
