'use client'

import { useRef, useMemo, useEffect, useState, Suspense, Component, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, useGLTF, Html, useProgress } from '@react-three/drei'
import { MeshoptDecoder } from 'three-stdlib'
import * as THREE from 'three'

/** Shared meshopt decoder — must be ready before any compressed GLB loads. */
const meshoptDecoder =
  typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder

function useMeshoptReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    Promise.resolve('ready' in meshoptDecoder ? meshoptDecoder.ready : undefined).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

function ModelLoadProgress() {
  const { progress, active } = useProgress()
  if (!active) return null
  return (
    <Html center>
      <div className="rounded-lg bg-[rgba(10,9,8,0.92)] border border-[rgba(212,160,23,0.25)] px-4 py-3 text-center min-w-[200px]">
        <p className="text-xs font-medium text-[#D4A017] mb-1">Loading 3D model</p>
        <p className="text-[10px] text-[#6B6560] mb-2">Large files can take 30–60s</p>
        <div className="h-1.5 rounded-full bg-[#1B1916] overflow-hidden">
          <div
            className="h-full bg-[#D4A017] transition-all duration-300"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <p className="text-[10px] text-[#A8A29E] mt-1.5">{Math.round(progress)}%</p>
      </div>
    </Html>
  )
}

export class ModelErrorBoundary extends Component<
  { children: ReactNode; onError?: (message: string) => void },
  { error: string | null }
> {
  state = { error: null as string | null }

  static getDerivedStateFromError(err: Error) {
    return { error: err.message || 'Failed to load 3D model' }
  }

  componentDidCatch(err: Error) {
    this.props.onError?.(err.message || 'Failed to load 3D model')
  }

  render() {
    if (this.state.error) return null
    return this.props.children
  }
}

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
  const lastTarget = useRef(new THREE.Vector3(NaN, NaN, NaN))
  const settled = useRef(false)

  useFrame((_, delta) => {
    // Re-arm only when floor/corner changes; once arrived, release the camera
    // so OrbitControls can be used instead of being pulled back every frame.
    if (!lastTarget.current.equals(target.position)) {
      lastTarget.current.copy(target.position)
      settled.current = false
    }
    if (settled.current) return
    const t = Math.min(delta * 2, 1)
    camera.position.lerp(target.position, t)
    currentLookAt.current.lerp(target.lookAt, t)
    camera.lookAt(currentLookAt.current)
    if (camera.position.distanceTo(target.position) < 0.5) settled.current = true
  })

  return null
}

// ─── Building GLB Model ──────────────────────────────────────────────────────

function BuildingModelInner({
  url,
  totalFloors,
  onLoaded,
}: {
  url: string
  totalFloors: number
  onLoaded?: () => void
}) {
  // Draco off — Legacy Towers GLB uses meshopt + WebP, not Draco
  const { scene } = useGLTF(url, false, true)
  const ref = useRef<THREE.Group>(null!)

  useEffect(() => {
    onLoaded?.()
  }, [onLoaded, scene])

  // Auto-center and scale the model so it fits our camera rig
  const transform = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    // Target height based on totalFloors
    const targetHeight = totalFloors * FLOOR_HEIGHT
    const scale = size.y > 0 ? targetHeight / size.y : 1

    return {
      // Shift so model center sits at origin, bottom at y=0
      position: new THREE.Vector3(
        -center.x * scale,
        -box.min.y * scale,
        -center.z * scale
      ),
      scale,
    }
  }, [scene, totalFloors])

  return (
    <group ref={ref} position={transform.position} scale={transform.scale}>
      <primitive object={scene} />
    </group>
  )
}

function BuildingModel({
  url,
  totalFloors,
  onLoaded,
}: {
  url: string
  totalFloors: number
  onLoaded?: () => void
}) {
  const meshoptReady = useMeshoptReady()
  if (!meshoptReady) {
    return <PlaceholderBuilding totalFloors={totalFloors} />
  }
  return (
    <BuildingModelInner url={url} totalFloors={totalFloors} onLoaded={onLoaded} />
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

  useEffect(() => () => {
    lineObj.geometry.dispose()
    ;(lineObj.material as THREE.Material).dispose()
    shapeMesh.geometry.dispose()
    ;(shapeMesh.material as THREE.Material).dispose()
  }, [lineObj, shapeMesh])

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
  onModelLoaded?: () => void
  onModelError?: (message: string) => void
}

export function BuildingExteriorViewer({
  modelUrl,
  totalFloors,
  selectedFloor,
  selectedCorner,
  onModelLoaded,
  onModelError,
}: BuildingExteriorViewerProps) {
  const viewDist = 200
  const target = getCameraTarget(selectedFloor, selectedCorner, totalFloors, viewDist)

  // Prefer Convex URL; local meshopt-compressed asset is the dev fallback
  const effectiveModelUrl = modelUrl || '/buildings/all-towers.glb'

  // Bust cache when Convex replaces storage after re-upload
  const cacheKey = modelUrl ? `${effectiveModelUrl}#${modelUrl.length}` : effectiveModelUrl

  return (
    <Canvas
      camera={{ fov: 50, near: 0.1, far: 5000, position: [viewDist, 80, viewDist] }}
      shadows
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0a0e14']} />

      <CameraRig target={target} />

      {/* Lighting — warm sunlight + cool fill */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 200, 100]} intensity={2.5} castShadow />
      <directionalLight position={[-80, 120, -80]} intensity={0.6} color="#87CEEB" />
      <hemisphereLight args={['#87CEEB', '#3A3530', 0.4]} />

      {/* Model */}
      <ModelErrorBoundary key={cacheKey} onError={onModelError}>
        <Suspense fallback={<PlaceholderBuilding totalFloors={totalFloors} />}>
          <BuildingModel
            key={cacheKey}
            url={effectiveModelUrl}
            totalFloors={totalFloors}
            onLoaded={onModelLoaded}
          />
        </Suspense>
      </ModelErrorBoundary>
      <ModelLoadProgress />

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
