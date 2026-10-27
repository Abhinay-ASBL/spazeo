import { NextRequest, NextResponse } from 'next/server'

/**
 * Returns derived geo signals only — never raw IP.
 * networkKey = sha256(ip + '|' + (asn||'') + '|' + PEPPER)
 *
 * City comes from edge headers when present (Vercel / Cloudflare).
 * On self-hosted public IPs, a city lookup is used. Private/localhost
 * addresses have no city — that is expected.
 */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function firstIp(header: string | null): string {
  if (!header) return ''
  return header.split(',')[0]?.trim() ?? ''
}

function clientIp(req: NextRequest): string {
  return (
    firstIp(req.headers.get('x-vercel-forwarded-for')) ||
    firstIp(req.headers.get('cf-connecting-ip')) ||
    firstIp(req.headers.get('x-forwarded-for')) ||
    firstIp(req.headers.get('x-real-ip')) ||
    ''
  )
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true
  const v4 = ip.replace('::ffff:', '')
  if (v4 === '127.0.0.1' || v4 === '0.0.0.0' || v4 === 'localhost') return true
  if (ip === '::1') return true
  if (/^10\./.test(v4)) return true
  if (/^192\.168\./.test(v4)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v4)) return true
  if (/^169\.254\./.test(v4)) return true
  return false
}

async function lookupPublicCity(
  ip: string
): Promise<{ city: string | null; countryCode: string | null }> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1800)
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,country_code`,
      { signal: ctrl.signal, cache: 'no-store' }
    )
    clearTimeout(timer)
    if (!res.ok) return { city: null, countryCode: null }
    const data = (await res.json()) as {
      success?: boolean
      city?: string
      country_code?: string
    }
    if (!data.success) return { city: null, countryCode: null }
    return {
      city: data.city?.trim() || null,
      countryCode: data.country_code?.trim() || null,
    }
  } catch {
    return { city: null, countryCode: null }
  }
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req)
  let city =
    decodeHeader(req.headers.get('x-vercel-ip-city')) ??
    decodeHeader(req.headers.get('cf-ipcity'))
  let countryCode =
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    null
  const asn = req.headers.get('x-vercel-ip-as-number') ?? ''

  if ((!city || !countryCode) && ip && !isPrivateIp(ip)) {
    const looked = await lookupPublicCity(ip)
    city = city || looked.city
    countryCode = countryCode || looked.countryCode
  }

  const pepper =
    process.env.NETWORK_KEY_PEPPER ||
    process.env.GEO_HASH_PEPPER ||
    process.env.VISITOR_NETWORK_PEPPER ||
    'spazeo-dev-pepper'

  const networkKey = ip ? await sha256Hex(`${ip}|${asn}|${pepper}`) : null

  return NextResponse.json({
    networkKey,
    city,
    countryCode,
  })
}
