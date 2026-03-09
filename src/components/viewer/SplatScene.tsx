'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Expose bundled THREE on globalThis so the patched spark.js module
// (served from /lib/spark.module.js) can access it without bare imports.
// This avoids Turbopack bundling issues with spark's inline Workers + WASM.
if (typeof globalThis !== 'undefined') {
  ;(globalThis as Record<string, unknown>).__THREE = THREE
}

interface SplatSceneProps {
  url: string
}

export function SplatScene({ url }: SplatSceneProps) {
  const { gl, scene } = useThree()
  const sparkRef = useRef<THREE.Mesh | null>(null)
  const splatRef = useRef<THREE.Object3D | null>(null)
  const updateRef = useRef<((opts: { scene: THREE.Scene }) => void) | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        // Load patched spark.js from public/ — bypasses Turbopack entirely
        const spark = await import(
          /* webpackIgnore: true */ '/lib/spark.module.js'
        )

        if (cancelled) return

        const renderer = new spark.SparkRenderer({
          renderer: gl as THREE.WebGLRenderer,
        })
        sparkRef.current = renderer
        updateRef.current = (opts: { scene: THREE.Scene }) =>
          renderer.update(opts)
        scene.add(renderer)

        const splat = new spark.SplatMesh({ url })
        splatRef.current = splat
        scene.add(splat)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[SplatScene] Failed to initialize spark.js:', msg)
      }
    }

    init()

    return () => {
      cancelled = true
      if (sparkRef.current) {
        scene.remove(sparkRef.current)
        sparkRef.current = null
      }
      if (splatRef.current) {
        if ('dispose' in splatRef.current) {
          ;(splatRef.current as unknown as { dispose: () => void }).dispose()
        }
        scene.remove(splatRef.current)
        splatRef.current = null
      }
      updateRef.current = null
    }
  }, [gl, scene, url])

  useFrame(() => {
    if (updateRef.current) {
      updateRef.current({ scene })
    }
  })

  return null
}
