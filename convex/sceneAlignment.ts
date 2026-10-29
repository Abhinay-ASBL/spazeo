/**
 * Scene alignment: panoramas of one tour are often shot facing slightly
 * different directions. The user marks the same landmark in every scene;
 * each scene's image is then rotated (direction + tilt, no roll) so its
 * landmark lands on the tour's shared target direction.
 *
 * Frames:
 *   local — the scene's own image frame. Hotspots are stored in it.
 *   world — the shared, aligned frame. Master plan mapping and camera live in it.
 * world = rotate(local), local = unrotate(world).
 *
 * Pure math, shared by Convex (hotspot copy) and the viewer.
 */

export type Vec3 = { x: number; y: number; z: number }

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

const azimuth = (v: Vec3) => Math.atan2(v.x, v.z)
const elevation = (v: Vec3) => Math.asin(Math.max(-1, Math.min(1, normalize(v).y)))

/** Rotation about +Y; matches three.js Matrix4.makeRotationY. */
function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c }
}

/** Rodrigues rotation about unit axis k (right-handed, like three.js). */
function rotateAxis(v: Vec3, k: Vec3, a: number): Vec3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const dot = k.x * v.x + k.y * v.y + k.z * v.z
  const cross = { x: k.y * v.z - k.z * v.y, y: k.z * v.x - k.x * v.z, z: k.x * v.y - k.y * v.x }
  return {
    x: v.x * c + cross.x * s + k.x * dot * (1 - c),
    y: v.y * c + cross.y * s + k.y * dot * (1 - c),
    z: v.z * c + cross.z * s + k.z * dot * (1 - c),
  }
}

export type SceneRotation = {
  /** Yaw applied first, about +Y (radians) */
  yaw: number
  /** Then tilt about this horizontal axis (radians) */
  tilt: number
  tiltAxis: Vec3
}

/**
 * Rotation taking the scene's landmark direction `ref` (local) onto `target` (world).
 * Yaw matches azimuth; tilt about the horizontal axis perpendicular to the
 * target azimuth matches elevation. Returns null when the scene isn't aligned.
 */
export function sceneRotation(
  ref: Vec3 | undefined | null,
  target: Vec3 | undefined | null
): SceneRotation | null {
  if (!ref || !target) return null
  const theta = azimuth(target)
  return {
    yaw: theta - azimuth(ref),
    tilt: elevation(target) - elevation(ref),
    // horizontal(theta) × Y — positive rotation about it raises elevation
    tiltAxis: { x: -Math.cos(theta), y: 0, z: Math.sin(theta) },
  }
}

export function rotate(v: Vec3, r: SceneRotation | null): Vec3 {
  if (!r) return v
  return rotateAxis(rotateY(v, r.yaw), r.tiltAxis, r.tilt)
}

export function unrotate(v: Vec3, r: SceneRotation | null): Vec3 {
  if (!r) return v
  return rotateY(rotateAxis(v, r.tiltAxis, -r.tilt), -r.yaw)
}

/** Re-express a local position of scene A in scene B's local frame. */
export function transferPosition(v: Vec3, from: SceneRotation | null, to: SceneRotation | null): Vec3 {
  return unrotate(rotate(v, from), to)
}
