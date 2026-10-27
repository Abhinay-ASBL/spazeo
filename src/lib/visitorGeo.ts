const GEO_KEY = 'spz_geo'
const GEO_FRESH_MS = 24 * 60 * 60 * 1000

export type VisitorGeo = {
  city?: string
  countryCode?: string
}

export function storeVisitorGeo(geo: VisitorGeo): void {
  if (typeof window === 'undefined') return
  const city = geo.city?.trim()
  const countryCode = geo.countryCode?.trim()
  if (!city && !countryCode) return
  try {
    sessionStorage.setItem(
      GEO_KEY,
      JSON.stringify({
        ...(city ? { city } : {}),
        ...(countryCode ? { countryCode } : {}),
        at: Date.now(),
      })
    )
  } catch {
    /* ignore */
  }
}

export function getVisitorGeo(): VisitorGeo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(GEO_KEY)
    if (!raw) return null
    return JSON.parse(raw) as VisitorGeo
  } catch {
    return null
  }
}

/** City only — never requests or stores the IP string. */
export async function lookupPublicCity(): Promise<VisitorGeo | null> {
  if (typeof window === 'undefined') return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1800)
    const res = await fetch(
      'https://ipwho.is/?fields=success,city,country_code',
      { signal: ctrl.signal, cache: 'no-store' }
    )
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as {
      success?: boolean
      city?: string
      country_code?: string
    }
    if (!data.success) return null
    const city = data.city?.trim()
    const countryCode = data.country_code?.trim()
    if (!city && !countryCode) return null
    return {
      ...(city ? { city } : {}),
      ...(countryCode ? { countryCode } : {}),
    }
  } catch {
    return null
  }
}

export async function refreshVisitorGeo(): Promise<VisitorGeo | null> {
  if (typeof window === 'undefined') return null
  const stored = getVisitorGeo() as (VisitorGeo & { at?: number }) | null
  if (stored?.at && Date.now() - stored.at < GEO_FRESH_MS) return stored
  let geo: VisitorGeo = {}
  try {
    const res = await fetch('/api/visitor-geo')
    if (res.ok) {
      const data = (await res.json()) as {
        city?: string | null
        countryCode?: string | null
      }
      geo = {
        city: data.city || undefined,
        countryCode: data.countryCode || undefined,
      }
    }
  } catch {
    /* fall through to public-city lookup */
  }
  if (!geo.city && !geo.countryCode) {
    const looked = await lookupPublicCity()
    if (looked) geo = looked
  }
  storeVisitorGeo(geo)
  return geo.city || geo.countryCode ? geo : getVisitorGeo()
}
