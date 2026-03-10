'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Clone, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface FurnitureGhostProps {
  glbUrl: string
}

export function FurnitureGhost({ glbUrl }: FurnitureGhostProps) {
  const { scene } = useGLTF(glbUrl)
  const groupRef = useRef<THREE.Group>(null)
  const { pointer, camera } = useThree()
  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef(new THREE.Raycaster())
  const intersectPoint = useRef(new THREE.Vector3())

  // Ghost material — semi-transparent gold
  const ghostMaterial = useRef(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: '#D4A017',
      depthWrite: false,
    })
  )

  // Override all materials on the cloned scene to ghost material
  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = ghostMaterial.current
      }
    })
  }, [glbUrl])

  // Track cursor position on floor plane each frame
  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    raycaster.current.setFromCamera(pointer, camera)
    const hit = raycaster.current.ray.intersectPlane(
      floorPlane.current,
      intersectPoint.current
    )

    if (hit) {
      group.position.set(
        intersectPoint.current.x,
        0,
        intersectPoint.current.z
      )
      group.visible = true
    } else {
      // Pointing at sky — hide ghost
      group.visible = false
    }
  })

  return (
    <group ref={groupRef} raycast={() => null}>
      <Clone object={scene} />
    </group>
  )
}
