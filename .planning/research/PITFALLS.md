# Pitfalls Research

**Domain:** AI 3D room reconstruction from panoramas + browser furniture placement (real estate SaaS)
**Researched:** 2026-03-09
**Confidence:** MEDIUM — Gaussian Splatting web deployment and GPT-4o floor plan extraction are fast-moving areas; specific production failure modes verified via official docs and community sources; some claims are MEDIUM confidence due to limited public post-mortems.

---

## Critical Pitfalls

### Pitfall 1: Gaussian Splatting Output Is Not Directly Renderable in Three.js

**What goes wrong:**
The team assumes that after Luma AI reconstructs a scene, the output can be dropped into the existing Three.js/R3F viewer as a GLTF/GLB file. In reality, Gaussian Splatting outputs `.splat` or `.ply` files — not standard mesh formats. Three.js does not natively render splat files. A separate WebGL rendering path must be built using a library like `@mkkellogg/gaussian-splats-3d` or the Luma WebGL Library, neither of which integrates with the existing R3F/drei scene graph without careful isolation. Attempting to mix splat renderers with standard Three.js objects (furniture GLTF models) in the same canvas requires explicit depth compositing — a problem most tutorials do not address.

**Why it happens:**
Developers conflate "3D output" with "mesh output." Luma AI does export GLTF/USDZ/OBJ, but these are baked meshes from the reconstruction — they lose the photorealistic quality that makes Gaussian Splatting valuable. The splat format IS the high-quality output.

**How to avoid:**
Decide upfront whether the deliverable is a splat-based volumetric render or a baked mesh. If splat:
- Use `@mkkellogg/gaussian-splats-3d` (Three.js-based splat viewer with active maintenance as of 2025).
- Render splats in a separate canvas or use the library's compositing approach to overlay furniture GLTF models.
- Accept that mobile performance will be substantially limited — target desktop browsers first for splat mode.
If mesh:
- Use Luma AI's GLTF export pipeline; compress with Draco/Meshopt via `gltf-pipeline`.
- Lose some visual fidelity but gain full R3F/drei integration and furniture overlay capability.

**Warning signs:**
- Team refers to "exporting the splat as GLTF" as if this preserves quality.
- Initial prototype loads a `.ply` or `.splat` file into standard GLTFLoader and shows nothing.
- Performance is fine in screenshots but drops to <10 FPS when actually tested in browser.

**Phase to address:**
Section 2, Phase 1 (3D Reconstruction foundation). Must be resolved before any furniture placement work begins, because the rendering architecture choice affects everything downstream.

---

### Pitfall 2: Splat File Sizes Make Web Delivery Impractical Without Compression Strategy

**What goes wrong:**
A single room reconstruction generates splat files ranging from 50MB to 250MB uncompressed (PLY format). Even with SPZ compression (~90% reduction, ~25MB), streaming a 3D room to a browser on a typical real estate buyer's connection takes 10–40 seconds before anything renders. Users interpret this as a broken page and leave. The problem compounds if tours have multiple rooms — each scene transition triggers another large download.

**Why it happens:**
Local development uses localhost (no latency) and developer hardware (fast GPU). The file loads instantly. The team ships without testing on throttled connections or mid-range mobile devices.

**How to avoid:**
- Use SOG (Splat Optimized Graphics) or SPZ format — not raw PLY — for all web delivery. These achieve 90–95% size reduction.
- Implement progressive streaming: render a low-LOD preview immediately, then swap to high-resolution as data arrives. The `@mkkellogg/gaussian-splats-3d` library supports this.
- Store compressed splat files in Convex file storage and serve via CDN edge caching (Vercel's CDN in front of Convex storage URLs).
- Test with Chrome DevTools throttled to "Slow 4G" before considering any reconstruction feature done.
- Set a hard limit: if compressed splat file exceeds 30MB, trigger a re-reconstruction job with reduced splat count.

**Warning signs:**
- The conversionJobs pipeline stores raw PLY output without a compression step.
- Lighthouse mobile performance score is below 50 on the tour viewer.
- First Contentful Paint for the 3D viewer exceeds 5 seconds in testing.

**Phase to address:**
Section 2, Phase 1 (3D Reconstruction foundation) — define the file format and compression pipeline before building the viewer. Retrofitting this after furniture placement is built causes a full viewer rebuild.

---

### Pitfall 3: Gaussian Splatting Requires Multiple Photos at Specific Angles — Single Panoramas Produce Artifacts

**What goes wrong:**
The project pitch describes uploading existing 360° panorama photos and getting a navigable 3D room back. In practice, Gaussian Splatting reconstruction (including Luma AI's pipeline) requires multiple overlapping photos from varied positions and angles to triangulate depth. A single equirectangular panorama taken from one fixed point provides only one vantage — depth is inferred, not measured. Results from single-panorama reconstruction contain:
- Floated geometry (objects appear to hover).
- Inpainted "hallucination" on occluded surfaces (walls behind furniture are AI-generated guesses).
- Scale ambiguity (the system cannot determine actual room dimensions without reference).

The Pano2Room research paper confirms this: single-panorama reconstruction is state-of-the-art research, not production-grade API output.

**Why it happens:**
Marketing from Luma AI and similar tools shows beautiful reconstructions from phone walkthroughs — video captured while moving through a space, providing hundreds of overlapping frames. Users conflate "360° photo" (single point) with "360° walkthrough video" (many positions). The PROJECT.md explicitly states "uploads existing 360° panorama photos" — these are single-position shots.

**How to avoid:**
Reframe the feature: the input must be a video walkthrough of the room (or a set of 10–30 photos taken at different positions), not the existing single-point equirectangular panoramas already in the tour system. The flow becomes:
1. User records a short walkthrough video of the room (30–60 seconds).
2. Luma AI API ingests the video and returns the 3D reconstruction.
3. The existing 360° panorama photos are used for the 2D virtual tour (Section 1); the video is used for 3D reconstruction (Section 2).

Alternatively: offer a lower-fidelity mode using single panorama + depth estimation (models like `Depth Anything V2` on Replicate) that generates a pseudo-3D scene — visually convincing for furniture placement but not geometrically accurate.

**Warning signs:**
- Onboarding UI asks user to "select an existing tour photo" as input for 3D reconstruction.
- First reconstruction demo uses a single panorama and produces floating geometry.
- Luma API call uses the `imageStorageId` from an existing scene record as the only input.

**Phase to address:**
Section 2, Phase 1 — define input requirements before building any UI. The upload/capture flow design depends entirely on resolving this.

---

### Pitfall 4: GPT-4o Extracts Floor Plan Geometry as Description, Not Structured Data

**What goes wrong:**
When GPT-4o Vision is asked to "read a floor plan," it returns a natural language description like "The living room appears to be approximately 5 by 4 meters, with a door on the north wall and two windows facing east." Converting this narrative into precise Three.js geometry requires a second parsing step. The common mistake is passing the raw text description directly to Three.js wall-generation code. Without a strict JSON schema in the prompt and explicit coordinate extraction, the output varies between requests, hallucinates dimensions, conflates room adjacency with physical connectivity, and cannot reliably distinguish load-bearing walls from partition walls.

For hand-drawn sketches and low-quality PDFs, accuracy degrades sharply: GPT-4o struggles with non-standard symbols, hand annotations, and skewed perspectives.

**Why it happens:**
Demos in controlled conditions use clean, professional floor plan PDFs with standard architectural notation. Production inputs are photos of hand-drawn sketches, scanned blueprints, and real estate brochure PDFs with mixed image/text content. Developers do not test degraded inputs until after building the parsing pipeline.

**How to avoid:**
- Engineer the GPT-4o prompt to return ONLY structured JSON: `{ rooms: [{ name, width_m, length_m, walls: [...], doors: [...], windows: [...] }] }`.
- Validate the JSON schema before passing to Three.js. Reject responses that do not conform.
- Build a two-pass pipeline: GPT-4o generates a draft schema, a deterministic validator checks for physically impossible values (negative dimensions, rooms that overlap, total area impossibly large), then flags failures for user correction.
- Offer users a manual correction step: render the extracted rooms as a 2D diagram with editable handles before generating 3D.
- Test with 5 real-world inputs (photo of hand sketch, agent-printed PDF, CAD-generated DWG screenshot, JPG scan, phone photo of whiteboard drawing) before shipping.

**Warning signs:**
- The extraction prompt instructs GPT-4o to "describe the floor plan layout."
- The Three.js generation code parses natural language strings like "5 by 4 meters" with a regex.
- Room dimensions vary by 10–30% between two API calls on the same input image.
- No validation step exists between GPT-4o output and Three.js geometry generation.

**Phase to address:**
Section 3, Phase 1 (Floor plan extraction). This is the highest-risk single step in Section 3. A manual correction UI must be planned from the start, not added as a hotfix.

---

### Pitfall 5: Three.js Furniture GLTF Models Have No Scale Reference — Everything Is Wrong Size

**What goes wrong:**
GLTF models from Sketchfab, manufacturer CAD exports, and AI-generated sources use inconsistent coordinate scales. A sofa model might be 1 Three.js unit = 1 meter (correct), 1 unit = 1 centimeter (100x too small), or 1 unit = 1 inch (2.54x off). When placed into a reconstructed room, a sofa appears as either a doll's toy or fills the entire room. Users cannot intuitively understand why. The problem compounds with models from different sources — a chair from one vendor is 50x the scale of a table from another.

**Why it happens:**
GLTF spec does not mandate a unit system. Three.js assumes 1 unit = 1 meter by convention, but many exporters do not follow this. Asset packs from game-oriented sources (Unity Asset Store, Sketchfab free tier) are particularly inconsistent.

**How to avoid:**
- Define a canonical scale: 1 Three.js unit = 1 meter. Enforce at import time.
- Store real-world dimensions (width, depth, height in meters) in the furniture catalog database alongside the GLTF model reference. Use these stored dimensions to compute a normalization scale factor at load time: `model.scale.setScalar(storedWidth / measuredBoundingBoxWidth)`.
- On catalog ingestion, run an automated script that measures each model's bounding box, flags models with dimensions outside expected furniture size ranges (0.3m – 5m on longest axis), and requires human review before publishing.
- Use `drei`'s `useBounds()` hook during development to quickly inspect model sizes.

**Warning signs:**
- The furniture catalog stores only GLTF file references with no dimensional metadata.
- First furniture placement demo places a sofa at incorrect scale and the fix is a manual `model.scale.set(0.01, 0.01, 0.01)` in component code.
- Different catalog items use different hardcoded scale factors in JSX.

**Phase to address:**
Section 2, Phase 2 (Furniture catalog setup). Dimensional metadata must be part of the catalog schema from day one — migrating hundreds of existing catalog entries later is painful.

---

### Pitfall 6: Next.js SSR Crashes on Three.js / Canvas Initialization

**What goes wrong:**
Three.js, `@react-three/fiber`, and Gaussian Splat viewer libraries all access `window`, `document`, and WebGL context at import time or in module-level initialization. When Next.js App Router attempts to server-render a page containing these components, it throws `ReferenceError: window is not defined`. This is especially subtle because the error only appears in production builds (where SSR is not skipped), not in `npm run dev` (which may run in a mode that defers SSR).

**Why it happens:**
Developers copy examples from library documentation that assume a pure client-side context. The pattern works in Vite/CRA apps, breaks in Next.js App Router. The existing codebase already uses `'use client'` on viewer components — but new AI 3D viewer components may miss this, or import a splat library at the top level of a shared utility file that is also imported in server components.

**How to avoid:**
- All 3D viewer components must have `'use client'` at the top of the file.
- Never import Three.js, R3F, or splat viewer libraries in files that are (or could become) Server Components.
- Wrap the 3D viewer in `dynamic(() => import('./ThreeDViewer'), { ssr: false })` as a belt-and-suspenders defense.
- Add a build-time test: run `next build` and check for SSR errors before any 3D feature is considered complete.

**Warning signs:**
- `ReferenceError: window is not defined` appears in Vercel build logs but not in local dev.
- A utility function shared between the AI analysis pipeline and the viewer imports Three.js.
- `next.config.ts` already has `typescript.ignoreBuildErrors: true` — TypeScript errors masking SSR issues go undetected.

**Phase to address:**
Section 2, Phase 1 — establish the `'use client'` boundary and `dynamic()` import patterns in the first component created. Catching this in Phase 1 prevents silent failures in every subsequent component.

---

### Pitfall 7: Convex Action Timeouts Kill Long-Running 3D Reconstruction Jobs

**What goes wrong:**
Convex Actions have a 10-minute timeout. Luma AI's 3D reconstruction pipeline takes 3–15 minutes for a room-scale scene (documented average). If the Convex action waits synchronously for the Luma API job to complete, it will time out for any complex scene — leaving the job in a `processing` state with no completion, no error recorded, and no user feedback.

**Why it happens:**
The existing AI job queue pattern (create job → schedule action → process → auto-update) works fine for OpenAI and Replicate calls that complete in seconds. Luma AI reconstruction is asynchronous — the API call to submit the job returns a `job_id` immediately, and completion must be polled. Developers familiar with the existing pattern assume the same approach works for Luma.

**How to avoid:**
- Use Luma AI's webhook callback (if available) or polling via Convex cron jobs:
  1. Convex action submits the job to Luma API → stores `lumaJobId` + status `submitted` → returns immediately (within seconds).
  2. Convex cron job polls `api.luma/jobs/{lumaJobId}` every 60 seconds.
  3. When Luma returns `completed`, cron job downloads the output, stores it in Convex file storage, and updates job status.
- Never `await` an external reconstruction API that may take >5 minutes inside a single Convex action.
- The existing `aiJobs` table already has `status`, `input`, and `output` fields — extend it with `externalJobId` for storing Luma's job reference.

**Warning signs:**
- The Convex action for reconstruction contains a `while (!done) { await sleep(5000) }` polling loop.
- Jobs consistently show `processing` status and never complete in production.
- Convex dashboard shows action timeout errors for the reconstruction function.

**Phase to address:**
Section 2, Phase 1 (3D Reconstruction foundation). The cron-based polling architecture must be established before any UI or user-facing flow is built on top of reconstruction.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store raw PLY/splat files without compression | Simpler pipeline, fewer moving parts | 100–250MB files per room, CDN costs explode, user load times unacceptable | Never — compress at pipeline output, always |
| Hardcode furniture model scale factors in JSX components | Gets the demo looking right quickly | Every new model needs a custom fix, catalog becomes untestable | Never — store dimensions in DB and normalize at load time |
| Skip the user-correction step in floor plan extraction | Faster shipping | GPT-4o errors (10–30% on real inputs) propagate to broken 3D geometry, users blame the product | Never for production; acceptable in internal demos only |
| Await Luma API synchronously inside one Convex action | Simpler code, fewer moving parts | Production job timeout failures for any complex scene | Never — asynchronous polling via cron is mandatory |
| Use raw PLY for development, compress "later" | Fast local iteration | Compression is not trivial to add post-hoc (changes storage IDs, requires migration of existing jobs) | Acceptable for earliest internal prototypes only; must be resolved before beta |
| Load all furniture catalog items into the scene graph at mount | Simpler state management | 50+ items × multi-MB models = browser tab crash on mid-range devices | Never — use lazy loading keyed on catalog scroll position or search results |
| Duplicate the AI action pattern from `aiActions.ts` for reconstruction | Faster to copy-paste | Known concern in CONCERNS.md: duplicate implementations require double maintenance | Never — refactor existing duplicates AND avoid creating new ones |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Luma AI API | Treating it like OpenAI (synchronous response) | Submit job → get `job_id` → poll or use webhook for completion; never await inline |
| Luma AI API | Sending a single panorama image as input | Input must be a video or multi-image ZIP from different positions; single panoramas produce floating geometry |
| Amazon PA-API | Assuming it returns 3D model URLs | PA-API returns product data and standard images only — no 3D models; 3D models are a seller-uploaded feature not accessible via affiliate API |
| Amazon PA-API | Building without meeting the pre-conditions | API requires 3 qualifying sales in the past 180 days; a new account will receive `AssociateNotEligible` errors even in production |
| Replicate | Hardcoding model version hashes | Already a known concern in CONCERNS.md; model versions are deprecated regularly; store as Convex env vars |
| Convex file storage | Passing 3D output files through action return values | Action return values are limited to 16 MiB; any splat file will exceed this; always upload to storage and return only the `storageId` |
| GPT-4o Vision | Sending high-resolution floor plan images without resizing | Large images consume many tokens per call; a 4000×3000 PDF page costs ~1700 tokens in image alone; resize to max 2048px on longest edge before sending |
| Three.js + Next.js | Importing viewer components in Server Components | Causes `window is not defined` crash at build time; all 3D components require `'use client'` + `dynamic(() => import(...), { ssr: false })` |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all furniture catalog GLTF models on page mount | Page freezes for 5–15 seconds; high memory usage; mobile tab crash | Lazy load only models visible in the catalog scroll window; use Suspense + loading states | At 20+ catalog items (~5MB each = 100MB+) |
| Rebuilding Three.js scene graph on every furniture state change (e.g., React re-renders) | Stuttering when moving furniture; FPS drops on add/remove | Keep the Three.js scene graph in a ref, not React state; use Zustand for furniture placement state, sync to Three.js imperatively | From the first state update in a naive implementation |
| Splat viewer + GLTF furniture in the same WebGL context without depth management | Furniture appears inside walls or behind room geometry | Render splat in a dedicated layer/canvas; composite GLTF furniture on top using transparent overlay or shared depth buffer with explicit render order | Visible on first attempt without planning |
| GPT-4o floor plan extraction without result caching | Same PDF re-processed on every page navigation; costs accumulate | Cache extraction results in the `conversionJobs` table keyed by file hash; never re-call GPT-4o for an identical input | At 100+ extractions/month (meaningful API cost) |
| Storing 3D scene data as a single Convex document | Cannot store scenes larger than 1 MiB | Store geometry as JSON file in Convex file storage; reference by `storageId` in the document | At any non-trivial room complexity |
| Analytics tracking on every camera move event in the 3D viewer | Thousands of Convex mutation calls per session; rate limiting; inflated analytics | Debounce camera move events to max 1 call per 5 seconds; use client-side batching | At first user session in a responsive 3D viewer |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Plaintext tour passwords (already exists in codebase) | Any Convex DB read access exposes all passwords; if Clerk is compromised, passwords are readable | Hash with `bcrypt` or `argon2` server-side in the Convex mutation; store only the hash; compare on verification (fix in Section 1 before Section 2) |
| Public furniture placement links with no session binding | Any user with the share link can modify the furnished room view in real time if mutations are not scoped | Furnishing save state must be tied to a `userId` or a one-time session token; shared links are read-only views |
| 3D model files served without signed URLs | Competitors can directly download proprietary 3D assets from public Convex storage URLs | Use Convex's `storage.getUrl()` only for authenticated contexts; for public tour viewers, generate short-lived signed download tokens if models are proprietary |
| No rate limiting on GPT-4o extraction endpoint | A malicious user uploads thousands of files to exhaust OpenAI credits | Add Convex rate limiter (`@convex-dev/rate-limiter`) on the floor plan extraction action; limit to 5 extractions per user per hour |
| CORS wildcard on Convex HTTP actions (already exists) | Any site can call lead capture, spam analytics, inject fake leads | Restrict `Access-Control-Allow-Origin` to `https://spazeo.io` and any known embed domains (fix in Section 1) |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during 3D reconstruction (which takes 3–15 minutes) | Users assume the page is broken, close the tab, and the job is lost | Show a persistent progress indicator with a realistic time estimate; send an email notification via Resend when reconstruction completes |
| Furniture placement with no snap-to-floor or wall-collision feedback | Furniture floats in mid-air or clips through walls; space looks unrealistic | Implement floor-plane raycasting for Y-axis locking; add soft bounding box collision for walls; visual snap feedback (highlight when near wall) |
| No undo/redo in furniture placement | User accidentally moves a chair, cannot recover original position without removing and re-adding | Implement a simple undo stack (array of furniture placement states, max 20 entries) using Zustand |
| Scale ambiguity — user does not know if placed furniture is the right size | A 3m sofa in a 4m room looks fine in the viewer but is absurd in reality | Show real-world dimensions on selection (e.g., "180cm × 90cm" label in the viewer); use the actual room dimensions from reconstruction to provide scale grid overlay |
| Floor plan extraction shows raw GPT-4o output to users | Error messages like "JSON parse failed" or "Room dimensions appear inconsistent" expose internal errors | Show only human-readable states: "Reading your floor plan…", "Verify your rooms below before generating 3D", "Something didn't look right — try a clearer photo" |
| Sharing a 3D furnished room that includes real-time furniture GLTF downloads for every viewer | Slow load for share recipients; multiple GB in model downloads per share | Pre-bake the furnished view as a high-quality screenshot/render for social sharing; offer the interactive 3D only to logged-in users |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **3D Reconstruction:** The conversion pipeline creates a job record and updates status — verify that actual Luma API calls are made, output is stored in Convex file storage, and the front-end viewer renders the result (currently the conversionJobs pipeline is a stub per CONCERNS.md).
- [ ] **Furniture Placement:** Models appear in the viewer — verify scale is normalized against real-world dimensions stored in the catalog DB, not hardcoded per component.
- [ ] **Floor Plan Extraction:** GPT-4o returns a room description — verify output is validated as structured JSON with physically plausible dimensions before Three.js geometry is generated.
- [ ] **Share Link for Furnished Room:** The URL is generated — verify the shared view is read-only (no mutation access), loads without authentication, and renders furniture models without requiring the original user's session.
- [ ] **Convex Action for Reconstruction:** Action is invoked — verify it completes without timeout, handles Luma API polling via cron (not inline await), and correctly updates job status on both success and failure.
- [ ] **Furniture Catalog Amazon Integration:** Product links are displayed — verify the Amazon PA-API account meets the 3 qualifying sales requirement and is not returning `AssociateNotEligible` errors in production.
- [ ] **Cost Tracker:** Items added show a running total — verify the cost is read from the catalog DB (not the GLTF model), updates in real time as items are added/removed, and persists correctly when the session is saved.
- [ ] **Mobile Viewer:** 3D viewer renders on desktop — verify performance on a mid-range Android device (throttled CPU/GPU); Gaussian Splat rendering may be entirely non-functional on mobile WebGL.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Splat files stored uncompressed at production scale | HIGH | Write a one-time migration job that re-downloads each stored PLY, compresses to SPZ, uploads back to Convex storage, updates `storageId` references in job records. Estimate 1–2 days engineering + CDN egress cost for migration. |
| Furniture catalog has no dimensional metadata | MEDIUM | Add `width_m`, `depth_m`, `height_m` fields to the `buildingUnits`/furniture catalog schema. Run a batch job to load each GLTF, measure bounding box, and auto-populate dimensions. Flag for human review if auto-measurement falls outside expected ranges. |
| Convex actions timing out on reconstruction jobs | MEDIUM | Extract the polling loop into a cron job. Existing job records are still valid; re-queue failed jobs for re-processing. No data migration needed, only code change. |
| GPT-4o floor plan extraction producing unreliable geometry | MEDIUM | Add a user-facing correction step (editable 2D room diagram) as a mandatory intermediate screen before 3D generation. Existing broken extractions cannot be auto-fixed; users must re-submit or manually correct. |
| Next.js SSR crashes on 3D viewer in production | LOW | Wrap the failing component with `dynamic(() => import(...), { ssr: false })`. Deploy fix. No data impact. |
| Amazon PA-API account not eligible | LOW-MEDIUM | Use a curated internal catalog only (already the planned fallback per PROJECT.md). Display manual Amazon search links instead of affiliate links until eligibility is established. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Splat format not renderable in Three.js | Section 2, Phase 1 — 3D Reconstruction foundation | A `.splat` file renders in the browser viewer with furniture GLTF overlaid correctly |
| Splat file sizes impractical without compression | Section 2, Phase 1 — 3D Reconstruction foundation | End-to-end test: reconstruction output compressed to <30MB, loads in <10s on throttled 4G |
| Single panorama input insufficient for Gaussian Splatting | Section 2, Phase 1 — input capture design | Upload flow requires video or multi-image capture; single panorama is rejected or routes to depth-estimation fallback |
| GPT-4o returns narrative, not structured geometry | Section 3, Phase 1 — floor plan extraction | Extraction returns validated JSON schema; user correction step is rendered before 3D generation |
| GLTF furniture scale inconsistency | Section 2, Phase 2 — furniture catalog setup | All catalog items have dimensional metadata; placed furniture matches real-world dimensions within 5% |
| Three.js SSR crash in Next.js | Section 2, Phase 1 — first viewer component | `next build` completes without SSR errors; viewer renders in Vercel preview deployment |
| Convex action timeout on reconstruction | Section 2, Phase 1 — reconstruction job architecture | A reconstruction job submitted via UI completes in Convex dashboard without timeout error |
| Plaintext tour passwords | Section 1 (pre-Section 2) — existing bug fix | `verifyTourPassword` in `convex/tours.ts` performs hash comparison; raw password not visible in Convex DB |
| No rate limiting on extraction endpoint | Section 3, Phase 1 — floor plan extraction | Rate limiter rejects a user who submits >5 extraction requests within 1 hour |
| Furniture loads crashing mid-range devices | Section 2, Phase 3 — performance validation | Lighthouse mobile score >60; viewer tested on real Android device with no tab crash |

---

## Sources

- Convex official limits documentation: https://docs.convex.dev/production/state/limits — Convex action timeouts (10 min), memory (512 MiB Node.js runtime), document size (1 MiB), HTTP action response (20 MiB). HIGH confidence.
- Gaussian Splatting WebGL implementation and file size: https://reading.torqsoftware.com/notes/software/graphics/gaussian-splatting/2025-11-12-gaussian-splats-web-ready-technical-implementation/ — SPZ format, SOG format, 90–95% compression ratios. MEDIUM confidence (single source).
- Three.js Gaussian Splat viewer (mkkellogg): https://github.com/mkkellogg/GaussianSplats3D — active Three.js-based splat viewer library. HIGH confidence.
- Luma WebGL Library: https://lumalabs.ai/luma-web-library — Three.js integration, streaming, interoperability with standard WebGL. MEDIUM confidence.
- Luma AI API pricing and input requirements: https://aimlapi.com/models/luma — video/multi-image input, $1/scene pricing. MEDIUM confidence.
- Pano2Room single panorama reconstruction limits: https://arxiv.org/html/2408.11413v1 — research-grade approach, inference <1 min but hallucinates occluded surfaces. MEDIUM confidence (academic paper, not production API).
- Three.js furniture placement collision/snapping challenges: https://discourse.threejs.org/t/collision-with-walls-floors-objects-furniture-in-room-when-using-transform-controls/60049 — community-documented ongoing challenge. MEDIUM confidence.
- GPT-4o Vision limitations (precision, structured extraction): https://openreview.net/forum?id=h3unlS2VWz — poor spatial reasoning and precision for tasks requiring exact measurements. MEDIUM confidence.
- Three.js performance — draw calls, memory leaks, texture disposal: https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/ — 1000 draw call threshold, undisposed texture memory leaks. MEDIUM confidence.
- Amazon PA-API 3D model limitations: https://sellercentral.amazon.com/help/hub/reference/external/G7RGSNQFZ2BAG7K3 — 3D models are seller-uploaded, not exposed in affiliate API. HIGH confidence (official Amazon seller docs).
- Amazon PA-API eligibility (`AssociateNotEligible`): https://www.keywordrush.com/blog/amazon-pa-api-associatenoteligible-error-is-there-a-new-10-sales-rule/ — 3 qualifying sales in 180 days required. MEDIUM confidence (community blog, not official docs).
- Spazeo CONCERNS.md (internal analysis, 2026-03-09): Stripe webhook stubs, 3D conversion pipeline stub, duplicate AI actions, plaintext passwords, leads auth bypass. HIGH confidence (direct codebase audit).

---
*Pitfalls research for: AI 3D room reconstruction from panoramas + browser furniture placement (Spazeo Section 2 & 3)*
*Researched: 2026-03-09*
