'use client'

import { useRef, useEffect, useCallback } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { Clone, TransformControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PlacedItem, TransformMode } from '@/hooks/useFurnitureStore'

interface FurniturePieceProps {
  item: PlacedItem
  selected: boolean
  transformMode: TransformMode
  onSelect: () => void
  onTransformEnd: (
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => void
}

export function FurniturePiece({
  item,
  selected,
  transformMode,
  onSelect,
  onTransformEnd,
}: FurniturePieceProps) {
  const { scene } = useGLTF(item.glbUrl)
  const groupRef = useRef<THREE.Group>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformRef = useRef<any>(null)

  // Apply / remove gold selection glow
  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (typeof mat.emissive !== 'undefined') {
          if (selected) {
            mat.emissive = new THREE.Color('#D4A017')
            mat.emissiveIntensity = 0.3
          } else {
            mat.emissive = new THREE.Color('#000000')
            mat.emissiveIntensity = 0
          }
          mat.needsUpdate = true
        }
      }
    })
  }, [selected])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect()
    },
    [onSelect]
  )

  const handleTransformEnd = useCallback(() => {
    const group = groupRef.current
    if (!group) return

    const pos: [number, number, number] = [
      group.position.x,
      0, // Enforce y=0
      group.position.z,
    ]
    const rot: [number, number, number] = [
      group.rotation.x,
      group.rotation.y,
      group.rotation.z,
    ]
    const scl: [number, number, number] = [
      group.scale.x,
      group.scale.y,
      group.scale.z,
    ]

    // Re-enforce y=0 after transform
    group.position.y = 0

    onTransformEnd(pos, rot, scl)
  }, [onTransformEnd])

  return (
    <>
      <group
        ref={groupRef}
        position={item.position}
        rotation={item.rotation}
        scale={item.scale}
        onClick={handleClick}
      >
        <Clone object={scene} />
      </group>

      {selected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          onMouseUp={handleTransformEnd}
        />
      )}
    </>
  )
}
