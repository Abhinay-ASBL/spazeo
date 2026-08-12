/**
 * ASBL Legacy Towers — view-from-floor showcase data.
 *
 * Source of truth: ASBL_360deg_editLOG.pdf (drone shot log).
 * Each panorama is a 360° view taken from a specific corner (A–F) of
 * a specific tower (A/B/C), at one of 5 heights (37m, 74m, 111m, 148m,
 * 185m). These correspond to floors ~10, 20, 30, 40, 50 (G+50 building).
 *
 * Day 3 (10 Apr 2026): Tower A & B — all 6 corners × 5 heights = 60 shots.
 * Day 4: Tower C — all 6 corners × 5 heights = 30 shots.
 * Total: 90 equirectangular panoramas, compressed 14400×7200 → 8192×4096.
 */

export type TowerId = 'A' | 'B' | 'C'
export type CornerId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface HeightSample {
  heightM: number
  floor: number
  label: string
}

/** 5 drone heights, each mapped to an approximate floor number. */
export const HEIGHT_SAMPLES: HeightSample[] = [
  { heightM: 37,  floor: 10, label: '~Floor 10' },
  { heightM: 74,  floor: 20, label: '~Floor 20' },
  { heightM: 111, floor: 30, label: '~Floor 30' },
  { heightM: 148, floor: 40, label: '~Floor 40' },
  { heightM: 185, floor: 50, label: '~Floor 50' },
]

export const TOTAL_FLOORS = 50

export interface TowerInfo {
  id: TowerId
  name: string
  tagline: string
  floorPlanUrl: string
}

export const TOWERS: TowerInfo[] = [
  {
    id: 'A',
    name: 'Tower A',
    tagline: 'West block · Lake & city views',
    floorPlanUrl: '/legacy-towers/plans/tower-a-floor.jpg',
  },
  {
    id: 'B',
    name: 'Tower B',
    tagline: 'Central block · North courtyard views',
    floorPlanUrl: '/legacy-towers/plans/tower-b-floor.jpg',
  },
  {
    id: 'C',
    name: 'Tower C',
    tagline: 'East block · City & sunset views',
    floorPlanUrl: '/legacy-towers/plans/tower-c-floor.jpg',
  },
]

/**
 * 6 corner vantage points around each tower's perimeter.
 * Percentages are overlay coordinates (left/top) on the cropped
 * tower-on-site-plan panel. Direction is a rough compass label.
 */
export interface CornerInfo {
  id: CornerId
  direction: string
  /** Position on the site-plan (wide-ratio) image. */
  overlay: { left: string; top: string }
  /** Position on a tall portrait floor-plan image (apartment-corner accurate). */
  floorPlanOverlay: { left: string; top: string }
}

export const CORNERS: CornerInfo[] = [
  { id: 'A', direction: 'North-East', overlay: { left: '78%', top: '18%' }, floorPlanOverlay: { left: '82%', top: '10%' } },
  { id: 'B', direction: 'East',       overlay: { left: '78%', top: '78%' }, floorPlanOverlay: { left: '82%', top: '90%' } },
  { id: 'C', direction: 'North',      overlay: { left: '50%', top: '14%' }, floorPlanOverlay: { left: '50%', top: '6%'  } },
  { id: 'D', direction: 'South',      overlay: { left: '50%', top: '82%' }, floorPlanOverlay: { left: '50%', top: '94%' } },
  { id: 'E', direction: 'North-West', overlay: { left: '22%', top: '18%' }, floorPlanOverlay: { left: '18%', top: '10%' } },
  { id: 'F', direction: 'West',       overlay: { left: '22%', top: '78%' }, floorPlanOverlay: { left: '18%', top: '90%' } },
]

/** Corners that have actual panorama files on disk, keyed as "tower|corner". */
const AVAILABLE_CORNERS = new Set<string>([
  'A|A', 'A|B', 'A|C', 'A|D', 'A|E', 'A|F',
  'B|A', 'B|B', 'B|C', 'B|D', 'B|E', 'B|F',
  'C|A', 'C|B', 'C|C', 'C|D', 'C|E', 'C|F',
])

/** Returns true if a panorama file exists for this tower + corner combination. */
export function hasStaticPanorama(tower: TowerId, corner: CornerId): boolean {
  return AVAILABLE_CORNERS.has(`${tower}|${corner}`)
}

/** Returns the path to a panorama sample for a tower + corner + height. */
export function resolvePanorama(
  tower: TowerId,
  corner: CornerId,
  heightM: number,
): string {
  const nearest = HEIGHT_SAMPLES.reduce((best, s) =>
    Math.abs(s.heightM - heightM) < Math.abs(best.heightM - heightM) ? s : best,
  HEIGHT_SAMPLES[0])
  // Only corner A has captured panoramas — fall back to it for unlaunched corners.
  const usableCorner: CornerId = hasStaticPanorama(tower, corner) ? corner : 'A'
  return `/legacy-towers/panoramas/tower-${tower.toLowerCase()}-p-${usableCorner.toLowerCase()}-${nearest.heightM}m.jpg`
}

/** Map an arbitrary floor number to the nearest sampled height. */
export function floorToHeight(floor: number): HeightSample {
  const estimatedM = (floor / TOTAL_FLOORS) * 185
  return HEIGHT_SAMPLES.reduce((best, s) =>
    Math.abs(s.heightM - estimatedM) < Math.abs(best.heightM - estimatedM) ? s : best,
  HEIGHT_SAMPLES[0])
}
