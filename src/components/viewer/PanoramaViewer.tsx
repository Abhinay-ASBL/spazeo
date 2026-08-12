'use client'

import { useEffect, useCallback, useState, useRef, Component, type ReactNode } from 'react'
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber'
import { PerspectiveCamera, TextureLoader, Texture, SRGBColorSpace, LinearMipMapLinearFilter, Mesh, Vector3, MeshBasicMaterial } from 'three'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { HotspotMarker } from './HotspotMarker'
import { MasterPlanOverlay, type MasterPlanMapping, type MasterPlanCorner, yawPitchToPosition } from './MasterPlanOverlay'
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

export interface HotspotData {
  _id: string
  _creationTime?: number
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
  markerStyle?: 'ring' | 'arrow' | 'dot' | 'label' | 'sticky'
  lineHeight?: number
  readOnly?: boolean
  size?: number
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
  previewPosition?: { x: number; y: number; z: number } | null
  onViewDirectionReady?: (
    getter: () => { yaw: number; pitch: number; zoom?: number } | null
  ) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  minAzimuthAngle?: number
  maxAzimuthAngle?: number
  polarClampMin?: number
  polarClampMax?: number
  /** Initial horizontal look direction in radians (OrbitControls azimuth: 0=South, π/2=East, π=North, -π/2=West) */
  initialYaw?: number
  /** Initial vertical tilt in radians. Positive = look down (more ground). Default: 0 (horizon). */
  initialPitch?: number
  /** Half-width of horizontal arc in radians. π = full 360°, π/3 = ±60° each side. Default: π (unrestricted) */
  azimuthHalfArc?: number
  /** URLs to preload in the background after the first scene loads */
  preloadUrls?: string[]
  /** Master plan image mapped onto the panorama sphere */
  masterPlanUrl?: string | null
  masterPlanMapping?: MasterPlanMapping | null
  masterPlanVisible?: boolean
  /** Show guides while pinning corners */
  masterPlanEditing?: boolean
  /** Corners placed so far (1–4) — numbered markers on sphere */
  masterPlanPinCorners?: MasterPlanCorner[]
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
  tex.minFilter = LinearMipMapLinearFilter
  tex.generateMipmaps = true
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

function rayHitOnSphere(event: ThreeEvent<PointerEvent | MouseEvent>, radius = 480) {
  const O = event.ray.origin
  const D = event.ray.direction
  const R = 500
  const b = O.dot(D)
  const c = O.dot(O) - R * R
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b + Math.sqrt(disc)
  const hitX = O.x + D.x * t
  const hitY = O.y + D.y * t
  const hitZ = O.z + D.z * t
  const len = Math.sqrt(hitX * hitX + hitY * hitY + hitZ * hitZ) || 1
  const k = radius / len
  return { x: hitX * k, y: hitY * k, z: hitZ * k }
}

function positionToYawPitch(position: { x: number; y: number; z: number }) {
  const len = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2) || 1
  const nx = position.x / len
  const ny = position.y / len
  const nz = position.z / len
  return {
    yaw: (Math.atan2(nx, -nz) * 180) / Math.PI,
    pitch: (Math.asin(Math.max(-1, Math.min(1, ny))) * 180) / Math.PI,
  }
}

/** Build a spherical rectangle mapping from two corners (degrees). */
export function mappingFromCorners(
  a: { yaw: number; pitch: number },
  b: { yaw: number; pitch: number },
  extras?: Partial<MasterPlanMapping>
): MasterPlanMapping {
  let dYaw = b.yaw - a.yaw
  while (dYaw > 180) dYaw -= 360
  while (dYaw < -180) dYaw += 360
  const widthDeg = Math.max(2, Math.abs(dYaw))
  const heightDeg = Math.max(2, Math.abs(b.pitch - a.pitch))
  let yaw = a.yaw + dYaw / 2
  while (yaw > 180) yaw -= 360
  while (yaw < -180) yaw += 360
  const pitch = (a.pitch + b.pitch) / 2
  return {
    yaw,
    pitch,
    widthDeg,
    heightDeg,
    rotation: extras?.rotation ?? 0,
    opacity: extras?.opacity ?? 0.9,
  }
}

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
      const hit = rayHitOnSphere(event)
      if (hit) onSphereClick(hit)
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

/* ── Preview Marker (pulsing dot at pending placement) ── */

function PreviewMarker({ position }: { position: { x: number; y: number; z: number } }) {
  const ringRef = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (ringRef.current) {
      const t = (ringRef.current.userData.t ?? 0) + delta * 2.4
      ringRef.current.userData.t = t
      const s = 1 + Math.sin(t) * 0.25
      ringRef.current.scale.setScalar(s)
      const mat = ringRef.current.material as MeshBasicMaterial
      mat.opacity = 0.55 + Math.sin(t) * 0.25
    }
  })
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#D4A017" depthTest={false} transparent />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[10, 14, 32]} />
        <meshBasicMaterial color="#D4A017" depthTest={false} transparent opacity={0.7} side={2} />
      </mesh>
    </group>
  )
}

/* ── Camera Controller ── */

function CameraController({ zoomLevel = 1 }: { zoomLevel?: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      // Keep overview useful without extreme fisheye (0.5× → ~95°, not 130°)
      const fov = zoomLevel <= 0.5 ? 95 : Math.min(100, 65 / zoomLevel)
      camera.fov = fov
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
  minAzimuthAngle,
  maxAzimuthAngle,
  initialYaw,
  initialPitch,
  azimuthHalfArc = Math.PI,
  onViewDirectionReady,
  onDragStart,
  onDragEnd,
  enableRotate = true,
}: {
  autoRotate?: boolean
  resetTrigger: number
  minPolarAngle?: number
  maxPolarAngle?: number
  minAzimuthAngle?: number
  maxAzimuthAngle?: number
  initialYaw?: number
  /** Initial vertical tilt in radians. Positive = look down (show more ground). Default: 0 (horizon). */
  initialPitch?: number
  azimuthHalfArc?: number
  onViewDirectionReady?: (
    getter: () => { yaw: number; pitch: number; zoom?: number } | null
  ) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  enableRotate?: boolean
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const yawAppliedRef = useRef(false)

  const polarLocked = Math.abs(maxPolarAngle - minPolarAngle) < 0.001

  // Position camera at initialYaw + initialPitch on mount and whenever they change
  useEffect(() => {
    if (!controlsRef.current) return
    const yaw = initialYaw ?? 0
    const pos = camera.position
    const horizDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z) || 5
    camera.position.x = Math.sin(yaw) * horizDist
    camera.position.z = Math.cos(yaw) * horizDist
    if (polarLocked) {
      camera.position.y = 0
    } else {
      camera.position.y = horizDist * Math.tan(initialPitch ?? 0)
    }
    controlsRef.current.update()
    controlsRef.current.saveState()
    yawAppliedRef.current = true
  }, [initialYaw, initialPitch, polarLocked, camera])

  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      controlsRef.current.reset()
    }
  }, [resetTrigger])

  // Wrap-safe azimuth clamping + horizon enforcement every frame
  useFrame(() => {
    if (!controlsRef.current || !yawAppliedRef.current) return

    // When polar is locked (damping disabled), force camera.y = 0 every frame.
    // OrbitControls already clamps phi via minPolarAngle===maxPolarAngle;
    // this catches any residual floating-point drift.
    if (polarLocked) {
      camera.position.y = 0
    }

    if (azimuthHalfArc >= Math.PI) return
    const pos = camera.position
    const theta = Math.atan2(pos.x, pos.z)
    const yaw = initialYaw ?? 0
    let delta = theta - yaw
    while (delta > Math.PI) delta -= 2 * Math.PI
    while (delta < -Math.PI) delta += 2 * Math.PI
    if (Math.abs(delta) > azimuthHalfArc) {
      const clampedTheta = yaw + Math.sign(delta) * azimuthHalfArc
      const horizDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z) || 5
      camera.position.x = Math.sin(clampedTheta) * horizDist
      camera.position.z = Math.cos(clampedTheta) * horizDist
      controlsRef.current.update()
    }
  })

  useEffect(() => {
    if (!onViewDirectionReady) return
    const getter = () => {
      const dir = camera.getWorldDirection(new Vector3())
      const yaw = (Math.atan2(dir.x, -dir.z) * 180) / Math.PI
      const pitch = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI
      const zoom = (camera as PerspectiveCamera).zoom ?? 1
      return { yaw, pitch, zoom }
    }
    onViewDirectionReady(getter)
  }, [camera, onViewDirectionReady])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enablePan={false}
      enableRotate={enableRotate}
      rotateSpeed={-0.3}
      zoomSpeed={0.5}
      minDistance={0.1}
      maxDistance={5}
      dampingFactor={polarLocked ? 0 : 0.1}
      enableDamping={!polarLocked && enableRotate}
      autoRotate={autoRotate && enableRotate}
      autoRotateSpeed={0.4}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      minAzimuthAngle={azimuthHalfArc < Math.PI ? undefined : minAzimuthAngle}
      maxAzimuthAngle={azimuthHalfArc < Math.PI ? undefined : maxAzimuthAngle}
      onStart={() => onDragStart?.()}
      onEnd={() => onDragEnd?.()}
    />
  )
}

/* ── WebGL capability check ──
 * react-three-fiber's <Canvas> throws hard when a WebGL context can't be
 * created (headless/sandboxed browsers, GPU disabled, blocklisted drivers).
 * Probe support before mounting the Canvas so we can degrade gracefully
 * instead of surfacing an uncaught THREE.WebGLRenderer error.
 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

/* ── Main Component ── */

type CachedEntry = { texture: Texture; minPolar: number; maxPolar: number }

function processRawTexture(t: Texture): CachedEntry {
  const result = normalizeEquirectangular(t.image as HTMLImageElement)
  if (result) {
    return { texture: result.texture, minPolar: result.minPolarAngle, maxPolar: result.maxPolarAngle }
  }
  t.colorSpace = SRGBColorSpace
  t.minFilter = LinearMipMapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return { texture: t, minPolar: 0, maxPolar: Math.PI }
}

export function PanoramaViewer({
  imageUrl,
  height = '100%',
  hotspots = [],
  onHotspotClick,
  onSphereClick,
  isEditing = false,
  autoRotate = false,
  zoomLevel = 1,
  previewPosition = null,
  onViewDirectionReady,
  onDragStart,
  onDragEnd,
  minAzimuthAngle,
  maxAzimuthAngle,
  polarClampMin,
  polarClampMax,
  initialYaw,
  initialPitch,
  azimuthHalfArc,
  preloadUrls,
  masterPlanUrl,
  masterPlanMapping,
  masterPlanVisible = true,
  masterPlanEditing = false,
  masterPlanPinCorners = [],
}: Props) {
  const [texture, setTexture] = useState<Texture | null>(null)
  const [fadeOpacity, setFadeOpacity] = useState(1)
  const [isLoading, setIsLoading] = useState(!!imageUrl)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [polarLimits, setPolarLimits] = useState({ min: 0, max: Math.PI })
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setWebglSupported(isWebGLAvailable())
  }, [])

  // Refs to avoid stale closures in setTimeout callbacks
  const isTransitioningRef = useRef(false)
  const isFirstLoadRef = useRef(true)
  const currentUrlRef = useRef<string>('')
  // Texture cache: url → processed {texture, polarLimits}
  const textureCacheRef = useRef<Map<string, CachedEntry>>(new Map())

  const applyEntry = useCallback(({ texture: t, minPolar, maxPolar }: CachedEntry) => {
    setTexture(t)
    setPolarLimits({ min: minPolar, max: maxPolar })
  }, [])

  // Legacy helper used by TextureLoader callbacks
  const applyTexture = useCallback((t: Texture) => {
    applyEntry(processRawTexture(t))
  }, [applyEntry])

  // Background preload: fires after first scene finishes loading
  useEffect(() => {
    if (isLoading || !preloadUrls || preloadUrls.length === 0) return
    preloadUrls.forEach((url) => {
      if (!url || url === imageUrl || textureCacheRef.current.has(url)) return
      const loader = new TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(url, (t) => {
        if (!textureCacheRef.current.has(url)) {
          textureCacheRef.current.set(url, processRawTexture(t))
        }
      })
    })
  }, [isLoading, preloadUrls, imageUrl])

  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false)
      return
    }

    // Skip if same URL
    if (imageUrl === currentUrlRef.current) {
      setIsLoading(false)
      return
    }
    currentUrlRef.current = imageUrl

    // Cache hit — apply immediately (first load: no transition; subsequent: fade swap)
    const cached = textureCacheRef.current.get(imageUrl)
    if (cached) {
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false
        applyEntry(cached)
        setFadeOpacity(1)
        setIsLoading(false)
        return
      }
      if (isTransitioningRef.current) return
      isTransitioningRef.current = true
      setFadeOpacity(0)
      setTimeout(() => {
        applyEntry(cached)
        setResetTrigger((n) => n + 1)
        setFadeOpacity(1)
        setIsLoading(false)
        setTimeout(() => { isTransitioningRef.current = false }, 420)
      }, 400)
      return
    }

    if (isFirstLoadRef.current) {
      // First load — no transition, just load directly
      isFirstLoadRef.current = false
      setIsLoading(true)
      const loader = new TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(
        imageUrl,
        (t) => {
          const entry = processRawTexture(t)
          textureCacheRef.current.set(imageUrl, entry)
          applyEntry(entry)
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
          const entry = processRawTexture(t)
          textureCacheRef.current.set(capturedUrl, entry)
          applyEntry(entry)
          setResetTrigger((n) => n + 1)
          setIsLoading(false)
          setFadeOpacity(1)
          setTimeout(() => { isTransitioningRef.current = false }, 420)
        },
        undefined,
        (err) => {
          console.error('[PanoramaViewer] texture load error:', err)
          setIsLoading(false)
          setFadeOpacity(1)
          setTimeout(() => { isTransitioningRef.current = false }, 420)
        }
      )
    }, 400) // wait for fade-out to complete

    return () => clearTimeout(timer)
  }, [imageUrl, applyEntry])

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
        {webglSupported === false ? (
          /* WebGL unavailable — degrade to a flat panorama image */
          imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Panorama view"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-3"
              style={{ backgroundColor: '#0A0908' }}
            >
              <ImageOff size={32} style={{ color: '#6B6560' }} />
              <p
                className="text-sm"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                Could not load panorama image
              </p>
            </div>
          )
        ) : webglSupported === true ? (
          <PanoramaErrorBoundary>
            <Canvas
              camera={{ fov: 65, near: 0.1, far: 1000 }}
              onCreated={({ gl }) => {
                // OrbitControls (three-stdlib) calls releasePointerCapture with a
                // stale pointer id when a touch ends mid-gesture or during unmount.
                // Browsers throw NotFoundError. Patch once — persists for canvas
                // lifetime, never restored, so unmount racing is not an issue.
                const el = gl.domElement
                const _orig = el.releasePointerCapture.bind(el)
                el.releasePointerCapture = (id: number) => {
                  try { _orig(id) } catch { /* stale pointer id */ }
                }
              }}
            >
              <CameraController zoomLevel={zoomLevel} />
              <Controls
                autoRotate={autoRotate && !isEditing && !masterPlanEditing}
                resetTrigger={resetTrigger}
                minPolarAngle={polarClampMin !== undefined ? Math.max(polarLimits.min, polarClampMin) : polarLimits.min}
                maxPolarAngle={polarClampMax !== undefined ? Math.min(polarLimits.max, polarClampMax) : polarLimits.max}
                minAzimuthAngle={minAzimuthAngle}
                maxAzimuthAngle={maxAzimuthAngle}
                initialYaw={initialYaw}
                initialPitch={initialPitch}
                azimuthHalfArc={azimuthHalfArc}
                onViewDirectionReady={onViewDirectionReady}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              {texture && (
                <PanoramaSphere
                  texture={texture}
                  onSphereClick={onSphereClick}
                  isEditing={isEditing}
                />
              )}

              {masterPlanUrl && masterPlanMapping && (
                <MasterPlanOverlay
                  imageUrl={masterPlanUrl}
                  mapping={masterPlanMapping}
                  visible={masterPlanVisible}
                  showGuides={false}
                />
              )}

              {/* Render hotspot markers */}
              {hotspots.map((hotspot) => (
                <HotspotMarker
                  key={hotspot._id}
                  hotspot={hotspot}
                  onClick={() => onHotspotClick?.(hotspot)}
                />
              ))}

              {/* Pending placement preview */}
              {previewPosition && <PreviewMarker position={previewPosition} />}
            </Canvas>
          </PanoramaErrorBoundary>
        ) : null}
      </div>

      {/* Loading spinner — shown during texture load (WebGL path only) */}
      {isLoading && webglSupported !== false && (
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
      {isEditing && !isLoading && !masterPlanEditing && (
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
      {masterPlanEditing && !isLoading && (
        <div
          className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 z-20"
          style={{
            backgroundColor: 'rgba(212,160,23,0.18)',
            color: '#D4A017',
            border: '1px solid rgba(212,160,23,0.35)',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#D4A017' }} />
          Click corners 1→4 on the panorama (TL, TR, BR, BL)
        </div>
      )}
    </div>
  )
}

export default PanoramaViewer
