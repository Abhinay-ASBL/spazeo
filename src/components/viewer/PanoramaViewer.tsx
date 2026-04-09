'use client'

import { useEffect, useCallback, useState, useRef, useMemo, Component, type ReactNode } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { PerspectiveCamera, TextureLoader, Texture, SRGBColorSpace } from 'three'
import { OrbitControls } from '@react-three/drei'
import { HotspotMarker } from './HotspotMarker'
import { ImageOff, Loader2 } from 'lucide-react'

/* ── Error Boundary ── */
class PanoramaErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-3"
            style={{ backgroundColor: '#0A0908' }}
          >
            <ImageOff size={32} style={{ color: '#6B6560' }} />
            <p className="text-sm" style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}>
              Could not load panorama image
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}

/* ── Types ── */

interface HotspotData {
  _id: string
  sceneId: string
  targetSceneId?: string
  type: 'navigation' | 'info' | 'media' | 'link'
  position: { x: number; y: number; z: number }
  tooltip?: string
  icon?: string
  content?: string
  title?: string
  description?: string
  imageUrl?: string | null
  markerStyle?: 'ring' | 'arrow' | 'dot' | 'label'
}

interface Props {
  imageUrl: string
  height?: string
  hotspots?: HotspotData[]
  onHotspotClick?: (hotspot: HotspotData) => void
  onSphereClick?: (position: { x: number; y: number; z: number }) => void
  isEditing?: boolean
  autoRotate?: boolean
  zoomLevel?: number
}

/* ── Normalize non-2:1 panoramas to equirectangular 2:1 ──
 *
 * Standard equirectangular panoramas are 2:1 (360°×180°).
 * DJI drone panoramas are often wider (e.g. 2.66:1 = 4750×1787).
 * Mapping these directly onto a sphere stretches them vertically.
 *
 * Fix: pad the image to 2:1 with black bars (top/bottom for wide,
 * left/right for tall) using a canvas, then use it as texture.
 * The sphere stays full & closed, and the projection is correct.
 *
 * Also returns orbital polar angle limits so OrbitControls can
 * prevent users from panning into the black-padded pole regions.
 *
 * Three.js UV mapping (with flipY=true):
 *   V_uv = 0  → South Pole (-Y) → image bottom (nadir)
 *   V_uv = 0.5 → equator → image center
 *   V_uv = 1  → North Pole (+Y) → image top (zenith)
 * OrbitControls phi mapping:
 *   phi = V_uv * π  (phi=0 ↔ looking at nadir, phi=π ↔ looking at zenith)
 */
interface NormalizeResult {
  texture: Texture
  minPolarAngle: number // radians — bottom of valid content
  maxPolarAngle: number // radians — top of valid content
}

function normalizeEquirectangular(img: HTMLImageElement): NormalizeResult | null {
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null

  const ar = w / h
  // Already close to 2:1 — no padding needed
  if (ar >= 1.95 && ar <= 2.05) return null

  const canvas = document.createElement('canvas')
  let yOff = 0

  if (ar > 2.0) {
    // Wider than 2:1 → keep width, expand height to width/2 (black bars top/bottom)
    canvas.width = w
    canvas.height = Math.round(w / 2)
    yOff = Math.round((canvas.height - h) / 2)
  } else {
    // Narrower than 2:1 → keep height, expand width to height*2 (black bars left/right)
    canvas.width = Math.round(h * 2)
    canvas.height = h
    // No vertical padding, so full polar range is valid
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Fill black, then center the original image
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const xOff = Math.round((canvas.width - w) / 2)
  ctx.drawImage(img, xOff, yOff)

  const tex = new Texture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true

  // Compute polar limits from the padded canvas (with flipY applied):
  //   canvas top (y=0) → UV V=1 (zenith/North Pole, phi=π)
  //   canvas bottom (y=H) → UV V=0 (nadir/South Pole, phi=0)
  // Original image occupies canvas rows [yOff, yOff+h].
  // After flipY: validVMax_uv (zenith side) = 1 - yOff/H
  //              validVMin_uv (nadir side)  = 1 - (yOff+h)/H
  // Polar angle: phi = V_uv * π
  const H = canvas.height
  const validVMin = 1 - (yOff + h) / H  // UV V at bottom of original image
  const validVMax = 1 - yOff / H         // UV V at top of original image
  const BUFFER = 0.01                    // small margin to avoid hard seams

  return {
    texture: tex,
    minPolarAngle: Math.max(0, (validVMin + BUFFER) * Math.PI),
    maxPolarAngle: Math.min(Math.PI, (validVMax - BUFFER) * Math.PI),
  }
}

/* ── Panorama Sphere ── */

function PanoramaSphere({
  texture,
  onSphereClick,
  isEditing,
}: {
  texture: Texture
  onSphereClick?: (position: { x: number; y: number; z: number }) => void
  isEditing?: boolean
}) {
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!isEditing || !onSphereClick) return
      event.stopPropagation()
      const point = event.point.clone().normalize().multiplyScalar(480)
      onSphereClick({ x: point.x, y: point.y, z: point.z })
    },
    [isEditing, onSphereClick]
  )

  return (
    <mesh scale={[-1, 1, 1]} onClick={handleClick}>
      <sphereGeometry args={[500, 128, 64]} />
      <meshBasicMaterial map={texture} side={2} />
    </mesh>
  )
}

/* ── Camera Controller ── */

function CameraController({ zoomLevel = 1 }: { zoomLevel?: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 50 / zoomLevel
      camera.updateProjectionMatrix()
    }
  }, [camera, zoomLevel])
  return null
}

/* ── Controls with reset support ── */

function Controls({
  autoRotate = false,
  resetTrigger,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
}: {
  autoRotate?: boolean
  resetTrigger: number
  minPolarAngle?: number
  maxPolarAngle?: number
}) {
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      controlsRef.current.reset()
    }
  }, [resetTrigger])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enablePan={false}
      rotateSpeed={-0.3}
      zoomSpeed={0.5}
      minDistance={0.1}
      maxDistance={5}
      dampingFactor={0.1}
      enableDamping
      autoRotate={autoRotate}
      autoRotateSpeed={0.4}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
    />
  )
}

/* ── Main Component ── */

export function PanoramaViewer({
  imageUrl,
  height = '100%',
  hotspots = [],
  onHotspotClick,
  onSphereClick,
  isEditing = false,
  autoRotate = false,
  zoomLevel = 1,
}: Props) {
  const [texture, setTexture] = useState<Texture | null>(null)
  const [fadeOpacity, setFadeOpacity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [polarLimits, setPolarLimits] = useState({ min: 0, max: Math.PI })

  // Refs to avoid stale closures in setTimeout callbacks
  const isTransitioningRef = useRef(false)
  const isFirstLoadRef = useRef(true)
  const currentUrlRef = useRef<string>('')

  // Helper: apply normalize result (or raw texture) and set polar limits
  const applyTexture = useCallback((t: Texture) => {
    const result = normalizeEquirectangular(t.image as HTMLImageElement)
    if (result) {
      setTexture(result.texture)
      setPolarLimits({ min: result.minPolarAngle, max: result.maxPolarAngle })
    } else {
      t.colorSpace = SRGBColorSpace
      t.needsUpdate = true
      setTexture(t)
      setPolarLimits({ min: 0, max: Math.PI })
    }
  }, [])

  useEffect(() => {
    if (!imageUrl) return

    // Skip if same URL
    if (imageUrl === currentUrlRef.current) return
    currentUrlRef.current = imageUrl

    if (isFirstLoadRef.current) {
      // First load — no transition, just load directly
      isFirstLoadRef.current = false
      setIsLoading(true)
      const loader = new TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(
        imageUrl,
        (t) => {
          applyTexture(t)
          setFadeOpacity(1)
          setIsLoading(false)
        },
        undefined,
        (err) => {
          console.error('[PanoramaViewer] texture load error:', err)
          setIsLoading(false)
        }
      )
      return
    }

    // Block overlapping transitions
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true

    // Step 1: Fade out
    setFadeOpacity(0)

    const capturedUrl = imageUrl
    const timer = setTimeout(() => {
      // Step 2: Load new texture while invisible
      setIsLoading(true)
      const loader = new TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(
        capturedUrl,
        (t) => {
          // Step 3: Normalize aspect ratio and swap texture + reset polar limits
          applyTexture(t)
          setResetTrigger((n) => n + 1)
          setIsLoading(false)

          // Step 4: Fade in
          setFadeOpacity(1)

          setTimeout(() => {
            isTransitioningRef.current = false
          }, 420) // slightly longer than CSS transition
        },
        undefined,
        (err) => {
          console.error('[PanoramaViewer] texture load error:', err)
          // Stay on current scene, fade back in
          setIsLoading(false)
          setFadeOpacity(1)
          setTimeout(() => {
            isTransitioningRef.current = false
          }, 420)
        }
      )
    }, 400) // wait for fade-out to complete

    return () => clearTimeout(timer)
  }, [imageUrl, applyTexture])

  // Compute stagger line heights for label hotspots so pills don't overlap.
  // Sort by yaw angle, then assign heights from a stepped ladder so nearby
  // labels get different heights. Non-label hotspots are not included.
  const labelLineHeights = useMemo(() => {
    const labelHotspots = hotspots.filter((h) => h.markerStyle === 'label')
    if (labelHotspots.length <= 1) return new Map<string, number>()

    // Compute yaw angle (horizontal bearing) for each label hotspot
    const withYaw = labelHotspots.map((h) => ({
      id: h._id,
      yaw: Math.atan2(h.position.x, -h.position.z), // -π to π
    }))
    // Sort by yaw so we process them left-to-right around the sphere
    withYaw.sort((a, b) => a.yaw - b.yaw)

    // Assign heights from a stepped ladder that cycles through offsets.
    // This ensures adjacent hotspots get distinct heights.
    const steps = [20, 52, 36, 68, 28, 60, 44]
    const map = new Map<string, number>()
    withYaw.forEach(({ id }, i) => {
      map.set(id, steps[i % steps.length])
    })
    return map
  }, [hotspots])

  return (
    <div
      style={{
        height,
        width: '100%',
        position: 'relative',
        cursor: isEditing ? 'crosshair' : 'grab',
        backgroundColor: '#0A0908',
        touchAction: 'none',
      }}
    >
      {/* Canvas with CSS fade transition */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeOpacity,
          transition: 'opacity 0.4s ease',
        }}
      >
        <PanoramaErrorBoundary>
          <Canvas camera={{ fov: 50, near: 0.1, far: 1000 }}>
            <CameraController zoomLevel={zoomLevel} />
            <Controls
              autoRotate={autoRotate && !isEditing}
              resetTrigger={resetTrigger}
              minPolarAngle={polarLimits.min}
              maxPolarAngle={polarLimits.max}
            />
            {texture && (
              <PanoramaSphere
                texture={texture}
                onSphereClick={onSphereClick}
                isEditing={isEditing}
              />
            )}

            {/* Render hotspot markers */}
            {hotspots.map((hotspot) => (
              <HotspotMarker
                key={hotspot._id}
                hotspot={hotspot}
                onClick={() => onHotspotClick?.(hotspot)}
                labelLineHeight={labelLineHeights.get(hotspot._id)}
              />
            ))}
          </Canvas>
        </PanoramaErrorBoundary>
      </div>

      {/* Loading spinner — shown during texture load */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full"
            style={{ backgroundColor: 'rgba(10,9,8,0.6)', backdropFilter: 'blur(8px)' }}
          >
            <Loader2 size={24} className="animate-spin" style={{ color: '#2DD4BF' }} />
          </div>
        </div>
      )}

      {/* Editing indicator */}
      {isEditing && !isLoading && (
        <div
          className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
          style={{
            backgroundColor: 'rgba(45,212,191,0.15)',
            color: '#2DD4BF',
            border: '1px solid rgba(45,212,191,0.3)',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#2DD4BF' }} />
          Click to place hotspot
        </div>
      )}
    </div>
  )
}

export default PanoramaViewer
