# Spazeo — Key Data Flows

> Moved verbatim from `AGENTS.md`/`CLAUDE.md` to keep startup context small.

## Key Data Flows

### Tour Creation
User creates tour → mutation checks auth + subscription limits → user uploads 360° images (3-step pattern) → AI Action analyzes each scene → user arranges scenes + adds hotspots → publishes → live at spazeo.io/tour/[slug]

### Tour Viewing (Public)
Visitor opens tour URL → `useQuery` loads tour + scenes + hotspots → PanoramaViewer renders → hotspot clicks = client-side scene transitions → analytics mutation fires on interactions → lead form saves to leads table → Action emails tour owner

### AI Staging
Select scene → choose style → create aiJob (pending) → scheduled Action → downloads panorama from Convex → sends to Replicate → uploads result to Convex storage → job complete → frontend auto-updates reactively

### Billing
Select plan → Stripe Checkout → webhook to Convex HTTP Action → verify signature → mutation updates subscription → queries return updated limits → UI auto-updates
