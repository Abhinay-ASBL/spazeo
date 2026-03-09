# Phase 2: 3D Capture Pipeline and Splat Viewer - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the GPU reconstruction job queue (video/photo upload → RunPod processing → compressed .spz output), the in-browser Gaussian Splat viewer using spark.js inside R3F, and all three navigation modes (dollhouse, free-roam, hotspot). No furniture catalog or placement — that is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Capture Upload UX
- Upload lives inside the existing tour editor at `/tours/[id]/edit` — a new "3D Capture" tab/section alongside scenes
- Two separate tabs: "Video Walkthrough" (single MP4/MOV, up to 500MB) and "Multi-Angle Photos" (10-30 JPG/PNG files)
- Validate + preview before triggering: show video thumbnail/duration or photo grid preview after upload
- Validate file size, format, and minimum photo count; show clear error messages on validation failure
- User clicks explicit "Start Reconstruction" button to trigger the GPU job — no auto-trigger
- Inline collapsible tips panel next to upload zone (expanded by default on first visit)

### Capture Guidance Content
- Video tab tips: "Walk slowly and steadily", "Cover all corners", "Keep good lighting — turn on all lights", "Avoid mirrors/windows", "Record 1-3 minutes per room" — with small icons per tip
- Photo tab tips: "Take 10-30 photos from different angles", "Overlap each shot by ~60%", "Cover all walls and corners", "Include floor and ceiling edges"
- Photo tab includes a live counter: "12 of 10-30 photos uploaded" with green checkmark when minimum (10) is met

### Reconstruction Progress
- Live multi-stage progress indicator: Uploading → Queued → Extracting Frames → Reconstructing → Compressing → Complete
- Progress percentage updates in real-time via Convex reactive query on the reconstruction job record
- User can leave the page and come back — progress persists on the tour card
- In-app toast notification + notification bell badge when job completes (reuse existing `notifications` table)
- No email notification for now — keep it simple
- Cancel button on the progress view with confirmation dialog: "Cancel reconstruction? GPU time already used will count toward your usage."

### Reconstruction Failure Handling
- Clear human-readable error messages: "Video too short for reconstruction — try a longer walkthrough" or "Processing failed — try again"
- Offer both "Retry" (re-trigger same input) and "Re-upload" (start fresh) buttons
- Failed jobs do NOT count against plan reconstruction limits

### Quality Review Step
- After reconstruction completes, show a 3D preview in the tour editor — user can orbit and inspect
- User clicks "Accept" to make it the tour's 3D model, or "Re-capture" to try again
- No in-browser cropping or editing of the splat in v1 — accept or re-capture only
- Show basic metadata: .spz file size, Gaussian splat count, processing time, input type (video/photos)

### Reconstruction Plan Limits
- Free plan: 1 reconstruction/month
- Starter plan: 5/month
- Pro plan: 20/month
- Enterprise: unlimited
- Clear messaging: "You have 3 reconstructions remaining this month"
- Failed jobs excluded from limits

### 3D Navigation: Dollhouse View
- Orthographic camera looking straight down — industry standard spatial overview (like Matterport)
- User can orbit around the model (rotate the dollhouse) and zoom in/out
- Click any spot on the model to "drop in" to first-person at that location

### 3D Navigation: Free-Roam First-Person
- Desktop: click a floor point to smoothly glide there; mouse drag to look around
- Mobile: virtual joystick overlay in bottom-left for movement; drag anywhere else to look
- Smooth camera transitions — gliding, not teleporting
- Camera stays at eye height (~1.6m) during movement

### 3D Navigation: Hotspot Markers
- Floating markers at doorway/transition points in 3D space
- Same Gold (#D4A017) pulsing ring style as 360° viewer hotspots (Phase 1 design continuity)
- Click a marker to smoothly fly to the next room
- Reuses the existing hotspot data model from Section 1

### Navigation Mode Transitions
- Animated camera fly between modes (~1 second, eased)
- Dollhouse → free-roam: camera smoothly flies down from overhead into first-person position
- Free-roam → dollhouse: camera pulls up and out to overhead
- Click-to-move in free-roam: smooth glide along floor plane
- No snap cuts — all transitions are animated

### Viewer Page Layout
- Same `/tour/[slug]` route — auto-switch between 360° panorama viewer and 3D splat viewer based on tour data
- If tour has a splat file → render GaussianSplatViewer; if panoramas only → render PanoramaViewer
- One URL per tour — clean for sharing
- Bottom-center: floating pill-shaped toolbar with 3 mode icons (Dollhouse | Free Roam | Hotspots)
- Top-right: fullscreen button + zoom +/- (reuse ViewerControls pattern from Phase 1)
- Top-left: tour branding/logo (same as Phase 1)
- No other controls — clean, immersive

### Mobile Viewer Layout
- 3D canvas fills the entire viewport
- Mode switcher and controls float as semi-transparent overlays
- Virtual joystick appears only in free-roam mode (bottom-left)
- Auto-hide controls after 3 seconds of inactivity; tap anywhere to show
- 44px minimum touch targets; respect safe area insets
- Matches Phase 1 adaptive mobile approach

### Claude's Discretion
- Exact virtual joystick component library or implementation
- RunPod worker configuration and nerfstudio/gsplat pipeline parameters
- SPZ compression tooling choice
- Convex cron polling interval for job status
- HTTP callback authentication pattern for RunPod → Convex
- Camera animation easing curves and exact transition durations
- spark.js SplatMesh configuration and loading strategy
- Exact reconstruction stage names if pipeline stages differ from listed

</decisions>

<specifics>
## Specific Ideas

- Dollhouse view should feel like Matterport's — the industry standard that real estate professionals already know
- Free-roam navigation should feel like "walking through a space" (praised by Polycam users), not like teleporting between fixed points
- The mode switcher pill at bottom-center is inspired by Matterport's mode bar — familiar to agents
- Hotspot markers maintain visual continuity with Phase 1's Gold pulsing ring design
- Luma AI emphasizes "tiny files that start streaming immediately" — SPZ compression should target fast initial load

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `conversionJobs.ts`: Existing Convex table and CRUD functions for job tracking — can be extended or a parallel `reconstructionJobs` table created
- `aiJobs` pattern: pending → processing → completed/failed job queue — same pattern applies to reconstruction jobs
- `UploadZone.tsx`: File upload component — can be adapted for video/multi-photo upload tabs
- `ViewerControls.tsx`: Zoom/fullscreen control bar — reuse for 3D viewer top-right controls
- `HotspotMarker.tsx`: Phase 1 Gold pulsing ring markers — style to be replicated in 3D space
- `notifications` table: Existing Convex table for in-app notifications — reuse for job completion alerts
- `PanoramaViewer.tsx`: Dynamic import + SSR:false pattern — replicate for GaussianSplatViewer
- `useViewerStore` (Zustand): Phase 6 store for viewer state — extend or create parallel store for 3D viewer state

### Established Patterns
- `dynamic(() => import(...), { ssr: false })` for all Three.js/R3F components — must be used for GaussianSplatViewer
- Fire-and-forget + cron polling + HTTP callback for long-running jobs (documented in research but not yet implemented)
- 3-step file upload: generateUploadUrl → POST file → save storageId — use for video/photo uploads
- Convex reactive queries auto-refresh UI — progress bar reads job status via `useQuery`
- `toast.success/error` for all user feedback notifications

### Integration Points
- Tour editor `/tours/[id]/edit` — add "3D Capture" section alongside existing scene management
- `tours` table needs a `splatStorageId` or similar field to link the splat file
- `reconstructionJobs` table (new) — tracks GPU job lifecycle
- `/tour/[slug]` page — conditional rendering: splat viewer vs panorama viewer based on tour data
- `subscriptions` table — add reconstruction limit tracking alongside existing tour limits
- `convex/http.ts` — add `/gpu-callback` HTTP action endpoint for RunPod to report completion
- `convex/crons.ts` — add polling job for stale reconstruction jobs

</code_context>

<deferred>
## Deferred Ideas

- Splat cropping/trimming tools in browser — future phase after v1 pipeline is proven
- AI quality scoring of reconstruction output — future enhancement
- Email notification on reconstruction completion — add when user feedback indicates need
- Example capture video tutorial content — nice-to-have, not blocking v1
- Depth estimation fallback (Depth Anything V2) for single panorama photos — research and add if Gaussian Splatting quality on small rooms is insufficient

</deferred>

---

*Phase: 02-3d-capture-pipeline-and-splat-viewer*
*Context gathered: 2026-03-09*
