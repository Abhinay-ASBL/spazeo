'use client'

import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Clone, useGLTF } from '@react-three/drei'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CostSummaryPanel } from './CostSummaryPanel'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface FurnishedRoomViewerProps {
  tourSlug: string
  furnishedRoomSlug: string
}

/** Read-only furniture piece — no selection or transform controls */
function ReadOnlyFurniturePiece({
  glbUrl,
  position,
  rotation,
  scale,
}: {
  glbUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const { scene } = useGLTF(glbUrl)

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Clone object={scene} />
    </group>
  )
}

export function FurnishedRoomViewer({
  tourSlug,
  furnishedRoomSlug,
}: FurnishedRoomViewerProps) {
  const [furnitureVisible, setFurnitureVisible] = useState(true)

  const data = useQuery(api.furnishedRooms.getBySlug, {
    furnishedRoomSlug,
  })

  // Loading state
  if (data === undefined) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full gap-3"
        style={{ backgroundColor: '#0A0908' }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: '#D4A017' }}
        />
        <span
          className="text-sm"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Loading furnished room...
        </span>
      </div>
    )
  }

  // Not found state
  if (data === null) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full gap-3"
        style={{ backgroundColor: '#0A0908' }}
      >
        <span
          className="text-lg font-semibold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          Room Not Found
        </span>
        <span
          className="text-sm"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          This furnished room may have been removed or the link is invalid.
        </span>
      </div>
    )
  }

  const { room, tour, placements } = data

  // Filter placements with valid glb URLs
  const validPlacements = placements.filter(
    (
      p
    ): p is NonNullable<typeof p> & {
      furnitureItem: NonNullable<NonNullable<typeof p>['furnitureItem']> & {
        glbUrl: string
      }
    } => p !== null && p.furnitureItem !== null && !!p.furnitureItem.glbUrl
  )

  // No splat URL — cannot render
  if (!tour.splatUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full gap-3"
        style={{ backgroundColor: '#0A0908' }}
      >
        <span
          className="text-lg font-semibold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          3D Model Unavailable
        </span>
        <span
          className="text-sm"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          The 3D model for this tour is not yet available.
        </span>
      </div>
    )
  }

  // Build placement data for CostSummaryPanel
  const costItems = validPlacements.map((p) => ({
    name: p.furnitureItem.name,
    price: p.furnitureItem.priceUsd,
    amazonUrl: p.furnitureItem.amazonUrl,
  }))

  return (
    <div className="flex flex-col md:flex-row w-full h-full">
      {/* Main 3D Viewer */}
      <div className="relative flex-1 min-w-0" style={{ minHeight: '60vh' }}>
        {/* Lazy-load SplatScene to avoid bundling spark.js at top level */}
        <Canvas
          gl={{ antialias: false }}
          camera={{ position: [0, 12, 12], fov: 30, near: 0.1, far: 1000 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <SplatSceneLoader url={tour.splatUrl} />
          </Suspense>

          {/* Render furniture pieces */}
          {furnitureVisible &&
            validPlacements.map((p) => (
              <Suspense key={p.instanceId} fallback={null}>
                <ReadOnlyFurniturePiece
                  glbUrl={p.furnitureItem.glbUrl}
                  position={[p.position.x, p.position.y, p.position.z]}
                  rotation={[p.rotation.x, p.rotation.y, p.rotation.z]}
                  scale={[p.scale.x, p.scale.y, p.scale.z]}
                />
              </Suspense>
            ))}

          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            makeDefault
            maxPolarAngle={(80 * Math.PI) / 180}
            minDistance={2}
            maxDistance={50}
          />
          <ambientLight intensity={0.5} />
        </Canvas>

        {/* Header bar */}
        <div
          className="absolute top-0 left-0 w-full h-14 z-10 flex items-center justify-between px-5"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,9,8,0.6), transparent)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-base font-bold"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              {tour.title}
            </span>
            {room.title && (
              <span
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  color: '#A8A29E',
                  backgroundColor: 'rgba(10,9,8,0.4)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {room.title}
              </span>
            )}
          </div>

          {/* Furniture toggle */}
          <button
            onClick={() => setFurnitureVisible((v) => !v)}
            aria-label={
              furnitureVisible ? 'Hide furniture' : 'Show furniture'
            }
            className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: furnitureVisible
                ? '#D4A017'
                : 'rgba(10,9,8,0.4)',
              color: furnitureVisible ? '#0A0908' : '#F5F3EF',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {furnitureVisible ? (
              <Eye size={16} strokeWidth={1.5} />
            ) : (
              <EyeOff size={16} strokeWidth={1.5} />
            )}
            <span className="hidden sm:inline">
              {furnitureVisible ? 'Hide Furniture' : 'Show Furniture'}
            </span>
          </button>
        </div>
      </div>

      {/* Cost Summary Panel — right sidebar on desktop, bottom on mobile */}
      <CostSummaryPanel
        placements={costItems}
        furnitureVisible={furnitureVisible}
      />
    </div>
  )
}

/** Lazy wrapper for SplatScene to avoid top-level import of spark.js */
function SplatSceneLoader({ url }: { url: string }) {
  // Dynamic import inside R3F context
  const { SplatScene } = require('@/components/viewer/SplatScene')
  return <SplatScene url={url} />
}
