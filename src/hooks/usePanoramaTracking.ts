'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import type { TrackedEvent } from './useSessionTracker'

interface Args {
  sceneId: Id<'scenes'> | null
  sceneOrder?: number
  getViewDirection: () => { yaw: number; pitch: number; zoom?: number } | null
  trackEvent: (e: TrackedEvent) => void
}

const YAW_SAMPLE_MS = 1000

export function usePanoramaTracking({
  sceneId,
  sceneOrder,
  getViewDirection,
  trackEvent,
}: Args) {
  const prevSceneIdRef = useRef<Id<'scenes'> | null>(null)
  const sceneEnteredAtRef = useRef<number>(0)
  const draggingRef = useRef<boolean>(false)

  // Scene enter/exit
  useEffect(() => {
    if (!sceneId) return
    if (prevSceneIdRef.current && prevSceneIdRef.current !== sceneId) {
      const dwell = Math.round((Date.now() - sceneEnteredAtRef.current) / 1000)
      trackEvent({
        event: 'scene_exit',
        sceneId: prevSceneIdRef.current,
        duration: dwell,
        metadata: sceneOrder !== undefined ? { order: sceneOrder } : undefined,
      })
    }
    prevSceneIdRef.current = sceneId
    sceneEnteredAtRef.current = Date.now()
    trackEvent({
      event: 'scene_view',
      sceneId,
      metadata: sceneOrder !== undefined ? { order: sceneOrder } : undefined,
    })
    return () => {
      if (prevSceneIdRef.current) {
        const dwell = Math.round((Date.now() - sceneEnteredAtRef.current) / 1000)
        trackEvent({
          event: 'scene_exit',
          sceneId: prevSceneIdRef.current,
          duration: dwell,
        })
        prevSceneIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId])

  // 1Hz idle yaw sampler
  useEffect(() => {
    if (!sceneId) return
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      if (draggingRef.current) return
      const dir = getViewDirection()
      if (!dir) return
      trackEvent({
        event: 'view_direction',
        sceneId,
        metadata: {
          yaw: Math.round(dir.yaw),
          pitch: Math.round(dir.pitch),
          zoom: dir.zoom,
        },
      })
    }, YAW_SAMPLE_MS)
    return () => clearInterval(interval)
  }, [sceneId, getViewDirection, trackEvent])

  const onDragStart = useCallback(() => {
    draggingRef.current = true
  }, [])
  const onDragEnd = useCallback(() => {
    draggingRef.current = false
  }, [])

  return { onDragStart, onDragEnd }
}
