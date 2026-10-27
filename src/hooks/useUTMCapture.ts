import { useEffect } from 'react'

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
/** Offline QR + portal campaign ids (mlid / cid from Magicbricks-style URLs). */
const QR_PARAMS = ['src', 'qr', 'mm', 'camp', 'mlid', 'cid'] as const
const STORAGE_KEY = 'spazeo_utm'

/**
 * Read UTM + QR placement params from the current URL and store in sessionStorage.
 * Can be called outside of React (e.g. from LandingAnalytics).
 */
export function captureUTMParams(): void {
  if (typeof window === 'undefined') return

  try {
    const params = new URLSearchParams(window.location.search)
    const captured: Record<string, string> = {}
    let hasAny = false

    for (const key of [...UTM_PARAMS, ...QR_PARAMS]) {
      const value = params.get(key)
      if (value) {
        captured[key] = value
        hasAny = true
      }
    }

    if (hasAny) {
      // Merge with any previously stored params so a later navigations don't wipe QR context
      const prev = getStoredUTMParams() ?? {}
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...captured }))
    }
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

/**
 * Retrieve stored UTM / QR parameters from sessionStorage.
 */
export function getStoredUTMParams(): Record<string, string> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : null
  } catch {
    return null
  }
}

/**
 * useUTMCapture — React hook that captures UTM / QR parameters on mount.
 *
 * Usage:
 *   useUTMCapture()
 *   // Later: getStoredUTMParams()
 */
export function useUTMCapture(): void {
  useEffect(() => {
    captureUTMParams()
  }, [])
}
