'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import type { FloorPlanGeometry, Wall, Room, DimensionLine } from '@/stores/floorPlanEditorStore'
import { SkipForward } from 'lucide-react'

// Dynamic import for react-konva (needs DOM, no SSR)
const Stage = lazy(() =>
  import('react-konva').then((m) => ({ default: m.Stage }))
)
const Layer = lazy(() =>
  import('react-konva').then((m) => ({ default: m.Layer }))
)
const Line = lazy(() =>
  import('react-konva').then((m) => ({ default: m.Line }))
)
const KonvaText = lazy(() =>
  import('react-konva').then((m) => ({ default: m.Text }))
)
const Rect = lazy(() =>
  import('react-konva').then((m) => ({ default: m.Rect }))
)

interface AnimatedBuildUpProps {
  geometry: FloorPlanGeometry
  onAnimationComplete: () => void
}

// Pixels per meter for rendering
const PPM = 50

// Room type to color map
const ROOM_COLORS: Record<string, string> = {
  kitchen: 'rgba(251, 191, 36, 0.2)',      // warm amber
  bedroom: 'rgba(96, 165, 250, 0.2)',      // soft blue
  bathroom: 'rgba(45, 212, 191, 0.2)',     // light teal
  living_room: 'rgba(212, 160, 23, 0.2)', // warm gold
  dining_room: 'rgba(251, 122, 84, 0.15)',// warm coral
  hallway: 'rgba(168, 162, 158, 0.12)',    // neutral
  closet: 'rgba(168, 162, 158, 0.1)',      // muted neutral
  balcony: 'rgba(45, 212, 191, 0.15)',     // teal variant
  laundry: 'rgba(96, 165, 250, 0.15)',     // blue variant
  study: 'rgba(167, 139, 250, 0.2)',       // purple
  garage: 'rgba(168, 162, 158, 0.15)',     // neutral
  other: 'rgba(168, 162, 158, 0.12)',      // fallback
}

type AnimationStage = 'walls' | 'rooms' | 'dimensions' | 'complete'

function computeBounds(geometry: FloorPlanGeometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const wall of geometry.walls) {
    minX = Math.min(minX, wall.start.x, wall.end.x)
    minY = Math.min(minY, wall.start.y, wall.end.y)
    maxX = Math.max(maxX, wall.start.x, wall.end.x)
    maxY = Math.max(maxY, wall.start.y, wall.end.y)
  }

  for (const room of geometry.rooms) {
    for (const pt of room.points) {
      minX = Math.min(minX, pt.x)
      minY = Math.min(minY, pt.y)
      maxX = Math.max(maxX, pt.x)
      maxY = Math.max(maxY, pt.y)
    }
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 10, maxY: 10, width: 10, height: 10 }
  }

  const padding = 2 // meters
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

function centroid(points: { x: number; y: number }[]) {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce(
    (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
    { x: 0, y: 0 }
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

export function AnimatedBuildUp({
  geometry,
  onAnimationComplete,
}: AnimatedBuildUpProps) {
  const [stage, setStage] = useState<AnimationStage>('walls')
  const [wallOpacities, setWallOpacities] = useState<number[]>([])
  const [roomOpacities, setRoomOpacities] = useState<number[]>([])
  const [dimOpacities, setDimOpacities] = useState<number[]>([])
  const [skipped, setSkipped] = useState(false)

  const bounds = useMemo(() => computeBounds(geometry), [geometry])

  const stageWidth = Math.round(bounds.width * PPM)
  const stageHeight = Math.round(bounds.height * PPM)

  // Convert geometry coords to canvas coords
  const toCanvas = useCallback(
    (x: number, y: number) => ({
      x: (x - bounds.minX) * PPM,
      y: (y - bounds.minY) * PPM,
    }),
    [bounds.minX, bounds.minY]
  )

  // Skip handler -- show everything immediately
  const handleSkip = useCallback(() => {
    setSkipped(true)
    setWallOpacities(geometry.walls.map(() => 1))
    setRoomOpacities(geometry.rooms.map(() => 1))
    setDimOpacities((geometry.dimensions ?? []).map(() => 1))
    setStage('complete')
    onAnimationComplete()
  }, [geometry, onAnimationComplete])

  // Stage 1: Animate walls (0 - 1.2s)
  useEffect(() => {
    if (skipped) return
    if (geometry.walls.length === 0) {
      setStage('rooms')
      return
    }

    const wallCount = geometry.walls.length
    const staggerMs = Math.min(80, 1200 / wallCount)
    const newOpacities = new Array(wallCount).fill(0)
    setWallOpacities([...newOpacities])

    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < wallCount; i++) {
      const timer = setTimeout(() => {
        setWallOpacities((prev) => {
          const next = [...prev]
          next[i] = 1
          return next
        })
      }, i * staggerMs)
      timers.push(timer)
    }

    const stageTimer = setTimeout(() => {
      setStage('rooms')
    }, wallCount * staggerMs + 200)
    timers.push(stageTimer)

    return () => timers.forEach(clearTimeout)
  }, [geometry.walls.length, skipped])

  // Stage 2: Animate rooms (after walls)
  useEffect(() => {
    if (skipped || stage !== 'rooms') return
    if (geometry.rooms.length === 0) {
      setStage('dimensions')
      return
    }

    const roomCount = geometry.rooms.length
    const staggerMs = Math.min(100, 1200 / roomCount)
    setRoomOpacities(new Array(roomCount).fill(0))

    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < roomCount; i++) {
      const timer = setTimeout(() => {
        setRoomOpacities((prev) => {
          const next = [...prev]
          next[i] = 1
          return next
        })
      }, i * staggerMs)
      timers.push(timer)
    }

    const stageTimer = setTimeout(() => {
      setStage('dimensions')
    }, roomCount * staggerMs + 200)
    timers.push(stageTimer)

    return () => timers.forEach(clearTimeout)
  }, [stage, geometry.rooms.length, skipped])

  // Stage 3: Animate dimensions (after rooms)
  useEffect(() => {
    if (skipped || stage !== 'dimensions') return
    const dims = geometry.dimensions ?? []
    if (dims.length === 0) {
      setStage('complete')
      onAnimationComplete()
      return
    }

    const dimCount = dims.length
    const staggerMs = Math.min(100, 1100 / dimCount)
    setDimOpacities(new Array(dimCount).fill(0))

    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < dimCount; i++) {
      const timer = setTimeout(() => {
        setDimOpacities((prev) => {
          const next = [...prev]
          next[i] = 1
          return next
        })
      }, i * staggerMs)
      timers.push(timer)
    }

    const completeTimer = setTimeout(() => {
      setStage('complete')
      onAnimationComplete()
    }, dimCount * staggerMs + 200)
    timers.push(completeTimer)

    return () => timers.forEach(clearTimeout)
  }, [stage, geometry.dimensions, skipped, onAnimationComplete])

  return (
    <div className="relative w-full" style={{ minHeight: 400 }}>
      {/* Skip button */}
      {stage !== 'complete' && (
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'rgba(30, 27, 22, 0.8)',
            color: '#A8A29E',
            border: '1px solid rgba(168, 162, 158, 0.2)',
          }}
        >
          <SkipForward className="h-3.5 w-3.5" />
          Skip Animation
        </button>
      )}

      <div
        className="flex items-center justify-center overflow-auto rounded-lg"
        style={{ backgroundColor: '#12100E' }}
      >
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center"
              style={{ width: stageWidth, height: stageHeight }}
            >
              <p className="text-sm" style={{ color: '#6B6560' }}>
                Loading canvas...
              </p>
            </div>
          }
        >
          <Stage width={stageWidth} height={stageHeight}>
            {/* Background */}
            <Layer listening={false}>
              <Rect
                x={0}
                y={0}
                width={stageWidth}
                height={stageHeight}
                fill="#12100E"
              />
            </Layer>

            {/* Walls layer */}
            <Layer listening={false}>
              {geometry.walls.map((wall: Wall, i: number) => {
                const start = toCanvas(wall.start.x, wall.start.y)
                const end = toCanvas(wall.end.x, wall.end.y)
                const isLowConfidence = wall.confidence === 'low'
                const strokeColor = isLowConfidence ? '#FBBF24' : '#F5F3EF'
                const opacity = wallOpacities[i] ?? 0

                return (
                  <Line
                    key={`wall-${wall.id}`}
                    points={[start.x, start.y, end.x, end.y]}
                    stroke={strokeColor}
                    strokeWidth={wall.thickness ? wall.thickness * PPM : 3}
                    opacity={opacity}
                    lineCap="round"
                    lineJoin="round"
                  />
                )
              })}
            </Layer>

            {/* Rooms layer */}
            <Layer listening={false}>
              {geometry.rooms.map((room: Room, i: number) => {
                const opacity = roomOpacities[i] ?? 0
                const fillColor =
                  ROOM_COLORS[room.type] || ROOM_COLORS.other
                const pts = room.points.flatMap((pt) => {
                  const c = toCanvas(pt.x, pt.y)
                  return [c.x, c.y]
                })
                const center = centroid(
                  room.points.map((pt) => toCanvas(pt.x, pt.y))
                )
                const isLowConfidence = room.confidence === 'low'

                return (
                  <Line
                    key={`room-${room.id}`}
                    points={pts}
                    closed
                    fill={fillColor}
                    stroke={isLowConfidence ? '#FBBF24' : 'transparent'}
                    strokeWidth={isLowConfidence ? 1.5 : 0}
                    opacity={opacity}
                  />
                )
              })}
              {geometry.rooms.map((room: Room, i: number) => {
                const opacity = roomOpacities[i] ?? 0
                const center = centroid(
                  room.points.map((pt) => toCanvas(pt.x, pt.y))
                )

                return (
                  <KonvaText
                    key={`room-label-${room.id}`}
                    x={center.x}
                    y={center.y}
                    text={room.name}
                    fontSize={11}
                    fill="#A8A29E"
                    opacity={opacity}
                    align="center"
                    offsetX={room.name.length * 3}
                    offsetY={6}
                  />
                )
              })}
            </Layer>

            {/* Dimensions layer */}
            <Layer listening={false}>
              {(geometry.dimensions ?? []).map(
                (dim: DimensionLine, i: number) => {
                  const start = toCanvas(dim.start.x, dim.start.y)
                  const end = toCanvas(dim.end.x, dim.end.y)
                  const opacity = dimOpacities[i] ?? 0
                  const midX = (start.x + end.x) / 2
                  const midY = (start.y + end.y) / 2
                  const label = dim.label || `${dim.value.toFixed(2)}m`

                  return (
                    <Line
                      key={`dim-line-${dim.id}`}
                      points={[start.x, start.y, end.x, end.y]}
                      stroke="#6B6560"
                      strokeWidth={1}
                      opacity={opacity}
                      dash={[4, 4]}
                    />
                  )
                }
              )}
              {(geometry.dimensions ?? []).map(
                (dim: DimensionLine, i: number) => {
                  const start = toCanvas(dim.start.x, dim.start.y)
                  const end = toCanvas(dim.end.x, dim.end.y)
                  const opacity = dimOpacities[i] ?? 0
                  const midX = (start.x + end.x) / 2
                  const midY = (start.y + end.y) / 2
                  const label = dim.label || `${dim.value.toFixed(2)}m`

                  return (
                    <KonvaText
                      key={`dim-text-${dim.id}`}
                      x={midX}
                      y={midY - 8}
                      text={label}
                      fontSize={10}
                      fill="#D4A017"
                      opacity={opacity}
                      align="center"
                      offsetX={label.length * 3}
                    />
                  )
                }
              )}
            </Layer>
          </Stage>
        </Suspense>
      </div>
    </div>
  )
}
