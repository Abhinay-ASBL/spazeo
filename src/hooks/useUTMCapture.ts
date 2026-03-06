import { useEffect } from 'react'

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const STORAGE_KEY = 'spazeo_utm'

/**
 * Read UTM parameters from the current URL and store them in sessionStorage.
 * Can be called outside of React (e.g. from LandingAnalytics).
 */
export function captureUTMParams(): void {
  if (typeof window === 'undefined') return

  try {
    const params = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    let hasUTM = false

    for (const key of UTM_PARAMS) {
      const value = params.get(key)
      if (value) {
        utm[key] = value
        hasUTM = true
      }
    }

    if (hasUTM) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
    }
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

/**
 * Retrieve stored UTM parameters from sessionStorage.
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
 * useUTMCapture — React hook that captures UTM parameters on mount.
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
