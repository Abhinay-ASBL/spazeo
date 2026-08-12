'use client'

import { Suspense, use, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  Layers,
  Eye,
  ArrowUpRight,
  Phone,
  ArrowLeft,
  Check,
  Share2,
  Pencil,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { PanoramaViewer } from '@/components/viewer/PanoramaViewer'
import {
  TOWERS as STATIC_TOWERS,
  HEIGHT_SAMPLES as STATIC_HEIGHT_SAMPLES,
  TOTAL_FLOORS as STATIC_TOTAL_FLOORS,
  floorToHeight as staticFloorToHeight,
  resolvePanorama as staticResolvePanorama,
  type TowerId,
  type CornerId,
} from '@/lib/legacyTowers'

const GOLD = '#D4A017'
const TEAL = '#2DD4BF'

/** Natural aspect ratio (width / height) of static floor-plan assets */
const FLOOR_PLAN_ASPECT: Record<string, number> = {
  A: 1130 / 1600, // portrait
  B: 1600 / 1130, // landscape
  C: 1130 / 1600, // portrait
}

/* ── Types ── */

type MergedTower = {
  id: TowerId
  name: string
  tagline: string
  floorPlanUrl: string
  heroUrl?: string | null
  heroLeftPct?: number
  heroTopPct?: number
  heroRightPct?: number
  heroBottomPct?: number
}

type MergedUnit = {
  id: string
  name: string
  bhk: number
  areaSqft?: number
  towerId?: string
  points: Array<{ leftPct: number; topPct: number }>
  balconyYawRad?: number
  balconyYawRads?: Array<{ heightM: number; yawRad: number }>
  balconyHotspots?: Array<{
    id: string
    heightM: number
    x: number
    y: number
    z: number
    title: string
    description?: string
    lineHeight?: number
  }>
  balconyStickyLabels?: Array<{
    id: string
    heightM: number
    text: string
    x?: number
    y?: number
    z?: number
    size?: number
  }>
}

type MergedHeightSample = { heightM: number; floor: number; label: string }

type MergedConfig = {
  projectName: string
  projectTagline: string
  totalFloors: number
  heroUrl: string | null
  sitePlanUrl: string | null
  towers: MergedTower[]
  heightSamples: MergedHeightSample[]
  unitTypes: MergedUnit[]
  floorToHeight: (floor: number) => MergedHeightSample
  resolveUnitPanorama: (tower: TowerId, unitId: string | null, heightM: number) => string | null
  hasUnitPanorama: (tower: TowerId, unitId: string) => boolean
}

type Stage = 'tower' | 'floor' | 'view'

interface Selection {
  tower: TowerId | null
  floor: number
  unitId: string | null
}

type ConvexCfg = {
  projectName: string
  projectTagline?: string | null
  totalFloors: number
  heroUrl: string | null
  sitePlanUrl: string | null
  towers: Array<{
    id: string
    name: string
    tagline?: string
    heroLeftPct?: number
    heroTopPct?: number
    floorPlanUrl?: string | null
    heroUrl?: string | null
  }>
  heightSamples: Array<{ heightM: number; floor: number; label: string }>
  unitTypes: Array<{
    id: string
    name: string
    bhk: number
    areaSqft?: number
    towerId?: string
    points?: Array<{ leftPct: number; topPct: number }>
    balconyYawRad?: number
    balconyYawRads?: Array<{ heightM: number; yawRad: number }>
    balconyHotspots?: Array<{
      id: string
      heightM: number
      x: number
      y: number
      z: number
      title: string
      description?: string
      lineHeight?: number
    }>
    balconyStickyLabels?: Array<{
      id: string
      heightM: number
      text: string
      x?: number
      y?: number
      z?: number
      size?: number
    }>
  }>
  panoramas: Array<{
    towerId: string
    cornerId: string
    heightM: number
    imageUrl?: string | null
  }>
}

const UNIT_SPEC: Record<string, { bhk: number; areaSqft: number }> = {
  a1:  { bhk: 4, areaSqft: 3015 }, a2:  { bhk: 4, areaSqft: 3015 },
  a3:  { bhk: 3, areaSqft: 1970 }, a4:  { bhk: 3, areaSqft: 1970 },
  a5:  { bhk: 3, areaSqft: 1970 }, a6:  { bhk: 3, areaSqft: 1970 },
  a7:  { bhk: 3, areaSqft: 1970 }, a8:  { bhk: 3, areaSqft: 1970 },
  a9:  { bhk: 4, areaSqft: 2535 }, a10: { bhk: 4, areaSqft: 2535 },
  b1:  { bhk: 4, areaSqft: 2540 }, b2:  { bhk: 4, areaSqft: 2540 },
  b3:  { bhk: 3, areaSqft: 2085 }, b4:  { bhk: 3, areaSqft: 1970 },
  b5:  { bhk: 3, areaSqft: 1970 }, b6:  { bhk: 3, areaSqft: 1970 },
  b7:  { bhk: 3, areaSqft: 1970 }, b8:  { bhk: 3, areaSqft: 2115 },
  b9:  { bhk: 4, areaSqft: 2540 }, b10: { bhk: 4, areaSqft: 2540 },
  c1:  { bhk: 4, areaSqft: 3015 }, c2:  { bhk: 4, areaSqft: 3015 },
  c3:  { bhk: 3, areaSqft: 1970 }, c4:  { bhk: 3, areaSqft: 1970 },
  c5:  { bhk: 3, areaSqft: 1970 }, c6:  { bhk: 3, areaSqft: 1970 },
  c7:  { bhk: 3, areaSqft: 1970 }, c8:  { bhk: 3, areaSqft: 1970 },
  c9:  { bhk: 4, areaSqft: 2535 }, c10: { bhk: 4, areaSqft: 2535 },
}

/* ── mergeConfig (unchanged data plumbing) ── */

function mergeConfig(remote: ConvexCfg | null | undefined): MergedConfig {
  if (!remote) {
    return {
      projectName: 'ASBL Legacy Towers',
      projectTagline: `Hyderabad · ${STATIC_TOWERS.length} towers · ${STATIC_TOTAL_FLOORS} floors`,
      totalFloors: STATIC_TOTAL_FLOORS,
      heroUrl: null,
      sitePlanUrl: null,
      towers: STATIC_TOWERS.map((t) => ({
        id: t.id,
        name: t.name,
        tagline: t.tagline,
        floorPlanUrl: t.floorPlanUrl,
        heroUrl: null,
      })),
      heightSamples: STATIC_HEIGHT_SAMPLES,
      unitTypes: [],
      floorToHeight: staticFloorToHeight,
      resolveUnitPanorama: (tower, _unitId, heightM) =>
        staticResolvePanorama(tower, 'A' as CornerId, heightM),
      hasUnitPanorama: () => false,
    }
  }

  const heightSamples = STATIC_HEIGHT_SAMPLES
  const totalFloors = STATIC_TOTAL_FLOORS

  const towers: MergedTower[] = (remote.towers.length > 0 ? remote.towers : STATIC_TOWERS).map(
    (t, i) => {
      const staticMatch = STATIC_TOWERS.find((s) => s.id === t.id)
      return {
        id: t.id as TowerId,
        name: t.name,
        tagline: ('tagline' in t && t.tagline) || staticMatch?.tagline || '',
        // Prefer static plans (Vercel) — Convex uploads can drift from marker coords
        floorPlanUrl:
          staticMatch?.floorPlanUrl ||
          ('floorPlanUrl' in t && t.floorPlanUrl) ||
          '/legacy-towers/plans/tower-a-floor.jpg',
        heroUrl: ('heroUrl' in t ? t.heroUrl : null) ?? null,
        heroLeftPct:
          'heroLeftPct' in t && typeof t.heroLeftPct === 'number'
            ? t.heroLeftPct
            : [19.5, 35, 63.8][i] ?? 50,
        heroTopPct:
          'heroTopPct' in t && typeof t.heroTopPct === 'number'
            ? t.heroTopPct
            : [8, 13.7, 10.6][i] ?? 10,
        heroRightPct:
          'heroRightPct' in t && typeof t.heroRightPct === 'number'
            ? t.heroRightPct
            : [32.8, 60.6, 80.9][i] ?? 70,
        heroBottomPct:
          'heroBottomPct' in t && typeof t.heroBottomPct === 'number'
            ? t.heroBottomPct
            : [96.5, 96.8, 96.3][i] ?? 96,
      }
    },
  )

  const unitTypes: MergedUnit[] = (remote.unitTypes ?? [])
    .map((u) => {
      const towerChar = (u.towerId ?? '').toLowerCase()
      const unitNum = parseInt(u.name?.replace(/\D/g, '') ?? '0', 10)
      const spec = UNIT_SPEC[`${towerChar}${unitNum}`]
      return {
        id: u.id,
        name: u.name,
        bhk: spec?.bhk ?? u.bhk,
        areaSqft: spec?.areaSqft ?? u.areaSqft,
        towerId: u.towerId,
        points: u.points ?? [],
        balconyYawRad: u.balconyYawRad,
        balconyYawRads: u.balconyYawRads,
        balconyHotspots: u.balconyHotspots,
        balconyStickyLabels: u.balconyStickyLabels,
      }
    })
    .filter((u) => u.points.length >= 3)

  const unitPanoMap = new Map<string, string>()
  const cornerPanoMap = new Map<string, string>()
  /** tower -> set of pano corner bases (`unit_u_xxx`) that have media */
  const panoBasesByTower = new Map<string, Set<string>>()
  for (const p of remote.panoramas) {
    if (!p.imageUrl) continue
    if (p.cornerId.startsWith('unit_')) {
      // store both full key and prefix without #vertex for lookups
      const base = p.cornerId.split('#')[0]
      unitPanoMap.set(`${p.towerId}|${base}|${p.heightM}`, p.imageUrl)
      unitPanoMap.set(`${p.towerId}|${p.cornerId}|${p.heightM}`, p.imageUrl)
      let set = panoBasesByTower.get(p.towerId)
      if (!set) {
        set = new Set()
        panoBasesByTower.set(p.towerId, set)
      }
      set.add(base)
    } else if (/^[A-F]$/.test(p.cornerId)) {
      cornerPanoMap.set(`${p.towerId}|${p.cornerId}|${p.heightM}`, p.imageUrl)
    }
  }

  /**
   * When unitTypes were recreated, panoramas may still use old unit_* keys
   * (e.g. Tower C). Alias current unitIds → a pano corner base so B/C load.
   * Prefer direct id match; fall back to unit number index within the tower.
   */
  const unitPanoAlias = new Map<string, string>() // unitId → `unit_…` base
  const towersWithUnits = new Set(
    unitTypes.map((u) => u.towerId).filter((id): id is string => !!id),
  )
  for (const towerId of towersWithUnits) {
    const configured = unitTypes
      .filter((u) => u.towerId === towerId)
      .sort((a, b) => {
        const na = parseInt(a.name.replace(/\D/g, '') || '0', 10)
        const nb = parseInt(b.name.replace(/\D/g, '') || '0', 10)
        return na - nb
      })
    const bases = [...(panoBasesByTower.get(towerId) ?? [])].sort()
    const claimed = new Set<string>()
    for (const u of configured) {
      const direct = `unit_${u.id}`
      if (bases.includes(direct)) {
        unitPanoAlias.set(u.id, direct)
        claimed.add(direct)
      }
      // also accept legacy unit_b1 / unit_c3 style
      const n = parseInt(u.name.replace(/\D/g, '') || '0', 10)
      if (n > 0) {
        const legacy = `unit_${towerId.toLowerCase()}${n}`
        if (bases.includes(legacy) && !unitPanoAlias.has(u.id)) {
          unitPanoAlias.set(u.id, legacy)
          claimed.add(legacy)
        }
      }
    }
    const orphans = bases.filter((b) => !claimed.has(b))
    const unmatched = configured.filter((u) => !unitPanoAlias.has(u.id))
    if (orphans.length > 0 && unmatched.length > 0) {
      const pairCount = Math.min(orphans.length, unmatched.length)
      for (let i = 0; i < pairCount; i++) {
        unitPanoAlias.set(unmatched[i].id, orphans[i])
      }
    }
  }

  const panoKeysForUnit = (tower: TowerId, unitId: string): string[] => {
    const alias = unitPanoAlias.get(unitId)
    const keys: string[] = []
    if (unitId.startsWith('unit_')) {
      keys.push(unitId, unitId.split('#')[0])
    } else {
      keys.push(`unit_${unitId}`, `unit_${unitId.split('#')[0]}`)
    }
    if (alias) keys.push(alias, alias.split('#')[0])
    return [...new Set(keys)]
  }

  const floorToHeight = (floor: number): MergedHeightSample => {
    const estimatedM = (floor / totalFloors) * (heightSamples[heightSamples.length - 1]?.heightM ?? 163)
    return heightSamples.reduce(
      (best, s) =>
        Math.abs(s.heightM - estimatedM) < Math.abs(best.heightM - estimatedM) ? s : best,
      heightSamples[0],
    )
  }

  const resolveUnitPanorama = (
    tower: TowerId,
    unitId: string | null,
    heightM: number,
  ): string | null => {
    const nearest = heightSamples.reduce(
      (best, s) =>
        Math.abs(s.heightM - heightM) < Math.abs(best.heightM - heightM) ? s : best,
      heightSamples[0],
    )
    if (unitId) {
      const keys = panoKeysForUnit(tower, unitId)
      for (const key of keys) {
        const direct = unitPanoMap.get(`${tower}|${key}|${nearest.heightM}`)
        if (direct) return direct
      }
      for (const s of heightSamples) {
        for (const key of keys) {
          const hit = unitPanoMap.get(`${tower}|${key}|${s.heightM}`)
          if (hit) return hit
        }
      }
      // scan any pano whose id starts with this unit key
      for (const s of heightSamples) {
        for (const key of keys) {
          for (const [k, url] of unitPanoMap) {
            if (k.startsWith(`${tower}|${key}`) && k.endsWith(`|${s.heightM}`)) return url
          }
        }
      }
    }
    const convexFallback = cornerPanoMap.get(`${tower}|A|${nearest.heightM}`)
    if (convexFallback) return convexFallback
    for (const s of heightSamples) {
      const hit = cornerPanoMap.get(`${tower}|A|${s.heightM}`)
      if (hit) return hit
    }
    return staticResolvePanorama(tower, 'A' as CornerId, nearest.heightM)
  }

  const hasUnitPanorama = (tower: TowerId, unitId: string): boolean => {
    const keys = panoKeysForUnit(tower, unitId)
    for (const s of heightSamples) {
      for (const key of keys) {
        if (unitPanoMap.has(`${tower}|${key}|${s.heightM}`)) return true
        for (const k of unitPanoMap.keys()) {
          if (k.startsWith(`${tower}|${key}`) && k.endsWith(`|${s.heightM}`)) return true
        }
      }
    }
    return false
  }

  return {
    projectName: remote.projectName,
    projectTagline:
      remote.projectTagline || `${towers.length} towers · ${totalFloors} floors`,
    totalFloors,
    heroUrl: remote.heroUrl,
    sitePlanUrl: remote.sitePlanUrl,
    towers,
    heightSamples,
    unitTypes,
    floorToHeight,
    resolveUnitPanorama,
    hasUnitPanorama,
  }
}

/* ── Skeleton ── */

function LoadingSkeleton() {
  return (
    <div>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '21/9', background: '#0E0C0A' }}
      >
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              'radial-gradient(ellipse at 50% 70%, rgba(212,160,23,0.08) 0%, transparent 60%)',
          }}
        />
      </div>
      <div className="mx-auto max-w-6xl space-y-px px-6 py-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-8 py-8 animate-pulse"
            style={{ borderTop: '1px solid rgba(212,160,23,0.08)' }}
          >
            <div
              className="h-20 w-20 shrink-0 rounded-full"
              style={{ background: 'rgba(212,160,23,0.06)' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-5 w-40 rounded"
                style={{ background: 'rgba(245,243,239,0.05)' }}
              />
              <div
                className="h-3 w-64 rounded"
                style={{ background: 'rgba(245,243,239,0.03)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stage ribbon (prod pill chips) ── */

function StageRibbon({
  stage,
  sel,
  unit,
  onJump,
}: {
  stage: Stage
  sel: Selection
  unit: MergedUnit | null
  onJump: (s: Stage) => void
}) {
  const order: Stage[] = ['tower', 'floor', 'view']
  const currentIdx = order.indexOf(stage === 'tower' || stage === 'floor' || stage === 'view' ? stage : 'tower')
  const steps: Array<{ key: Stage; label: string }> = [
    { key: 'tower', label: sel.tower ? `Tower ${sel.tower}` : 'Tower' },
    { key: 'floor', label: currentIdx >= 1 ? `Floor ${sel.floor}` : 'Floor' },
    { key: 'view', label: unit ? unit.name : 'View' },
  ]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {steps.map((s, i) => {
        const isActive = s.key === stage
        const isPast = i < currentIdx
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <button
              onClick={() => onJump(s.key)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] transition-all cursor-pointer"
              style={{
                fontFamily: 'var(--font-jakarta)',
                background: isActive
                  ? GOLD
                  : isPast
                    ? 'rgba(212,160,23,0.12)'
                    : 'transparent',
                color: isActive ? '#0A0908' : isPast ? GOLD : '#5A5248',
                border: isPast
                  ? '1px solid rgba(212,160,23,0.3)'
                  : '1px solid transparent',
              }}
            >
              {isPast && <Check size={10} strokeWidth={3} />}
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <ChevronRight
                size={12}
                strokeWidth={2}
                style={{ color: i < currentIdx ? GOLD : '#3A352F' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Tower Stage (Vercel-matching) ── */

function TowerStage({
  cfg,
  onPick,
}: {
  cfg: MergedConfig
  onPick: (t: TowerId) => void
}) {
  const [hovered, setHovered] = useState<TowerId | null>(null)
  const viewsCount = Math.max(cfg.heightSamples.length, 1)

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={cfg.heroUrl ?? '/legacy-towers/plans/tower-hero.jpg'}
        alt={cfg.projectName}
        fill
        className="object-cover object-center"
        sizes="100vw"
        priority
      />
      {/* subtle vignette like prod */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,9,8,0.35) 0%, transparent 28%, transparent 55%, rgba(10,9,8,0.88) 100%)',
        }}
      />

      {/* Clickable tower hit-areas (desktop) */}
      {cfg.towers.map((tower) => {
        if (
          tower.heroLeftPct === undefined ||
          tower.heroTopPct === undefined ||
          tower.heroRightPct === undefined ||
          tower.heroBottomPct === undefined
        ) {
          return null
        }
        const isHov = hovered === tower.id
        const left = tower.heroLeftPct
        const top = tower.heroTopPct
        const width = Math.max(tower.heroRightPct - left, 4)
        const height = Math.max(tower.heroBottomPct - top, 8)
        return (
          <button
            key={tower.id}
            type="button"
            onClick={() => onPick(tower.id)}
            onMouseEnter={() => setHovered(tower.id)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`Select ${tower.name}`}
            className="hidden sm:block absolute cursor-pointer transition-all duration-200"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              background: isHov ? 'rgba(212,160,23,0.12)' : 'transparent',
              border: isHov
                ? `1px solid ${GOLD}`
                : '1px solid transparent',
              borderRadius: 8,
              boxShadow: isHov ? `0 0 40px rgba(212,160,23,0.18)` : undefined,
            }}
          />
        )
      })}

      {/* Tower cards — overlaid on hero bottom (prod layout) */}
      <div className="absolute bottom-6 left-6 right-6 z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cfg.towers.map((tower) => {
            const isHov = hovered === tower.id
            return (
              <button
                key={tower.id}
                type="button"
                onClick={() => onPick(tower.id)}
                onMouseEnter={() => setHovered(tower.id)}
                onMouseLeave={() => setHovered(null)}
                className="group flex cursor-pointer items-center gap-4 rounded-xl p-5 text-left transition-all duration-200"
                style={{
                  background: isHov ? '#1B1916' : '#12100E',
                  border: isHov
                    ? `1px solid rgba(212,160,23,0.45)`
                    : '1px solid rgba(245,243,239,0.07)',
                  boxShadow: isHov
                    ? '0 12px 32px rgba(0,0,0,0.45)'
                    : '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-2xl font-black"
                  style={{
                    color: GOLD,
                    fontFamily: 'var(--font-jakarta)',
                    background: 'rgba(212,160,23,0.08)',
                    border: '1.5px solid rgba(212,160,23,0.5)',
                  }}
                >
                  {tower.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-lg font-bold tracking-tight"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
                  >
                    {tower.name}
                  </p>
                  <p className="text-[13px]" style={{ color: '#6B6560' }}>
                    {tower.tagline || `G+${cfg.totalFloors} Floors`}
                  </p>
                  <div
                    className="mt-2 flex items-center gap-4 text-[11px] uppercase tracking-[0.1em]"
                    style={{ color: '#6B6560' }}
                  >
                    <span className="flex items-center gap-1">
                      <Layers size={11} strokeWidth={1.5} />
                      {cfg.totalFloors} floors
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={11} strokeWidth={1.5} />
                      {viewsCount} views
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  strokeWidth={2}
                  className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  style={{ color: isHov ? GOLD : '#6B6560' }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Floor Stage (prod layout) ── */

function FloorStage({
  cfg,
  tower,
  floor,
  onChange,
  onPickUnit,
}: {
  cfg: MergedConfig
  tower: MergedTower
  floor: number
  onChange: (floor: number) => void
  onPickUnit: (unitId: string) => void
}) {
  const h = cfg.floorToHeight(floor)
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null)

  const towerUnits = useMemo(
    () =>
      cfg.unitTypes.filter(
        (u) => u.towerId === tower.id && u.points.length >= 3,
      ),
    [cfg.unitTypes, tower.id],
  )

  const toSvgPoints = (pts: Array<{ leftPct: number; topPct: number }>) =>
    pts.map((p) => `${p.leftPct},${p.topPct}`).join(' ')

  const floorLineTopPct =
    12 + (1 - (floor - 1) / Math.max(cfg.totalFloors - 1, 1)) * 70

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-4 pt-4 lg:overflow-hidden lg:px-10 lg:pb-5 lg:pt-5">
      <div className="mx-auto flex w-full max-w-7xl flex-col lg:min-h-0 lg:flex-1">
        <div className="mb-3 shrink-0 lg:mb-4">
          <div className="flex items-center gap-3">
            <span
              className="rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: 'rgba(212,160,23,0.1)',
                color: GOLD,
                border: '1px solid rgba(212,160,23,0.22)',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              Tower {tower.id}
            </span>
            {towerUnits.length > 0 && (
              <span className="text-[12px]" style={{ color: '#4A4540' }}>
                {towerUnits.length} units
              </span>
            )}
          </div>
          <h2
            className="mt-2 text-[20px] font-bold tracking-tight lg:text-[28px]"
            style={{
              color: '#F5F3EF',
              fontFamily: 'var(--font-jakarta)',
              lineHeight: 1.1,
            }}
          >
            Pick your floor & unit
          </h2>
          <p className="mt-1 text-[11px] lg:text-[12px]" style={{ color: '#5A5248' }}>
            Select a floor section, then tap your unit on the plan.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-8">
          {/* LEFT: tower elevation + floor sections */}
          <div className="hidden lg:flex w-[280px] shrink-0 flex-col gap-4">
            <div
              className="relative min-h-0 flex-1 overflow-hidden rounded-xl"
              style={{ background: '#0C0A09', minHeight: 280 }}
            >
              <Image
                src={
                  tower.heroUrl ??
                  cfg.heroUrl ??
                  '/legacy-towers/plans/tower-hero.jpg'
                }
                alt={tower.name}
                fill
                className="object-cover object-top"
                sizes="280px"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,9,8,0.18) 0%, transparent 28%, transparent 52%, rgba(10,9,8,0.9) 100%)',
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-0"
                style={{ top: `${floorLineTopPct}%` }}
              >
                <div className="flex items-center">
                  <div
                    className="h-px flex-1"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD})`,
                      boxShadow: '0 0 6px rgba(212,160,23,0.6)',
                    }}
                  />
                  <span
                    className="ml-1.5 mr-3 whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: GOLD,
                      color: '#0A0908',
                      fontFamily: 'var(--font-jakarta)',
                    }}
                  >
                    {h.label}
                  </span>
                </div>
              </div>
              <div className="absolute bottom-3 left-4 right-4">
                <p
                  className="text-[14px] font-bold leading-tight"
                  style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
                >
                  {tower.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight" style={{ color: '#7A7470' }}>
                  {tower.tagline || `G+${cfg.totalFloors} Floors`}
                </p>
              </div>
            </div>

            <div
              className="shrink-0 rounded-xl p-4"
              style={{
                background: '#0F0D0B',
                border: '1px solid rgba(245,243,239,0.07)',
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: '#4A4540', fontFamily: 'var(--font-jakarta)' }}
                >
                  Floor section
                </span>
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
                >
                  {h.label} · {h.heightM}m
                </span>
              </div>
              <div className="flex gap-1.5">
                {cfg.heightSamples.map((s) => {
                  const active = s.heightM === h.heightM
                  return (
                    <button
                      key={s.heightM}
                      onClick={() => onChange(s.floor)}
                      className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-150"
                      style={{
                        borderRadius: 6,
                        background: active ? GOLD : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? GOLD : 'rgba(245,243,239,0.09)'}`,
                      }}
                    >
                      <span
                        className="text-[13px] font-bold leading-none tabular-nums"
                        style={{
                          color: active ? '#0A0908' : '#C0B9B2',
                          fontFamily: 'var(--font-jakarta)',
                        }}
                      >
                        {s.floor}
                      </span>
                      <span
                        className="mt-0.5 text-[9px] leading-none"
                        style={{ color: active ? 'rgba(10,9,8,0.6)' : '#3E3A36' }}
                      >
                        {s.heightM}m
                      </span>
                    </button>
                  )
                })}
              </div>
              <div
                className="mt-3 pt-3"
                style={{ borderTop: '1px solid rgba(245,243,239,0.05)' }}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: '#3E3A36' }}
                  >
                    Fine-tune
                  </span>
                  <span
                    className="text-[12px] font-bold tabular-nums"
                    style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
                  >
                    Floor {floor}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={cfg.totalFloors}
                  value={floor}
                  onChange={(e) => onChange(Number(e.target.value))}
                  className="w-full accent-[#D4A017]"
                  aria-label="Fine-tune floor"
                />
                <div
                  className="mt-0.5 flex justify-between text-[10px] tabular-nums"
                  style={{ color: '#2E2A26' }}
                >
                  <span>1</span>
                  <span>{cfg.totalFloors}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile floor chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {cfg.heightSamples.map((s) => {
              const active = s.heightM === h.heightM
              return (
                <button
                  key={s.heightM}
                  onClick={() => onChange(s.floor)}
                  className="flex shrink-0 cursor-pointer flex-col items-center px-3 py-2"
                  style={{
                    borderRadius: 6,
                    background: active ? GOLD : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? GOLD : 'rgba(245,243,239,0.09)'}`,
                  }}
                >
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: active ? '#0A0908' : '#C0B9B2' }}
                  >
                    {s.floor}
                  </span>
                </button>
              )
            })}
          </div>

          {/* RIGHT: floor plan with unit hit-areas (prod layout) */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
              >
                Floor plan — {tower.name}
              </span>
              <span className="text-[11px]" style={{ color: '#5A5248' }}>
                Tap unit to explore
              </span>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <div
                className="relative mx-auto w-full max-w-full overflow-hidden rounded-xl lg:h-full lg:w-auto"
                style={{
                  // Match each plan’s native ratio (B is landscape, A/C portrait)
                  aspectRatio: `${FLOOR_PLAN_ASPECT[tower.id] ?? 1130 / 1600}`,
                  maxWidth: tower.id === 'B' ? 860 : 560,
                  maxHeight: '100%',
                  background: '#0C0A09',
                }}
              >
                <Image
                  src={tower.floorPlanUrl || `/legacy-towers/plans/tower-${tower.id.toLowerCase()}-floor.jpg`}
                  alt={`${tower.name} floor plan`}
                  fill
                  className="object-cover"
                  sizes={tower.id === 'B' ? '860px' : '560px'}
                  priority
                />
                {towerUnits.length > 0 && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    style={{ pointerEvents: 'none' }}
                  >
                    {towerUnits.map((unit) => {
                      const hasPano = cfg.hasUnitPanorama(tower.id, unit.id)
                      const isHov = hoveredUnit === unit.id
                      return (
                        <g key={unit.id} style={{ pointerEvents: 'all' }}>
                          <polygon
                            points={toSvgPoints(unit.points)}
                            fill={
                              isHov
                                ? 'rgba(45,212,191,0.22)'
                                : hasPano
                                  ? 'rgba(212,160,23,0.06)'
                                  : 'rgba(0,0,0,0)'
                            }
                            stroke={
                              isHov
                                ? TEAL
                                : hasPano
                                  ? 'rgba(212,160,23,0.85)'
                                  : 'rgba(107,101,96,0.45)'
                            }
                            strokeWidth={isHov ? 0.55 : 0.4}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredUnit(unit.id)}
                            onMouseLeave={() => setHoveredUnit(null)}
                            onClick={() => onPickUnit(unit.id)}
                          >
                            <title>{`${unit.name} · ${unit.bhk} BHK`}</title>
                          </polygon>
                        </g>
                      )
                    })}
                  </svg>
                )}
                {/* Accessible unit buttons for a11y */}
                <div className="sr-only">
                  {towerUnits.map((u) => (
                    <button key={u.id} onClick={() => onPickUnit(u.id)}>
                      {u.name} {u.bhk} BHK
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── View Stage ── */

function ViewStage({
  imageUrl,
  heightSample,
  heightSamples,
  unit,
  onChangeFloorDirect,
}: {
  imageUrl: string
  tower: MergedTower
  floor: number
  heightSample: MergedHeightSample
  heightSamples: MergedHeightSample[]
  unit: MergedUnit | null
  onChangeUnit: () => void
  onChangeFloor: () => void
  onChangeTower: () => void
  onChangeFloorDirect: (floor: number) => void
  totalFloors: number
  towerImg: string | null
}) {
  const balconyYaw =
    unit?.balconyYawRads?.find((e) => e.heightM === heightSample.heightM)
      ?.yawRad ?? unit?.balconyYawRad
  const hasBalconyView = balconyYaw !== undefined && balconyYaw !== null

  const viewerHotspots = useMemo(() => {
    const hots = (unit?.balconyHotspots ?? []).filter(
      (h) => h.heightM === heightSample.heightM,
    )
    const labels = (unit?.balconyStickyLabels ?? []).filter(
      (l) => l.heightM === heightSample.heightM && typeof l.x === 'number',
    )
    return [
      ...hots.map((h) => ({
        _id: h.id,
        sceneId: '',
        type: 'info' as const,
        position: { x: h.x, y: h.y, z: h.z },
        title: h.title,
        description: h.description,
        lineHeight: h.lineHeight,
      })),
      ...labels.map((l) => ({
        _id: l.id,
        sceneId: '',
        type: 'info' as const,
        markerStyle: 'sticky' as const,
        readOnly: true,
        position: { x: l.x as number, y: l.y as number, z: l.z as number },
        title: l.text,
        size: l.size,
      })),
    ]
  }, [unit, heightSample.heightM])

  // Banner (positionless) sticky labels — rare legacy
  const bannerLabels = useMemo(
    () =>
      (unit?.balconyStickyLabels ?? []).filter(
        (l) => l.heightM === heightSample.heightM && typeof l.x !== 'number',
      ),
    [unit, heightSample.heightM],
  )

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: '#000' }}>
      <PanoramaViewer
        imageUrl={imageUrl}
        height="100%"
        hotspots={viewerHotspots}
        initialYaw={hasBalconyView ? balconyYaw : undefined}
        azimuthHalfArc={hasBalconyView ? Math.PI / 3 : Math.PI / 2}
        polarClampMin={hasBalconyView ? Math.PI / 2 : Math.PI / 3}
        polarClampMax={
          hasBalconyView ? Math.PI / 2 : (Math.PI * 2) / 3
        }
      />

      {/* Floor rail — left (matches Vercel) */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center pl-3 sm:pl-5"
      >
        <div className="pointer-events-auto flex flex-col gap-2">
          {[...heightSamples].reverse().map((s) => {
            const active = s.heightM === heightSample.heightM
            return (
              <button
                key={s.heightM}
                onClick={() => onChangeFloorDirect(s.floor)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-left transition-all cursor-pointer"
                style={{
                  background: active
                    ? 'rgba(10,9,8,0.82)'
                    : 'rgba(10,9,8,0.55)',
                  border: active
                    ? `1px solid ${GOLD}`
                    : '1px solid rgba(245,243,239,0.12)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: active
                    ? `0 0 0 1px rgba(212,160,23,0.25), 0 8px 24px rgba(0,0,0,0.45)`
                    : '0 4px 14px rgba(0,0,0,0.35)',
                }}
              >
                <span
                  className="h-0.5 w-2 shrink-0 rounded-full"
                  style={{
                    background: active ? GOLD : 'transparent',
                    boxShadow: active ? `0 0 8px ${GOLD}` : undefined,
                  }}
                />
                <span
                  className="whitespace-nowrap text-[11px] font-bold tracking-[0.12em]"
                  style={{
                    color: active ? GOLD : '#A8A29E',
                    fontFamily: 'var(--font-jakarta)',
                  }}
                >
                  ~FLOOR {s.floor}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Banner sticky labels (legacy) */}
      {bannerLabels.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4">
          {bannerLabels.map((l) => (
            <span
              key={l.id}
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{
                background: 'rgba(10,9,8,0.72)',
                border: `1px solid rgba(212,160,23,0.45)`,
                color: GOLD,
                backdropFilter: 'blur(12px)',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              {l.text}
            </span>
          ))}
        </div>
      )}

      {!hasBalconyView && (
        <div
          className="absolute right-4 top-4 z-20 flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] pointer-events-none"
          style={{
            background: 'rgba(10,9,8,0.7)',
            backdropFilter: 'blur(12px)',
            color: '#A8A29E',
            borderLeft: `2px solid ${TEAL}`,
          }}
        >
          <Eye size={10} strokeWidth={1.5} />
          Free look · uncalibrated
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          color: 'rgba(245,243,239,0.72)',
          background: 'rgba(10,9,8,0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: 999,
        }}
      >
        {hasBalconyView ? 'Balcony view · drag to pan' : 'Drag to look around'}
      </div>
    </div>
  )
}

/* ── Page ── */

function resolveSlug(id: string) {
  return id === 'legacy-towers' ? 'asbl-legacy-towers' : id
}

function buildHref(
  pathname: string,
  stage: Stage,
  tower: TowerId | null | undefined,
  floor: number,
  unitId: string | null,
) {
  const p = new URLSearchParams()
  if (stage !== 'tower') p.set('s', stage)
  if (tower) p.set('t', tower)
  if (floor !== 20) p.set('f', String(floor))
  if (unitId) p.set('u', unitId)
  const q = p.toString()
  return q ? `${pathname}?${q}` : pathname
}

function ShowcaseInner({ slug }: { slug: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const convexCfg = useQuery(api.legacyTowersConfig.getBySlug, { slug })
  const cfg = useMemo(
    () => mergeConfig(convexCfg as ConvexCfg | null | undefined),
    [convexCfg],
  )

  const rawStage = searchParams.get('s') || 'tower'
  const stage: Stage =
    rawStage === 'floor' || rawStage === 'view' || rawStage === 'tower'
      ? rawStage
      : rawStage === '3d'
        ? 'tower'
        : 'tower'
  const towerParam = searchParams.get('t') as TowerId | null
  const floor = Math.max(1, parseInt(searchParams.get('f') || '20', 10) || 20)
  const unitId = searchParams.get('u') || null

  const sel: Selection = {
    tower: towerParam && ['A', 'B', 'C'].includes(towerParam) ? towerParam : null,
    floor,
    unitId,
  }

  const go = (
    nextStage: Stage,
    nextTower: TowerId | null = sel.tower,
    nextFloor: number = sel.floor,
    nextUnit: string | null = sel.unitId,
  ) => {
    router.push(buildHref(pathname, nextStage, nextTower, nextFloor, nextUnit))
  }

  const tower = useMemo(
    () => cfg.towers.find((t) => t.id === sel.tower) ?? null,
    [cfg.towers, sel.tower],
  )
  const heightSample = useMemo(
    () => cfg.floorToHeight(sel.floor),
    [cfg, sel.floor],
  )
  const panoramaUrl = useMemo(() => {
    if (!sel.tower) return null
    return cfg.resolveUnitPanorama(sel.tower, sel.unitId, heightSample.heightM)
  }, [cfg, sel.tower, sel.unitId, heightSample.heightM])
  const selectedUnit = useMemo(
    () => cfg.unitTypes.find((u) => u.id === sel.unitId) ?? null,
    [cfg.unitTypes, sel.unitId],
  )

  const [copied, setCopied] = useState(false)

  if (convexCfg === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div
          className="h-[78vh] min-h-[420px] w-full animate-pulse rounded-2xl"
          style={{ background: '#12100E' }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: '#0A0908' }}
    >
      <header
        className="relative z-50 shrink-0"
        style={{
          background: 'rgba(10,9,8,0.82)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(245,243,239,0.06)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:gap-4 lg:px-10 lg:py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/buildings"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
              style={{
                background: 'rgba(212,160,23,0.1)',
                border: '1px solid rgba(212,160,23,0.2)',
                color: GOLD,
              }}
              aria-label="Back to buildings"
              title="Back to buildings"
            >
              <ArrowLeft size={16} strokeWidth={2.25} />
            </Link>
            <Image
              src="/legacy-towers/brand/legacy-logo-white.png"
              alt={cfg.projectName}
              width={140}
              height={36}
              className="h-7 w-auto object-contain sm:h-9"
              style={{ width: 'auto' }}
              priority
            />
            <div
              className="hidden h-4 w-px sm:block"
              style={{ background: 'rgba(245,243,239,0.15)' }}
            />
            <div className="hidden min-w-0 sm:block">
              <p
                className="truncate text-[13px] font-bold leading-none tracking-tight"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-jakarta)' }}
              >
                {cfg.projectName}
              </p>
              <p
                className="mt-0.5 truncate text-[11px] leading-none"
                style={{ color: '#A8A29E' }}
              >
                {cfg.projectTagline}
              </p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <StageRibbon
              stage={stage}
              sel={sel}
              unit={selectedUnit}
              onJump={(s) => go(s)}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              aria-label="Copy share link"
              title={copied ? 'Copied' : 'Share'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all"
              style={{
                background: 'rgba(45,212,191,0.1)',
                border: '1px solid rgba(45,212,191,0.3)',
                color: TEAL,
              }}
            >
              {copied ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Share2 size={14} strokeWidth={2.5} />
              )}
            </button>
            <Link
              href="/buildings/legacy-towers/admin"
              aria-label="Edit building"
              title="Edit"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all"
              style={{
                background: 'rgba(245,243,239,0.06)',
                border: '1px solid rgba(245,243,239,0.15)',
                color: '#F5F3EF',
              }}
            >
              <Pencil size={14} strokeWidth={2.5} />
            </Link>
            <a
              href="tel:+919999999999"
              className="hidden shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all sm:flex"
              style={{
                background: GOLD,
                color: '#0A0908',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              <Phone size={13} strokeWidth={2.5} />
              Inquire
            </a>
          </div>
        </div>
      </header>

      <div
        className="flex shrink-0 justify-center border-b px-3 py-2 md:hidden"
        style={{ borderColor: 'rgba(245,243,239,0.06)' }}
      >
        <StageRibbon stage={stage} sel={sel} unit={selectedUnit} onJump={(s) => go(s)} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {stage === 'tower' && (
          <TowerStage
            cfg={cfg}
            onPick={(t) => go('floor', t, sel.floor, null)}
          />
        )}
        {stage === 'floor' && tower && (
          <FloorStage
            cfg={cfg}
            tower={tower}
            floor={sel.floor}
            onChange={(f) => go('floor', sel.tower, f, sel.unitId)}
            onPickUnit={(uid) => go('view', sel.tower, sel.floor, uid)}
          />
        )}
        {stage === 'floor' && !tower && (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="text-sm" style={{ color: '#A8A29E' }}>
              Please select a tower first.
            </p>
          </div>
        )}
        {stage === 'view' && tower && panoramaUrl && (
          <ViewStage
            imageUrl={panoramaUrl}
            tower={tower}
            floor={sel.floor}
            heightSample={heightSample}
            heightSamples={cfg.heightSamples}
            unit={selectedUnit}
            onChangeUnit={() => go('floor', sel.tower, sel.floor, null)}
            onChangeFloor={() => go('floor', sel.tower, sel.floor, null)}
            onChangeTower={() => go('tower', null, sel.floor, null)}
            onChangeFloorDirect={(f) => go('view', sel.tower, f, sel.unitId)}
            totalFloors={cfg.totalFloors}
            towerImg={tower.heroUrl ?? cfg.heroUrl ?? null}
          />
        )}
        {stage === 'view' && tower && !panoramaUrl && (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <p
              className="text-[13px] uppercase tracking-[0.18em]"
              style={{ color: '#3A3530' }}
            >
              No panorama captured for this unit
            </p>
            <button
              onClick={() => go('floor', sel.tower, sel.floor, null)}
              className="mt-5 cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
            >
              ← Choose a different unit
            </button>
          </div>
        )}
        {stage === 'view' && !tower && (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="text-sm" style={{ color: '#A8A29E' }}>
              Please select a tower first.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ShowcaseFromParams({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>
}) {
  const { id } = use(paramsPromise)
  const slug = resolveSlug(id)
  return <ShowcaseInner slug={slug} />
}

export default function BuildingShowcasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div
            className="flex h-[78vh] min-h-[420px] w-full items-center justify-center rounded-2xl"
            style={{ background: '#12100E' }}
          >
            <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
          </div>
        </div>
      }
    >
      <ShowcaseFromParams paramsPromise={params} />
    </Suspense>
  )
}
