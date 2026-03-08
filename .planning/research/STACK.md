# Stack Research

**Domain:** AI-powered 3D room reconstruction, furniture placement, and floor plan extraction — added to existing Next.js 16 + Convex + Three.js app
**Researched:** 2026-03-09
**Confidence:** MEDIUM (Luma AI 3D API has reduced public documentation in 2025; splat viewer ecosystem is fast-moving)

---

## Context: What Already Exists

The following are locked-in and must not be replaced:

| Layer | Current | Version |
|-------|---------|---------|
| Frontend | Next.js (App Router) | 16.1.6 |
| Backend | Convex (queries, mutations, actions, job queue) | 1.32.0 |
| Auth | Clerk + convex/react-clerk | @clerk/nextjs 6.38.2 |
| 3D runtime | Three.js + React Three Fiber + Drei | three 0.183.1 / R3F 9.5.0 / drei 10.7.7 |
| AI | OpenAI GPT-4o (via fetch in Convex actions) | gpt-4o |
| Staging AI | Replicate (Stable Diffusion) | via REPLICATE_API_TOKEN |
| Payments | Stripe | 20.3.1 |

All additions below extend this stack. Nothing replaces it.

---

## Recommended Stack — New Additions

### Domain 1: AI 3D Room Reconstruction from Panoramas

#### Primary: Luma AI NeRF/Gaussian Splatting API

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Luma AI Capture API | REST (no SDK, call via fetch) | Submit panorama video/images, receive 3D scene | Only production-ready API offering Gaussian Splatting output as GLB + splat from video input at $1/scene. Already in the project's tech stack per CLAUDE.md and PROJECT.md decisions. Output formats include GLB, USDZ, OBJ — all usable in Three.js. |
| `@lumaai/luma-web` | 0.2.2 | Render Luma-generated Gaussian Splat scenes in Three.js/R3F | Official Luma library; provides `LumaSplatsThree` (Three.js Object3D subclass) and `LumaSplatsWebGL` (framework-agnostic). Integrates with R3F via `extend()`. Renders streamed splat files (8–20MB) browser-side without server-side rendering. |

**Confidence:** MEDIUM. `@lumaai/luma-web` v0.2.2 was last published ~2 years ago (2023). The package is functional but Luma has shifted focus toward Dream Machine (video generation). The 3D Capture API at captures.lumalabs.ai still exists and costs ~$1/scene; confirm it remains active before committing the milestone to this API. If unavailable, use GaussianSplats3D + self-hosted/Polycam pipeline (see Alternatives).

#### Fallback Viewer: @sparkjsdev/spark or @mkkellogg/gaussian-splats-3d

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@sparkjsdev/spark` | 0.1.10 (stable) | Render .splat / .ply / .ksplat / .spz / .sog files in Three.js | More actively maintained than @lumaai/luma-web as of 2025. Supports most splat formats. Integrates with Three.js renderer pipeline; R3F integration via `extend()` is demonstrated in sparkjsdev/spark-react-r3f. Use if Luma web library has compatibility issues with Three.js 0.183+. |
| `@mkkellogg/gaussian-splats-3d` | latest | Alternative splat viewer | Older, battle-tested. Drop-in Three.js viewer. Has documented R3F integration issues; use only as last resort. |

**Integration pattern for both:** Convex Action (marked `"use node"`) calls Luma API → receives scene URL → stores URL in `conversionJobs` table → frontend loads splat URL via `@lumaai/luma-web` or `@sparkjsdev/spark` in the R3F canvas.

---

### Domain 2: Interactive 3D Furniture Placement

#### Core: Existing Three.js + R3F + Drei (already installed)

No new core packages needed. All required primitives are already in the stack. Use as follows:

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@react-three/drei` — `<DragControls>` | 10.7.7 (existing) | Drag furniture models on a floor plane | Built-in to existing drei install. Supports axis locking, drag limits, autoTransform. Use with `axisLock="y"` to constrain to floor. No additional package needed. |
| `@react-three/drei` — `<TransformControls>` | 10.7.7 (existing) | Gizmo-based rotate/scale on selected furniture | Same package. Provides translate/rotate/scale gizmos. Required for professional furniture placement UX. |
| `@react-three/drei` — `<useGLTF>` / `<useKTX2>` | 10.7.7 (existing) | Load GLB furniture models with texture compression | useGLTF handles GLB/GLTF; supports Draco-compressed geometry (install `draco3d` decoder). Already part of drei. |

#### Collision/Boundary Enforcement: @react-three/rapier

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@react-three/rapier` | ^1.x (latest) | Prevent furniture from clipping through walls/floor; enforce room boundary during drag | Rapier is a WASM physics engine; react-three-rapier wraps it for R3F. Lighter than Cannon.js. Use `<RigidBody type="kinematicPosition">` for draggable furniture and trimesh colliders for room walls. |

**Confidence:** HIGH. @react-three/rapier is the ecosystem standard for R3F physics as of 2025. DragControls and TransformControls in drei are stable and documented.

**Geometry Draco decoder** (if model sources use Draco compression):

| Technology | Purpose | Notes |
|------------|---------|-------|
| `draco3d` | Decode Draco-compressed GLTF geometry | Often pre-bundled with drei but explicit install ensures correct version. Models from Sketchfab often use Draco. |

---

### Domain 3: Floor Plan Extraction from PDF/Image/Sketch

#### PDF-to-Image Pipeline in Convex

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `pdfjs-dist` | 5.x (latest) | Convert PDF floor plan to PNG/JPEG page images server-side in Convex Node action | Mozilla's PDF.js runtime build. Works in Node.js Convex actions (`"use node"` directive required). Must add to `convex.json` `node.externalPackages` to avoid bundle issues. Outputs canvas pixel data, convertible to base64 PNG for GPT-4o input. |
| `@napi-rs/canvas` | latest | Node.js canvas implementation required by pdfjs-dist | Native-level performance; no system dependency on libcairo unlike the `canvas` npm package. Required because pdfjs-dist v3+ needs a canvas implementation for server-side rendering. Compatible with Convex Node runtime. |

**Alternative for PDF text extraction only (no image needed):**
`unpdf` (unjs ecosystem) ships a serverless build of PDF.js optimized for edge runtimes. However, GPT-4o Vision requires image input, not text, so full page rendering is necessary. `unpdf` is NOT sufficient for floor plan extraction because it produces text/links, not pixel-accurate room layout images.

#### GPT-4o Vision Structured Extraction

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| OpenAI GPT-4o Vision (existing) | gpt-4o | Extract rooms, dimensions, adjacency, and openings from floor plan images as structured JSON | Already in the stack. Use `response_format: { type: "json_schema" }` with `strict: true` (Structured Outputs) to guarantee schema adherence. GPT-4o handles PDF rasterized to image, hand-drawn sketches, and CAD screenshots without custom model training. Accuracy is production-grade for room classification and rough dimension estimation. |

**Prompt strategy:** Send the rasterized floor plan image + a schema defining `rooms: [{ name, shape, approximate_width_m, approximate_depth_m, doors: [], windows: [] }]`. Set `strict: true`. Return the JSON directly to a Convex mutation that writes a `floorPlanData` field to the `floorPlans` table.

**Confidence:** HIGH. OpenAI Structured Outputs with `strict: true` is stable as of late 2023 and is the correct tool. pdfjs-dist + @napi-rs/canvas pattern is well-documented for Node.js server environments.

---

### Domain 4: Furniture Catalog + 3D Model Sources

#### Primary: Internal Curated Catalog (as decided in PROJECT.md)

No external API dependency in Phase 1. Build an internal Convex `furnitureItems` table with:
- `name`, `brand`, `category`, `priceUsd`, `priceInr`
- `glbStorageId` (Convex file storage)
- `thumbnailStorageId`
- `affiliateUrl` (Amazon product link, optional)
- `dimensions: { width, depth, height }` in meters (critical for collision/placement accuracy)

Populate with 50–100 curated GLB models from Sketchfab CC-licensed furniture collections. This avoids API dependency, guarantees 3D model availability, and delivers consistent quality.

#### Sketchfab for Model Sourcing (not runtime API)

| Technology | Purpose | Notes |
|------------|---------|-------|
| Sketchfab Download API | Batch-download CC-licensed furniture GLB models during catalog build | Not a runtime dependency. Use the Sketchfab Data API v2 with an API key to search `category:furniture` + `license:cc` and download GLB files. Store in Convex file storage. Do this as a one-time build step, not at request time. |

**Confidence:** HIGH for this approach. Sketchfab has 1M+ models with CC licenses and official Download API. GLB output is the correct format for Three.js.

#### Amazon Affiliate Integration (Phase 2+)

| Technology | Purpose | Notes |
|------------|---------|-------|
| Amazon Creators API (replacement for deprecated PA API) | Fetch Amazon product links + pricing | The Product Advertising API (PA API 5) is deprecated as of April 30, 2026 and no longer accepting new customers. Use the Amazon Creators API instead for affiliate links. Does NOT provide 3D models. Use only for product deep-links and pricing on internal catalog items. |
| Canopy API (alternative) | Third-party Amazon product data API | $0.01/request after 100 free/month. Use if Creators API approval is difficult. Returns price, images, and ASIN. No 3D models. |

**3D models are not available from Amazon's API.** Associate affiliate revenue by linking the internal curated GLB model to the closest matching Amazon ASIN, manually curated or matched via name+brand search. This is the correct architecture given Amazon's lack of 3D export capability.

**Confidence:** MEDIUM for Amazon integration. PA API deprecation confirmed for April 2026; Creators API is the path forward but may have onboarding friction.

---

## Complete Install Commands

```bash
# Gaussian Splatting viewer (Luma)
npm install @lumaai/luma-web

# Fallback: Spark splat viewer (if @lumaai/luma-web has Three.js 0.183 incompatibility)
npm install @sparkjsdev/spark

# Furniture placement physics
npm install @react-three/rapier

# Draco decoder for compressed GLB models
npm install draco3d

# PDF-to-image pipeline (Convex Node action)
npm install pdfjs-dist @napi-rs/canvas
```

Add to `convex.json` for Node action bundling:
```json
{
  "node": {
    "externalPackages": ["pdfjs-dist", "@napi-rs/canvas"]
  }
}
```

Convex Node action directive:
```typescript
"use node";
// pdfjs-dist import goes here
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Luma AI API ($1/scene) | Self-hosted NeRF Studio / instant-ngp | Requires GPU server infrastructure; Convex is serverless. Not viable without separate compute backend. |
| Luma AI API | Polycam API | No public programmatic API for custom integrations except Enterprise tier. Pricing and access unknown. |
| @lumaai/luma-web (splat viewer) | @sparkjsdev/spark | @lumaai/luma-web is the native viewer for Luma captures; use Spark if Luma scenes output raw .splat files incompatible with the Luma web library. Both are valid. |
| @react-three/rapier (physics) | Skip physics, use raycasting bounds | For v1 furniture placement, raycasting + floor-plane projection (no Rapier) is sufficient. Rapier adds significant bundle weight (~800KB WASM). Defer Rapier to v2 if tight on bundle size. |
| pdfjs-dist + @napi-rs/canvas (Convex Node) | unpdf | unpdf extracts text only; cannot rasterize PDF to pixel-accurate image. Floor plan extraction requires vision input (image), not text. |
| GPT-4o Vision + Structured Outputs (floor plan) | Specialized floor plan CV model | No off-the-shelf floor plan API with comparable input flexibility (PDF/sketch/CAD screenshot). GPT-4o handles all input types without custom training. |
| Internal curated catalog (furniture) | Real-time Sketchfab API search | Real-time Sketchfab search adds API latency, download latency, and license uncertainty per-request. Pre-curated catalog is faster, cheaper, and more reliable. |
| Amazon Creators API | PA API 5 | PA API 5 is deprecated April 2026 and not accepting new customers. Do not implement. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Amazon Product Advertising API (PA API 5) | Deprecated April 30, 2026; not accepting new customers | Amazon Creators API |
| `canvas` npm package | Requires libcairo system dependency; incompatible with Convex's Node runtime and Vercel serverless | `@napi-rs/canvas` (no native system deps) |
| `@mkkellogg/gaussian-splats-3d` as primary | Documented incompatibility issues with React Three Fiber; less actively maintained than Spark | `@lumaai/luma-web` (primary) or `@sparkjsdev/spark` (fallback) |
| Three.js `DragControls` (vanilla Three.js class) | Lower-level; requires manual DOM event wiring outside R3F | `@react-three/drei` `<DragControls>` component |
| Self-hosted NeRF pipeline (Nerfstudio, instant-ngp) | Requires persistent GPU compute; incompatible with Convex serverless architecture | Luma AI API |
| `pdf-parse` for floor plan input | Text extraction only; cannot produce images for Vision API | `pdfjs-dist` + `@napi-rs/canvas` for rasterization |

---

## Stack Patterns by Scenario

**If Luma AI 3D Capture API is confirmed unavailable or too expensive at scale:**
- Use Polycam (manual upload flow) or accept user-uploaded pre-processed .glb files
- Switch viewer to `@sparkjsdev/spark` for .splat file format flexibility
- This changes the Section 2 reconstruction flow from automated to semi-automated

**If @lumaai/luma-web v0.2.2 has Three.js 0.183 compatibility issues:**
- Use `@sparkjsdev/spark` v0.1.10 instead
- Spark integrates via `extend()` using the same R3F pattern as Luma web
- The example repo `sparkjsdev/spark-react-r3f` shows the integration pattern

**If furniture physics (Rapier) creates performance issues on mobile:**
- Replace with simple floor-plane raycasting collision (no WASM dependency)
- Project drag point onto a `PlaneGeometry` matching the reconstructed room floor
- Acceptable for v1; revisit Rapier for v2 with complex multi-room layouts

**If pdfjs-dist + @napi-rs/canvas fails in Convex Node action:**
- Move PDF rasterization to a Next.js API route (same server-side Node.js environment)
- Upload the resulting PNG to Convex storage, then pass URL to Convex action for GPT-4o call
- This adds one hop but isolates the native dependency from Convex's runtime

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@lumaai/luma-web` 0.2.2 | three 0.155+ officially documented | Verify compatibility with three 0.183.1 before ship. The library uses `extend()` from R3F; if R3F 9.x changed the extend API, a shim may be needed. Check lumalabs/luma-web-examples for three version pinning. |
| `@sparkjsdev/spark` 0.1.10 | three (any recent) | Integrates directly into Three.js render pipeline; not bound to a specific three version. More resilient to three upgrades. |
| `@react-three/rapier` 1.x | R3F 9.x + three 0.183 | Peer dependency on @react-three/fiber ^9.x; compatible with current stack. WASM binary is fetched at runtime (no compile-time native build). |
| `pdfjs-dist` 5.x | Node.js 20+ | Convex uses Node.js 18+; confirm pdfjs-dist 5.x supports Node 18 (some builds require 20+). Pin to 4.x if Node 18 is required. |
| `@napi-rs/canvas` latest | Node.js 16+ | No system dependencies; compatible with Convex Node runtime. |

---

## Sources

- Luma AI Interactive Scenes — https://lumalabs.ai/interactive-scenes (confirmed Gaussian Splatting API, $1/scene pricing)
- Luma AI API Dashboard — https://lumalabs.ai/dashboard/api (API access, confirm 3D capture endpoints)
- @lumaai/luma-web npm — https://www.npmjs.com/package/@lumaai/luma-web (v0.2.2, LumaSplatsThree class, R3F extend pattern) — MEDIUM confidence (last published 2023)
- lumalabs/luma-web-examples GitHub — https://github.com/lumalabs/luma-web-examples (R3F integration examples)
- sparkjsdev/spark GitHub — https://github.com/sparkjsdev/spark (v0.1.10 stable, @sparkjsdev/spark package)
- sparkjsdev/spark-react-r3f — https://github.com/sparkjsdev/spark-react-r3f (R3F integration example)
- @react-three/drei DragControls — https://drei.docs.pmnd.rs/gizmos/drag-controls (official docs)
- @react-three/rapier GitHub — https://github.com/pmndrs/react-three-rapier (R3F physics, confirmed R3F 9.x compat)
- OpenAI Structured Outputs — https://platform.openai.com/docs/guides/structured-outputs (strict:true, schema adherence)
- Convex Runtimes — https://docs.convex.dev/functions/runtimes ("use node" directive, external packages)
- Convex Bundling — https://docs.convex.dev/functions/bundling (node.externalPackages in convex.json)
- pdfjs-dist npm — https://www.npmjs.com/package/pdfjs-dist (v5.x, canvas requirement confirmed)
- Amazon PA API deprecation — https://webservices.amazon.com/paapi5/documentation/ (confirmed deprecated April 2026)
- Sketchfab Download API — https://sketchfab.com/developers/download-api (GLB download, CC license filtering)
- Sketchfab Data API v2 — https://sketchfab.com/developers/data-api/v2 (search endpoint for furniture)

---

*Stack research for: Spazeo AI 3D Room Reconstruction + Furniture Placement + Floor Plan Extraction*
*Researched: 2026-03-09*
