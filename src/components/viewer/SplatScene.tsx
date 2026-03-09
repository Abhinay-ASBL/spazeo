'use client'

import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark'
import type * as THREE from 'three'

interface SplatSceneProps {
  url: string
}

export function SplatScene({ url }: SplatSceneProps) {
  const { gl, scene, camera } = useThree()
  const sparkRef = useRef<SparkRenderer | null>(null)
  const splatRef = useRef<SplatMesh | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Create SparkRenderer with the R3F WebGL renderer
    const spark = new SparkRenderer({ renderer: gl as THREE.WebGLRenderer })
    sparkRef.current = spark
    scene.add(spark)

    // Create SplatMesh with the target URL
    const splat = new SplatMesh({ url })
    splatRef.current = splat
    scene.add(splat)

    setReady(true)

    return () => {
      scene.remove(spark)
      scene.remove(splat)
      sparkRef.current = null
      splatRef.current = null
      setReady(false)
    }
  }, [gl, scene, url])

  // Drive SparkRenderer update each frame
  useFrame(() => {
    if (sparkRef.current) {
      sparkRef.current.update({ scene })
    }
  })

  return null
}
