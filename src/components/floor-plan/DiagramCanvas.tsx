'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle, Text, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import {
  useFloorPlanEditorStore,
  type Wall,
  type Room,
  type Door,
  type FloorPlanWindow,
} from '@/stores/floorPlanEditorStore'

// Pixels per meter for rendering
const PPM = 50
const GRID_SIZE = 1 // 1 meter grid
const GRID_COLOR = '#2E2A24'
const WALL_COLOR = '#F5F3EF'
const WALL_LOW_CONF = '#FBBF24'
const ROOM_FILL = 'rgba(45,212,191,0.08)'
const ROOM_LOW_CONF_FILL = 'rgba(251,191,36,0.08)'
const ROOM_STROKE = '#2DD4BF'
const SELECTION_COLOR = '#D4A017'
const ENDPOINT_RADIUS = 5
const DOOR_COLOR = '#34D399'
const WINDOW_COLOR = '#60A5FA'
const DIM_COLOR = '#6B6560'

function centroid(points: { x: number; y: number }[]): { x: number; y: number } {
  const n = points.length
  if (n === 0) return { x: 0, y: 0 }
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / n, y: sum.y / n }
}

function wallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  return Math.sqrt(dx * dx + dy * dy)
}

function wallMidpoint(wall: Wall): { x: number; y: number } {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2,
  }
}

function pointOnWall(wall: Wall, fraction: number): { x: number; y: number } {
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * fraction,
    y: wall.start.y + (wall.end.y - wall.start.y) * fraction,
  }
}

function wallAngle(wall: Wall): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
}

export function DiagramCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  const geometry = useFloorPlanEditorStore((s) => s.geometry)
  const activeTool = useFloorPlanEditorStore((s) => s.activeTool)
  const selectedElementId = useFloorPlanEditorStore((s) => s.selectedElementId)
  const drawingPoints = useFloorPlanEditorStore((s) => s.drawingPoints)
  const viewportScale = useFloorPlanEditorStore((s) => s.viewportScale)
  const viewportPosition = useFloorPlanEditorStore((s) => s.viewportPosition)

  const selectElement = useFloorPlanEditorStore((s) => s.selectElement)
  const addWall = useFloorPlanEditorStore((s) => s.addWall)
  const moveWallEndpoint = useFloorPlanEditorStore((s) => s.moveWallEndpoint)
  const addRoom = useFloorPlanEditorStore((s) => s.addRoom)
  const addDoor = useFloorPlanEditorStore((s) => s.addDoor)
  const addWindowEl = useFloorPlanEditorStore((s) => s.addWindow)
  const deleteWall = useFloorPlanEditorStore((s) => s.deleteWall)
  const deleteRoom = useFloorPlanEditorStore((s) => s.deleteRoom)
  const deleteDoor = useFloorPlanEditorStore((s) => s.deleteDoor)
  const deleteWindow = useFloorPlanEditorStore((s) => s.deleteWindow)
  const addDrawingPoint = useFloorPlanEditorStore((s) => s.addDrawingPoint)
  const clearDrawingPoints = useFloorPlanEditorStore((s) => s.clearDrawingPoints)
  const setViewportScale = useFloorPlanEditorStore((s) => s.setViewportScale)
  const setViewportPosition = useFloorPlanEditorStore((s) => s.setViewportPosition)
  const setStageSize = useFloorPlanEditorStore((s) => s.setStageSize)
  const nextWallId = useFloorPlanEditorStore((s) => s.nextWallId)
  const nextRoomId = useFloorPlanEditorStore((s) => s.nextRoomId)
  const nextDoorId = useFloorPlanEditorStore((s) => s.nextDoorId)
  const nextWindowId = useFloorPlanEditorStore((s) => s.nextWindowId)

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [tooltipText, setTooltipText] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
        setStageSize({ width, height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [setStageSize])

  // Get pointer position in world coordinates (meters)
  const getPointerMeters = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current
    if (!stage) return null
    const pos = stage.getPointerPosition()
    if (!pos) return null
    // Convert from stage pixel coords to world meters
    const x = (pos.x - viewportPosition.x) / viewportScale / PPM
    const y = (pos.y - viewportPosition.y) / viewportScale / PPM
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
  }, [viewportScale, viewportPosition])

  // Find nearest wall to a point
  const findNearestWall = useCallback((pt: { x: number; y: number }): { wall: Wall; fraction: number } | null => {
    let bestDist = Infinity
    let bestWall: Wall | null = null
    let bestFraction = 0

    for (const wall of geometry.walls) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      let t = ((pt.x - wall.start.x) * dx + (pt.y - wall.start.y) * dy) / len2
      t = Math.max(0, Math.min(1, t))
      const closestX = wall.start.x + t * dx
      const closestY = wall.start.y + t * dy
      const dist = Math.sqrt((pt.x - closestX) ** 2 + (pt.y - closestY) ** 2)
      if (dist < bestDist) {
        bestDist = dist
        bestWall = wall
        bestFraction = t
      }
    }

    if (bestWall && bestDist < 0.5) { // within 0.5 meters
      return { wall: bestWall, fraction: bestFraction }
    }
    return null
  }, [geometry.walls])

  // Zoom handler
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.05
    const oldScale = viewportScale
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.1, Math.min(5.0, newScale))

    // Zoom toward pointer position
    const mousePointTo = {
      x: (pointer.x - viewportPosition.x) / oldScale,
      y: (pointer.y - viewportPosition.y) / oldScale,
    }

    setViewportScale(clampedScale)
    setViewportPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }, [viewportScale, viewportPosition, setViewportScale, setViewportPosition])

  // Stage click handler
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only handle clicks on the stage background (not on shapes)
    if (e.target !== e.target.getStage()) return

    const pt = getPointerMeters()
    if (!pt) return

    switch (activeTool) {
      case 'select':
        selectElement(null, null)
        break

      case 'wall':
        if (drawingPoints.length === 0) {
          addDrawingPoint(pt)
        } else {
          const start = drawingPoints[0]
          addWall({
            id: nextWallId(),
            start,
            end: pt,
            thickness: 0.15,
          })
          clearDrawingPoints()
        }
        break

      case 'room':
        addDrawingPoint(pt)
        break

      case 'door': {
        const nearest = findNearestWall(pt)
        if (nearest) {
          addDoor({
            id: nextDoorId(),
            wallId: nearest.wall.id,
            position: nearest.fraction,
            width: 0.9,
            swingDirection: 'inward',
          })
        }
        break
      }

      case 'window': {
        const nearest = findNearestWall(pt)
        if (nearest) {
          addWindowEl({
            id: nextWindowId(),
            wallId: nearest.wall.id,
            position: nearest.fraction,
            width: 1.2,
          })
        }
        break
      }

      default:
        break
    }
  }, [activeTool, drawingPoints, getPointerMeters, selectElement, addWall, addDrawingPoint, clearDrawingPoints, findNearestWall, addDoor, addWindowEl, nextWallId, nextDoorId, nextWindowId])

  // Double-click to close room polygon
  const handleStageDblClick = useCallback(() => {
    if (activeTool === 'room' && drawingPoints.length >= 3) {
      addRoom({
        id: nextRoomId(),
        name: 'New Room',
        type: 'other',
        points: [...drawingPoints],
      })
      clearDrawingPoints()
    }
  }, [activeTool, drawingPoints, addRoom, clearDrawingPoints, nextRoomId])

  // Mouse move for drawing preview and tooltips
  const handleStageMouseMove = useCallback(() => {
    const pt = getPointerMeters()
    if (pt) setHoverPos(pt)
  }, [getPointerMeters])

  // Stage drag for panning
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      const stage = e.target.getStage()
      if (stage) {
        setViewportPosition({ x: stage.x(), y: stage.y() })
      }
    }
  }, [setViewportPosition])

  // Generate grid lines
  const gridLines: JSX.Element[] = []
  const gridRange = 50 // meters
  for (let i = -gridRange; i <= gridRange; i += GRID_SIZE) {
    gridLines.push(
      <Line
        key={`gv${i}`}
        points={[i * PPM, -gridRange * PPM, i * PPM, gridRange * PPM]}
        stroke={GRID_COLOR}
        strokeWidth={0.5}
        dash={[2, 4]}
      />,
      <Line
        key={`gh${i}`}
        points={[-gridRange * PPM, i * PPM, gridRange * PPM, i * PPM]}
        stroke={GRID_COLOR}
        strokeWidth={0.5}
        dash={[2, 4]}
      />
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0A0908]">
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={viewportPosition.x}
        y={viewportPosition.y}
        scaleX={viewportScale}
        scaleY={viewportScale}
        draggable={activeTool === 'select'}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onMouseMove={handleStageMouseMove}
        onDragEnd={handleDragEnd}
      >
        {/* Grid layer (non-interactive) */}
        <Layer listening={false}>
          {gridLines}
        </Layer>

        {/* Rooms layer */}
        <Layer>
          {(geometry?.rooms ?? []).filter((room: Room) => room.points?.length).map((room: Room) => {
            const isSelected = room.id === selectedElementId
            const pts = room.points.flatMap((p) => [p.x * PPM, p.y * PPM])
            const center = centroid(room.points)
            const isLowConf = room.confidence === 'low'

            return (
              <Group key={room.id}>
                <Line
                  points={pts}
                  closed
                  fill={isLowConf ? ROOM_LOW_CONF_FILL : ROOM_FILL}
                  stroke={isSelected ? SELECTION_COLOR : ROOM_STROKE}
                  strokeWidth={isSelected ? 2 : 1}
                  onClick={(e) => {
                    e.cancelBubble = true
                    if (activeTool === 'select') selectElement(room.id, 'room')
                    else if (activeTool === 'eraser') deleteRoom(room.id)
                  }}
                  onMouseEnter={(e) => {
                    if (isLowConf) {
                      const stage = e.target.getStage()
                      const pos = stage?.getPointerPosition()
                      if (pos) {
                        setTooltipText('This room may need correction')
                        setTooltipPos({ x: pos.x / viewportScale, y: pos.y / viewportScale })
                      }
                    }
                  }}
                  onMouseLeave={() => setTooltipText(null)}
                />
                <Text
                  x={center.x * PPM - 30}
                  y={center.y * PPM - 6}
                  text={room.name}
                  fontSize={11}
                  fill="#A8A29E"
                  width={60}
                  align="center"
                  listening={false}
                />
                {room.area !== undefined && (
                  <Text
                    x={center.x * PPM - 30}
                    y={center.y * PPM + 6}
                    text={`${room.area.toFixed(1)} m2`}
                    fontSize={9}
                    fill="#6B6560"
                    width={60}
                    align="center"
                    listening={false}
                  />
                )}
              </Group>
            )
          })}
        </Layer>

        {/* Walls layer */}
        <Layer>
          {(geometry?.walls ?? []).filter((wall: Wall) => wall.start && wall.end).map((wall: Wall) => {
            const isSelected = wall.id === selectedElementId
            const isLowConf = wall.confidence === 'low'
            const strokeColor = isSelected ? SELECTION_COLOR : isLowConf ? WALL_LOW_CONF : WALL_COLOR

            return (
              <Group key={wall.id}>
                {/* Wall line */}
                <Line
                  points={[wall.start.x * PPM, wall.start.y * PPM, wall.end.x * PPM, wall.end.y * PPM]}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 4 : Math.max(2, wall.thickness * PPM)}
                  lineCap="round"
                  onClick={(e) => {
                    e.cancelBubble = true
                    if (activeTool === 'select') selectElement(wall.id, 'wall')
                    else if (activeTool === 'eraser') deleteWall(wall.id)
                  }}
                  onMouseEnter={(e) => {
                    if (isLowConf) {
                      const stage = e.target.getStage()
                      const pos = stage?.getPointerPosition()
                      if (pos) {
                        setTooltipText('This wall may need correction')
                        setTooltipPos({ x: pos.x / viewportScale, y: pos.y / viewportScale })
                      }
                    }
                  }}
                  onMouseLeave={() => setTooltipText(null)}
                />

                {/* Draggable endpoints (only in select mode) */}
                {activeTool === 'select' && (
                  <>
                    <Circle
                      x={wall.start.x * PPM}
                      y={wall.start.y * PPM}
                      radius={ENDPOINT_RADIUS}
                      fill={isSelected ? SELECTION_COLOR : '#1B1916'}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      draggable
                      onDragEnd={(e) => {
                        const newX = e.target.x() / PPM
                        const newY = e.target.y() / PPM
                        moveWallEndpoint(wall.id, 'start', {
                          x: Math.round(newX * 100) / 100,
                          y: Math.round(newY * 100) / 100,
                        })
                      }}
                      onClick={(e) => {
                        e.cancelBubble = true
                        selectElement(wall.id, 'wall')
                      }}
                    />
                    <Circle
                      x={wall.end.x * PPM}
                      y={wall.end.y * PPM}
                      radius={ENDPOINT_RADIUS}
                      fill={isSelected ? SELECTION_COLOR : '#1B1916'}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      draggable
                      onDragEnd={(e) => {
                        const newX = e.target.x() / PPM
                        const newY = e.target.y() / PPM
                        moveWallEndpoint(wall.id, 'end', {
                          x: Math.round(newX * 100) / 100,
                          y: Math.round(newY * 100) / 100,
                        })
                      }}
                      onClick={(e) => {
                        e.cancelBubble = true
                        selectElement(wall.id, 'wall')
                      }}
                    />
                  </>
                )}
              </Group>
            )
          })}
        </Layer>

        {/* Doors/Windows layer */}
        <Layer>
          {geometry.doors.map((door: Door) => {
            const wall = geometry.walls.find((w) => w.id === door.wallId)
            if (!wall) return null
            const pt = pointOnWall(wall, door.position)
            const angle = wallAngle(wall)
            const isSelected = door.id === selectedElementId
            const halfW = (door.width / 2) * PPM

            return (
              <Group
                key={door.id}
                x={pt.x * PPM}
                y={pt.y * PPM}
                rotation={(angle * 180) / Math.PI}
                onClick={(e) => {
                  e.cancelBubble = true
                  if (activeTool === 'select') selectElement(door.id, 'door')
                  else if (activeTool === 'eraser') deleteDoor(door.id)
                }}
              >
                {/* Door arc */}
                <Line
                  points={[-halfW, 0, halfW, 0]}
                  stroke={isSelected ? SELECTION_COLOR : DOOR_COLOR}
                  strokeWidth={3}
                  lineCap="round"
                />
                {/* Swing arc indicator */}
                <Line
                  points={[
                    -halfW, 0,
                    -halfW + halfW * 0.3, -halfW * 0.7,
                    0, -halfW,
                    halfW - halfW * 0.3, -halfW * 0.7,
                    halfW, 0,
                  ]}
                  stroke={isSelected ? SELECTION_COLOR : DOOR_COLOR}
                  strokeWidth={1}
                  dash={[3, 3]}
                  tension={0.4}
                />
              </Group>
            )
          })}

          {geometry.windows.map((win: FloorPlanWindow) => {
            const wall = geometry.walls.find((w) => w.id === win.wallId)
            if (!wall) return null
            const pt = pointOnWall(wall, win.position)
            const angle = wallAngle(wall)
            const isSelected = win.id === selectedElementId
            const halfW = (win.width / 2) * PPM

            return (
              <Group
                key={win.id}
                x={pt.x * PPM}
                y={pt.y * PPM}
                rotation={(angle * 180) / Math.PI}
                onClick={(e) => {
                  e.cancelBubble = true
                  if (activeTool === 'select') selectElement(win.id, 'window')
                  else if (activeTool === 'eraser') deleteWindow(win.id)
                }}
              >
                {/* Window: double parallel lines */}
                <Line
                  points={[-halfW, -2, halfW, -2]}
                  stroke={isSelected ? SELECTION_COLOR : WINDOW_COLOR}
                  strokeWidth={2}
                />
                <Line
                  points={[-halfW, 2, halfW, 2]}
                  stroke={isSelected ? SELECTION_COLOR : WINDOW_COLOR}
                  strokeWidth={2}
                />
              </Group>
            )
          })}
        </Layer>

        {/* Dimensions layer (non-interactive) */}
        <Layer listening={false}>
          {(geometry?.walls ?? []).filter((wall: Wall) => wall.start && wall.end).map((wall: Wall) => {
            const len = wallLength(wall)
            if (len < 0.3) return null
            const mid = wallMidpoint(wall)
            const angle = wallAngle(wall)
            // Offset dimension text perpendicular to wall
            const offsetX = Math.sin(angle) * 12
            const offsetY = -Math.cos(angle) * 12

            return (
              <Text
                key={`dim-${wall.id}`}
                x={mid.x * PPM + offsetX}
                y={mid.y * PPM + offsetY}
                text={`${len.toFixed(2)}m`}
                fontSize={10}
                fill={DIM_COLOR}
                rotation={(angle * 180) / Math.PI}
                offsetX={15}
                offsetY={5}
              />
            )
          })}
        </Layer>

        {/* Drawing preview layer */}
        <Layer listening={false}>
          {/* Wall drawing preview */}
          {activeTool === 'wall' && drawingPoints.length === 1 && hoverPos && (
            <Line
              points={[
                drawingPoints[0].x * PPM,
                drawingPoints[0].y * PPM,
                hoverPos.x * PPM,
                hoverPos.y * PPM,
              ]}
              stroke={SELECTION_COLOR}
              strokeWidth={2}
              dash={[6, 4]}
            />
          )}

          {/* Room drawing preview */}
          {activeTool === 'room' && drawingPoints.length > 0 && (
            <>
              <Line
                points={[
                  ...drawingPoints.flatMap((p) => [p.x * PPM, p.y * PPM]),
                  ...(hoverPos ? [hoverPos.x * PPM, hoverPos.y * PPM] : []),
                ]}
                stroke={SELECTION_COLOR}
                strokeWidth={1.5}
                dash={[4, 4]}
              />
              {drawingPoints.map((p, i) => (
                <Circle
                  key={`dp${i}`}
                  x={p.x * PPM}
                  y={p.y * PPM}
                  radius={3}
                  fill={SELECTION_COLOR}
                />
              ))}
              {drawingPoints.length >= 3 && (
                <Text
                  x={drawingPoints[drawingPoints.length - 1].x * PPM + 10}
                  y={drawingPoints[drawingPoints.length - 1].y * PPM - 15}
                  text="Double-click to close"
                  fontSize={10}
                  fill={SELECTION_COLOR}
                />
              )}
            </>
          )}
        </Layer>

        {/* Selection highlight layer */}
        <Layer listening={false}>
          {selectedElementId && (() => {
            const wall = geometry.walls.find((w) => w.id === selectedElementId)
            if (wall) {
              return (
                <Line
                  points={[wall.start.x * PPM, wall.start.y * PPM, wall.end.x * PPM, wall.end.y * PPM]}
                  stroke={SELECTION_COLOR}
                  strokeWidth={6}
                  opacity={0.3}
                  lineCap="round"
                />
              )
            }
            const room = geometry.rooms.find((r) => r.id === selectedElementId)
            if (room) {
              return (
                <Line
                  points={room.points.flatMap((p) => [p.x * PPM, p.y * PPM])}
                  closed
                  stroke={SELECTION_COLOR}
                  strokeWidth={3}
                  opacity={0.4}
                  dash={[6, 4]}
                />
              )
            }
            return null
          })()}
        </Layer>

        {/* Tooltip layer */}
        <Layer listening={false}>
          {tooltipText && (
            <Group x={tooltipPos.x} y={tooltipPos.y - 25}>
              <Rect
                width={tooltipText.length * 6.5 + 12}
                height={20}
                fill="#1B1916"
                cornerRadius={4}
                stroke="#2E2A24"
                strokeWidth={1}
              />
              <Text
                x={6}
                y={4}
                text={tooltipText}
                fontSize={11}
                fill="#FBBF24"
              />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  )
}
