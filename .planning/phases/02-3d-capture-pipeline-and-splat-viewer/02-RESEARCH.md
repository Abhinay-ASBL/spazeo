# Phase 2: 3D Capture Pipeline and Splat Viewer - Research

**Researched:** 2026-03-09
**Domain:** GPU-based Gaussian Splatting reconstruction, in-browser splat rendering, 3D navigation
**Confidence:** MEDIUM

## Summary

This phase requires three distinct technical subsystems: (1) a file upload and GPU job queue for video/photo-to-Gaussian-Splat reconstruction via RunPod serverless, (2) an in-browser splat renderer using spark.js inside the existing R3F canvas, and (3) three navigation modes (dollhouse, free-roam, hotspot) with smooth camera transitions.

The reconstruction pipeline follows: Upload media to Convex storage -> Convex action submits job to RunPod serverless endpoint with webhook callback -> RunPod Docker worker runs COLMAP + nerfstudio/gsplat splatfacto -> exports PLY -> converts to SPZ via 3dgsconverter -> uploads SPZ to Convex storage -> webhook notifies Convex HTTP action -> job marked complete. The viewer uses `@sparkjsdev/spark` which has an official R3F integration pattern using `extend()`. The project uses Next.js 16 with Turbopack, which has known WASM/worker compatibility issues with spark.js that require specific workarounds.

**Primary recommendation:** Build the reconstruction pipeline first (schema + upload + RunPod integration), then the splat viewer component, then navigation modes. Use `dynamic(() => import(...), { ssr: false })` for the entire GaussianSplatViewer to avoid SSR/WASM issues. Keep the RunPod worker as a separate Docker image repo.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Upload lives inside existing tour editor at `/tours/[id]/edit` -- a new "3D Capture" tab/section alongside scenes
- Two separate tabs: "Video Walkthrough" (single MP4/MOV, up to 500MB) and "Multi-Angle Photos" (10-30 JPG/PNG files)
- Validate + preview before triggering: show video thumbnail/duration or photo grid preview after upload
- User clicks explicit "Start Reconstruction" button -- no auto-trigger
- Inline collapsible tips panel next to upload zone (expanded by default on first visit)
- Live multi-stage progress: Uploading -> Queued -> Extracting Frames -> Reconstructing -> Compressing -> Complete
- Progress via Convex reactive query on reconstruction job record
- User can leave and return -- progress persists on tour card
- In-app toast + notification bell on completion (reuse notifications table)
- Cancel button with confirmation dialog
- Clear error messages with "Retry" and "Re-upload" buttons; failed jobs excluded from limits
- Quality review step: 3D preview in editor, "Accept" or "Re-capture" only (no in-browser editing)
- Show metadata: .spz file size, splat count, processing time, input type
- Plan limits: Free 1/mo, Starter 5/mo, Pro 20/mo, Enterprise unlimited
- Dollhouse: orthographic overhead, orbit + zoom, click to drop into first-person
- Free-roam: desktop click-to-move + mouse look; mobile virtual joystick + drag look; eye height ~1.6m; smooth glide
- Hotspots: floating Gold (#D4A017) pulsing ring markers at doorway/transition points in 3D space
- Animated 1-second camera fly between all mode transitions
- Same `/tour/[slug]` route -- auto-switch based on tour data (splat vs panorama)
- Bottom-center floating pill toolbar with 3 mode icons
- Top-right fullscreen + zoom; top-left tour branding
- Mobile: canvas fills viewport, semi-transparent overlays, virtual joystick in free-roam only, auto-hide after 3s, 44px touch targets, safe area insets

### Claude's Discretion
- Virtual joystick component library or implementation
- RunPod worker configuration and nerfstudio/gsplat pipeline parameters
- SPZ compression tooling choice
- Convex cron polling interval for job status
- HTTP callback authentication pattern for RunPod -> Convex
- Camera animation easing curves and exact transition durations
- spark.js SplatMesh configuration and loading strategy
- Exact reconstruction stage names if pipeline stages differ

### Deferred Ideas (OUT OF SCOPE)
- Splat cropping/trimming tools in browser
- AI quality scoring of reconstruction output
- Email notification on reconstruction completion
- Example capture video tutorial content
- Depth estimation fallback (Depth Anything V2) for single panoramas
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAP-01 | Upload video walkthrough (MP4/MOV, up to 500MB) to trigger 3D reconstruction | Convex storage supports arbitrarily large files via 3-step upload pattern; existing UploadZone component can be extended with video tab |
| CAP-02 | Upload 10-30 multi-angle JPG/PNG photos as alternative to video | Same 3-step upload, batch uploads with progress tracking; photo grid preview with counter |
| CAP-03 | RunPod + nerfstudio/gsplat async reconstruction with real-time progress | RunPod serverless /run endpoint with webhook callback; Convex reactive query on reconstructionJobs table; cron for stale job cleanup |
| CAP-04 | Completed reconstruction stored as .spz in Convex storage linked to tour | SPZ format (Niantic, ~10x smaller than PLY); 3dgsconverter for PLY->SPZ; splatStorageId field on tours table |
| VIEW3D-01 | Gaussian Splat renders in R3F canvas using spark.js | @sparkjsdev/spark with R3F extend() pattern; SplatMesh + SparkRenderer components; dynamic import with ssr:false |
| VIEW3D-02 | Dollhouse/overhead orthographic view | OrthographicCamera from drei; smooth animated transition from PerspectiveCamera |
| VIEW3D-03 | Free-roam first-person (click-to-move desktop, virtual joystick mobile) | Raycasting for click-to-move; nipplejs for virtual joystick; camera at 1.6m height; smooth lerp movement |
| VIEW3D-04 | Hotspot markers in 3D space for room-to-room navigation | Reuse hotspot data model; 3D Billboard markers with Gold pulse animation; smooth fly-to camera transition |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sparkjsdev/spark | 0.1.10+ | Gaussian Splat rendering in Three.js/R3F | Official Three.js splat renderer from World Labs; supports SPZ, PLY, SOGS, splat, ksplat formats; SplatMesh extends Object3D |
| @react-three/fiber | ^9.5.0 (existing) | React renderer for Three.js | Already installed; spark.js integrates via extend() |
| @react-three/drei | ^10.7.7 (existing) | R3F helpers (OrthographicCamera, CameraControls, Billboard) | Already installed; provides camera and interaction primitives |
| three | ^0.183.1 (existing) | 3D engine | Already installed; spark.js requires Three.js |
| nipplejs | ^0.10.2 | Virtual joystick for mobile free-roam | De facto standard (1M+ weekly downloads); lightweight; touch-optimized; dynamic visibility |
| convex | ^1.32.0 (existing) | Backend (reactive queries, file storage, HTTP actions, crons) | Already the entire backend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| 3dgsconverter | latest | PLY to SPZ conversion (Python, on RunPod worker) | Inside RunPod Docker worker post-training |
| runpod (Python SDK) | latest | RunPod serverless worker handler | Inside RunPod Docker worker |
| nerfstudio | latest | COLMAP + splatfacto training pipeline | Inside RunPod Docker worker |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sparkjsdev/spark | GaussianSplats3D (mkkellogg) | GaussianSplats3D is mature but spark.js has official R3F example, better SPZ support, and active development from World Labs |
| nipplejs | Custom touch handler | nipplejs handles edge cases (dead zones, thresholds, multi-touch) that custom code would need to replicate |
| 3dgsconverter | Niantic spz C++ library | 3dgsconverter is Python-native, simpler to integrate in nerfstudio pipeline, supports PLY->SPZ directly |

**Installation (frontend):**
```bash
npm install @sparkjsdev/spark nipplejs
npm install -D @types/nipplejs  # if types exist
```

**Installation (RunPod worker - in Dockerfile):**
```bash
pip install runpod nerfstudio 3dgsconverter
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── viewer/
│   │   ├── PanoramaViewer.tsx         # Existing 360 viewer
│   │   ├── GaussianSplatViewer.tsx    # NEW: R3F canvas with spark.js
│   │   ├── SplatScene.tsx             # NEW: SplatMesh + SparkRenderer + lights
│   │   ├── NavigationModes.tsx        # NEW: Dollhouse/FreeRoam/Hotspot camera logic
│   │   ├── ModeSwitcher.tsx           # NEW: Bottom pill toolbar UI
│   │   ├── VirtualJoystick.tsx        # NEW: nipplejs wrapper for mobile
│   │   ├── SplatHotspot3D.tsx         # NEW: 3D hotspot marker (Billboard)
│   │   ├── ViewerControls.tsx         # Existing (reuse for top-right)
│   │   └── HotspotMarker.tsx          # Existing 2D markers
│   ├── tour/
│   │   ├── CaptureUpload.tsx          # NEW: 3D Capture tab with video/photo upload
│   │   ├── ReconstructionProgress.tsx # NEW: Multi-stage progress indicator
│   │   ├── SplatPreview.tsx           # NEW: Quality review 3D preview
│   │   └── UploadZone.tsx             # Existing (adapt for video)
│   └── ...
├── hooks/
│   ├── useViewerStore.ts              # Extend with 3D viewer state
│   ├── useSplatViewerStore.ts         # NEW: 3D-specific state (navMode, camera position)
│   └── ...
convex/
├── reconstructionJobs.ts              # NEW: Job lifecycle CRUD
├── tours.ts                           # EXTEND: splatStorageId field
├── schema.ts                          # EXTEND: reconstructionJobs table + tours fields
├── http.ts                            # EXTEND: /gpu-callback endpoint
├── crons.ts                           # EXTEND: stale job polling
└── ...
```

### Pattern 1: spark.js R3F Integration via extend()
**What:** Register spark.js classes as JSX-compatible R3F components
**When to use:** Always when using spark.js in R3F
**Example:**
```typescript
// Source: https://github.com/sparkjsdev/spark-react-r3f
import { extend } from "@react-three/fiber";
import { SplatMesh as SparkSplatMesh, SparkRenderer as SparkSparkRenderer } from "@sparkjsdev/spark";

// Register as JSX elements
extend({ SparkSplatMesh, SparkSparkRenderer });

// Then use in R3F Canvas:
// <sparkSplatMesh args={[{ url: splatUrl }]} />
// <sparkSparkRenderer />
```

### Pattern 2: Reconstruction Job Queue (Fire-and-Forget + Webhook + Cron)
**What:** Three-layer reliability for long-running GPU jobs
**When to use:** All reconstruction jobs
**Example:**
```typescript
// 1. Convex Action submits to RunPod with webhook
const response = await fetch(`https://api.runpod.ai/v2/${ENDPOINT_ID}/run`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: { videoStorageUrl, outputFormat: 'spz' },
    webhook: `${CONVEX_SITE_URL}/gpu-callback?secret=${WEBHOOK_SECRET}`,
  }),
});
const { id: runpodJobId } = await response.json();
// 2. Store runpodJobId in reconstructionJobs record
// 3. Webhook POST to /gpu-callback updates job on completion
// 4. Cron polls RunPod /status for jobs stuck >30 min without webhook
```

### Pattern 3: Conditional Viewer Rendering
**What:** Auto-switch between PanoramaViewer and GaussianSplatViewer based on tour data
**When to use:** Public tour page `/tour/[slug]`
**Example:**
```typescript
// In tour/[slug]/page.tsx
const hasSplat = tour?.splatStorageId != null;

{hasSplat ? (
  <GaussianSplatViewer splatUrl={splatUrl} hotspots={hotspots3D} />
) : activeScene?.imageUrl ? (
  <PanoramaViewer imageUrl={imageUrl} hotspots={hotspots} />
) : null}
```

### Pattern 4: Dynamic Import for WASM-dependent Components
**What:** Prevent SSR of spark.js (contains WASM + Web Workers)
**When to use:** Always for GaussianSplatViewer
**Example:**
```typescript
const GaussianSplatViewer = dynamic(
  () => import('@/components/viewer/GaussianSplatViewer'),
  { ssr: false, loading: () => <SplatLoadingSpinner /> }
);
```

### Anti-Patterns to Avoid
- **Importing spark.js at top level in SSR context:** WASM and Web Workers crash in Node. Always use dynamic import with `ssr: false`.
- **Polling RunPod from the browser:** Never poll RunPod directly from client. Use Convex reactive queries on the job record -- the webhook/cron updates the record, and the client auto-refreshes.
- **Storing video bytes in Convex mutations:** Convex HTTP actions are limited to 20MB. Use the 3-step upload pattern (generateUploadUrl -> direct POST -> save storageId) for all video/photo uploads.
- **Single-layer job completion detection:** Don't rely on webhook alone (can fail) or cron alone (adds latency). Use both: webhook for fast updates, cron as fallback for stuck jobs.
- **Creating separate WebGL contexts:** spark.js SplatMesh integrates inside the existing R3F Canvas. Don't create a separate renderer or canvas.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Virtual joystick | Custom touch event handler | nipplejs | Dead zones, threshold tuning, multi-touch, dynamic show/hide -- all solved |
| Gaussian Splat rendering | Custom WebGL splat renderer | @sparkjsdev/spark | GPU-accelerated sorting, WASM workers, SPZ decompression, progressive loading |
| PLY to SPZ compression | Custom compression script | 3dgsconverter (Python) | Handles quantization, gzip, SH coefficients correctly; MIT licensed |
| 3D reconstruction | Custom COLMAP + training script | nerfstudio splatfacto | Full pipeline: frame extraction, COLMAP SfM, splatfacto training, PLY export |
| Camera transitions | Manual matrix interpolation | drei CameraControls or custom lerp with Three.js | Smooth easing, orbit clamping, collision avoidance |
| Job queue reliability | Custom polling system | Convex reactive queries + webhook + cron | Convex auto-pushes changes; no manual polling needed on client |

**Key insight:** The reconstruction pipeline involves COLMAP (C++), nerfstudio (Python/CUDA), and compression (Python) -- these run on GPU and are far too complex to hand-roll. The viewer involves WASM-accelerated GPU sorting that spark.js provides out of the box.

## Common Pitfalls

### Pitfall 1: WASM/Worker Loading in Next.js Turbopack
**What goes wrong:** spark.js uses WASM + Web Workers internally. Next.js Turbopack has known issues with `new URL()` syntax for WASM resolution and worker blob URLs.
**Why it happens:** Turbopack's static analysis of `new URL()` resolves paths at build time differently than Vite/Webpack.
**How to avoid:** (1) Always use `dynamic(() => import(...), { ssr: false })` for any component that imports spark.js. (2) If WASM loading fails at runtime, copy the spark.js WASM file to `public/` and configure the WASM path. (3) Test the splat viewer early in a dedicated PR before building navigation features on top.
**Warning signs:** "Failed to execute 'fetch' on 'WorkerGlobalScope'" or "Failed to parse URL" errors in console.

### Pitfall 2: Convex 500MB Video Upload Architecture
**What goes wrong:** Trying to upload video through Convex mutations or HTTP actions hits the 20MB limit.
**Why it happens:** Convex HTTP action request body is capped at 20MB. Mutations have a 1MB document size limit.
**How to avoid:** Use the 3-step upload pattern exclusively: `generateUploadUrl()` -> direct POST from browser -> save storageId. Convex storage itself supports arbitrarily large files through upload URLs.
**Warning signs:** 413 Payload Too Large errors or timeout errors on upload.

### Pitfall 3: RunPod Webhook Delivery Failures
**What goes wrong:** RunPod webhook POST to Convex fails silently, leaving job stuck in "processing" forever.
**Why it happens:** RunPod retries only 2 times with 10-second delays. Network issues, Convex cold starts, or incorrect webhook URL can cause all 3 attempts to fail.
**How to avoid:** (1) Cron job that polls RunPod `/status` for any jobs in "processing" state older than 30 minutes. (2) Store the RunPod job ID in the reconstruction record so cron can query RunPod directly. (3) Validate webhook URL format before submitting job.
**Warning signs:** Jobs stuck in "processing" status for >30 minutes.

### Pitfall 4: Camera Mode Transition State Corruption
**What goes wrong:** Switching modes while a camera transition is animating causes visual glitches or the camera ends up in an impossible state.
**Why it happens:** Two concurrent animation frames fight over camera position/rotation/projection.
**How to avoid:** (1) Disable mode switcher buttons during transitions (show loading state). (2) Cancel any in-progress animation before starting a new one. (3) Use a single source of truth for camera target position.
**Warning signs:** Camera snapping to unexpected positions; flickering between orthographic and perspective.

### Pitfall 5: SPZ File Size Expectations
**What goes wrong:** Expecting tiny SPZ files but getting 50-100MB+ for complex interior scenes.
**Why it happens:** SPZ is ~10x smaller than PLY, but a high-quality interior PLY can be 500MB-1GB+, resulting in 50-100MB SPZ files.
**How to avoid:** (1) Set max Gaussian count in nerfstudio splatfacto config (e.g., 500K-1M gaussians). (2) Show file size during quality review so users know what they're accepting. (3) Stream SPZ loading with spark.js (it supports progressive loading).
**Warning signs:** Splat files >50MB; initial load times >10 seconds.

### Pitfall 6: OrthographicCamera + PerspectiveCamera Switching
**What goes wrong:** Switching between orthographic (dollhouse) and perspective (free-roam) cameras causes a jarring visual pop.
**Why it happens:** Orthographic and perspective projections are fundamentally different -- you can't interpolate between projection matrices smoothly.
**How to avoid:** (1) Animate the camera position/rotation first, THEN switch projection type at the midpoint of the animation. (2) Use a brief crossfade or zoom effect during the switch. (3) Alternatively, fake the dollhouse view with a very high perspective camera and narrow FOV.
**Warning signs:** Sudden visual "pop" when switching modes.

## Code Examples

### Gaussian Splat Viewer Component (R3F + spark.js)
```typescript
// Source: https://github.com/sparkjsdev/spark-react-r3f + spark.js docs
'use client'

import { Canvas, extend, useThree } from '@react-three/fiber'
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'

// Register spark.js classes for JSX use
extend({ SplatMesh, SparkRenderer })

function SplatScene({ url }: { url: string }) {
  const splatRef = useRef<any>(null)
  const { gl } = useThree()

  return (
    <>
      <sparkRenderer args={[{ renderer: gl }]} />
      <splatMesh ref={splatRef} args={[{ url }]} />
      <ambientLight intensity={0.5} />
    </>
  )
}

export function GaussianSplatViewer({ splatUrl }: { splatUrl: string }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100vh' }}
      gl={{ antialias: true }}
      camera={{ position: [0, 5, 0], fov: 60 }}
    >
      <SplatScene url={splatUrl} />
      <OrbitControls />
    </Canvas>
  )
}
```

### Reconstruction Job Schema (Convex)
```typescript
// Source: Convex schema patterns from existing codebase
reconstructionJobs: defineTable({
  tourId: v.id('tours'),
  userId: v.id('users'),
  inputType: v.union(v.literal('video'), v.literal('photos')),
  inputStorageIds: v.array(v.id('_storage')),  // 1 video or N photos
  status: v.union(
    v.literal('uploading'),
    v.literal('queued'),
    v.literal('extracting_frames'),
    v.literal('reconstructing'),
    v.literal('compressing'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('cancelled')
  ),
  progress: v.number(),  // 0-100
  runpodJobId: v.optional(v.string()),
  outputStorageId: v.optional(v.id('_storage')),  // .spz file
  outputMetadata: v.optional(v.object({
    fileSizeBytes: v.number(),
    gaussianCount: v.number(),
    processingTimeMs: v.number(),
  })),
  error: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
})
  .index('by_tourId', ['tourId'])
  .index('by_userId', ['userId'])
  .index('by_status', ['status']),
```

### RunPod Webhook HTTP Action (Convex)
```typescript
// Source: Convex HTTP action patterns from existing http.ts + RunPod docs
http.route({
  path: '/gpu-callback',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Verify shared secret
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    if (secret !== process.env.RUNPOD_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    // body: { id, status, output, executionTime, delayTime }

    if (body.status === 'COMPLETED' && body.output?.splatUrl) {
      // Download SPZ from RunPod temporary URL and store in Convex
      const splatResponse = await fetch(body.output.splatUrl)
      const splatBlob = await splatResponse.blob()
      const storageId = await ctx.storage.store(splatBlob)

      await ctx.runMutation(internal.reconstructionJobs.complete, {
        runpodJobId: body.id,
        outputStorageId: storageId,
        outputMetadata: body.output.metadata,
      })
    } else if (body.status === 'FAILED') {
      await ctx.runMutation(internal.reconstructionJobs.fail, {
        runpodJobId: body.id,
        error: body.output?.error || 'Reconstruction failed',
      })
    }

    return new Response('OK', { status: 200 })
  }),
})
```

### Mode Switcher Camera Transitions
```typescript
// Conceptual pattern for camera mode switching
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

type NavMode = 'dollhouse' | 'freeRoam' | 'hotspot'

function useNavigationMode() {
  const { camera } = useThree()
  const [mode, setMode] = useState<NavMode>('dollhouse')
  const [transitioning, setTransitioning] = useState(false)

  const switchMode = useCallback((newMode: NavMode) => {
    if (transitioning || newMode === mode) return
    setTransitioning(true)

    // Animate camera to target position over ~1 second
    const targets: Record<NavMode, { position: Vector3; lookAt: Vector3 }> = {
      dollhouse: { position: new Vector3(0, 10, 0), lookAt: new Vector3(0, 0, 0) },
      freeRoam: { position: new Vector3(0, 1.6, 0), lookAt: new Vector3(0, 1.6, -1) },
      hotspot: { position: camera.position.clone(), lookAt: new Vector3(0, 1.6, 0) },
    }

    // Use gsap or manual lerp in useFrame
    animateCamera(camera, targets[newMode], 1000, () => {
      setMode(newMode)
      setTransitioning(false)
    })
  }, [mode, transitioning, camera])

  return { mode, switchMode, transitioning }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PLY format (uncompressed) | SPZ format (10x compression) | 2024 (Niantic open-sourced) | ~25MB instead of ~250MB per splat; fast streaming |
| Custom WebGL splat renderers | spark.js (World Labs) | 2025 | Production-quality rendering with WASM sorting; supports R3F |
| NeRF-based reconstruction | Gaussian Splatting (splatfacto) | 2023-2024 | Real-time rendering; 10-15 min training instead of hours |
| Self-hosted GPU servers | RunPod Serverless | 2024-2025 | Per-second billing; no idle costs; auto-scaling |
| Manual webhook polling | Convex reactive queries | Existing | Zero-latency UI updates; no manual polling code |

**Deprecated/outdated:**
- NeRF rendering (replaced by Gaussian Splatting for real-time use cases)
- PLY-only workflows (SPZ is now the standard compressed format; adopted by glTF as KHR_gaussian_splatting_compression_spz)
- Luma AI 3D Capture API (availability unconfirmed as of March 2026 -- stick with nerfstudio/gsplat on RunPod as primary pipeline)

## Open Questions

1. **spark.js + Next.js Turbopack WASM compatibility**
   - What we know: spark.js uses WASM + Web Workers; Turbopack has known issues with WASM URL resolution; the spark-react-r3f example uses Vite, not Next.js
   - What's unclear: Whether `dynamic(() => import(...), { ssr: false })` alone resolves the WASM loading issue in Turbopack, or if additional configuration (copying WASM to public, custom turbopack rules) is needed
   - Recommendation: Build a minimal spike (single page with spark.js loading one SPZ file) as the very first task to validate compatibility before building the full viewer

2. **RunPod worker Docker image size and cold start**
   - What we know: nerfstudio + COLMAP + CUDA dependencies create a very large Docker image (likely 10-20GB); RunPod cold starts depend on image size
   - What's unclear: Exact cold start time; whether pre-warming is needed for acceptable UX
   - Recommendation: Use RunPod's "Flash Boot" option if available; keep at least 1 active worker during peak hours; set user expectations with "Queued" status during cold starts

3. **Maximum SPZ file size for acceptable load performance**
   - What we know: spark.js supports progressive/streaming loading; SPZ is ~10x smaller than PLY; the success criterion says "within 5 seconds on standard connection"
   - What's unclear: Maximum practical file size that loads in 5 seconds; whether splitting large splats is needed
   - Recommendation: Target 20-30MB SPZ files by limiting Gaussian count to ~500K-1M in splatfacto config; benchmark load times early

4. **Hotspot placement in 3D splat space**
   - What we know: Existing hotspots use {x, y, z} position in equirectangular space (yaw/pitch mapped); 3D splats need world-space coordinates
   - What's unclear: How users will place hotspots in the 3D viewer (click on splat surface? manual coordinate entry?)
   - Recommendation: For v1, use click-on-surface raycasting in the editor to place 3D hotspot coordinates; store as separate fields or a parallel hotspot record type

## Sources

### Primary (HIGH confidence)
- [spark.js official docs](https://sparkjs.dev/docs/) - SplatMesh API, SparkRenderer setup, format support
- [spark-react-r3f GitHub](https://github.com/sparkjsdev/spark-react-r3f) - Official R3F integration example with extend() pattern
- [SPZ format specification (Niantic)](https://github.com/nianticlabs/spz) - SPZ format details, 10x compression ratio, MIT license
- [RunPod Serverless docs](https://docs.runpod.io/serverless/endpoints/send-requests) - /run endpoint, webhook parameter, /status polling, authentication
- [Convex file storage docs](https://docs.convex.dev/file-storage/upload-files) - Arbitrarily large files via upload URL; 20MB HTTP action limit

### Secondary (MEDIUM confidence)
- [nerfstudio splatfacto docs](https://docs.nerf.studio/nerfology/methods/splat.html) - PLY export, splatfacto training pipeline
- [3dgsconverter GitHub](https://github.com/francescofugazzi/3dgsconverter) - PLY to SPZ conversion tool
- [nipplejs GitHub](https://github.com/yoannmoinet/nipplejs) - Virtual joystick API, configuration options
- [Next.js Turbopack WASM issues](https://github.com/vercel/next.js/issues/84782) - Known WASM loading problems with Turbopack

### Tertiary (LOW confidence)
- Training time estimates (12-25 min on RTX 4090/3080) from community guides -- actual RunPod performance may differ
- SPZ file size estimates based on compression ratios -- actual sizes depend on scene complexity and Gaussian count

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM -- spark.js R3F integration is documented but not yet validated with Next.js Turbopack; RunPod serverless is well-documented
- Architecture: HIGH -- follows established Convex patterns (job queue, HTTP actions, reactive queries); extends existing codebase patterns
- Pitfalls: HIGH -- WASM/Turbopack issues are well-documented; Convex upload limits are officially documented; RunPod webhook behavior is documented

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (spark.js is actively developed; check for new releases before implementation)
