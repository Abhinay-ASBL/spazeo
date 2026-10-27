/** Phone + hash helpers for unverified lead-form identity (SPEC §4 attachPhone). */

let warnedMissingPepper = false
const PEPPER = () => {
  const pepper = process.env.VISITOR_IDENTITY_PEPPER
  if (pepper) return pepper
  // Kept as a fallback so tracking never breaks, but phone hashes are then
  // guessable — set VISITOR_IDENTITY_PEPPER in the Convex env.
  if (!warnedMissingPepper) {
    warnedMissingPepper = true
    console.error('VISITOR_IDENTITY_PEPPER is not set; using the insecure dev pepper for phone hashes')
  }
  return 'spazeo-dev-pepper'
}

/** India-first E.164. Returns null if invalid. */
export function toE164(phone: string): string | null {
  const raw = phone.trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // 10-digit Indian mobile
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`
  }
  // 0XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('0')) {
    const rest = digits.slice(1)
    if (/^[6-9]\d{9}$/.test(rest)) return `+91${rest}`
  }
  // 91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) {
    const rest = digits.slice(2)
    if (/^[6-9]\d{9}$/.test(rest)) return `+91${rest}`
  }
  // Already international-ish
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }
  return null
}

export function phoneCountryCode(e164: string): string {
  if (e164.startsWith('+91')) return '+91'
  const m = /^\+(\d{1,3})/.exec(e164)
  return m ? `+${m[1]}` : '+91'
}

export async function hashPhone(e164: string): Promise<string> {
  const data = new TextEncoder().encode(e164 + PEPPER())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
