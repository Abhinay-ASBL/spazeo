# Project Research Summary

**Project:** Spazeo — AI-powered 360° virtual tour platform with 3D reconstruction and floor plan generation
**Domain:** Real estate property visualization SaaS (panorama tours, Gaussian Splatting, furniture placement, floor plan AI)
**Researched:** 2026-03-09
**Confidence:** MEDIUM

## Executive Summary

Spazeo is a three-section expansion of an existing Next.js 16 + Convex + Clerk + Three.js/R3F platform. Section 1 is tour polish — fixing live bugs and adding AI differentiators (narration, scene descriptions) to the existing 360° panorama viewer. Section 2 is the core product leap: AI 3D room reconstruction from video walkthroughs using Gaussian Splatting (via RunPod GPU + nerfstudio/gsplat pipeline), with in-browser furniture placement powered by an internal curated GLB catalog and floor-plane raycasting. Section 3 is floor plan AI — extracting structured room geometry from any file format (PDF, JPG, sketch) via GPT-4o Vision and generating procedural Three.js 3D walkthrough environments. The three sections build sequentially: Section 1 bugs must be fixed before Section 2 loads new viewer infrastructure on top, and Section 2's furniture placement system is reused directly by Section 3. This ordering is non-negotiable given architectural dependencies.

The recommended technical approach leans heavily on what already exists. Three.js + R3F + Drei cover all furniture placement and 3D viewer needs without new packages. The critical additions are: `@sparkjsdev/spark` for Gaussian Splat rendering inside R3F, `@react-three/rapier` for physics (deferrable to v2), and `pdfjs-dist` + `@napi-rs/canvas` in a Convex Node action for PDF floor plan rasterization. Luma AI's 3D Capture API was the planned reconstruction source but its public API availability is unconfirmed as of March 2026 — the architecture must be designed for RunPod + nerfstudio/gsplat as the primary reconstruction pipeline, with Luma as a potential swap-in. The Gaussian Splatting GPU job pipeline is the highest-complexity and highest-risk component: Convex actions time out at 10 minutes, reconstruction takes 10–30 minutes, and the solution requires a fire-and-forget + webhook callback architecture using a Convex cron job for status polling.

The primary risks are: (1) single 360° panorama photos are insufficient input for Gaussian Splatting — users must capture video or multi-position photos, which breaks the existing "upload panorama" mental model; (2) Gaussian Splat files are 50–250MB uncompressed and will produce unacceptable load times without a compression pipeline (SPZ/SOG format, <30MB target) built before the viewer; (3) GPT-4o floor plan extraction produces narrative descriptions rather than structured geometry unless enforced with strict JSON schema and a user-facing correction step — skipping the correction UI is the fastest path to user-visible failures. All three risks must be resolved in Phase 1 of their respective sections, not retrofitted.

---

## Key Findings

### Recommended Stack

The existing stack handles most of what is needed. No new backend infrastructure is required. The additions are narrow and purposeful.

**New packages to add:**

- `@sparkjsdev/spark` (v0.1.10): Gaussian Splat renderer inside R3F — the only actively maintained Three.js-compatible splat viewer as of 2025. Supports `.ply`, `.splat`, `.ksplat`, `.spz`, `.sog` formats and streaming. Primary splat viewer for Section 2.
- `@lumaai/luma-web` (v0.2.2): Luma-specific splat viewer — use only if reconstruction source is Luma AI API. Last published 2023; compatibility with Three.js 0.183 unverified. Use spark as primary, Luma web as secondary.
- `pdfjs-dist` (v4.x pinned for Node 18 compatibility) + `@napi-rs/canvas`: PDF rasterization in Convex Node actions for floor plan extraction pipeline. Must be added to `convex.json` `node.externalPackages`.
- `@react-three/rapier` (^1.x): Physics engine for furniture wall-collision enforcement — adds ~800KB WASM. Deferrable to v2; floor-plane raycasting alone is sufficient for v1 furniture placement.
- `draco3d`: Decoder for Draco-compressed GLB models from Sketchfab catalog. Often already bundled with drei but explicit install ensures correct version.

**Critical version constraints:**

- `pdfjs-dist` v5.x requires Node 20+; Convex runs Node 18 — pin to v4.x
- `@sparkjsdev/spark` integrates via Three.js scene, not bound to a specific three version — resilient to three upgrades
- Amazon Product Advertising API (PA API 5) is deprecated April 30, 2026 — do not implement; use Amazon Creators API or curated manual affiliate links only

See `.planning/research/STACK.md` for full alternatives analysis.

### Expected Features

Research covers three sections. Feature priority is strict: Section 1 completeness gates Section 2 construction.

**Must have — Section 1 (fix before any Section 2 work):**
- Lead capture email notification fix (tourSlug bug) — broken revenue, live in production
- Password protection with bcrypt hashing — live security risk, plaintext passwords in DB now
- Hotspot visual editor (add, move, delete hotspots) — core tour creation flow
- Mobile touch gesture support — 60%+ of buyers on mobile
- AI scene descriptions visible in public viewer — fastest differentiator, reuses existing GPT-4o analysis
- AI auto-narration per scene (OpenAI TTS tts-1-hd, toggle in settings) — highest engagement lift, no competitor has this
- Custom branding (logo + color) on paid plans — table stakes for professional agents

**Must have — Section 2 (AI 3D Room Reconstruction):**
- Gaussian Splatting reconstruction from video/multi-photo input (RunPod GPU pipeline)
- Dollhouse view and free-roam first-person navigation in reconstructed 3D
- Internal furniture catalog (50–100 curated GLB items with real-world dimensions in DB)
- Drag-and-drop furniture placement with scale and rotation controls (floor-plane raycasting)
- Real-time cost total tracker (Zustand reactive sum)
- Save and share furnished room as public read-only link

**Must have — Section 3 (Floor Plan to 3D):**
- File upload (PDF, PNG, JPG, sketch photo) — any format user has
- GPT-4o extraction with strict JSON schema enforcement — rooms, walls, dimensions
- Mandatory user-correction step (editable 2D room diagram) before 3D generation
- Three.js procedural 3D generation from extracted room JSON
- Same navigation modes as Section 2 (reuse)
- Furniture placement and cost tracking in floor-plan-derived 3D (reuse Section 2 system)
- Publish as shareable public tour link

**Should have (add after section validation):**
- Heatmap analytics (where viewers look) — new tracking infrastructure required
- Multilingual AI narration — same TTS infrastructure, add language param
- CRM lead webhook export — add when first enterprise client requests it
- AI furniture placement suggestions — add after catalog is seeded and placement validated
- Style filtering in furniture catalog
- Room-to-room hotspot links inside 3D reconstruction (reuse hotspot data model)

**Defer to v2+:**
- Native VR headset support (WebXR API instability, <1% headset market share)
- Real-time collaborative room planning (WebRTC/Presence complexity out of scope)
- BIM/IFC integration (separate product category)
- Custom user furniture upload (GLB) — catalog covers 90% of v1 cases
- Renovation cost estimation — separate product
- AR mobile app — post-web validation

**Key competitive gaps Spazeo uniquely fills:**

No competitor combines: captured 360° tours + Gaussian Splatting 3D reconstruction from existing captures + AI floor plan extraction to walkable 3D — all in one platform. Matterport requires proprietary hardware. Planner 5D and RoomSketcher build from scratch, not captured space. AI narration in the viewer is absent from every competitor.

See `.planning/research/FEATURES.md` for full competitor matrix and dependency graph.

### Architecture Approach

The architecture is a Convex-reactive system with three browser surfaces (360° panorama viewer, 3D room editor, floor plan uploader) all backed by Convex queries/mutations/actions. The critical new infrastructure is a GPU job queue: Convex action fires a job to RunPod, returns immediately (fire-and-forget), RunPod processes Gaussian Splatting, then calls back to a Convex HTTP action that writes the completed splat `storageId`. A Convex cron job polls for stragglers. Convex's 10-minute action timeout is the governing constraint — all reconstruction work happens on RunPod, not in the action. State is split cleanly: Convex DB handles persistent shared state (jobs, furniture placements, room geometry); Zustand handles ephemeral viewer state (selected item, camera position, drag state) which must never be written to Convex at animation-frame frequency.

**Major components:**

1. `GaussianSplatViewer` — spark.js `SplatMesh` inside R3F `<Canvas>`; splat is background layer; furniture GLBs are foreground; same WebGL context required for depth compositing
2. `RoomEditor3D` — furniture placement canvas; `<DragControls>` + `<TransformControls>` from existing drei; floor-plane raycasting for Y-axis snap; write to Convex only on drag-end commit
3. `FloorPlan3DViewer` — procedural Three.js geometry from GPT-4o extracted JSON; `buildRoomGeometry()` extrudes walls from 2D coordinates; shares furniture placement UI with Section 2
4. `FurnitureCatalog` — paginated Convex query; lazy GLTF load on "Place" click only (not on browse); dimensional normalization at load time using stored DB dimensions
5. `reconstructionActions.ts` (Convex) — POST to RunPod, store jobId, return immediately; cron polls Luma/RunPod; HTTP action `/gpu-callback` receives worker result
6. `floorPlanActions.ts` (Convex) — PDF rasterize via pdfjs-dist + @napi-rs/canvas; resize image to max 2048px; send to GPT-4o with strict JSON schema; validate schema before storing
7. `CostTracker` — reactive `useQuery` on `furnitureItems.getTotalCost`; auto-refreshes on every placement mutation; state lives in Convex, not Zustand

**Parallel build tracks (can proceed simultaneously):**
- OpenAI floor plan extraction action (independent of GPU pipeline)
- Furniture catalog population with 50–100 Sketchfab CC-licensed GLB models
- CostTracker UI (only needs `furnitureItems` Convex query)

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams and schema additions.

### Critical Pitfalls

1. **Single 360° panoramas are insufficient for Gaussian Splatting** — The feature requires video walkthrough or 10–30 photos from different positions. Uploading an existing single equirectangular panorama produces floating geometry and hallucinated surfaces. Reframe the Section 2 input as "record a room walkthrough" — separate from the existing single-panorama tour photos. Offer a depth-estimation fallback (Depth Anything V2 on Replicate) as a lower-fidelity alternative.

2. **Convex action timeouts will kill reconstruction jobs** — Gaussian Splatting takes 10–30 minutes; Convex actions time out at 10 minutes. Any synchronous wait or polling loop inside the action will produce silent job failures. Use fire-and-forget to RunPod + Convex cron polling + HTTP action callback. This architecture must be built in Section 2 Phase 1 before any UI is constructed on top of it.

3. **Gaussian Splat files require compression before web delivery** — Raw PLY files are 50–250MB; SPZ/SOG compressed files are 5–25MB. Uncompressed delivery produces 10–40 second load times on real connections. Define and enforce SPZ compression in the reconstruction pipeline output before the viewer is built — retrofitting compression after the viewer exists requires storage migration of all existing job outputs.

4. **GPT-4o floor plan extraction produces narrative unless forced to structured JSON** — Without `response_format: json_schema` + `strict: true` and a validator, output varies per call, hallucinates dimensions on sketches, and cannot drive Three.js geometry generation reliably. The user-facing correction step (editable 2D room diagram before 3D generation) is not optional — it prevents 10–30% GPT-4o error rate from producing broken geometry that users blame on the product.

5. **Furniture GLTF scale is inconsistent across sources** — Sketchfab models may use 1 unit = 1mm or 1 unit = 1 inch. Hardcoding scale factors per component is a technical debt trap. Store real-world dimensions (width, depth, height in meters) in the `furnitureCatalog` DB table from day one and normalize at load time via bounding box comparison. Do not ship any catalog item without dimensional metadata.

6. **Three.js components crash Next.js SSR in production** — All 3D viewer components require `'use client'` + `dynamic(() => import(...), { ssr: false })`. The existing `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so TypeScript errors masking SSR issues will not surface at build time. Run `next build` and check Vercel preview deployment before marking any 3D feature complete.

7. **Live Section 1 security risks must be resolved before Section 2 begins** — Plaintext tour passwords in Convex DB and CORS wildcard on HTTP actions are live vulnerabilities. Building Section 2 on top of insecure Section 1 infrastructure expands the attack surface.

See `.planning/research/PITFALLS.md` for full checklist including "Looks Done But Isn't" items and recovery strategies.

---

## Implications for Roadmap

### Phase 1: Section 1 — Tour Platform Stabilization and Differentiation

**Rationale:** Architecture research confirms that Section 1 infrastructure (viewer, lead capture, tour creation flow) must be production-stable before Section 2 builds on top of it. Two live security vulnerabilities (plaintext passwords, CORS wildcard) and a broken revenue flow (lead email notifications) cannot coexist with a Section 2 build sprint. Section 1 differentiators (AI narration, scene descriptions) reuse existing GPT-4o job queue and add no new dependencies — fastest competitive wins with lowest risk.

**Delivers:** Production-stable 360° tour platform with first-to-market AI narration; no live security vulnerabilities; mobile-functional viewer; working lead capture revenue flow.

**Addresses (from FEATURES.md):** Lead email fix, bcrypt password hashing, hotspot visual editor, mobile touch gestures, AI scene descriptions in viewer, AI auto-narration (OpenAI TTS), custom branding on paid plans.

**Avoids (from PITFALLS.md):** Plaintext password risk, CORS wildcard exposure, broken lead revenue.

**Research flag:** Standard patterns — AI TTS via existing Convex action + OpenAI API is well-documented. No deeper research needed.

---

### Phase 2: Section 2 Foundation — GPU Pipeline and Splat Viewer Infrastructure

**Rationale:** Architecture identifies a hard dependency chain within Section 2: schema additions → RunPod + callback wiring → spark.js viewer integration must all be complete before furniture placement or UI work begins. Building the GPU job pipeline first prevents the costliest pitfall (action timeouts + silent job failures discovered after UI is built). SSR safety boundaries for Three.js components must be established on the first component created.

**Delivers:** Working end-to-end reconstruction pipeline: user captures room video → RunPod processes → splat file delivered to browser → renders in R3F canvas. No furniture yet — just the rendering foundation.

**Uses (from STACK.md):** `@sparkjsdev/spark` for splat rendering, RunPod Serverless GPU for nerfstudio/gsplat, Convex HTTP action `/gpu-callback`, Convex cron for polling, SPZ compression in pipeline output.

**Implements (from ARCHITECTURE.md):** `reconstructionJobs` schema, `reconstructionActions.ts`, `/gpu-callback` HTTP action, `GaussianSplatViewer` component, Convex cron polling.

**Avoids (from PITFALLS.md):** Action timeout trap (fire-and-forget + cron pattern), uncompressed PLY delivery (SPZ enforced at output), SSR crash (dynamic import + use client established on first component).

**Research flag:** Needs research-phase during planning — RunPod worker setup, nerfstudio/gsplat configuration, callback authentication pattern, SPZ compression tooling. The Convex + RunPod integration is documented at stack.convex.dev but worker-side implementation details need validation.

---

### Phase 3: Section 2 — Furniture Catalog and Placement System

**Rationale:** Furniture placement depends on the R3F canvas foundation from Phase 2 and requires the catalog to be seeded before any placement feature can be demonstrated. The catalog schema must include dimensional metadata from day one — retrofitting it after 50+ models are ingested is a documented pitfall. Placement, cost tracker, and share link are built together as a unit because they share the `furnitureItems` Convex table.

**Delivers:** Interactive 3D room with draggable/scalable furniture, running cost total, undo stack, catalog search, and a shareable public read-only link. Section 2 is now a shippable product.

**Uses (from STACK.md):** Existing `@react-three/drei` `<DragControls>` + `<TransformControls>`, `useGLTF` with Draco decoder, Convex `furnitureCatalog` + `furnitureItems` tables.

**Implements (from ARCHITECTURE.md):** `RoomEditor3D`, `FurnitureCatalog`, `CostTracker`, `RoomShareModal`, `FurnitureItem` (draggable), floor-snap raycasting, Zustand ephemeral viewer state.

**Avoids (from PITFALLS.md):** Scale inconsistency (dimensional metadata in DB from day one), loading all GLTFs on mount (paginated catalog + lazy load on place), writing Zustand state to Convex at 60fps (commit only on drag-end).

**Research flag:** Standard patterns — drei DragControls, TransformControls, useGLTF are well-documented. Sketchfab batch download script is a one-time build step, not a runtime integration. No deep research needed.

---

### Phase 4: Section 3 — Floor Plan Extraction and 3D Generation

**Rationale:** Section 3 reuses the Section 2 furniture placement system entirely, so Phase 3 must be complete. The GPT-4o extraction pipeline is independent of the GPU reconstruction pipeline and can be partially developed in parallel during Phase 3, but the 3D viewer and furniture flow require Phase 3 completion. The user-correction editor is mandatory before the 3D generation step — this is the single highest-risk UX decision in Section 3 and must be designed as a first-class feature, not an afterthought.

**Delivers:** End-to-end floor plan to walkable 3D: upload any file format → AI extracts rooms → user corrects → 3D generates → furniture placement → publish as tour.

**Uses (from STACK.md):** `pdfjs-dist` v4.x + `@napi-rs/canvas` in Convex Node action, GPT-4o Vision with `response_format: json_schema` + `strict: true`, Three.js `Shape` + `BoxGeometry` for wall extrusion.

**Implements (from ARCHITECTURE.md):** `FloorPlanUploader`, `floorPlanActions.ts`, `roomGeometry.ts`, `FloorPlan3DViewer`, editable room correction step, `ExtractionProgress`.

**Avoids (from PITFALLS.md):** Narrative GPT-4o output (strict JSON schema enforced), missing correction step (built as mandatory intermediate screen), large floor plan images (resize to max 2048px before API call), no result caching (cache by file hash in `conversionJobs`), no rate limiting (add `@convex-dev/rate-limiter` at 5 extractions/user/hour).

**Research flag:** Needs research-phase during planning — pdfjs-dist in Convex Node action compatibility (Node 18 vs v4 vs v5), GPT-4o structured output token costs at scale, Three.js procedural wall extrusion patterns for non-rectangular rooms. The blueprint3d reference (GitHub) needs validation for complex floor plan shapes.

---

### Phase 5: Section 2 and 3 — Post-Launch Differentiators

**Rationale:** After both sections are validated with real users, add the high-complexity differentiators that require the foundation to be stable: AI furniture placement suggestions (needs seeded catalog + tested placement), heatmap analytics (needs viewer instrumentation), multilingual narration (needs English narration validated), room-to-room hotspot links in 3D reconstruction.

**Delivers:** Competitive moat features that no competitor has — AI suggests furniture layout in a real captured room; buyers see room-by-room attention analytics; narration in Hindi/Tamil/Telugu for Indian market.

**Research flag:** AI furniture placement suggestions will need its own research-phase — GPT-4o Vision on room geometry + catalog matching is not a documented pattern; prompt engineering and accuracy validation needed.

---

### Phase Ordering Rationale

- Section 1 completion gates Section 2 start: live security bugs and broken lead flow cannot coexist with a new build sprint
- GPU pipeline gates everything in Section 2: furniture cannot be built until the splat viewer renders
- Furniture catalog gates furniture placement, cost tracker, AI suggestions, and Amazon augmentation — all in parallel dependency
- Floor plan extraction (GPT-4o + correction editor) gates 3D generation — extraction accuracy gates user trust in the entire Section 3 value proposition
- Section 2 furniture placement system is the shared dependency for Section 3: build once, reuse completely

### Research Flags

**Needs deeper research during planning:**
- Phase 2 (GPU Pipeline): RunPod worker configuration, nerfstudio/gsplat pipeline parameters, SPZ compression tooling, Convex callback authentication for worker
- Phase 4 (Floor Plan): pdfjs-dist Node 18 compatibility confirmation, Three.js procedural geometry for complex non-rectangular room shapes, GPT-4o extraction accuracy testing on real-world degraded inputs

**Standard patterns (skip research-phase):**
- Phase 1 (Tour Stabilization): bcrypt in Convex mutation, OpenAI TTS via action, hotspot editor with existing marker plugin
- Phase 3 (Furniture Catalog + Placement): drei DragControls/TransformControls documented and stable, Sketchfab batch download is a build-time script
- Phase 5 (Differentiators): multilingual TTS is a language parameter change; room-to-room hotspots reuse existing hotspot data model

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core packages (spark.js, R3F, Draco, pdfjs-dist) are well-documented. Luma AI 3D Capture API availability is LOW confidence — docs show video/image generation only as of March 2026. @lumaai/luma-web v0.2.2 was last published 2023; Three.js 0.183 compatibility unverified. |
| Features | MEDIUM | Competitor analysis from public sources. No access to internal Matterport/Kuula feature roadmaps. Indian market demand for multilingual narration is directionally correct but not validated with user research. |
| Architecture | MEDIUM-HIGH | GPU job queue pattern (RunPod + Convex callback) is documented at stack.convex.dev with HIGH confidence. spark.js integration is verified via official docs. Convex action 10-min timeout is a documented hard limit. Main uncertainty: RunPod worker side implementation and SPZ compression tooling specifics. |
| Pitfalls | MEDIUM | Splat file size and format pitfalls verified via Three.js community and official library docs. Single-panorama limitation confirmed via Pano2Room academic paper (not a production post-mortem). GPT-4o spatial reasoning limitations documented in academic review. Amazon PA-API eligibility via community blog, not official docs. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Luma AI 3D API availability:** Confirm whether Luma's 3D Capture API (captures.lumalabs.ai) is operational and accepting programmatic submissions before committing Phase 2 to this dependency. If unavailable, RunPod + nerfstudio is the confirmed primary pipeline. Validate in the first week of Phase 2 planning.

- **pdfjs-dist Node 18 compatibility:** Convex runs Node 18; pdfjs-dist v5.x may require Node 20+. Pin to v4.x or confirm v5.x Node 18 support before building the floor plan extraction action. Validate before Phase 4 begins.

- **Gaussian Splatting quality on interior panoramas:** Real estate interior rooms (small spaces, reflective surfaces, windows) are notoriously challenging for NeRF/Gaussian Splatting. The reconstruction quality on typical Indian apartment interior photos needs early validation — a failed quality bar in Phase 2 may require the depth estimation fallback to become the primary path.

- **@lumaai/luma-web Three.js 0.183 compatibility:** The package was last published with three 0.155 as the documented target. Either verify compatibility or commit to spark.js as the exclusive splat viewer before Phase 2 viewer work begins.

- **Amazon Creators API onboarding friction:** PA API 5 is deprecated April 2026. Creators API is the path forward but may have approval delays. Evaluate during Phase 3 catalog work; do not block furniture launch on Amazon integration.

---

## Sources

### Primary (HIGH confidence)
- Convex action timeout (10 min): https://docs.convex.dev/functions/actions
- Convex GPU + RunPod workflow: https://stack.convex.dev/convex-gpu-runpod-workflows
- Convex background job management: https://stack.convex.dev/background-job-management
- OpenAI Structured Outputs (strict mode): https://platform.openai.com/docs/guides/structured-outputs
- spark.js GitHub (v2.0, June 2025): https://github.com/sparkjsdev/spark
- mkkellogg/GaussianSplats3D: https://github.com/mkkellogg/GaussianSplats3D
- Amazon PA-API seller docs (no 3D models): https://sellercentral.amazon.com/help/hub/reference/external/G7RGSNQFZ2BAG7K3
- Spazeo CONCERNS.md internal audit (2026-03-09): live codebase

### Secondary (MEDIUM confidence)
- Gaussian Splatting SPZ/SOG compression ratios: https://reading.torqsoftware.com/notes/software/graphics/gaussian-splatting/2025-11-12-gaussian-splats-web-ready-technical-implementation/
- spark.js SplatMesh docs: https://sparkjs.dev/docs/splat-mesh/
- Luma AI pricing ($1/scene): https://aimlapi.com/models/luma
- Sketchfab Download API (CC license GLB): https://sketchfab.com/developers/download-api
- Three.js furniture drag/collision (community): https://discourse.threejs.org
- GPT-4o Vision spatial reasoning limits: https://openreview.net/forum?id=h3unlS2VWz
- Three.js performance optimization: https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
- Blueprint3D reference (floor plan to Three.js): https://github.com/furnishup/blueprint3d
- Competitor analysis: Capterra/G2/TrustRadius reviews (Kuula, Matterport, Planner 5D, RoomSketcher) accessed 2026

### Tertiary (LOW confidence)
- Luma AI 3D Capture API availability (March 2026): docs show video/image generation only — 3D Capture endpoint unconfirmed. Validate before Phase 2 commitment.
- Pano2Room single-panorama reconstruction limits: https://arxiv.org/html/2408.11413v1 — academic paper, not production API behavior
- Amazon PA-API eligibility requirements: https://www.keywordrush.com/blog/amazon-pa-api-associatenoteligible-error — community blog, not official docs
- @lumaai/luma-web Three.js 0.183 compatibility: unverified, last published 2023

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
