'use client'

import { useFloorPlanEditorStore } from '@/stores/floorPlanEditorStore'
import { useCallback, useRef } from 'react'

const MINIMAP_WIDTH = 200
const MINIMAP_HEIGHT = 150

export function EditorMiniMap() {
  const walls = useFloorPlanEditorStore((s) => s.geometry.walls)
  const viewportScale = useFloorPlanEditorStore((s) => s.viewportScale)
  const viewportPosition = useFloorPlanEditorStore((s) => s.viewportPosition)
  const stageSize = useFloorPlanEditorStore((s) => s.stageSize)
  const setViewportPosition = useFloorPlanEditorStore((s) => s.setViewportPosition)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate bounding box of all walls to scale minimap
  const allPoints = walls.flatMap((w) => [w.start, w.end])
  const minX = allPoints.length > 0 ? Math.min(...allPoints.map((p) => p.x)) - 1 : 0
  const maxX = allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.x)) + 1 : 20
  const minY = allPoints.length > 0 ? Math.min(...allPoints.map((p) => p.y)) - 1 : 0
  const maxY = allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.y)) + 1 : 15

  const worldW = maxX - minX
  const worldH = maxY - minY
  const scaleX = MINIMAP_WIDTH / worldW
  const scaleY = MINIMAP_HEIGHT / worldH
  const scale = Math.min(scaleX, scaleY)

  const toMiniX = (x: number) => (x - minX) * scale
  const toMiniY = (y: number) => (y - minY) * scale

  // Viewport rectangle in minimap coords
  const vpW = (stageSize.width / viewportScale) * scale / 50 // 50px per meter approx
  const vpH = (stageSize.height / viewportScale) * scale / 50
  const vpX = toMiniX(-viewportPosition.x / viewportScale / 50)
  const vpY = toMiniY(-viewportPosition.y / viewportScale / 50)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Convert minimap click to world coords
    const worldX = clickX / scale + minX
    const worldY = clickY / scale + minY

    // Center viewport on clicked position (pixels per meter = 50 approx)
    const ppm = 50
    setViewportPosition({
      x: -(worldX * ppm * viewportScale - stageSize.width / 2),
      y: -(worldY * ppm * viewportScale - stageSize.height / 2),
    })
  }, [scale, minX, minY, viewportScale, stageSize, setViewportPosition])

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="absolute bottom-3 right-3 bg-[#1B1916]/90 border border-[#2E2A24] rounded-lg overflow-hidden cursor-crosshair"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      aria-label="Floor plan minimap"
    >
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
        {/* Wall lines */}
        {walls.map((wall) => (
          <line
            key={wall.id}
            x1={toMiniX(wall.start.x)}
            y1={toMiniY(wall.start.y)}
            x2={toMiniX(wall.end.x)}
            y2={toMiniY(wall.end.y)}
            stroke="#A8A29E"
            strokeWidth={1.5}
          />
        ))}
        {/* Viewport rectangle */}
        <rect
          x={Math.max(0, vpX)}
          y={Math.max(0, vpY)}
          width={Math.min(vpW, MINIMAP_WIDTH)}
          height={Math.min(vpH, MINIMAP_HEIGHT)}
          fill="none"
          stroke="#D4A017"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  )
}
