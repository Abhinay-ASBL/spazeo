# Feature Research

**Domain:** AI-powered property visualization — 360° virtual tours, AI 3D room reconstruction, floor plan to 3D
**Researched:** 2026-03-09
**Confidence:** MEDIUM (competitor analysis from public sources; some specifics verified against multiple sources)

---

## Context: Three Distinct Feature Domains

This research covers three sections of Spazeo's planned expansion:

- **Section 1:** Differentiating the existing 360° tour platform vs. Matterport, Kuula, Pano2VR
- **Section 2:** AI 3D room reconstruction from panoramas with furniture placement and cost tracking
- **Section 3:** Floor plan / sketch to navigable 3D

Each section has its own table stakes, differentiators, and anti-features documented below.

---

## Section 1: 360° Tour Platform

### Table Stakes (Users Expect These)

Features present in Kuula, Matterport, CloudPano, and every credible competitor. Missing these means users disqualify the product in under 60 seconds.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Smooth scene-to-scene navigation | Users expect walking between rooms to feel fluid, not jarring | LOW | Already partially built; needs transition animation polish |
| Hotspot overlays on panoramas | Standard since 2018; clicking to move between scenes is assumed | LOW | Schema exists; visual editor not complete |
| Custom branding / logo on tour | Agents want their own brand, not platform watermark | LOW | Needs white-label mode on paid plans |
| Embeddable iframe | Every MLS, agency site, and blog will iframe the tour | LOW | Single embed snippet; must work cross-origin |
| Mobile touch gesture support | 60%+ of buyers view tours on phones; pinch/swipe are expected | LOW | Needs explicit mobile testing pass |
| Autorotate on idle | Standard behavior for unattended kiosk or listing site use | LOW | Plugin already imported |
| Tour analytics (views, time) | Agents need proof of buyer engagement for their CRM workflow | MEDIUM | Schema exists; dashboard UI needs completion |
| Lead capture form | Converting viewers to inquiries is the primary agent ROI | LOW | Bug: email notification broken; fix is the priority |
| Password protection | Exclusive pre-launch tours, private buyer links | LOW | Currently plaintext; needs bcrypt hash |
| Shareable public URL | The tour is the deliverable — it must have a clean URL | LOW | Already done via slug |
| High-res panorama rendering | Pixelated tours kill trust immediately | LOW | Dependent on source image quality; viewer handles it |
| Fullscreen mode | Standard UX for immersive content | LOW | Needs explicit fullscreen button + keyboard shortcut |

### Differentiators (Competitive Advantage)

These features are absent or weak in Matterport/Kuula/Pano2VR and represent actual moats.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI auto-narration per scene | 40-60% higher tour completion rate; agents paste listing copy, AI voices it per room. No competitor has this natively in the viewer | MEDIUM | OpenAI TTS (tts-1-hd model); trigger on scene load; Convex Action; agent can toggle on/off |
| AI scene descriptions visible in viewer | Buyers read room summaries without leaving the tour; reinforces emotional decision | LOW | GPT-4o already analyzes scenes; surface output as viewer overlay card |
| Ambient soundscapes per room | Living room feels calm, kitchen feels energetic; Matterport has zero audio capability | MEDIUM | Upload audio per scene; autorotate plugin has audio hook; short looping clips |
| Instant AI virtual staging toggle in public viewer | Buyer can switch between empty room and AI-staged version mid-tour — no competitor does this live | HIGH | Requires pre-generated staged versions stored in Convex; toggle is client-side swap; staging job must run at publish time |
| Heatmap analytics (where viewers look) | Agents see which rooms got attention and which killed interest | HIGH | Requires viewport angle tracking + server aggregation; PostHog custom events |
| Domain-whitelisted embed + referrer locking | Enterprise agents block competitors from iframing their tours | LOW | HTTP header check in Convex HTTP Action |
| Multilingual AI narration | Indian market (Hindi, Tamil, Telugu) + global; no competitor targets regional languages | MEDIUM | OpenAI TTS supports multiple languages; language selector in tour settings |
| CRM-ready lead export (CSV + webhook) | Agents want leads in their existing tool (HubSpot, Follow Up Boss); Kuula has no webhook | MEDIUM | Convex HTTP Action to push lead; CSV download from leads table |

### Anti-Features (Deliberately Not Building)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Native VR headset support (Oculus, Vision Pro) | "Future of real estate" narrative is compelling | WebXR API is unstable, headset market share is <1% of buyers, build cost is enormous | Keep web-based; add VR later after Section 2/3 ship |
| Real-time multi-agent collaboration in viewer | Teams want to annotate tours together | Requires WebSockets + operational transform; diverges from Convex reactive model; 10x scope | Single-user annotations, shared via static comment threads |
| Live video chat embedded in tour | Agents want to guide buyers through tours remotely | Requires WebRTC; streaming infrastructure; third-party compliance | Link to Calendly or Zoom from within tour as hotspot |
| Offline downloadable tours | Enterprise wants tours that work without internet | Massive bundle sizes; Gaussian splats + panoramas are 50-200MB; PWA caching has limits | Optimize load speed instead; progressive streaming |
| AI that auto-selects best panorama angles | Sounds useful for agents with multiple shots | Requires training data specific to real estate; high error rate on unusual rooms | Provide manual ordering with drag-and-drop |

---

## Section 2: AI 3D Room Reconstruction + Furniture Placement

### Table Stakes (Users Expect These)

Based on what Planner 5D, RoomSketcher, and IKEA Place have established as baseline expectations.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Navigable 3D room view (not just a render) | Users expect to walk through, not just look at a static image | HIGH | Gaussian Splatting via Luma AI; render in Three.js / @react-three/fiber |
| Dollhouse overhead view | Matterport made this iconic; users expect to orient themselves spatially | MEDIUM | Orthographic camera mode in Three.js; toggle button |
| Free-roam first-person navigation | WASD or click-to-move through reconstructed space | MEDIUM | Three.js PointerLockControls or custom; mobile needs virtual joystick |
| Furniture catalog to browse and place | Users expect to see real products, not placeholder boxes | HIGH | Curated internal GLB catalog first; Amazon augmentation second |
| Drag-and-drop furniture placement | Mouse drag on floor plane to position items | MEDIUM | Three.js raycasting against floor mesh; furniture object parenting |
| Furniture scale and rotation controls | Buyers want to verify fit; standard in every room planner | MEDIUM | Transform gizmo overlay; keyboard shortcuts |
| Save and share the furnished room | The output is the deliverable — must be sharable | MEDIUM | Serialize furniture positions + IDs to Convex; generate share URL |
| Real-time cost total as items are added | Planner 5D does this; users expect to see budget impact immediately | LOW | Sum of selected furniture prices in UI; reactive Zustand state |
| Remove / undo furniture placement | Any editor needs undo | LOW | Command pattern or simple history stack in Zustand |
| Search and filter furniture catalog | With 100+ items, browsing without search is unusable | LOW | Full-text search via Convex vector search or simple substring filter |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Reconstruction from existing 360° panoramas (not LiDAR) | Competitors (Matterport) require expensive hardware; Spazeo works from any panorama already uploaded | HIGH | Core differentiator of Section 2; Gaussian Splatting pipeline on uploaded panoramas via Luma AI API |
| AI furniture placement suggestions | AI analyzes room dimensions and suggests optimal layout; Planner 5D does this only in 2D | HIGH | GPT-4o Vision on room geometry + furniture catalog; suggest top 3 layouts |
| Room-to-room hotspot links inside 3D reconstruction | Buyers navigate between reconstructed rooms just like the 360° tour | MEDIUM | Reuse hotspot data model; link viewPositions inside the Gaussian splat scene |
| Shared furnished room as buyer-facing link | Buyers and agents can both view the same furnished room; no login required | LOW | Public UUID-based share URL; read-only viewer mode |
| "What it will cost" summary card | Itemized list with prices and buy links; converts visualization intent to purchase | LOW | Furniture item metadata in Convex; render as slide-out panel |
| Style filtering (Scandinavian, Industrial, Luxury) | Narrows catalog to buyer's taste; IKEA Place does this only with IKEA products | LOW | Tag furniture items in catalog; filter by style tag |
| AI-generated room ambiance (lighting style) | Suggest lighting configuration with the furniture layout; differentiated from static renders | HIGH | Replicate / Stable Diffusion render of final layout with lighting applied; preview only |

### Anti-Features (Deliberately Not Building)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real Amazon product purchasing inside the app | "One click buy" sounds compelling | Amazon Affiliate API requires approval; 3D models for Amazon products are inconsistent; return/compliance complexity | Link out to Amazon product page with affiliate tag; do not handle checkout |
| Physics simulation for furniture | "Will the couch fit through the door" | Adds 3D physics engine (Cannon.js/Rapier); not needed for visualization use case | Show dimensions overlay on furniture item; let buyer calculate manually |
| Real-time collaborative room planning | Two buyers planning together | WebRTC or Convex Presence required; out of scope for v1 | Share link to view the same saved layout |
| Custom furniture upload by user | Power users want their exact sofa | 3D model upload pipeline, format validation, size limits, IP issues | Accept GLB upload in v2; catalog covers 90% of cases in v1 |
| Renovation cost estimation (walls, materials, labor) | Agents ask for full renovation quotes | Requires contractor data, regional pricing, integration with cost databases | Furniture cost only in v1; renovation estimation is a separate product |

---

## Section 3: Floor Plan to 3D

### Table Stakes (Users Expect These)

Based on Planner 5D AI, RoomSketcher, Maket AI, and CamPlan AI establishing baseline expectations.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Upload any file format (PDF, PNG, JPG, sketch photo) | Users have floor plans in whatever format their architect gave them | LOW | File picker with format validation; store in Convex; pass to GPT-4o |
| AI extracts room layout and dimensions | The core promise; users expect the AI to do the reading | HIGH | GPT-4o Vision with structured JSON output prompt; walls, rooms, openings |
| Generate navigable 3D model from extracted layout | The 2D layout becomes a walkable space | HIGH | Extrude walls from floor plan JSON; Three.js procedural mesh generation |
| Same navigation modes as Section 2 (dollhouse, free-roam) | Users will expect parity with Section 2 | MEDIUM | Reuse navigation system built for Section 2 |
| Furniture placement in floor-plan-generated 3D | The 3D space should accept the same furniture workflow | LOW | Reuse Section 2 furniture placement system with same floor-plane raycasting |
| Publish floor-plan-derived tour as shareable link | The output must be distributable | LOW | Same share model as tours and furnished rooms |
| Progress feedback during AI processing | Floor plan extraction + 3D generation takes 15-60 seconds | LOW | Job queue (aiJob pattern) with status polling; progress bar in UI |
| Ability to correct AI extraction errors | AI will misread 10-20% of floor plans; user must fix before 3D generation | HIGH | Editable room layout editor (drag walls, resize rooms) after extraction step |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hand-drawn sketch input (not just clean PDFs) | Architects and buyers sometimes only have sketches; no competitor handles this reliably | HIGH | GPT-4o Vision handles sketches with reasonable accuracy; prompt engineering required |
| Seamless output into Section 2 furniture workflow | After generating 3D from floor plan, immediately furnish it — no other tool combines these two flows | LOW | Route floor-plan-generated 3D into the same furniture placement state; feature dependency |
| AI auto-labels rooms (bedroom, kitchen, living room) | Users expect the AI to know what each room is | MEDIUM | Part of GPT-4o extraction prompt; return room type per polygon |
| Instant preview before committing to full 3D generation | Show a simplified 2D wireframe of what was extracted; let user approve before the expensive 3D step | MEDIUM | Render extracted JSON as SVG floor plan overlay; confirmation step before Three.js generation |
| Published 3D tour from floor plan (pre-construction marketing) | Developers can market off-plan properties with walkable 3D — no existing panoramas needed | MEDIUM | Section 3 output feeds Section 1's public tour viewer architecture; builder use case |
| DWG/CAD via AI vision (not parser) | Users with AutoCAD exports expect support; AI handles it without a CAD parser | MEDIUM | GPT-4o Vision on DWG screenshot/export image; works for simple plans; flag complex plans as low confidence |

### Anti-Features (Deliberately Not Building)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Native DWG/CAD file parser | "Real architects use AutoCAD" | DWG is a proprietary binary format; open-source parsers (Open Design Alliance) require licensing; engineering months | Accept screenshot/export of DWG as image; AI reads it via vision |
| BIM integration (Revit, ArchiCAD) | Enterprise developers want BIM-level accuracy | BIM file formats are deeply complex; IFC parsing is a project in itself; entirely different buyer | Out of scope entirely; flag as v3+ |
| Structural accuracy guarantees | "Use this for construction planning" | AI extraction has 10-20% error rate; liability risk if used for actual construction | Watermark output as "visualization only"; include disclaimer in published tours |
| Real-time collaborative floor plan editing | Teams want to edit together | Same WebRTC/Presence complexity as Section 2; out of scope | Sequential ownership; share link to view |

---

## Feature Dependencies

```
Section 1: 360° Tour Polish
    └──required before──> Section 2: AI 3D Reconstruction
                              └──required before──> Section 3: Floor Plan to 3D
                                                        (shares furniture workflow)

[Lead Capture Bug Fix]
    └──required before──> [CRM Lead Export]

[AI Scene Analysis] ──already exists──> [AI Scene Descriptions in Viewer]
    └──enhances──> [AI Auto-Narration per Scene]

[Gaussian Splatting Reconstruction]
    └──required before──> [Dollhouse View]
    └──required before──> [Free-Roam Navigation]
    └──required before──> [Furniture Placement on 3D Room]

[Furniture Catalog (internal)]
    └──required before──> [Furniture Placement]
    └──required before──> [Cost Tracker]
    └──required before──> [AI Furniture Suggestions]
    └──required before──> [Amazon product augmentation]

[GPT-4o Floor Plan Extraction]
    └──required before──> [3D Generation from Floor Plan]
    └──required before──> [Room Auto-Labeling]

[Floor Plan 3D Generation]
    └──required before──> [Furniture Placement in Floor-Plan 3D]
    └──feeds into──> [Section 1 Public Tour Viewer] (pre-construction use case)

[AI Auto-Narration]
    └──requires──> [OpenAI TTS API integration in Convex Action]
    └──enhances──> [Multilingual Narration] (same infrastructure, different language param)

[Password Protection Fix (bcrypt)]
    ──conflicts with (current)──> [Plaintext password storage] (live security risk)
```

### Dependency Notes

- **Section 2 requires Section 1 to be production-stable first:** The 360° tour viewer, lead capture, and tour creation flow must be bug-free before building on top of the viewer infrastructure. Technical debt in Section 1 (plaintext passwords, broken lead email) is a live risk.
- **Furniture catalog must exist before any furniture features:** Placement, cost tracking, AI suggestions, and sharing all assume a catalog. The internal catalog must be seeded before those features are built.
- **Gaussian Splatting reconstruction gates the entire Section 2 value proposition:** If Luma AI API integration fails or produces poor results for interior panoramas, Section 2 needs an alternate reconstruction path (e.g., depth estimation + Three.js procedural mesh as fallback).
- **Floor plan AI extraction accuracy gates user trust in Section 3:** If GPT-4o extraction error rate exceeds 30%, the correction editor becomes mandatory before the 3D generation step. Build the extraction editor before the generation step, not after.
- **AI narration and scene descriptions can ship independently:** They reuse the existing AI job queue and scene analysis infrastructure. These are the fastest differentiators to ship in Section 1.

---

## MVP Definition

### Section 1 — Launch With (must fix/complete before any Section 2 work)

- [ ] Lead capture email notification fix (tourSlug bug) — this is broken revenue
- [ ] Password protection with hashed storage (bcrypt) — live security risk
- [ ] Hotspot visual editor (add, move, delete hotspots in the viewer) — core tour creation flow
- [ ] Mobile touch gesture support — 60%+ of buyers view on mobile
- [ ] AI scene descriptions visible in public viewer — fastest differentiator, reuses existing analysis
- [ ] AI auto-narration per scene (OpenAI TTS, toggle in tour settings) — highest engagement lift, medium complexity
- [ ] Custom branding (logo + color) on paid plans — table stakes for professional agents

### Section 1 — Add After Validation (v1.x)

- [ ] Heatmap analytics — adds value but requires new tracking infrastructure; validate engagement first
- [ ] Multilingual narration — add once English narration is validated
- [ ] CRM lead webhook export — add when first enterprise client requests it
- [ ] Ambient soundscapes per room — high delight, low revenue impact; add after narration

### Section 2 — Launch With

- [ ] Gaussian Splatting reconstruction from uploaded panoramas (Luma AI API)
- [ ] Dollhouse view and free-roam navigation in reconstructed 3D
- [ ] Internal furniture catalog (50-100 curated items in GLB with price metadata)
- [ ] Drag-and-drop furniture placement with scale and rotation
- [ ] Real-time cost total tracker
- [ ] Save and share furnished room as public link

### Section 2 — Add After Validation

- [ ] AI furniture placement suggestions (after catalog is seeded)
- [ ] Style filtering in catalog
- [ ] Room-to-room hotspot links inside 3D reconstruction
- [ ] Amazon product augmentation (after internal catalog validates the concept)

### Section 3 — Launch With

- [ ] File upload (PDF, PNG, JPG, sketch photo) → GPT-4o extraction
- [ ] Editable room layout correction step (before 3D generation)
- [ ] Three.js procedural 3D generation from extracted layout
- [ ] Same navigation modes (dollhouse + free-roam) as Section 2
- [ ] Furniture placement + cost tracking in floor-plan-generated 3D (reuse Section 2)
- [ ] Publish as shareable public tour link

### Future Consideration (v2+)

- [ ] Real-time collaborative room planning (Section 2 and 3)
- [ ] Native VR headset support
- [ ] BIM/IFC integration
- [ ] Custom user furniture upload (GLB)
- [ ] Renovation cost estimation (materials, labor)
- [ ] AR mobile app (ARKit / ARCore)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Lead capture email fix | HIGH | LOW | P1 |
| Password hashing (bcrypt) | HIGH | LOW | P1 |
| Hotspot visual editor | HIGH | MEDIUM | P1 |
| Mobile touch gestures | HIGH | LOW | P1 |
| AI scene descriptions in viewer | HIGH | LOW | P1 |
| AI auto-narration (TTS per scene) | HIGH | MEDIUM | P1 |
| Custom branding on paid plans | MEDIUM | LOW | P1 |
| Gaussian Splatting reconstruction | HIGH | HIGH | P1 (Section 2 gate) |
| Internal furniture catalog (50-100 GLB) | HIGH | MEDIUM | P1 (Section 2 gate) |
| Furniture placement + scale/rotate | HIGH | MEDIUM | P1 |
| Cost tracker | HIGH | LOW | P1 |
| Save + share furnished room | HIGH | MEDIUM | P1 |
| Dollhouse + free-roam navigation | HIGH | MEDIUM | P1 |
| GPT-4o floor plan extraction | HIGH | HIGH | P1 (Section 3 gate) |
| Floor plan correction editor | HIGH | HIGH | P1 (prevents user frustration) |
| Three.js 3D from floor plan | HIGH | HIGH | P1 |
| Heatmap analytics | MEDIUM | HIGH | P2 |
| AI furniture placement suggestions | HIGH | HIGH | P2 |
| Room-to-room hotspots in 3D | MEDIUM | MEDIUM | P2 |
| Multilingual narration | MEDIUM | LOW | P2 |
| Style filtering in furniture catalog | MEDIUM | LOW | P2 |
| CRM lead export webhook | MEDIUM | MEDIUM | P2 |
| Ambient soundscapes | LOW | MEDIUM | P3 |
| Amazon product augmentation | MEDIUM | HIGH | P3 |
| AI room ambiance/lighting render | LOW | HIGH | P3 |
| AR mobile app | HIGH | HIGH | P3 (post web validation) |

**Priority key:**
- P1: Must have for launch of that section
- P2: Should have, add when possible after section launches
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Matterport | Kuula | Pano2VR | Planner 5D | RoomSketcher | Spazeo Approach |
|---------|------------|-------|---------|------------|--------------|-----------------|
| 360° tour viewer | Yes (expensive hardware) | Yes (any camera) | Yes (any camera) | No | No | Yes — any panorama |
| Hotspot navigation | Yes | Yes | Yes | N/A | N/A | Yes (building) |
| AI scene narration | No | No | No | No | No | Yes — key differentiator |
| Dollhouse 3D view | Yes (scan required) | No | No | Yes (designed, not captured) | Yes (designed) | Yes — from captured panoramas |
| Furniture placement | No | No | No | Yes (2D+3D) | Yes (2D+3D) | Yes — in reconstructed real space |
| Cost tracking | No | No | No | Yes (basic) | No | Yes — itemized with buy links |
| Floor plan to 3D | No | No | No | Yes (manual draw) | Yes (manual draw) | Yes — AI extraction from any image |
| AI floor plan read | No | No | No | Partial (image upload) | No | Yes — GPT-4o on any format |
| Lead capture | No | Via hotspot link | No | No | No | Yes — native with email notify |
| White label | Paid tier | Paid tier | N/A (self-hosted) | No | Paid tier | Yes — paid plans |
| Pricing model | Expensive ($69-309/mo) | Affordable ($16-50/mo) | One-time license | Freemium | Subscription | Competitive — positioning TBD |
| Self-hosting | No | No | Yes | No | No | No (Convex-hosted) |
| Multilingual | No | No | No | No | No | Yes — narration differentiator |

### Key Competitive Gaps to Exploit

1. **No competitor combines 360° captured tours + AI 3D reconstruction + floor plan 3D in one platform.** Matterport does captured 3D but requires their hardware and is expensive. Planner 5D does designed 3D but from scratch. Spazeo bridges both.

2. **No competitor has AI narration built into the tour viewer.** This is the fastest Section 1 differentiator to ship. CloudPano has a third-party TTS add-on, but it is not AI-generated per-room.

3. **No competitor allows furniture placement inside a photogrammetry-reconstructed room.** Planner 5D and RoomSketcher use designed rooms. IKEA Place uses AR. Spazeo would be the first to let buyers furnish a real captured space in 3D.

4. **Matterport's pricing and closed ecosystem are its primary complaint.** Users want open, affordable, embeddable tours without hardware lock-in. Spazeo positions directly against this.

---

## Sources

- Capterra Reviews: Kuula (2026), Planner 5D (2026)
- G2 Reviews: Matterport (2026)
- TrustRadius: Matterport reviews (2025)
- ShowAndTour.com: Virtual tour software comparison
- photoup.net: Real estate virtual tour statistics 2025
- llcbuddy.com: Virtual tour statistics 2025
- Matterport blog: "3D Tours properties sell 31% faster"
- CloudPano blog: AI narration in virtual tours
- Planner 5D: AI furniture placement and floor plan recognition features
- RoomSketcher blog: competitor comparisons
- Wizart.ai: 3D room layout reconstruction
- Tensorway.com: 3D reconstruction and room planning
- Luma AI: Interactive Scenes (Gaussian Splatting, browser rendering)
- utsubo.com: Gaussian splatting guide 2026
- ai-stager.com: Interior design apps 2025
- businesswaretech.com: Floor plan analysis with AI
- aitextstospeech.com: TTS for real estate virtual tours
- ar-code.com: GLB/GLTF furniture 3D models
- fastvirtualstaging.com: Virtual staging trends 2025
- bellastaging.ca: 3D rendering for property sales 2025

---

*Feature research for: AI-powered property visualization platform (Spazeo)*
*Researched: 2026-03-09*
