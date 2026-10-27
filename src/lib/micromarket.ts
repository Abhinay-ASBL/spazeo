/**
 * Micromarket waterfall (SPEC-visitor-identity §7).
 * First hit wins. Never use IP as a lead attribute.
 *
 * Priority:
 * 1. QR campaign `mm` (utm/qr param)
 * 2. Declared (gate / form field)
 * 3. Tour intent (tours.address / location label)
 * 4. Browser geolocation (consented)
 * 5. IP — city pre-fill / VPN flag only; never returned here for leads
 *
 * Phase 2 agent: call `resolveMicromarket` when capturing a lead and
 * pass `{ micromarket }` into `api.leads.capture`.
 */

export type MicromarketSource =
  | 'qr_campaign'
  | 'declared'
  | 'tour_intent'
  | 'geolocation'

export type MicromarketResult = {
  micromarket: string
  source: MicromarketSource
}

export type MicromarketInput = {
  /** UTM / QR `mm` param from getStoredUTMParams() */
  qrMm?: string | null
  /** Optional "Which area are you looking in?" field */
  declared?: string | null
  /** tours.address or a human location label on the listing */
  tourAddress?: string | null
  /** Consented browser geolocation label (area / locality) — not raw IP */
  geoMicromarket?: string | null
}

function clean(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Resolve micromarket for a lead. Returns null if nothing usable.
 * IP is intentionally omitted from the input surface.
 */
export function resolveMicromarket(
  input: MicromarketInput
): MicromarketResult | null {
  const qrMm = clean(input.qrMm)
  if (qrMm) return { micromarket: qrMm, source: 'qr_campaign' }

  const declared = clean(input.declared)
  if (declared) return { micromarket: declared, source: 'declared' }

  const tourAddress = clean(input.tourAddress)
  if (tourAddress) return { micromarket: tourAddress, source: 'tour_intent' }

  const geo = clean(input.geoMicromarket)
  if (geo) return { micromarket: geo, source: 'geolocation' }

  return null
}
