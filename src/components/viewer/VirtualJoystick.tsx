'use client'

import { useEffect, useRef } from 'react'
import { useSplatViewerStore } from '@/hooks/useSplatViewerStore'

export function VirtualJoystick() {
  const navMode = useSplatViewerStore((s) => s.navMode)
  const setJoystickVector = useSplatViewerStore((s) => s.setJoystickVector)
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<ReturnType<typeof import('nipplejs').create> | null>(null)

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches)

  // Only show in free-roam on touch devices
  const visible = navMode === 'freeRoam' && isTouchDevice

  useEffect(() => {
    if (!visible || !containerRef.current) return

    let manager: ReturnType<typeof import('nipplejs').create> | null = null

    async function init() {
      const nipplejs = await import('nipplejs')
      if (!containerRef.current) return

      manager = nipplejs.create({
        zone: containerRef.current,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        size: 120,
        color: 'rgba(212, 160, 23, 0.4)',
        restOpacity: 0.6,
        fadeTime: 200,
      })
      managerRef.current = manager

      manager.on('move', (_event, data) => {
        if (!data.vector) return
        setJoystickVector({
          x: data.vector.x,
          y: data.vector.y,
        })
      })

      manager.on('end', () => {
        setJoystickVector({ x: 0, y: 0 })
      })
    }

    init()

    return () => {
      if (manager) {
        manager.destroy()
        managerRef.current = null
      }
      setJoystickVector({ x: 0, y: 0 })
    }
  }, [visible, setJoystickVector])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className="absolute z-20"
      style={{
        left: 16,
        bottom: 80,
        width: 120,
        height: 120,
        opacity: 0.8,
        touchAction: 'none',
      }}
      aria-hidden="true"
    />
  )
}
