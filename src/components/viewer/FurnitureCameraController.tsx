'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFurnitureStore } from '@/hooks/useFurnitureStore'

const LERP_FACTOR = 0.08
const ARRIVAL_THRESHOLD = 0.01

/**
 * R3F component that smoothly animates OrbitControls target
 * toward a furniture item position when centerOnItem is set.
 * Used when clicking items in the CostTracker list.
 */
export function FurnitureCameraController() {
  const { controls } = useThree()
  const targetRef = useRef<THREE.Vector3 | null>(null)

  useFrame(() => {
    const centerOnItem = useFurnitureStore.getState().centerOnItem
    const setCenterOnItem = useFurnitureStore.getState().setCenterOnItem

    if (!centerOnItem) {
      targetRef.current = null
      return
    }

    if (!targetRef.current) {
      targetRef.current = new THREE.Vector3(
        centerOnItem[0],
        centerOnItem[1],
        centerOnItem[2]
      )
    }

    // Animate OrbitControls target toward the item position
    const orbitControls = controls as unknown as { target: THREE.Vector3; update: () => void }
    if (!orbitControls || !orbitControls.target) return

    orbitControls.target.lerp(targetRef.current, LERP_FACTOR)
    orbitControls.update()

    const distance = orbitControls.target.distanceTo(targetRef.current)
    if (distance < ARRIVAL_THRESHOLD) {
      orbitControls.target.copy(targetRef.current)
      orbitControls.update()
      targetRef.current = null
      setCenterOnItem(null)
    }
  })

  return null
}
