# Spazeo

## What This Is

Spazeo is an AI-powered immersive property experience platform for real estate agents, interior designers, and property buyers. It turns any property input — panorama photos, floor plan PDFs, or hand-drawn sketches — into interactive 3D spaces that users can walk through, furnish with real products, and use to make real decisions.

The platform is structured in three progressive sections: (1) a polished and differentiated 360° virtual tour, (2) AI-generated 3D rooms reconstructed from panorama photos with furniture placement and cost tracking, and (3) floor plan/sketch to fully interactive 3D walkthrough generation.

## Core Value

A buyer should be able to upload any property input, walk through the space in 3D, place real furniture, and see exactly what it will cost — before a single brick is laid or a single piece of furniture is bought.

## Requirements

### Validated

- ✓ Convex reactive backend with queries, mutations, and action job queue — existing
- ✓ Clerk authentication with JWT + route protection — existing
- ✓ 360° panorama viewer rendering equirectangular images in Three.js sphere — existing
- ✓ Tour CRUD (create, list, edit, delete) with slug-based public URLs — existing
- ✓ Scene management with ordering — existing
- ✓ Hotspot data model (sceneId, targetSceneId, position, type) — existing (schema + data layer)
- ✓ Analytics tracking per tour and scene — existing
- ✓ Lead capture form on public tour viewer — existing (schema + data layer; email has a known bug)
- ✓ Stripe subscription billing structure with plan limits — existing (partial; webhook stubs incomplete)
- ✓ AI job queue pattern (create job → schedule action → process → auto-update UI) — existing
- ✓ AI scene analysis, virtual staging, description generation via OpenAI + Replicate — existing
- ✓ Floor plan generation action stub — existing
- ✓ 3D Building Viewer schema (buildings, units, view positions, exterior panoramas) — existing (conversion pipeline not implemented)

### Active

**Section 1 — 360° Tour (Complete + Differentiate)**
- [ ] Tour creation flow is complete and polished end-to-end (upload → arrange → publish)
- [ ] Hotspot editor allows adding, moving, and deleting navigation hotspots visually in the viewer
- [ ] Public tour viewer is fully polished with autorotate, branding, and mobile touch gestures
- [ ] Tour sharing generates a link + optional password protection (hashed, not plaintext)
- [ ] Lead capture form fires correctly with email notification to tour owner (fix tourSlug bug)
- [ ] Platform has at least one unique differentiator that competitors lack (e.g. AI-powered scene descriptions, instant AI staging preview in the public viewer, or ambient auto-narration)

**Section 2 — AI 3D from Panoramas**
- [ ] AI reconstructs a navigable 3D room model from existing uploaded 360° panorama photos
- [ ] User can navigate the 3D space in dollhouse view, free-roam, and room-to-room hotspot modes
- [ ] User can browse and search a furniture catalog (internal + Amazon products)
- [ ] User can place furniture 3D models into the generated 3D room
- [ ] Cost tracker shows total furnishing budget as items are added
- [ ] User can save and share a furnished 3D room view as a link

**Section 3 — Floor Plan → 3D**
- [ ] User can upload any file format (PDF, PNG/JPG, DWG, sketch photo) as a floor plan input
- [ ] AI reads and extracts room layout, dimensions, and structure from the uploaded file
- [ ] AI + Three.js generates a navigable 3D model of the floor plan
- [ ] User can walk through the generated 3D space (same navigation modes as Section 2)
- [ ] User can apply furnishing and cost tracking to floor-plan-generated 3D rooms
- [ ] Generated 3D tour can be published and shared via a public link

### Out of Scope

- Native mobile app — web-first, mobile later
- Multi-user real-time collaboration in the 3D editor — too complex for v1
- Renovation cost estimation (materials, labor) — furniture cost only in v1
- AR/VR headset support — future after web platform is proven
- DWG/CAD file parsing beyond AI vision extraction — engineering complexity; AI handles it

## Context

The codebase has a solid foundation with the Convex backend, auth, and basic tour viewer. Several features are partially implemented with real technical debt:
- Stripe webhook has empty handlers (the real handler is in convex/http.ts)
- 3D Building conversion pipeline is a stub (TODO in conversionJobs.ts)
- Duplicate AI action implementations (public + internal versions with identical logic)
- Lead email notification fails due to missing tourSlug argument
- Tour passwords stored as plaintext (security risk)

The panorama viewer currently uses @react-three/fiber directly. The planned 3D room reconstruction for Section 2 will also use Three.js — this is consistent with existing tech choices.

Amazon product integration will need a third-party furniture API (Amazon Affiliate API or ASIN lookup) or a curated internal catalog built first, then augmented with Amazon. 3D model availability for Amazon products is limited — GLB/GLTF sources will need to be identified (Sketchfab, manufacturer APIs, or AI-generated from product photos).

## Constraints

- **Tech Stack**: Next.js 16 + Convex + Clerk + Three.js — locked in, all new features extend this stack
- **3D Generation**: Gaussian Splatting pipeline and Luma AI are already planned for 3D reconstruction; stick to these
- **AI Models**: OpenAI GPT-4o Vision for floor plan extraction; Replicate for staging and generation
- **No test runner configured**: No vitest/playwright yet — builds must be manually tested
- **TypeScript strict**: `typescript.ignoreBuildErrors: true` in next.config.ts due to Convex type circularity; don't workaround this differently

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three sections built in order (360° → AI 3D → Floor Plan) | Each section builds on the previous; 360° is already 80% done | — Pending |
| 3D reconstruction from panoramas using Gaussian Splatting + Luma AI | Already in tech stack; proven for room-scale reconstruction | — Pending |
| Furniture catalog: internal catalog first, Amazon augmentation second | Amazon 3D model availability is inconsistent; curated catalog ensures quality | — Pending |
| AI reads floor plan via GPT-4o Vision (any file format) | Avoids complex DWG parsing; GPT-4o handles PDF/image/sketch with high accuracy | — Pending |
| Fix known bugs in Section 1 before moving to Section 2 | Lead email bug + plaintext passwords + stripe stubs are live risks | — Pending |

---
*Last updated: 2026-03-09 after initialization*
