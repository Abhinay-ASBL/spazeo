# Roadmap: Spazeo

## Overview

Spazeo builds in three sequential sections, each layering on the last. Phase 1 hardens the existing 360° tour platform — fixing live security bugs, wiring lead capture correctly, and polishing the viewer — so it is production-stable before new infrastructure lands on top. Phase 2 constructs the GPU reconstruction pipeline and in-browser Gaussian Splat viewer that Section 2 depends on entirely. Phase 3 completes Section 2 with the furniture catalog, drag-and-drop placement, cost tracker, and public share link. Phase 4 extracts structured room geometry from any floor plan file using GPT-4o. Phase 5 generates navigable 3D spaces from that geometry and connects the furniture system to close the Section 3 loop. The output is a buyer who can upload anything — a panorama set, a video walkthrough, or a hand-drawn sketch — and walk through, furnish, and cost out a real space before a single item is purchased.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Tour Platform — Stabilize and Polish** - Fix live security bugs, wire lead capture, complete tour creation flow, and polish the 360° viewer for production (completed 2026-03-09)
- [ ] **Phase 2: 3D Capture Pipeline and Splat Viewer** - Build GPU reconstruction job queue, in-browser Gaussian Splat rendering, and all three 3D navigation modes
- [ ] **Phase 3: Furniture Catalog, Placement, and Room Sharing** - Seed the internal furniture catalog, build drag-and-drop 3D placement with cost tracking, and publish furnished rooms as shareable links
- [ ] **Phase 4: Floor Plan Extraction** - Accept any floor plan file format, extract structured room geometry via GPT-4o, and provide an editable 2D correction step before proceeding
- [ ] **Phase 5: Floor Plan to 3D and Full Section 3 Delivery** - Generate navigable 3D spaces from corrected room geometry, connect the furniture and cost tracking system, and publish as shareable tours

## Phase Details

### Phase 1: Tour Platform — Stabilize and Polish
**Goal**: The 360° tour platform is production-stable with no live security vulnerabilities, working lead capture revenue flow, complete tour creation end-to-end, and a polished mobile-ready public viewer
**Depends on**: Nothing (first phase)
**Requirements**: FIX-01, FIX-02, FIX-03, TOUR-01, TOUR-02, TOUR-03, TOUR-04, TOUR-05, VIEW-01, VIEW-02, VIEW-03, LEAD-01, ANLT-01
**Success Criteria** (what must be TRUE):
  1. An agent submits a lead form on any tour and receives an email notification with buyer name, email, and tour title within 60 seconds
  2. A tour with password protection stores a bcrypt hash — the plaintext password is never readable in the Convex database
  3. An agent completes the full flow — upload panoramas, arrange scenes, add hotspots visually, set sharing options, and publish — without leaving the app or editing JSON
  4. A buyer on a mobile device can pinch to zoom, swipe to rotate, and tap hotspots with no degradation vs desktop; the viewer auto-rotates when idle and stops on interaction
  5. An agent can view total tour views, unique visitors, average scene time, and lead count for any tour in the analytics dashboard
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Security fixes: remove duplicate lead email function and add bcrypt password hashing (Convex backend)
- [ ] 01-02-PLAN.md — Password gate frontend switch to useAction + Stripe webhook verification
- [ ] 01-03-PLAN.md — Viewer polish: pinch-to-zoom, F key fullscreen, idle auto-rotate timer
- [ ] 01-04-PLAN.md — Hotspot visual upgrade: Gold pulse ring + info popup card + editor config fields
- [ ] 01-05-PLAN.md — Tour creation flow, embed code UI, lead email verify, analytics verify

### Phase 2: 3D Capture Pipeline and Splat Viewer
**Goal**: A user can upload a video walkthrough or multi-angle photos, trigger GPU-based Gaussian Splatting reconstruction asynchronously, and view the completed splat rendered in-browser inside the existing R3F canvas with dollhouse, free-roam, and hotspot navigation — no furniture yet
**Depends on**: Phase 1
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, VIEW3D-01, VIEW3D-02, VIEW3D-03, VIEW3D-04
**Success Criteria** (what must be TRUE):
  1. A user uploads a video walkthrough (up to 500MB MP4/MOV) or 10-30 multi-angle photos and triggers a reconstruction job that processes asynchronously on RunPod GPU without blocking the browser
  2. The user sees real-time progress updates while reconstruction runs and is notified when the job completes — no manual polling or page refresh required
  3. The completed Gaussian Splat (.spz) renders in-browser inside the R3F canvas using spark.js within 5 seconds of opening the viewer on a standard connection
  4. The user can switch between three navigation modes — overhead dollhouse view, first-person free-roam (click-to-move desktop / virtual joystick mobile), and room-to-room hotspot markers — without leaving the viewer
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md — Convex schema: reconstructionJobs table, tours splat fields, job lifecycle CRUD with plan limits
- [ ] 02-02-PLAN.md — spark.js compatibility spike: validate WASM/R3F/Turbopack, build GaussianSplatViewer shell
- [ ] 02-03-PLAN.md — Capture upload UI: video/photo tabs, validation, preview, tips panel in tour editor
- [ ] 02-04-PLAN.md — Reconstruction progress indicator, failure handling, and quality review (Accept/Re-capture)
- [ ] 02-05-PLAN.md — RunPod integration: submit action, /gpu-callback webhook, stale job polling cron
- [ ] 02-06-PLAN.md — Navigation modes (dollhouse, free-roam, hotspot), mode switcher, virtual joystick, public viewer conditional rendering
- [ ] 02-07-PLAN.md — Gap closure: upload validation (react-dropzone, format/size limits), wire orphaned CapturePhotoGrid and CaptureTips, quota display

### Phase 3: Furniture Catalog, Placement, and Room Sharing
**Goal**: Inside the reconstructed 3D room, a user can browse a curated catalog of 50+ GLB furniture items, drag and drop them onto the floor, scale and rotate them, track running cost in real time, undo mistakes, and save and share the furnished room as a public read-only link
**Depends on**: Phase 2
**Requirements**: FURN-01, FURN-02, FURN-03, FURN-04, FURN-05, FURN-06, FURN-07, FURN-08, SHARE-01, SHARE-02, SHARE-03
**Success Criteria** (what must be TRUE):
  1. The furniture catalog contains at least 50 GLB items searchable by name and filterable by style and category, each with a real-world dimensions, price, and an Amazon product link where available
  2. A user drags a catalog item into the 3D room and it snaps to the floor plane; they can then select it, scale it, rotate it, and delete it with the Delete key
  3. The cost tracker updates in real time as items are added or removed, showing the running subtotal and an itemized list
  4. A user presses Ctrl/Cmd+Z to undo the last placement action
  5. A user saves the furnished room and shares the link; anyone with the link sees the room in read-only mode with an itemized cost summary and product links — no login required
**Plans**: TBD

### Phase 4: Floor Plan Extraction
**Goal**: A user can upload any floor plan file (PDF, JPG/PNG, or sketch photo), the AI extracts structured room geometry as a validated JSON payload, and the user reviews and corrects the extracted 2D diagram before the data is committed to Convex
**Depends on**: Phase 1
**Requirements**: FP-01, FP-02, FP-03, FP-04
**Success Criteria** (what must be TRUE):
  1. A user uploads a PDF, JPG/PNG, or photo of a hand-drawn sketch and the upload is accepted without error for all three formats
  2. The AI returns an extracted floor plan with room names, wall boundaries, and approximate dimensions — the output is a validated structured JSON payload, not a narrative description
  3. The user sees the extracted 2D floor plan rendered as an editable diagram and can correct room names, adjust wall positions, and fix dimensions before proceeding to 3D generation
  4. The corrected room geometry is saved to Convex as structured wall coordinates and room metadata, ready for 3D generation
**Plans**: TBD

### Phase 5: Floor Plan to 3D and Full Section 3 Delivery
**Goal**: The corrected 2D floor plan data generates a navigable 3D space using the same viewer modes as Section 2; the Section 2 furniture placement and cost tracking system works unchanged inside the floor-plan-derived rooms; the finished tour publishes as a shareable public link
**Depends on**: Phase 3, Phase 4
**Requirements**: FP3D-01, FP3D-02, FP3D-03, FP3D-04, FP3D-05
**Success Criteria** (what must be TRUE):
  1. A corrected 2D floor plan generates a 3D model with walls extruded to standard ceiling height that the user can review and adjust (wall heights, doorways) before finalizing
  2. The finalized 3D space is navigable in all three modes — dollhouse, free-roam, and hotspot — using the same viewer from Section 2 with no separate implementation
  3. Furniture drag-and-drop, transform controls, undo, cost tracker, and share link all work identically inside a floor-plan-derived 3D room as they do in a reconstructed splat room
  4. A user publishes the floor-plan-derived tour as a public share link that anyone can open without logging in
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5
Note: Phase 4 depends only on Phase 1 (not Phase 2 or 3) — floor plan extraction is independent of the GPU pipeline. Phase 5 depends on both Phase 3 (furniture system) and Phase 4 (geometry data).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tour Platform — Stabilize and Polish | 7/7 | Complete   | 2026-03-09 |
| 2. 3D Capture Pipeline and Splat Viewer | 0/7 | Not started | - |
| 3. Furniture Catalog, Placement, and Room Sharing | 0/TBD | Not started | - |
| 4. Floor Plan Extraction | 0/TBD | Not started | - |
| 5. Floor Plan to 3D and Full Section 3 Delivery | 0/TBD | Not started | - |

### Phase 6: Hotspot customization options, icons, info panels, video support, and adaptive screen layout

**Goal:** Hotspot interactions deliver a rich, responsive experience — custom Lucide icons per hotspot, a full-height info panel (right drawer on desktop, bottom sheet on mobile) with image and CTA support, full-screen video modal, and a viewer layout that meets 44px touch targets and safe-area requirements on all mobile devices
**Requirements**: HS6-01, HS6-02, HS6-03, HS6-04, HS6-05, HS6-06
**Depends on:** Phase 1 (inserted enhancement)
**Plans:** 6/6 plans complete (UAT fixing)

Plans:
- [ ] 06-01-PLAN.md — Convex schema + mutations: add 6 new optional hotspot customization fields
- [ ] 06-02-PLAN.md — Shared infrastructure: parseVideoUrl utility and useViewerStore Zustand store
- [ ] 06-03-PLAN.md — HotspotMarker refactor: delegate panel open to store, support iconName and accentColor
- [ ] 06-04-PLAN.md — New viewer components: HotspotInfoPanel (responsive drawer) and HotspotVideoModal (full-screen)
- [ ] 06-05-PLAN.md — Public viewer wiring: AnimatePresence integration + adaptive mobile layout
- [ ] 06-06-PLAN.md — Tour editor: icon picker grid, panel layout selector, video URL, and CTA fields
