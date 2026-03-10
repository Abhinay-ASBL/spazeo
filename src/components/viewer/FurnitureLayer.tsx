'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useFurnitureStore, type PlacedItem } from '@/hooks/useFurnitureStore'
import { FurnitureGhost } from './FurnitureGhost'
import { FurniturePiece } from './FurniturePiece'

export function FurnitureLayer() {
  const {
    mode,
    ghostItemId,
    ghostGlbUrl,
    ghostMetadata,
    placedItems,
    selectedId,
    transformMode,
    addItem,
    clearGhost,
    setSelectedId,
    setTransformMode,
    removeItem,
    updateTransform,
    undo,
  } = useFurnitureStore()

  const { camera } = useThree()
  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef(new THREE.Raycaster())
  const intersectPoint = useRef(new THREE.Vector3())

  // Click handler for the floor plane (click-to-place or deselect)
  const handleFloorClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (mode !== 'furnish') return

      // Raycast to floor
      raycaster.current.setFromCamera(e.pointer, camera)
      const hit = raycaster.current.ray.intersectPlane(
        floorPlane.current,
        intersectPoint.current
      )
      if (!hit) return

      // If ghost is active, place the item
      if (ghostItemId && ghostGlbUrl && ghostMetadata) {
        const newItem: PlacedItem = {
          instanceId: crypto.randomUUID(),
          furnitureItemId: ghostItemId,
          position: [intersectPoint.current.x, 0, intersectPoint.current.z],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          name: ghostMetadata.name,
          price: ghostMetadata.price,
          amazonUrl: ghostMetadata.amazonUrl,
          glbUrl: ghostGlbUrl,
        }
        addItem(newItem)
        clearGhost()
        return
      }

      // No ghost active — deselect current item
      if (selectedId) {
        setSelectedId(null)
      }
    },
    [
      mode,
      ghostItemId,
      ghostGlbUrl,
      ghostMetadata,
      selectedId,
      camera,
      addItem,
      clearGhost,
      setSelectedId,
    ]
  )

  // Item selection handler
  const handleSelect = useCallback(
    (instanceId: string) => {
      setSelectedId(instanceId)
    },
    [setSelectedId]
  )

  // Transform end handler
  const handleTransformEnd = useCallback(
    (
      instanceId: string,
      position: [number, number, number],
      rotation: [number, number, number],
      scale: [number, number, number]
    ) => {
      updateTransform(instanceId, position, rotation, scale)
    },
    [updateTransform]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Only active in furnish mode
      if (useFurnitureStore.getState().mode !== 'furnish') return

      switch (e.key) {
        case 'r':
        case 'R':
          setTransformMode('rotate')
          break

        case 's':
        case 'S':
          setTransformMode('scale')
          break

        case 'Delete':
        case 'Backspace': {
          const currentSelected = useFurnitureStore.getState().selectedId
          if (currentSelected) {
            removeItem(currentSelected)
            setSelectedId(null)
          }
          break
        }

        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            undo()
          }
          break

        case 'Escape': {
          const state = useFurnitureStore.getState()
          if (state.ghostItemId) {
            clearGhost()
          } else if (state.selectedId) {
            setSelectedId(null)
          }
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setTransformMode, removeItem, setSelectedId, undo, clearGhost])

  return (
    <>
      {/* Invisible floor click catcher — only interactive in furnish mode */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onClick={handleFloorClick}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Ghost preview */}
      {ghostGlbUrl && <FurnitureGhost glbUrl={ghostGlbUrl} />}

      {/* Placed furniture items */}
      {placedItems.map((item) => (
        <FurniturePiece
          key={item.instanceId}
          item={item}
          selected={item.instanceId === selectedId}
          transformMode={transformMode}
          onSelect={() => handleSelect(item.instanceId)}
          onTransformEnd={(pos, rot, scl) =>
            handleTransformEnd(item.instanceId, pos, rot, scl)
          }
        />
      ))}
    </>
  )
}
