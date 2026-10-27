'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { getOrCreateDeviceId } from '@/lib/deviceId'
import { lookupPublicCity, storeVisitorGeo } from '@/lib/visitorGeo'
import { getStoredUTMParams } from '@/hooks/useUTMCapture'
import {
  CONSENT_UPDATED_EVENT,
  getStoredPreferences,
  type CookiePreferences,
} from '@/components/ui/CookieConsent'
import type { Id } from '../../convex/_generated/dataModel'

const VISITOR_STORAGE_KEY = 'spz_vid'
const SESSION_STORAGE_KEY = 'spz_sid'

// ponytail: codegen may lag parallel agent; FunctionReference works before api.* exists
const visitorsResolve = makeFunctionReference<'mutation'>('visitors:resolve')

type IdentityTier =
  | 'session'
  | 'device'
  | 'fingerprint'
  | 'identified'
  | 'verified'

type ResolveDoc = {
  _id: Id<'visitors'>
  confidence: number
  identityTier: IdentityTier
  phoneHash?: string
  lastSceneId?: Id<'scenes'>
}

function ensureSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    return id
  } catch {
    return null
  }
}

function readCachedVisitorId(): Id<'visitors'> | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(VISITOR_STORAGE_KEY) as Id<'visitors'> | null
  } catch {
    return null
  }
}

function clearCachedVisitorId(): void {
  try {
    sessionStorage.removeItem(VISITOR_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function writeCachedVisitorId(id: string): void {
  try {
    sessionStorage.setItem(VISITOR_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

function canResolve(prefs: CookiePreferences | null): boolean {
  // Identity resolve requires analytics; FP only when fingerprinting granted
  return !!prefs?.analytics
}

async function loadFingerprint(): Promise<{
  fingerprintHash: string
  fpConfidence: number
} | null> {
  try {
    const FingerprintJS = await import('@fingerprintjs/fingerprintjs')
    const agent = await FingerprintJS.load()
    const result = await agent.get()
    return {
      fingerprintHash: result.visitorId,
      fpConfidence: result.confidence?.score ?? 0.5,
    }
  } catch {
    return null
  }
}

async function fetchGeo(): Promise<{
  networkKey?: string
  city?: string
  countryCode?: string
}> {
  try {
    const res = await fetch('/api/visitor-geo')
    if (!res.ok) return {}
    const data = (await res.json()) as {
      networkKey?: string | null
      city?: string | null
      countryCode?: string | null
    }
    return {
      networkKey: data.networkKey || undefined,
      city: data.city || undefined,
      countryCode: data.countryCode || undefined,
    }
  } catch {
    return {}
  }
}

async function fetchGeoWithCity(): Promise<{
  networkKey?: string
  city?: string
  countryCode?: string
}> {
  const geo = await fetchGeo()
  if (geo.city || geo.countryCode) return geo
  const looked = await lookupPublicCity()
  if (!looked) return geo
  return {
    ...geo,
    city: looked.city,
    countryCode: looked.countryCode ?? geo.countryCode,
  }
}

/**
 * Resolves visitor identity AFTER analytics consent.
 * FingerprintJS loads only when fingerprinting purpose is granted.
 */
export function useVisitorIdentity() {
  const resolveMutation = useMutation(visitorsResolve)
  const [visitorId, setVisitorId] = useState<Id<'visitors'> | null>(() =>
    canResolve(getStoredPreferences()) ? readCachedVisitorId() : null
  )
  const [confidence, setConfidence] = useState<number | null>(null)
  const [identityTier, setIdentityTier] = useState<IdentityTier | null>(null)
  const resolvingRef = useRef(false)
  const resolvedRef = useRef(false)

  const resolve = useCallback(async () => {
    if (resolvingRef.current || resolvedRef.current) return visitorId
    const prefs = getStoredPreferences()
    if (!canResolve(prefs)) return null

    const sessionId = ensureSessionId()
    if (!sessionId) return null

    resolvingRef.current = true
    try {
      const deviceId = await getOrCreateDeviceId()

      let fingerprintHash: string | undefined
      let fpConfidence: number | undefined
      if (prefs?.fingerprinting) {
        const fp = await loadFingerprint()
        if (fp) {
          fingerprintHash = fp.fingerprintHash
          fpConfidence = fp.fpConfidence
        }
      }

      const geo = await fetchGeoWithCity()
      storeVisitorGeo({ city: geo.city, countryCode: geo.countryCode })
      const utm = getStoredUTMParams()
      const mm = utm?.mm?.trim()

      const result = (await resolveMutation({
        sessionId,
        deviceId,
        fingerprintHash,
        fpConfidence,
        networkKey: geo.networkKey,
        city: geo.city,
        countryCode: geo.countryCode,
        ...(mm
          ? { micromarket: mm, micromarketSource: 'qr_campaign' as const }
          : {}),
      })) as ResolveDoc

      if (result?._id) {
        writeCachedVisitorId(result._id)
        setVisitorId(result._id)
        setConfidence(result.confidence ?? null)
        setIdentityTier(result.identityTier ?? null)
        resolvedRef.current = true
        return result._id
      }
      return null
    } catch {
      return null
    } finally {
      resolvingRef.current = false
    }
  }, [resolveMutation, visitorId])

  useEffect(() => {
    const prefs = getStoredPreferences()
    if (canResolve(prefs)) {
      void resolve()
    }

    const onConsent = () => {
      resolvedRef.current = false
      if (!canResolve(getStoredPreferences())) {
        // Analytics revoked: stop attaching the visitor id to events.
        clearCachedVisitorId()
        setVisitorId(null)
        setConfidence(null)
        setIdentityTier(null)
        return
      }
      void resolve()
    }
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent)
    const retry = window.setTimeout(() => {
      if (!resolvedRef.current) void resolve()
    }, 800)
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent)
      window.clearTimeout(retry)
    }
  }, [resolve])

  return {
    visitorId,
    confidence,
    identityTier,
    resolve,
  }
}
