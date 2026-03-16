'use client'

import { useFloorPlanEditorStore } from '@/stores/floorPlanEditorStore'

interface OriginalOverlayProps {
  imageUrl: string
}

export function OriginalOverlay({ imageUrl }: OriginalOverlayProps) {
  const walls = useFloorPlanEditorStore((s) => s.geometry?.walls ?? [])
  const rooms = useFloorPlanEditorStore((s) => s.geometry?.rooms ?? [])
  const selectedElementId = useFloorPlanEditorStore((s) => s.selectedElementId)
  const viewportScale = useFloorPlanEditorStore((s) => s.viewportScale)
  const viewportPosition = useFloorPlanEditorStore((s) => s.viewportPosition)

  // Pixels per meter for overlay coordinate conversion
  const PPM = 50

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0A0908]">
      <div
        style={{
          transform: `translate(${viewportPosition.x}px, ${viewportPosition.y}px) scale(${viewportScale})`,
          transformOrigin: '0 0',
        }}
        className="relative"
      >
        {/* Original floor plan image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Original floor plan"
          className="block max-w-none"
          draggable={false}
        />

        {/* SVG overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {/* Room polygons */}
          {rooms.filter((room) => room.points?.length).map((room) => (
            <polygon
              key={room.id}
              points={room.points.map((p) => `${p.x * PPM},${p.y * PPM}`).join(' ')}
              fill={room.confidence === 'low' ? 'rgba(251,191,36,0.1)' : 'rgba(212,160,23,0.08)'}
              stroke={room.id === selectedElementId ? '#D4A017' : 'rgba(212,160,23,0.3)'}
              strokeWidth={room.id === selectedElementId ? 2 : 1}
            />
          ))}

          {/* Wall lines */}
          {walls.filter((wall) => wall.start && wall.end).map((wall) => (
            <line
              key={wall.id}
              x1={wall.start.x * PPM}
              y1={wall.start.y * PPM}
              x2={wall.end.x * PPM}
              y2={wall.end.y * PPM}
              stroke={
                wall.id === selectedElementId
                  ? '#D4A017'
                  : wall.confidence === 'low'
                    ? 'rgba(251,191,36,0.6)'
                    : 'rgba(212,160,23,0.6)'
              }
              strokeWidth={wall.id === selectedElementId ? 3 : 2}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
