'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  TextureLoader,
  SRGBColorSpace,
  Vector3,
  type Texture,
} from 'three'

export type MasterPlanCorner = { yaw: number; pitch: number }

export type MasterPlanMapping = {
  /** TL, TR, BR, BL — image corners pinned on the panorama */
  corners?: MasterPlanCorner[]
  /** Legacy rect (used when corners absent) */
  yaw?: number
  pitch?: number
  widthDeg?: number
  heightDeg?: number
  rotation?: number
  opacity?: number
}

const PATCH_RADIUS = 478
const CORNER_LABELS = ['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left'] as const

function yawPitchToVec(yawDeg: number, pitchDeg: number): Vector3 {
  const yaw = (yawDeg * Math.PI) / 180
  const pitch = (pitchDeg * Math.PI) / 180
  return new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ).normalize()
}

function yawPitchToPosition(yawDeg: number, pitchDeg: number, radius: number) {
  const v = yawPitchToVec(yawDeg, pitchDeg)
  return { x: v.x * radius, y: v.y * radius, z: v.z * radius }
}

/** Spherical interpolation between unit directions (Vector3.slerp unavailable in this Three build). */
function slerpDir(a: Vector3, b: Vector3, t: number): Vector3 {
  const dot = Math.min(1, Math.max(-1, a.dot(b)))
  const omega = Math.acos(dot)
  if (omega < 1e-6) {
    return a.clone().lerp(b, t).normalize()
  }
  const sinOmega = Math.sin(omega)
  const wA = Math.sin((1 - t) * omega) / sinOmega
  const wB = Math.sin(t * omega) / sinOmega
  return new Vector3(
    wA * a.x + wB * b.x,
    wA * a.y + wB * b.y,
    wA * a.z + wB * b.z
  ).normalize()
}

/** Rotate texture UVs around image center (degrees). */
function applyUvRotation(u: number, v: number, rotationDeg: number): [number, number] {
  if (!rotationDeg) return [u, v]
  const imgU = u
  const imgV = 1 - v
  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const du = imgU - 0.5
  const dv = imgV - 0.5
  const ru = 0.5 + du * cos - dv * sin
  const rv = 0.5 + du * sin + dv * cos
  return [ru, 1 - rv]
}

/** Bilinear quad on the sphere from 4 corner directions (TL, TR, BR, BL). */
function buildCornerQuadGeometry(
  corners: MasterPlanCorner[],
  radius: number,
  rotationDeg = 0,
  seg = 40
): BufferGeometry {
  const [tl, tr, br, bl] = corners.map((c) => yawPitchToVec(c.yaw, c.pitch))
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let j = 0; j <= seg; j++) {
    for (let i = 0; i <= seg; i++) {
      const u = i / seg
      const v = j / seg
      const top = slerpDir(tl, tr, u)
      const bottom = slerpDir(bl, br, u)
      const dir = slerpDir(top, bottom, v)
      positions.push(dir.x * radius, dir.y * radius, dir.z * radius)
      const [uu, vv] = applyUvRotation(u, v, rotationDeg)
      uvs.push(uu, vv)
    }
  }

  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i
      const b = a + 1
      const c = a + (seg + 1)
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildSpherePatchGeometry(
  yawCenter: number,
  pitchCenter: number,
  widthDeg: number,
  heightDeg: number,
  rotationDeg: number,
  radius: number,
  segW = 64,
  segH = 48
): BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const rot = (rotationDeg * Math.PI) / 180
  const cosR = Math.cos(rot)
  const sinR = Math.sin(rot)
  const halfW = Math.max(widthDeg, 0.5) / 2
  const halfH = Math.max(heightDeg, 0.5) / 2

  for (let j = 0; j <= segH; j++) {
    for (let i = 0; i <= segW; i++) {
      const u = i / segW
      const v = j / segH
      const dy = (u - 0.5) * 2 * halfW
      const dp = (v - 0.5) * 2 * halfH
      const dyR = dy * cosR - dp * sinR
      const dpR = dy * sinR + dp * cosR

      const yaw = ((yawCenter + dyR) * Math.PI) / 180
      let pitch = ((pitchCenter + dpR) * Math.PI) / 180
      pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, pitch))

      positions.push(
        Math.sin(yaw) * Math.cos(pitch) * radius,
        Math.sin(pitch) * radius,
        -Math.cos(yaw) * Math.cos(pitch) * radius
      )
      uvs.push(u, 1 - v)
    }
  }

  for (let j = 0; j < segH; j++) {
    for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i
      const b = a + 1
      const c = a + (segW + 1)
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function hasCornerMapping(mapping: MasterPlanMapping): mapping is MasterPlanMapping & { corners: MasterPlanCorner[] } {
  return Array.isArray(mapping.corners) && mapping.corners.length === 4
}

function hasRectMapping(mapping: MasterPlanMapping): boolean {
  return (
    mapping.yaw !== undefined &&
    mapping.pitch !== undefined &&
    mapping.widthDeg !== undefined &&
    mapping.heightDeg !== undefined
  )
}

export function MasterPlanOverlay({
  imageUrl,
  mapping,
  visible = true,
  showGuides = false,
}: {
  imageUrl: string
  mapping: MasterPlanMapping
  visible?: boolean
  showGuides?: boolean
}) {
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    let cancelled = false
    let loaded: Texture | null = null
    const loader = new TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      imageUrl,
      (t) => {
        if (cancelled) {
          t.dispose()
          return
        }
        t.colorSpace = SRGBColorSpace
        t.anisotropy = 8
        t.needsUpdate = true
        loaded = t
        setTexture(t)
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null)
      }
    )
    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [imageUrl])

  const geometry = useMemo(() => {
    if (hasCornerMapping(mapping)) {
      return buildCornerQuadGeometry(mapping.corners, PATCH_RADIUS, mapping.rotation ?? 0)
    }
    if (hasRectMapping(mapping)) {
      return buildSpherePatchGeometry(
        mapping.yaw!,
        mapping.pitch!,
        mapping.widthDeg!,
        mapping.heightDeg!,
        mapping.rotation ?? 0,
        PATCH_RADIUS
      )
    }
    return null
  }, [mapping])

  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  const guideCorners = useMemo(() => {
    if (!showGuides) return []
    if (hasCornerMapping(mapping)) {
      return mapping.corners.map((c, i) => ({
        ...yawPitchToPosition(c.yaw, c.pitch, PATCH_RADIUS - 1),
        label: CORNER_LABELS[i],
      }))
    }
    return []
  }, [showGuides, mapping])

  if (!visible || !texture || !geometry) return null

  const opacity = Math.min(1, Math.max(0.15, mapping.opacity ?? 0.92))

  return (
    <group>
      <mesh geometry={geometry} renderOrder={2} frustumCulled={false}>
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={opacity}
          side={DoubleSide}
          depthWrite={false}
          depthTest
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {showGuides && (
        <>
          <mesh geometry={geometry} renderOrder={3} frustumCulled={false}>
            <meshBasicMaterial
              color="#D4A017"
              wireframe
              transparent
              opacity={0.85}
              side={DoubleSide}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
          {guideCorners.map((c, i) => (
            <mesh key={i} position={[c.x, c.y, c.z]} renderOrder={4} frustumCulled={false}>
              <sphereGeometry args={[5, 12, 12]} />
              <meshBasicMaterial color="#2DD4BF" depthTest={false} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}

export function positionToMasterPlanYawPitch(position: {
  x: number
  y: number
  z: number
}) {
  const len = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2) || 1
  const nx = position.x / len
  const ny = position.y / len
  const nz = position.z / len
  return {
    yaw: (Math.atan2(nx, -nz) * 180) / Math.PI,
    pitch: (Math.asin(Math.max(-1, Math.min(1, ny))) * 180) / Math.PI,
  }
}

export function normalizeMasterPlanRotation(deg: number): number {
  let r = deg % 360
  if (r > 180) r -= 360
  if (r < -180) r += 360
  return Math.round(r * 10) / 10
}

export { CORNER_LABELS, yawPitchToPosition }

/** Sensible default for aerial 360° — plan appears on the plot immediately after upload */
export const DEFAULT_AERIAL_CORNERS: MasterPlanCorner[] = [
  { yaw: -28, pitch: -44 },
  { yaw: 28, pitch: -44 },
  { yaw: 32, pitch: -58 },
  { yaw: -32, pitch: -58 },
]

export function isMasterPlanMapped(m: MasterPlanMapping | null | undefined): boolean {
  if (!m) return false
  if (m.corners?.length === 4) return true
  return (
    m.yaw !== undefined &&
    m.pitch !== undefined &&
    m.widthDeg !== undefined &&
    m.heightDeg !== undefined
  )
}
