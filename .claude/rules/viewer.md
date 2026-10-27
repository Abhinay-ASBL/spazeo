---
paths:
  - "src/components/viewer/**"
  - "src/app/tour/**"
  - "src/app/demo/**"
  - "convex/building*.ts"
  - "convex/viewPositions.ts"
  - "convex/exteriorPanoramas.ts"
  - "convex/conversionJobs.ts"
---

## 360° Viewer Architecture

### Rendering Pipeline

The panorama viewer uses `@photo-sphere-viewer/core` (NOT Three.js/R3F directly):

- `PhotoSphereViewer` renders equirectangular panoramas
- `MarkersPlugin` (`@photo-sphere-viewer/markers-plugin`) — hotspot overlays
- `AutorotatePlugin` (`@photo-sphere-viewer/autorotate-plugin`) — auto-spin on idle
- Image loaded from Convex storage URLs

### 3D Building Viewer Architecture

The Building Viewer domain uses Three.js via `@react-three/fiber` + `drei`:

- Renders interactive 3D building models (`.glb`/`.gltf`)
- Users select floor + block + unit position → view exterior panoramas from that vantage point
- `buildingUnits` link back to `tours` (interior panorama tours for each apartment)
- `viewPositions` store camera coordinates/heading per floor/block/positionIndex
- `exteriorPanoramas` store rendered panorama images per viewPosition + timeOfDay
- `conversionJobs` track 3D model optimization status
