'use client'

import { useRef, useMemo, Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'

// ─── Types & Constants ────────────────────────────────────────────────────────

export type CornerKey = 'NE' | 'NW' | 'SE' | 'SW' | 'aerial'

export const CORNERS: { key: CornerKey; label: string; short: string }[] = [
  { key: 'NE', label: 'North-East Corner', short: 'NE' },
  { key: 'NW', label: 'North-West Corner', short: 'NW' },
  { key: 'SE', label: 'South-East Corner', short: 'SE' },
  { key: 'SW', label: 'South-West Corner', short: 'SW' },
  { key: 'aerial', label: 'Aerial View', short: 'Aerial' },
]

const FLOOR_HEIGHT = 3.2 // meters per floor

export function getFloorLevels(totalFloors: number): number[] {
  const levels: number[] = [1]
  for (let f = 10; f < totalFloors; f += 10) levels.push(f)
  if (totalFloors > 1) levels.push(totalFloors)
  return [...new Set(levels)].sort((a, b) => a - b)
}

// ─── KML Plot Boundary (ASBL Legacy Towers, Hyderabad) ───────────────────────
// Converted from WGS84 to local meters using center point as origin

const KML_CENTER = { lat: 17.40337129161836, lng: 78.50295053690694 }
const DEG_LAT_TO_M = 111320
const DEG_LNG_TO_M = 111320 * Math.cos((KML_CENTER.lat * Math.PI) / 180) // ~106239

const KML_POLYGON_WGS84 = [
  [78.50184386, 17.40439877],
  [78.50152263, 17.40355224],
  [78.50386060, 17.40263672],
  [78.50408163, 17.40321536],
  [78.50434804, 17.40380758],
  [78.50306190, 17.40425496],
  [78.50203529, 17.40463877],
  [78.50189394, 17.40452176],
  [78.50184386, 17.40439877], // close
]

// Convert to local meters: x = east (+), z = south (+) in Three.js
const PLOT_POINTS = KML_POLYGON_WGS84.map(([lng, lat]) => {
  const x = (lng - KML_CENTER.lng) * DEG_LNG_TO_M
  const z = -(lat - KML_CENTER.lat) * DEG_LAT_TO_M // negate so north = -z
  return new THREE.Vector3(x, 0.15, z)
})

// ─── Camera targets ───────────────────────────────────────────────────────────

function getCameraTarget(
  floor: number,
  corner: CornerKey,
  totalFloors: number,
  viewDist: number
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  const buildingMidY = (totalFloors * FLOOR_HEIGHT) / 2
  const lookAt = new THREE.Vector3(0, buildingMidY * 0.5, 0)

  if (corner === 'aerial') {
    return {
      position: new THREE.Vector3(
        viewDist * 0.3,
        totalFloors * FLOOR_HEIGHT + viewDist * 0.4,
        viewDist * 0.3
      ),
      lookAt,
    }
  }

  const camY = (floor - 1) * FLOOR_HEIGHT + FLOOR_HEIGHT / 2
  const offsets: Record<string, [number, number]> = {
    NE: [viewDist,  -viewDist],
    NW: [-viewDist, -viewDist],
    SE: [viewDist,   viewDist],
    SW: [-viewDist,  viewDist],
  }
  const [x, z] = offsets[corner]
  return { position: new THREE.Vector3(x, camY, z), lookAt }
}

// ─── Camera Rig (smooth lerp) ────────────────────────────────────────────────

function CameraRig({ target }: { target: { position: THREE.Vector3; lookAt: THREE.Vector3 } }) {
  const { camera } = useThree()
  const currentLookAt = useRef(new THREE.Vector3(0, 20, 0))

  useFrame((_, delta) => {
    const t = Math.min(delta * 2, 1)
    camera.position.lerp(target.position, t)
    currentLookAt.current.lerp(target.lookAt, t)
    camera.lookAt(currentLookAt.current)
  })

  return null
}

// ─── Building GLB Model ──────────────────────────────────────────────────────

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

function BuildingModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, DRACO_CDN)
  const ref = useRef<THREE.Group>(null!)

  useEffect(() => {
    if (!scene) return
    // Compute bounding box to auto-center and scale the model
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    // Log model dimensions for debugging
    console.log('[BuildingModel] bounding box size:', size)
    console.log('[BuildingModel] bounding box center:', center)
    console.log('[BuildingModel] bounding box min/max:', box.min, box.max)
  }, [scene])

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  )
}

// ─── Placeholder building ────────────────────────────────────────────────────

function PlaceholderBuilding({ totalFloors }: { totalFloors: number }) {
  const height = totalFloors * FLOOR_HEIGHT
  const floorLevels = getFloorLevels(totalFloors)

  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[22, height, 22]} />
        <meshStandardMaterial color="#1B1916" />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[22.2, height, 22.2]} />
        <meshStandardMaterial color="#D4A017" wireframe transparent opacity={0.3} />
      </mesh>
      {floorLevels.map((fl) => (
        <mesh key={fl} position={[0, (fl - 1) * FLOOR_HEIGHT, 0]}>
          <boxGeometry args={[23, 0.12, 23]} />
          <meshStandardMaterial color="#2DD4BF" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ─── KML Plot Outline ────────────────────────────────────────────────────────

function PlotOutline() {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(PLOT_POINTS)
    const mat = new THREE.LineBasicMaterial({ color: '#D4A017', transparent: true, opacity: 0.8 })
    return new THREE.Line(geo, mat)
  }, [])

  const shapeMesh = useMemo(() => {
    const shape = new THREE.Shape()
    PLOT_POINTS.forEach((pt, i) => {
      if (i === 0) shape.moveTo(pt.x, pt.z)
      else shape.lineTo(pt.x, pt.z)
    })
    const geo = new THREE.ShapeGeometry(shape)
    const mat = new THREE.MeshStandardMaterial({ color: '#D4A017', transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.05
    return mesh
  }, [])

  return (
    <group>
      <primitive object={lineObj} />
      <primitive object={shapeMesh} />

      {/* North arrow */}
      <mesh position={[0, 0.2, -160]}>
        <coneGeometry args={[3, 8, 4]} />
        <meshStandardMaterial color="#2DD4BF" />
      </mesh>
      <mesh position={[0, 0.2, -150]}>
        <boxGeometry args={[1.5, 0.3, 10]} />
        <meshStandardMaterial color="#2DD4BF" />
      </mesh>
    </group>
  )
}

// ─── Main Viewer ─────────────────────────────────────────────────────────────

export interface BuildingExteriorViewerProps {
  modelUrl?: string | null
  totalFloors: number
  selectedFloor: number
  selectedCorner: CornerKey
}

export function BuildingExteriorViewer({
  modelUrl,
  totalFloors,
  selectedFloor,
  selectedCorner,
}: BuildingExteriorViewerProps) {
  // Use a closer camera if we have a model, wider for the plot view
  const viewDist = 200
  const target = getCameraTarget(selectedFloor, selectedCorner, totalFloors, viewDist)

  // If a Convex model URL exists use it, otherwise fall back to local GLB
  const effectiveModelUrl = modelUrl || '/legacy-towers.glb'

  return (
    <Canvas
      camera={{ fov: 50, near: 0.1, far: 5000, position: [viewDist, 80, viewDist] }}
      shadows
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0a0e14']} />

      <CameraRig target={target} />

      {/* Lighting — warm sunlight + cool fill */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 200, 100]} intensity={2.5} castShadow />
      <directionalLight position={[-80, 120, -80]} intensity={0.6} color="#87CEEB" />
      <hemisphereLight args={['#87CEEB', '#3A3530', 0.4]} />

      {/* Model */}
      <Suspense fallback={<PlaceholderBuilding totalFloors={totalFloors} />}>
        <BuildingModel url={effectiveModelUrl} />
      </Suspense>

      {/* KML plot outline */}
      <PlotOutline />

      {/* OrbitControls for interactive exploration */}
      <OrbitControls
        target={[0, (totalFloors * FLOOR_HEIGHT) / 3, 0]}
        maxDistance={800}
        minDistance={20}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Ground grid */}
      <Grid
        position={[0, -0.5, 0]}
        args={[600, 600]}
        cellSize={10}
        cellThickness={0.3}
        cellColor="#1a1e24"
        sectionSize={50}
        sectionThickness={0.6}
        sectionColor="#2a2e34"
        fadeDistance={400}
        fadeStrength={1}
        infiniteGrid
      />
    </Canvas>
  )
}
