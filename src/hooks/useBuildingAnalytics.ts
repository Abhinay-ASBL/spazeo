'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  buildingStageSection,
  getCampaignMeta,
  type AnalyticsSection,
} from '@/lib/analyticsAttribution'
import { getVisitorGeo, refreshVisitorGeo } from '@/lib/visitorGeo'

const SESSION_KEY = 'spz_sid'
const DWELL_MS = 10_000

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'sunset' | 'night'

type TrackArgs = {
  event: string
  floor?: number
  unitNumber?: string
  viewPositionId?: Id<'viewPositions'>
  duration?: number
  timeOfDay?: TimeOfDay
  metadata?: Record<string, string | number | boolean | null>
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (/Mobi/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function useBuildingAnalytics(
  buildingId: Id<'buildings'> | null | undefined,
  opts?: { visitorId?: Id<'visitors'> | null }
) {
  const trackMutation = useMutation(api.buildingAnalytics.track)
  const [sessionId] = useState(() => getOrCreateSessionId())
  const device = useRef(detectDevice())
  const viewFired = useRef(false)
  const sectionRef = useRef<AnalyticsSection>('homepage')
  // Stamped on mount — reading the clock during render isn't allowed.
  const lastDwellAtRef = useRef<number>(0)
  const visitorIdRef = useRef(opts?.visitorId ?? null)
  const linkedRef = useRef(false)

  // Kept in sync after commit — refs must not be written during render.
  useEffect(() => {
    visitorIdRef.current = opts?.visitorId ?? null
  }, [opts?.visitorId])

  useEffect(() => {
    lastDwellAtRef.current = Date.now()
    void refreshVisitorGeo()
  }, [])

  const track = useCallback(
    (args: TrackArgs) => {
      if (!buildingId) return
      const campaign = getCampaignMeta()
      const geo = getVisitorGeo()
      void trackMutation({
        buildingId,
        sessionId,
        device: device.current,
        visitorId: visitorIdRef.current ?? undefined,
        ...args,
        metadata: {
          ...campaign,
          section: sectionRef.current,
          ...(geo?.city ? { city: geo.city } : {}),
          ...(geo?.countryCode ? { country: geo.countryCode } : {}),
          ...args.metadata,
        },
      }).catch(() => {
        // fire-and-forget
      })
    },
    [buildingId, sessionId, trackMutation]
  )

  const emitDwell = useCallback(() => {
    const startedAt = lastDwellAtRef.current || Date.now()
    const dwell = Math.round((Date.now() - startedAt) / 1000)
    lastDwellAtRef.current = Date.now()
    if (dwell <= 0) return
    track({
      event: 'section_dwell',
      duration: dwell,
      metadata: { section: sectionRef.current },
    })
  }, [track])

  const setSection = useCallback(
    (section: AnalyticsSection) => {
      if (section === sectionRef.current) return
      emitDwell()
      sectionRef.current = section
    },
    [emitDwell]
  )

  useEffect(() => {
    if (!buildingId || viewFired.current) return
    viewFired.current = true
    track({ event: 'building_view', metadata: { section: 'homepage' } })
  }, [buildingId, track])

  useEffect(() => {
    if (!opts?.visitorId || !buildingId || linkedRef.current) return
    linkedRef.current = true
    track({
      event: 'building_view',
      metadata: { section: sectionRef.current, linked: true },
    })
  }, [opts?.visitorId, buildingId, track])

  useEffect(() => {
    lastDwellAtRef.current = Date.now()
    const tick = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      emitDwell()
    }, DWELL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') emitDwell()
      else lastDwellAtRef.current = Date.now()
    }
    const onUnload = () => emitDwell()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onUnload)
      onUnload()
    }
  }, [emitDwell])

  return { track, sessionId, setSection }
}

export { buildingStageSection }
