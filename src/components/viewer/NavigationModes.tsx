'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSplatViewerStore, type NavMode } from '@/hooks/useSplatViewerStore'

/* ── Target camera configs per mode ── */
const DOLLHOUSE_POS = new THREE.Vector3(0, 12, 12)
const DOLLHOUSE_TARGET = new THREE.Vector3(0, 0, 0)
const DOLLHOUSE_FOV = 30

const FREE_ROAM_POS = new THREE.Vector3(0, 1.6, 5)
const FREE_ROAM_TARGET = new THREE.Vector3(0, 1.6, 0)
const FREE_ROAM_FOV = 60

const HOTSPOT_POS = new THREE.Vector3(0, 1.6, 5)
const HOTSPOT_TARGET = new THREE.Vector3(0, 1.6, 0)
const HOTSPOT_FOV = 60

const EYE_HEIGHT = 1.6
const LERP_FACTOR = 0.05
const ARRIVAL_THRESHOLD = 0.01
const MOVE_SPEED = 0.08
const JOYSTICK_SPEED = 0.06

function getTargetConfig(mode: NavMode) {
  switch (mode) {
    case 'dollhouse':
      return { pos: DOLLHOUSE_POS.clone(), target: DOLLHOUSE_TARGET.clone(), fov: DOLLHOUSE_FOV }
    case 'freeRoam':
      return { pos: FREE_ROAM_POS.clone(), target: FREE_ROAM_TARGET.clone(), fov: FREE_ROAM_FOV }
    case 'hotspot':
      return { pos: HOTSPOT_POS.clone(), target: HOTSPOT_TARGET.clone(), fov: HOTSPOT_FOV }
  }
}

interface NavigationModesProps {
  onFlyTo?: (position: THREE.Vector3) => void
}

export function NavigationModes({ onFlyTo }: NavigationModesProps) {
  const { camera, gl } = useThree()
  const perspCamera = camera as THREE.PerspectiveCamera

  const navMode = useSplatViewerStore((s) => s.navMode)
  const transitioning = useSplatViewerStore((s) => s.transitioning)
  const setTransitioning = useSplatViewerStore((s) => s.setTransitioning)
  const joystickVector = useSplatViewerStore((s) => s.joystickVector)

  const prevModeRef = useRef<NavMode>(navMode)
  const targetPosRef = useRef(camera.position.clone())
  const targetLookRef = useRef(new THREE.Vector3(0, 0, -1))
  const targetFovRef = useRef(perspCamera.fov)
  const isTransitioningRef = useRef(false)

  // Click-to-move state (free-roam mode)
  const moveTargetRef = useRef<THREE.Vector3 | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const floorPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  // Fly-to for hotspot mode
  const flyToTargetRef = useRef<THREE.Vector3 | null>(null)

  // Expose flyTo callback for SplatHotspot3D
  useEffect(() => {
    if (onFlyTo) return
  }, [onFlyTo])

  // Handle mode transitions
  useEffect(() => {
    if (prevModeRef.current !== navMode) {
      const config = getTargetConfig(navMode)
      targetPosRef.current.copy(config.pos)
      targetLookRef.current.copy(config.target)
      targetFovRef.current = config.fov
      isTransitioningRef.current = true
      setTransitioning(true)
      prevModeRef.current = navMode
      // Cancel any in-progress move
      moveTargetRef.current = null
      flyToTargetRef.current = null
    }
  }, [navMode, setTransitioning])

  // Click-to-move handler for free-roam
  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      const mode = useSplatViewerStore.getState().navMode
      const trans = useSplatViewerStore.getState().transitioning
      if (trans) return
      if (mode !== 'freeRoam') return

      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)
      const intersect = new THREE.Vector3()
      const hit = raycaster.current.ray.intersectPlane(floorPlaneRef.current, intersect)
      if (hit) {
        intersect.y = EYE_HEIGHT
        moveTargetRef.current = intersect.clone()
      }
    },
    [camera, gl.domElement]
  )

  useEffect(() => {
    gl.domElement.addEventListener('click', handleCanvasClick)
    return () => gl.domElement.removeEventListener('click', handleCanvasClick)
  }, [gl.domElement, handleCanvasClick])

  // Frame loop: handle transitions, movement, and joystick
  useFrame(() => {
    // Mode transition animation
    if (isTransitioningRef.current) {
      camera.position.lerp(targetPosRef.current, LERP_FACTOR)
      perspCamera.fov += (targetFovRef.current - perspCamera.fov) * LERP_FACTOR
      perspCamera.updateProjectionMatrix()

      const dist = camera.position.distanceTo(targetPosRef.current)
      const fovDist = Math.abs(perspCamera.fov - targetFovRef.current)
      if (dist < ARRIVAL_THRESHOLD && fovDist < 0.1) {
        camera.position.copy(targetPosRef.current)
        perspCamera.fov = targetFovRef.current
        perspCamera.updateProjectionMatrix()
        isTransitioningRef.current = false
        setTransitioning(false)
      }
      return // Skip other movement during transition
    }

    // Click-to-move in free-roam
    if (navMode === 'freeRoam' && moveTargetRef.current) {
      camera.position.lerp(moveTargetRef.current, MOVE_SPEED)
      camera.position.y = EYE_HEIGHT // Enforce eye height
      const dist = camera.position.distanceTo(moveTargetRef.current)
      if (dist < ARRIVAL_THRESHOLD) {
        camera.position.copy(moveTargetRef.current)
        camera.position.y = EYE_HEIGHT
        moveTargetRef.current = null
      }
    }

    // Joystick movement in free-roam
    if (navMode === 'freeRoam' && (joystickVector.x !== 0 || joystickVector.y !== 0)) {
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()

      const right = new THREE.Vector3()
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

      camera.position.add(forward.multiplyScalar(-joystickVector.y * JOYSTICK_SPEED))
      camera.position.add(right.multiplyScalar(joystickVector.x * JOYSTICK_SPEED))
      camera.position.y = EYE_HEIGHT
    }

    // Fly-to in hotspot mode
    if (navMode === 'hotspot' && flyToTargetRef.current) {
      camera.position.lerp(flyToTargetRef.current, MOVE_SPEED)
      camera.position.y = EYE_HEIGHT
      const dist = camera.position.distanceTo(flyToTargetRef.current)
      if (dist < ARRIVAL_THRESHOLD) {
        camera.position.copy(flyToTargetRef.current)
        camera.position.y = EYE_HEIGHT
        flyToTargetRef.current = null
      }
    }
  })

  return null
}

/** Utility: trigger a fly-to in hotspot mode from outside the component */
export function createFlyTo(position: [number, number, number]) {
  return new THREE.Vector3(position[0], EYE_HEIGHT, position[2])
}
