'use client'

import { useEffect, useMemo } from 'react'
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

const DEFAULT_WALL_COLOR = '#FFFFFF'

type Pt = { x: number; y: number }
type Room = FloorPlanGeometry['rooms'][number]

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2)) : 0
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t))
}

function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Find the room on each side of a wall. "left" is the side of the wall's left
 * normal (-dirY, dirX), which is the BoxGeometry's local +Z face after the
 * -angle Y rotation used in buildWalls.
 *
 * 1. Edge match: a room polygon edge roughly parallel to the wall (< ~6 deg)
 *    whose distance to the wall midpoint is <= wall thickness. Tolerance scales
 *    with thickness so it works for polygons drawn on the wall centerline or on
 *    its inner faces, in whatever unit the extractor emits.
 * 2. Fallback: room containing a probe point offset 1.5x thickness from the
 *    wall midpoint on each side.
 */
function findWallRooms(
  wall: FloorPlanGeometry['walls'][number],
  thickness: number,
  rooms: Room[]
): { left?: Room; right?: Room } {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return {}
  const ux = dx / len
  const uy = dy / len
  const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }
  const off = thickness * 1.5
  const probeL = { x: mid.x - uy * off, y: mid.y + ux * off }
  const probeR = { x: mid.x + uy * off, y: mid.y - ux * off }
  const result: { left?: Room; right?: Room } = {}

  for (const room of rooms) {
    const poly = room.polygon
    if (poly.length < 3) continue
    const edgeMatch = poly.some((a, i) => {
      const b = poly[(i + 1) % poly.length]
      const ex = b.x - a.x
      const ey = b.y - a.y
      const elen = Math.hypot(ex, ey)
      if (elen === 0) return false
      const sinAngle = Math.abs((ux * ey - uy * ex) / elen)
      return sinAngle < 0.1 && distToSegment(mid, a, b) <= thickness
    })
    if (!edgeMatch) continue
    let side: 'left' | 'right'
    if (pointInPolygon(probeL, poly)) side = 'left'
    else if (pointInPolygon(probeR, poly)) side = 'right'
    else {
      // Probe missed (thin/odd polygon): pick the side of the vertex average
      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length
      const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length
      side = (cx - mid.x) * -uy + (cy - mid.y) * ux >= 0 ? 'left' : 'right'
    }
    result[side] ??= room
  }

  result.left ??= rooms.find((r) => r.polygon.length >= 3 && pointInPolygon(probeL, r.polygon))
  result.right ??= rooms.find((r) => r.polygon.length >= 3 && pointInPolygon(probeR, r.polygon))
  return result
}

interface WallMeshData {
  key: string
  geometry: THREE.BoxGeometry
  position: [number, number, number]
  rotationY: number
  /** [left (+Z face), right (-Z face), ends/top] */
  colors: [string, string, string]
}

function buildWalls(
  walls: FloorPlanGeometry['walls'],
  doors: FloorPlanGeometry['doors'],
  rooms: FloorPlanGeometry['rooms'],
  overrides: FloorPlan3DOverrides
): WallMeshData[] {
  const meshes: WallMeshData[] = []

  walls.forEach((wall) => {
    const dx = wall.end.x - wall.start.x
    const dz = wall.end.y - wall.start.y
    const wallLength = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)

    const wallDoors = doors.filter((d) => d.wallId === wall.id)
    const thickness = wall.thickness > 0 ? wall.thickness : 0.1

    // Height: tallest ceilingHeight override among adjacent rooms, else global.
    // Color: each face takes its own room's wallColor (BoxGeometry has per-face
    // material groups, so a shared wall can be two colors). A side with no room
    // or no override borrows the other side's color, then falls back to white.
    const { left, right } = findWallRooms(wall, thickness, rooms)
    const leftO = left ? overrides.roomOverrides[left.id] : undefined
    const rightO = right ? overrides.roomOverrides[right.id] : undefined
    const heights = [leftO?.ceilingHeight, rightO?.ceilingHeight].filter(
      (h): h is number => typeof h === 'number' && h > 0
    )
    const ceilingHeight = heights.length ? Math.max(...heights) : overrides.globalCeilingHeight
    const leftColor = leftO?.wallColor ?? rightO?.wallColor ?? DEFAULT_WALL_COLOR
    const rightColor = rightO?.wallColor ?? leftO?.wallColor ?? DEFAULT_WALL_COLOR
    const colors: WallMeshData['colors'] = [leftColor, rightColor, leftColor]

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
        colors,
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
            colors,
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
            colors,
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
          colors,
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
  const geometryKey = JSON.stringify({ geometry, ceilingHeight, roomOverrides: overrides.roomOverrides })

  const wallMeshes = useMemo(() => {
    return buildWalls(geometry.walls, geometry.doors, geometry.rooms, overrides)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey])

  const floorMeshes = useMemo(() => {
    return buildFloors(geometry.rooms, overrides)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey])

  // One material per distinct wall color, mapped onto BoxGeometry face groups
  // (+X, -X, +Y, -Y, +Z, -Z) = (end, end, top, bottom, left, right)
  const { wallMaterialCache, wallMaterials } = useMemo(() => {
    const cache = new Map<string, THREE.MeshStandardMaterial>()
    const get = (color: string) => {
      let mat = cache.get(color)
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 })
        cache.set(color, mat)
      }
      return mat
    }
    const perMesh = wallMeshes.map(({ colors: [l, r, e] }) =>
      l === r && r === e ? get(l) : [get(e), get(e), get(e), get(e), get(l), get(r)]
    )
    return { wallMaterialCache: cache, wallMaterials: perMesh }
  }, [wallMeshes])

  // Dispose GPU geometry/materials when rebuilt (e.g. override edits) or on unmount
  useEffect(() => () => wallMeshes.forEach((m) => m.geometry.dispose()), [wallMeshes])
  useEffect(() => () => floorMeshes.forEach((m) => m.geometry.dispose()), [floorMeshes])
  useEffect(() => () => wallMaterialCache.forEach((m) => m.dispose()), [wallMaterialCache])

  return (
    <group>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />

      {/* Walls */}
      {wallMeshes.map(({ key, geometry: geo, position, rotationY }, i) => (
        <mesh
          key={key}
          geometry={geo}
          material={wallMaterials[i]}
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
