'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Html } from '@react-three/drei'
import * as THREE from 'three'

interface SplatHotspot3DProps {
  position: [number, number, number]
  label: string
  onClick: () => void
}

const GOLD = '#D4A017'
const GOLD_INNER = new THREE.Color(GOLD)

export function SplatHotspot3D({ position, label, onClick }: SplatHotspot3DProps) {
  const [hovered, setHovered] = useState(false)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)

  // Animate pulse rings
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ring1Ref.current) {
      const s1 = 1 + 0.4 * Math.sin(t * 2)
      ring1Ref.current.scale.set(s1, s1, 1)
      ;(ring1Ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.6 * (1 - 0.3 * Math.sin(t * 2))
    }
    if (ring2Ref.current) {
      const s2 = 1 + 0.4 * Math.sin(t * 2 + Math.PI * 0.6)
      ring2Ref.current.scale.set(s2, s2, 1)
      ;(ring2Ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.4 * (1 - 0.3 * Math.sin(t * 2 + Math.PI * 0.6))
    }
  })

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Outer pulse ring 1 */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[0.18, 0.22, 32]} />
        <meshBasicMaterial color={GOLD_INNER} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer pulse ring 2 (staggered) */}
      <mesh ref={ring2Ref}>
        <ringGeometry args={[0.24, 0.27, 32]} />
        <meshBasicMaterial color={GOLD_INNER} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Center dot */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
        scale={hovered ? 1.2 : 1}
      >
        <circleGeometry args={[0.12, 32]} />
        <meshBasicMaterial color={GOLD_INNER} side={THREE.DoubleSide} />
      </mesh>

      {/* Tooltip on hover */}
      {hovered && (
        <Html center position={[0, 0.35, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              whiteSpace: 'nowrap',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'rgba(10,9,8,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5F3EF',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </Billboard>
  )
}
