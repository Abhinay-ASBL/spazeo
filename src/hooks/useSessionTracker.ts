'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export type TrackedEvent = {
  event: string
  sceneId?: Id<'scenes'>
  duration?: number
  metadata?: Record<string, unknown>
  timestamp?: number
}

const FLUSH_MAX_EVENTS = 10
const FLUSH_MAX_MS = 10_000

function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (/Mobi/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function useSessionTracker(tourId: Id<'tours'> | null) {
  const trackBatch = useMutation(api.analytics.trackBatch)
  const [sessionId] = useState(() => crypto.randomUUID())

  const bufferRef = useRef<TrackedEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deviceType = useMemo(() => detectDeviceType(), [])
  const startedAtRef = useRef<number>(0)

  const flush = useCallback(
    async () => {
      if (!tourId) return
      const events = bufferRef.current
      if (events.length === 0) return
      bufferRef.current = []
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
      try {
        await trackBatch({
          tourId,
          sessionId,
          deviceType,
          events,
        })
      } catch {
        /* drop on failure; tracking must never block UX */
      }
    },
    [tourId, trackBatch, deviceType, sessionId]
  )

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      void flush()
    }, FLUSH_MAX_MS)
  }, [flush])

  const trackEvent = useCallback(
    (event: TrackedEvent) => {
      bufferRef.current.push({ ...event, timestamp: event.timestamp ?? Date.now() })
      if (event.event === 'tour_view' || bufferRef.current.length >= FLUSH_MAX_EVENTS) {
        void flush()
      } else {
        scheduleFlush()
      }
    },
    [flush, scheduleFlush]
  )

  useEffect(() => {
    if (startedAtRef.current === 0) startedAtRef.current = Date.now()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onBeforeUnload = () => {
      const totalSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)
      bufferRef.current.push({
        event: 'session_end',
        duration: totalSeconds,
        timestamp: Date.now(),
      })
      void flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
    }
  }, [flush])

  return {
    sessionId,
    trackEvent,
    flush,
  }
}
