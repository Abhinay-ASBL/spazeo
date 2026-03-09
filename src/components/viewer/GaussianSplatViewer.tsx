'use client'

import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { SplatScene } from './SplatScene'
import { NavigationModes } from './NavigationModes'
import { SplatHotspot3D } from './SplatHotspot3D'
import { ModeSwitcher } from './ModeSwitcher'
import { VirtualJoystick } from './VirtualJoystick'
import { useSplatViewerStore } from '@/hooks/useSplatViewerStore'
import { Maximize2, Minimize2, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Hotspot3D {
  id: string
  position: [number, number, number]
  label: string
  targetPosition?: [number, number, number]
}

interface GaussianSplatViewerProps {
  splatUrl: string
  tourTitle?: string
  hotspots?: Hotspot3D[]
}

export function GaussianSplatViewer({
  splatUrl,
  tourTitle,
  hotspots = [],
}: GaussianSplatViewerProps) {
  const navMode = useSplatViewerStore((s) => s.navMode)
  const transitioning = useSplatViewerStore((s) => s.transitioning)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Orbit controls config based on nav mode
  const orbitConfig = (() => {
    switch (navMode) {
      case 'dollhouse':
        return {
          enableRotate: true,
          enableZoom: true,
          enablePan: true,
          maxPolarAngle: (80 * Math.PI) / 180,
          minDistance: 2,
          maxDistance: 50,
        }
      case 'freeRoam':
        return {
          enableRotate: true,
          enableZoom: false,
          enablePan: false,
          maxPolarAngle: Math.PI,
          minDistance: 0.1,
          maxDistance: 100,
        }
      case 'hotspot':
        return {
          enableRotate: true,
          enableZoom: true,
          enablePan: false,
          maxPolarAngle: Math.PI,
          minDistance: 0.1,
          maxDistance: 100,
        }
    }
  })()

  const handleHotspotClick = useCallback(
    (_hotspot: Hotspot3D) => {
      // In hotspot mode, flying to position is handled by NavigationModes
      // For now, log the click — full fly-to integration uses the store
      if (navMode === 'hotspot') {
        // Camera fly-to would be triggered through the navigation system
      }
    },
    [navMode]
  )

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied!')
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0A0908',
      }}
    >
      {/* R3F Canvas */}
      <Canvas
        gl={{ antialias: false }}
        camera={{ position: [0, 12, 12], fov: 30, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <SplatScene url={splatUrl} />
        </Suspense>

        <NavigationModes />

        {/* 3D Hotspot markers */}
        {hotspots.map((h) => (
          <SplatHotspot3D
            key={h.id}
            position={h.position}
            label={h.label}
            onClick={() => handleHotspotClick(h)}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          enabled={!transitioning}
          {...orbitConfig}
        />
        <ambientLight intensity={0.5} />
      </Canvas>

      {/* Top header bar with title and controls */}
      <div
        className="absolute top-0 left-0 w-full h-14 z-10 flex items-center justify-between px-5"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,9,8,0.6), transparent)',
        }}
      >
        {/* Tour title */}
        <div className="flex items-center gap-3">
          {tourTitle && (
            <span
              className="text-base font-bold"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              {tourTitle}
            </span>
          )}
          <span
            className="text-[11px] px-2.5 py-1 rounded-full"
            style={{
              color: '#A8A29E',
              backgroundColor: 'rgba(10,9,8,0.4)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            3D
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(10,9,8,0.4)' }}
          >
            {isFullscreen ? (
              <Minimize2 size={18} color="#F5F3EF" strokeWidth={1.5} />
            ) : (
              <Maximize2 size={18} color="#F5F3EF" strokeWidth={1.5} />
            )}
          </button>
          <button
            onClick={handleShare}
            aria-label="Share tour"
            className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(10,9,8,0.4)' }}
          >
            <Share2 size={18} color="#F5F3EF" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mode switcher (bottom center) */}
      <ModeSwitcher />

      {/* Virtual joystick (bottom left, mobile only) */}
      <VirtualJoystick />
    </div>
  )
}
