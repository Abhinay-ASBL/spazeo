'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloorPlanGeometry {
  walls: Array<{
    id: string
    start: { x: number; y: number }
    end: { x: number; y: number }
    thickness: number
  }>
  rooms: Array<{
    id: string
    name: string
    type?: string
    polygon: Array<{ x: number; y: number }>
    floorMaterial?: string
  }>
  doors: Array<{
    id: string
    wallId: string
    position: { x: number; y: number }
    width: number
  }>
}

export interface FloorPlan3DOverrides {
  globalCeilingHeight: number
  doorWidth: number
  doorHeight: number
  roomOverrides: Record<
    string,
    { wallColor?: string; floorType?: string; ceilingHeight?: number }
  >
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_OVERRIDES: FloorPlan3DOverrides = {
  globalCeilingHeight: 2.7,
  doorWidth: 0.9,
  doorHeight: 2.1,
  roomOverrides: {},
}

const FLOOR_MATERIAL_COLORS: Record<string, string> = {
  wood: '#C8A97E',
  tile: '#D8D8D4',
  carpet: '#B0A898',
  concrete: '#C4C4C0',
  default: '#E5E4E0',
}

function getFloorColor(
  room: FloorPlanGeometry['rooms'][number],
  overrides: FloorPlan3DOverrides
): string {
  const roomOverride = overrides.roomOverrides[room.id]
  const floorType = roomOverride?.floorType ?? room.floorMaterial ?? 'default'
  return FLOOR_MATERIAL_COLORS[floorType] ?? FLOOR_MATERIAL_COLORS.default
}

// ---------------------------------------------------------------------------
// Utility: computeSceneBounds
// ---------------------------------------------------------------------------

export function computeSceneBounds(geometry: FloorPlanGeometry): {
  center: [number, number, number]
  size: [number, number, number]
} {
  if (geometry.walls.length === 0) {
    return { center: [0, 0, 0], size: [10, 0, 10] }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  geometry.walls.forEach((wall) => {
    minX = Math.min(minX, wall.start.x, wall.end.x)
    maxX = Math.max(maxX, wall.start.x, wall.end.x)
    minZ = Math.min(minZ, wall.start.y, wall.end.y)
    maxZ = Math.max(maxZ, wall.start.y, wall.end.y)
  })

  const centerX = (minX + maxX) / 2
  const centerZ = (minZ + maxZ) / 2
  const sizeX = maxX - minX
  const sizeZ = maxZ - minZ

  return {
    center: [centerX, 0, centerZ] as [number, number, number],
    size: [sizeX, 0, sizeZ] as [number, number, number],
  }
}

// ---------------------------------------------------------------------------
// Geometry builders
// ---------------------------------------------------------------------------

interface WallMeshData {
  key: string
  geometry: THREE.BoxGeometry
  position: [number, number, number]
  rotationY: number
}

function buildWalls(
  walls: FloorPlanGeometry['walls'],
  doors: FloorPlanGeometry['doors'],
  ceilingHeight: number
): WallMeshData[] {
  const meshes: WallMeshData[] = []

  walls.forEach((wall) => {
    const dx = wall.end.x - wall.start.x
    const dz = wall.end.y - wall.start.y
    const wallLength = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)

    const wallDoors = doors.filter((d) => d.wallId === wall.id)
    const thickness = wall.thickness > 0 ? wall.thickness : 0.1

    if (wallDoors.length === 0) {
      // No doors — single box for the full wall
      const geo = new THREE.BoxGeometry(wallLength, ceilingHeight, thickness)
      const midX = (wall.start.x + wall.end.x) / 2
      const midZ = (wall.start.y + wall.end.y) / 2
      meshes.push({
        key: `wall-${wall.id}`,
        geometry: geo,
        position: [midX, ceilingHeight / 2, midZ],
        rotationY: -angle,
      })
    } else {
      // Door openings: split wall into segments
      // Project door positions onto the wall axis (0..wallLength)
      const startVec = new THREE.Vector2(wall.start.x, wall.start.y)
      const wallDir = new THREE.Vector2(dx, dz).normalize()

      // Map each door to a parametric position along the wall
      const doorSortable = wallDoors.map((door) => {
        const dp = new THREE.Vector2(door.position.x, door.position.y)
        const t = dp.clone().sub(startVec).dot(wallDir)
        return { door, t }
      })
      doorSortable.sort((a, b) => a.t - b.t)

      // Build segments between doors
      let cursor = 0
      const doorHeight = ceilingHeight < 2.1 ? ceilingHeight * 0.78 : 2.1
      const headerHeight = ceilingHeight - doorHeight

      doorSortable.forEach(({ door, t }, idx) => {
        const halfDoor = door.width / 2
        const segStart = cursor
        const segEnd = t - halfDoor

        // Left-of-door segment
        const segLength = segEnd - segStart
        if (segLength > 0.01) {
          const cx = wall.start.x + wallDir.x * (segStart + segLength / 2)
          const cz = wall.start.y + wallDir.y * (segStart + segLength / 2)
          const geo = new THREE.BoxGeometry(segLength, ceilingHeight, thickness)
          meshes.push({
            key: `wall-${wall.id}-seg-${idx}-left`,
            geometry: geo,
            position: [cx, ceilingHeight / 2, cz],
            rotationY: -angle,
          })
        }

        // Header above door opening
        if (headerHeight > 0.01) {
          const hcx = wall.start.x + wallDir.x * t
          const hcz = wall.start.y + wallDir.y * t
          const hGeo = new THREE.BoxGeometry(door.width, headerHeight, thickness)
          meshes.push({
            key: `wall-${wall.id}-header-${idx}`,
            geometry: hGeo,
            position: [hcx, doorHeight + headerHeight / 2, hcz],
            rotationY: -angle,
          })
        }

        cursor = t + halfDoor
      })

      // Right-of-last-door segment
      const lastSegLength = wallLength - cursor
      if (lastSegLength > 0.01) {
        const cx = wall.start.x + wallDir.x * (cursor + lastSegLength / 2)
        const cz = wall.start.y + wallDir.y * (cursor + lastSegLength / 2)
        const geo = new THREE.BoxGeometry(lastSegLength, ceilingHeight, thickness)
        meshes.push({
          key: `wall-${wall.id}-seg-last`,
          geometry: geo,
          position: [cx, ceilingHeight / 2, cz],
          rotationY: -angle,
        })
      }
    }
  })

  return meshes
}

interface FloorMeshData {
  key: string
  geometry: THREE.BufferGeometry
  color: string
}

function buildFloors(
  rooms: FloorPlanGeometry['rooms'],
  overrides: FloorPlan3DOverrides
): FloorMeshData[] {
  const meshes: FloorMeshData[] = []

  rooms.forEach((room) => {
    if (room.polygon.length < 3) return

    const shape = new THREE.Shape()
    shape.moveTo(room.polygon[0].x, room.polygon[0].y)
    room.polygon.slice(1).forEach((pt) => shape.lineTo(pt.x, pt.y))
    shape.closePath()

    const geometry = new THREE.ShapeGeometry(shape)
    geometry.rotateX(-Math.PI / 2)

    const color = getFloorColor(room, overrides)

    meshes.push({
      key: `floor-${room.id}`,
      geometry,
      color,
    })
  })

  return meshes
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FloorPlanMeshProps {
  geometry: FloorPlanGeometry
  overrides?: Partial<FloorPlan3DOverrides>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FloorPlanMesh({ geometry, overrides: overridesProp }: FloorPlanMeshProps) {
  const overrides: FloorPlan3DOverrides = {
    ...DEFAULT_OVERRIDES,
    ...overridesProp,
    roomOverrides: overridesProp?.roomOverrides ?? DEFAULT_OVERRIDES.roomOverrides,
  }

  const ceilingHeight = overrides.globalCeilingHeight

  // Memoize all geometry so we don't rebuild every frame
  const geometryKey = JSON.stringify({ geometry, ceilingHeight })

  const wallMeshes = useMemo(() => {
    return buildWalls(geometry.walls, geometry.doors, ceilingHeight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey])

  const floorMeshes = useMemo(() => {
    return buildFloors(geometry.rooms, overrides)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey])

  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.9,
        metalness: 0,
      }),
    []
  )

  // Cleanup on unmount
  const wallMeshesRef = useRef(wallMeshes)
  wallMeshesRef.current = wallMeshes
  const floorMeshesRef = useRef(floorMeshes)
  floorMeshesRef.current = floorMeshes

  return (
    <group>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />

      {/* Walls */}
      {wallMeshes.map(({ key, geometry: geo, position, rotationY }) => (
        <mesh
          key={key}
          geometry={geo}
          material={wallMaterial}
          position={position}
          rotation={[0, rotationY, 0]}
          castShadow
          receiveShadow
        />
      ))}

      {/* Floors */}
      {floorMeshes.map(({ key, geometry: geo, color }) => (
        <mesh key={key} geometry={geo} position={[0, 0, 0]} receiveShadow>
          <meshStandardMaterial
            color={color}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
