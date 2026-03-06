'use client'

import { useEffect, useCallback, useState, useRef, Component, type ReactNode } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { PerspectiveCamera, TextureLoader, type Texture, SRGBColorSpace } from 'three'
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
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={2} />
    </mesh>
  )
}

/* ── Camera Controller ── */

function CameraController({ zoomLevel = 1 }: { zoomLevel?: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 75 / zoomLevel
      camera.updateProjectionMatrix()
    }
  }, [camera, zoomLevel])
  return null
}

/* ── Controls with reset support ── */

function Controls({
  autoRotate = false,
  resetTrigger,
}: {
  autoRotate?: boolean
  resetTrigger: number
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
      enableZoom={false}
      enablePan={false}
      rotateSpeed={-0.3}
      dampingFactor={0.1}
      enableDamping
      autoRotate={autoRotate}
      autoRotateSpeed={0.4}
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

  // Refs to avoid stale closures in setTimeout callbacks
  const isTransitioningRef = useRef(false)
  const isFirstLoadRef = useRef(true)
  const currentUrlRef = useRef<string>('')

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
          t.colorSpace = SRGBColorSpace
          t.needsUpdate = true
          setTexture(t)
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
          t.colorSpace = SRGBColorSpace
          t.needsUpdate = true

          // Step 3: Swap texture and reset camera
          setTexture(t)
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
  }, [imageUrl])

  return (
    <div
      style={{
        height,
        width: '100%',
        position: 'relative',
        cursor: isEditing ? 'crosshair' : 'grab',
        backgroundColor: '#0A0908',
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
          <Canvas camera={{ fov: 75, near: 0.1, far: 1000 }}>
            <CameraController zoomLevel={zoomLevel} />
            <Controls autoRotate={autoRotate && !isEditing} resetTrigger={resetTrigger} />
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
