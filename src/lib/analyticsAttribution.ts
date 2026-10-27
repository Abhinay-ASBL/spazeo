import { captureUTMParams, getStoredUTMParams } from '@/hooks/useUTMCapture'

export type AnalyticsSection =
  | 'homepage'
  | 'plans'
  | 'location'
  | 'price'
  | 'media'
  | 'specifications'

export function classifyAnalyticsSection(
  title?: string | null,
  panoramaType?: string | null
): AnalyticsSection {
  if (panoramaType === 'floor_plan') return 'plans'
  const t = (title ?? '').toLowerCase()
  if (/\b(plan|layout|typical|master plan|floor plan|site plan)\b/.test(t)) {
    return 'plans'
  }
  if (/\b(price|pricing|cost|payment|lakh|crore|starting)\b/.test(t)) {
    return 'price'
  }
  if (/\b(location|map|connectivity|nearby|neighbourhood|neighborhood|google map)\b/.test(t)) {
    return 'location'
  }
  if (/\b(spec|amenit|bhk|sqft|sq ft|area|unit type)\b/.test(t)) {
    return 'specifications'
  }
  if (/\b(home|lobby|entrance|arrival|reception|drop[- ]?off)\b/.test(t)) {
    return 'homepage'
  }
  return 'media'
}

export function getCampaignMeta(): Record<string, string> {
  captureUTMParams()
  const utm = getStoredUTMParams()
  if (!utm) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(utm)) {
    if (typeof value === 'string' && value.trim()) out[key] = value.trim()
  }
  return out
}

export function buildingStageSection(
  stage: string,
  unitSelected: boolean
): AnalyticsSection {
  if (unitSelected) return 'specifications'
  if (stage === 'floor') return 'plans'
  if (stage === 'view') return 'media'
  if (stage === 'map') return 'location'
  return 'homepage'
}
