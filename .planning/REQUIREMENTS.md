# Requirements: Spazeo

**Defined:** 2026-03-09
**Core Value:** Turn any property input (video walkthrough, panorama photos, or floor plan file) into an interactive 3D experience where buyers can furnish, visualize, and cost out a space before a single item is purchased.

---

## v1 Requirements

### Stability (Critical Fixes — Ship Before Everything Else)

- [x] **FIX-01**: Lead email notification fires correctly when a buyer submits the lead form (fix missing tourSlug argument in leads.ts scheduler call)
- [x] **FIX-02**: Tour passwords are hashed with bcrypt before storage and compared server-side (remove plaintext storage)
- [x] **FIX-03**: Stripe webhook handlers process checkout.session.completed, subscription updates, and cancellations correctly (complete empty stubs in convex/http.ts)

### Tour Creation

- [x] **TOUR-01**: User can complete the full tour creation flow end-to-end — upload panoramas, arrange scenes, set title/settings, and publish in one session
- [x] **TOUR-02**: User can add, move, and delete hotspots visually inside the tour editor without editing JSON
- [x] **TOUR-03**: User can customize each hotspot with: animated directional arrow (points toward target room), info popup card (text, image, video), external link, and visibility toggle
- [x] **TOUR-04**: User can generate an embeddable iframe snippet from the tour settings page that works cross-origin on any website
- [x] **TOUR-05**: User can share the tour via a clean public URL and optionally set a password-protected link

### Viewer UX

- [x] **VIEW-01**: Public tour viewer supports mobile touch gestures — pinch to zoom, swipe to rotate panorama — with no degradation vs desktop
- [x] **VIEW-02**: Public tour viewer has a fullscreen button and keyboard shortcut (F key) that fills the browser window
- [x] **VIEW-03**: Tour auto-rotates when idle for more than 5 seconds and stops rotating on any user interaction

### Lead & Analytics

- [x] **LEAD-01**: Agent receives email notification with buyer name, email, and tour title within 60 seconds of lead form submission
- [x] **ANLT-01**: Analytics dashboard shows total views, unique visitors, average time per scene, and lead count per tour

### 3D Capture & Reconstruction

- [x] **CAP-01**: User can upload a video walkthrough (MP4/MOV, up to 500MB) to trigger 3D reconstruction
- [x] **CAP-02**: User can upload 10–30 multi-angle JPG/PNG photos to trigger 3D reconstruction as an alternative to video
- [x] **CAP-03**: 3D reconstruction job processes input via RunPod + nerfstudio/gsplat pipeline asynchronously; user sees real-time progress updates while job runs
- [x] **CAP-04**: Completed reconstruction is stored as a Gaussian Splat file (.spz) in Convex storage and linked to the tour

### 3D Viewer (Section 2)

- [x] **VIEW3D-01**: Gaussian Splat renders in-browser using spark.js within the existing React Three Fiber canvas — no separate WebGL context
- [x] **VIEW3D-02**: User can switch to a dollhouse/overhead orthographic view to see the full room layout from above
- [x] **VIEW3D-03**: User can navigate the 3D space in free-roam first-person mode (click-to-move on desktop, virtual joystick on mobile)
- [x] **VIEW3D-04**: User can navigate between reconstructed rooms using hotspot markers placed in the 3D space (reuses Section 1 hotspot model)

### Furniture Catalog & Placement

- [x] **FURN-01**: Internal furniture catalog contains at least 50 GLB items with dimensional metadata (width, depth, height in meters), price, style tags, and category
- [x] **FURN-02**: Each catalog item has an Amazon product link (buy link with affiliate tag) where available
- [x] **FURN-03**: User can search the catalog by name and filter by style (Scandinavian, Modern, Luxury, Industrial) and category (sofa, bed, table, etc.)
- [x] **FURN-04**: User can drag a catalog item from the panel and drop it onto the 3D room floor plane to place it
- [x] **FURN-05**: User can select a placed furniture item and use transform controls to scale and rotate it
- [x] **FURN-06**: User can undo the last furniture placement action (Ctrl/Cmd+Z)
- [x] **FURN-07**: Cost tracker updates in real time as items are added or removed, showing subtotal and itemized list
- [x] **FURN-08**: User can remove any placed furniture item by selecting it and pressing Delete

### 3D Room Sharing (Section 2)

- [x] **SHARE-01**: User can save the furnished room state (furniture positions, IDs, rotations) and generate a public share link
- [x] **SHARE-02**: Anyone with the share link can view the furnished room in read-only mode without logging in
- [x] **SHARE-03**: Share page shows an itemized cost summary panel with product links for each placed item

### Floor Plan Extraction (Section 3)

- [ ] **FP-01**: User can upload a floor plan in any format — PDF, JPG/PNG, or a photo of a hand-drawn sketch
- [ ] **FP-02**: AI (GPT-4o Vision with structured JSON output) extracts room layout — room names, wall boundaries, approximate dimensions — from the uploaded file
- [ ] **FP-03**: User sees the extracted 2D floor plan rendered as an editable diagram and can correct room names, adjust wall positions, and fix dimensions before proceeding
- [ ] **FP-04**: Corrected 2D floor plan data is saved to Convex as structured room geometry (wall coordinates, room metadata)

### Floor Plan to 3D (Section 3)

- [ ] **FP3D-01**: AI generates a 3D model from the corrected 2D floor plan data by extruding walls to standard ceiling height in Three.js
- [ ] **FP3D-02**: User reviews the generated 3D space and can make adjustments (correct wall heights, open/close doorways) before finalizing
- [ ] **FP3D-03**: Finalized 3D model is navigable using the same three modes as Section 2 (dollhouse, free-roam, hotspot)
- [ ] **FP3D-04**: Furniture placement and cost tracking from Section 2 work unchanged inside floor-plan-generated 3D rooms
- [ ] **FP3D-05**: User can publish the floor-plan-generated tour as a public share link

---

## v2 Requirements

### Section 1 — Advanced Differentiators

- **DIFF-01**: AI auto-narration per scene using OpenAI TTS — voices room descriptions as buyer enters each scene
- **DIFF-02**: AI scene description overlay card visible in the public viewer (summary of room features)
- **DIFF-03**: AI virtual staging toggle in public viewer — buyer switches between empty and staged room mid-tour
- **DIFF-04**: Heatmap analytics — track which areas of each panorama viewers look at most
- **DIFF-05**: CRM-ready lead export — CSV download and webhook push to HubSpot/Follow Up Boss
- **DIFF-06**: Ambient soundscape per room — upload audio clip per scene

### Section 2 — Advanced 3D

- **ADV3D-01**: AI furniture placement suggestions — GPT-4o suggests optimal layout based on room dimensions
- **ADV3D-02**: Style-based room presets — auto-populate room with furniture from a selected style theme
- **ADV3D-03**: Splat CDN delivery via Cloudflare R2 for large .spz files at scale

### Section 3 — Advanced Floor Plan

- **FPAV-01**: DWG/CAD file import with AI-assisted parsing
- **FPAV-02**: Multi-floor support — link multiple floor plan 3D rooms into a single navigable building

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native VR/AR headset support | WebXR unstable; <1% buyer market share; enormous build cost |
| Real-time multi-user collaboration in 3D | Requires WebRTC + operational transform; 10x scope increase |
| Live video chat embedded in tour | WebRTC infrastructure; third-party compliance overhead |
| Offline downloadable tours | Splats + panoramas are 50-200MB; PWA limits; optimize streaming instead |
| Renovation cost estimation (labor, materials) | Furniture cost only in v1; labor pricing requires geo-specific data |
| Native mobile app (iOS/Android) | Web-first; mobile later after web platform is proven |
| Real-time multi-agent annotations | Single-user with shareable static links is sufficient for v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 1 | Complete |
| FIX-02 | Phase 1 | Complete |
| FIX-03 | Phase 1 | Complete |
| TOUR-01 | Phase 1 | Complete |
| TOUR-02 | Phase 1 | Complete |
| TOUR-03 | Phase 1 | Complete |
| TOUR-04 | Phase 1 | Complete |
| TOUR-05 | Phase 1 | Complete |
| VIEW-01 | Phase 1 | Complete |
| VIEW-02 | Phase 1 | Complete |
| VIEW-03 | Phase 1 | Complete |
| LEAD-01 | Phase 1 | Complete |
| ANLT-01 | Phase 1 | Complete |
| CAP-01 | Phase 2 | Complete |
| CAP-02 | Phase 2 | Complete |
| CAP-03 | Phase 2 | Complete |
| CAP-04 | Phase 2 | Complete |
| VIEW3D-01 | Phase 2 | Complete |
| VIEW3D-02 | Phase 2 | Complete |
| VIEW3D-03 | Phase 2 | Complete |
| VIEW3D-04 | Phase 2 | Complete |
| FURN-01 | Phase 3 | Complete |
| FURN-02 | Phase 3 | Complete |
| FURN-03 | Phase 3 | Complete |
| FURN-04 | Phase 3 | Complete |
| FURN-05 | Phase 3 | Complete |
| FURN-06 | Phase 3 | Complete |
| FURN-07 | Phase 3 | Complete |
| FURN-08 | Phase 3 | Complete |
| SHARE-01 | Phase 3 | Complete |
| SHARE-02 | Phase 3 | Complete |
| SHARE-03 | Phase 3 | Complete |
| FP-01 | Phase 4 | Pending |
| FP-02 | Phase 4 | Pending |
| FP-03 | Phase 4 | Pending |
| FP-04 | Phase 4 | Pending |
| FP3D-01 | Phase 5 | Pending |
| FP3D-02 | Phase 5 | Pending |
| FP3D-03 | Phase 5 | Pending |
| FP3D-04 | Phase 5 | Pending |
| FP3D-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 — traceability populated after roadmap creation*
