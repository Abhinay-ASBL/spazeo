'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { SplatScene } from './SplatScene'

interface GaussianSplatViewerProps {
  splatUrl: string
}

export function GaussianSplatViewer({ splatUrl }: GaussianSplatViewerProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0A0908',
      }}
    >
      <Canvas
        gl={{ antialias: false }}
        camera={{ position: [0, 2, 5], fov: 60, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <SplatScene url={splatUrl} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={0.5}
          maxDistance={50}
        />
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  )
}
