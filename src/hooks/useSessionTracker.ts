'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  getCampaignMeta,
  type AnalyticsSection,
} from '@/lib/analyticsAttribution'
import { getVisitorGeo, refreshVisitorGeo } from '@/lib/visitorGeo'

export type TrackedEvent = {
  event: string
  sceneId?: Id<'scenes'>
  duration?: number
  metadata?: Record<string, unknown>
  timestamp?: number
  variantKey?: string
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'sunset' | 'night'
}

const FLUSH_MAX_EVENTS = 10
const FLUSH_MAX_MS = 10_000
const DWELL_MS = 10_000
const SESSION_STORAGE_KEY = 'spz_sid'

function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (/Mobi/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function useSessionTracker(
  tourId: Id<'tours'> | null,
  options?: { visitorId?: Id<'visitors'> | null }
) {
  const trackBatch = useMutation(api.analytics.trackBatch)
  const [sessionId] = useState(() => getOrCreateSessionId())
  const visitorId = options?.visitorId ?? null
  const visitorIdRef = useRef(visitorId)
  useEffect(() => {
    visitorIdRef.current = visitorId
  }, [visitorId])

  const bufferRef = useRef<TrackedEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deviceType = useMemo(() => detectDeviceType(), [])
  const [initialTimestamp] = useState(() => Date.now())
  const startedAtRef = useRef<number>(initialTimestamp)
  const sectionRef = useRef<AnalyticsSection>('homepage')
  const lastDwellAtRef = useRef<number>(initialTimestamp)
  const linkedRef = useRef(false)

  useEffect(() => {
    void refreshVisitorGeo()
  }, [])

  const flush = useCallback(async () => {
    if (!tourId) return
    const events = bufferRef.current
    if (events.length === 0) return
    bufferRef.current = []
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    const vid = visitorIdRef.current
    const campaign = getCampaignMeta()
    const geo = getVisitorGeo()
    const eventsWithMeta = events.map((e) => ({
      ...e,
      metadata: {
        ...campaign,
        section: sectionRef.current,
        ...e.metadata,
        ...(vid ? { visitorId: vid } : {}),
      },
    }))
    try {
      await trackBatch({
        tourId,
        sessionId,
        deviceType,
        events: eventsWithMeta,
        ...(vid ? { visitorId: vid } : {}),
        ...(geo?.city ? { city: geo.city } : {}),
        ...(geo?.countryCode ? { country: geo.countryCode } : {}),
      })
    } catch {
      try {
        await trackBatch({
          tourId,
          sessionId,
          deviceType,
          events: eventsWithMeta,
          ...(geo?.city ? { city: geo.city } : {}),
          ...(geo?.countryCode ? { country: geo.countryCode } : {}),
        })
      } catch {
        /* drop on failure; tracking must never block UX */
      }
    }
  }, [tourId, trackBatch, deviceType, sessionId])

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
      if (
        event.event === 'tour_view' ||
        event.event === 'session_end' ||
        event.event === 'section_dwell' ||
        bufferRef.current.length >= FLUSH_MAX_EVENTS
      ) {
        void flush()
      } else {
        scheduleFlush()
      }
    },
    [flush, scheduleFlush]
  )

  const emitDwell = useCallback(
    (section: AnalyticsSection) => {
      const dwell = Math.round((Date.now() - lastDwellAtRef.current) / 1000)
      lastDwellAtRef.current = Date.now()
      if (dwell <= 0) return
      trackEvent({
        event: 'section_dwell',
        duration: dwell,
        metadata: { section },
      })
    },
    [trackEvent]
  )

  const setSection = useCallback(
    (section: AnalyticsSection) => {
      if (section === sectionRef.current) return
      emitDwell(sectionRef.current)
      sectionRef.current = section
    },
    [emitDwell]
  )

  useEffect(() => {
    if (!visitorId || linkedRef.current || !tourId) return
    linkedRef.current = true
    trackEvent({
      event: 'tour_view',
      metadata: { linked: true, section: sectionRef.current },
    })
  }, [visitorId, tourId, trackEvent])

  useEffect(() => {
    // No tour yet (loading / password gate / sales pre-start): don't arm the
    // session, or the null→id transition's cleanup buffers a bogus session_end.
    if (!tourId) return
    startedAtRef.current = Date.now()
    lastDwellAtRef.current = Date.now()
    // beforeunload + pagehide (mobile) can both fire; send session_end once.
    let ended = false
    // Events tracked before tourId arrived (sales-mode start) are still buffered.
    void flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        emitDwell(sectionRef.current)
        void flush()
      } else {
        lastDwellAtRef.current = Date.now()
      }
    }
    const onBeforeUnload = () => {
      if (ended) return
      ended = true
      const totalSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)
      emitDwell(sectionRef.current)
      bufferRef.current.push({
        event: 'session_end',
        duration: totalSeconds,
        timestamp: Date.now(),
        metadata: { section: sectionRef.current },
      })
      void flush()
    }
    const dwellTick = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      emitDwell(sectionRef.current)
    }, DWELL_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onBeforeUnload)
    return () => {
      window.clearInterval(dwellTick)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onBeforeUnload)
      onBeforeUnload()
    }
  }, [tourId, emitDwell, flush])

  return {
    sessionId,
    trackEvent,
    flush,
    setSection,
  }
}
