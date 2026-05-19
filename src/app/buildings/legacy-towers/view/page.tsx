'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Building2,
  Layers,
  Eye,
  ArrowUpRight,
  Phone,
  ArrowLeft,
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

const SLUG = 'asbl-legacy-towers'
const GOLD = '#D4A017'
const TEAL = '#2DD4BF'

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
        floorPlanUrl:
          ('floorPlanUrl' in t && t.floorPlanUrl) ||
          staticMatch?.floorPlanUrl ||
          '/legacy-towers/plans/tower-a-floor.jpg',
        heroUrl: ('heroUrl' in t ? t.heroUrl : null) ?? null,
        heroLeftPct:
          'heroLeftPct' in t && typeof t.heroLeftPct === 'number'
            ? t.heroLeftPct
            : [26, 50, 74][i] ?? 50,
        heroTopPct:
          'heroTopPct' in t && typeof t.heroTopPct === 'number'
            ? t.heroTopPct
            : [34, 30, 34][i] ?? 34,
        heroRightPct:
          'heroRightPct' in t && typeof t.heroRightPct === 'number'
            ? t.heroRightPct
            : undefined,
        heroBottomPct:
          'heroBottomPct' in t && typeof t.heroBottomPct === 'number'
            ? t.heroBottomPct
            : undefined,
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
      }
    })
    .filter((u) => u.points.length >= 3)

  const unitPanoMap = new Map<string, string>()
  const cornerPanoMap = new Map<string, string>()
  for (const p of remote.panoramas) {
    if (!p.imageUrl) continue
    if (p.cornerId.startsWith('unit_')) {
      unitPanoMap.set(`${p.towerId}|${p.cornerId}|${p.heightM}`, p.imageUrl)
    } else if (/^[A-F]$/.test(p.cornerId)) {
      cornerPanoMap.set(`${p.towerId}|${p.cornerId}|${p.heightM}`, p.imageUrl)
    }
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
      const key = `unit_${unitId}`
      const direct = unitPanoMap.get(`${tower}|${key}|${nearest.heightM}`)
      if (direct) return direct
      for (const s of heightSamples) {
        const hit = unitPanoMap.get(`${tower}|${key}|${s.heightM}`)
        if (hit) return hit
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
    const key = `unit_${unitId}`
    for (const s of heightSamples) {
      if (unitPanoMap.has(`${tower}|${key}|${s.heightM}`)) return true
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

/* ── Stage ribbon (replaces old StepPills) ── */

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
  const currentIdx = order.indexOf(stage)
  const steps: Array<{ key: Stage; label: string; sub: string }> = [
    {
      key: 'tower',
      label: 'Tower',
      sub: sel.tower ? `Tower ${sel.tower}` : 'Select',
    },
    {
      key: 'floor',
      label: 'Floor',
      sub: stage === 'tower' ? '—' : `Level ${sel.floor}`,
    },
    {
      key: 'view',
      label: 'View',
      sub: unit ? unit.name : stage === 'view' ? '360°' : '—',
    },
  ]

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const isActive = s.key === stage
        const isPast = i < currentIdx
        const num = String(i + 1).padStart(2, '0')
        return (
          <div key={s.key} className="flex items-center gap-3">
            <button
              onClick={() => isPast && onJump(s.key)}
              disabled={!isPast}
              className="group flex items-center gap-2 transition-opacity"
              style={{
                cursor: isPast ? 'pointer' : 'default',
                opacity: isActive || isPast ? 1 : 0.45,
              }}
            >
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{
                  color: isActive ? GOLD : isPast ? '#A8A29E' : '#5A5248',
                }}
              >
                {num}
              </span>
              <span className="hidden sm:flex flex-col items-start leading-none">
                <span
                  className="text-[10px] uppercase tracking-[0.14em]"
                  style={{
                    color: isActive ? GOLD : isPast ? '#A8A29E' : '#5A5248',
                  }}
                >
                  {s.label}
                </span>
                <span
                  className="mt-1 text-[11px]"
                  style={{ color: isActive ? '#F5F3EF' : '#6B6560' }}
                >
                  {s.sub}
                </span>
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                className="h-px w-6"
                style={{
                  background:
                    i < currentIdx
                      ? 'rgba(212,160,23,0.4)'
                      : 'rgba(212,160,23,0.1)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Tower Stage ── */

function TowerStage({
  cfg,
  onPick,
}: {
  cfg: MergedConfig
  onPick: (t: TowerId) => void
}) {
  const [hovered, setHovered] = useState<TowerId | null>(null)

  return (
    <div className="w-full">
      {/* Cinematic hero — 4:3 on mobile, 21:9 on desktop */}
      <div className="relative w-full overflow-hidden">
        <div className="relative w-full [aspect-ratio:4/3] md:[aspect-ratio:21/9]">
          <Image
            src={cfg.heroUrl ?? '/legacy-towers/plans/tower-hero.jpg'}
            alt={cfg.projectName}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          {/* Cinematic vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.05) 30%, rgba(10,9,8,0.15) 60%, rgba(10,9,8,0.92) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, transparent 0%, rgba(10,9,8,0.5) 100%)',
            }}
          />

          {/* Editorial overline + display title — top left */}
          <div className="absolute left-5 top-5 sm:left-8 sm:top-8 lg:left-10 lg:top-10 max-w-2xl">
            <p
              className="text-[9px] sm:text-[10px] uppercase tracking-[0.32em]"
              style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
            >
              ASBL · Hyderabad
            </p>
            <h1
              className="mt-2 sm:mt-3 font-black leading-[0.9] tracking-[-0.04em]"
              style={{
                color: '#F5F3EF',
                fontFamily: 'var(--font-jakarta)',
                fontSize: 'clamp(28px, 5.6vw, 72px)',
              }}
            >
              Legacy
              <br />
              <span style={{ color: GOLD }}>Towers</span>
            </h1>
          </div>

          {/* Tower hotspots */}
          {cfg.towers
            .filter(
              (t) =>
                t.heroLeftPct !== undefined &&
                t.heroTopPct !== undefined &&
                t.heroRightPct !== undefined &&
                t.heroBottomPct !== undefined,
            )
            .map((t) => {
              const isHov = hovered === t.id
              const l = t.heroLeftPct!
              const top = t.heroTopPct!
              const w = t.heroRightPct! - l
              const h = t.heroBottomPct! - top
              return (
                <button
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  aria-label={`Select ${t.name}`}
                  className="absolute cursor-pointer transition-all duration-300"
                  style={{
                    left: `${l}%`,
                    top: `${top}%`,
                    width: `${w}%`,
                    height: `${h}%`,
                    background: isHov
                      ? 'linear-gradient(180deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.06) 100%)'
                      : 'transparent',
                    boxShadow: isHov
                      ? 'inset 0 0 0 1px rgba(212,160,23,0.6), 0 0 60px rgba(212,160,23,0.18)'
                      : 'inset 0 0 0 1px rgba(245,243,239,0.12)',
                  }}
                >
                  {/* Tag — connects via vertical guide line */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none"
                    style={{ top: -8 }}
                  >
                    <div
                      className="px-3 py-1.5 transition-all duration-300"
                      style={{
                        background: isHov ? GOLD : 'rgba(10,9,8,0.85)',
                        color: isHov ? '#0A0908' : '#F5F3EF',
                        fontFamily: 'var(--font-jakarta)',
                        fontWeight: 800,
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      Tower {t.id}
                    </div>
                  </div>
                </button>
              )
            })}

          {/* Bottom caption strip */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 lg:px-10 lg:pb-10">
            <div className="flex items-end justify-between gap-6">
              <p
                className="hidden sm:block max-w-md text-sm leading-relaxed"
                style={{ color: '#A8A29E' }}
              >
                Tap a tower above, walk any floor, look out from any window.
              </p>
              <div
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em]"
                style={{ color: '#A8A29E' }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: GOLD }} />
                {cfg.towers.length} Towers
                <span className="mx-2 h-px w-4" style={{ background: 'rgba(212,160,23,0.3)' }} />
                {cfg.totalFloors} Floors
                <span className="mx-2 h-px w-4" style={{ background: 'rgba(212,160,23,0.3)' }} />
                360°
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial tower list — replaces identical 3-card grid */}
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div
          className="flex items-baseline justify-between py-6"
          style={{ borderBottom: '1px solid rgba(212,160,23,0.18)' }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.24em]"
            style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
          >
            The Towers
          </p>
          <p
            className="font-mono text-[10px] tabular-nums"
            style={{ color: '#6B6560' }}
          >
            01 / {String(cfg.towers.length).padStart(2, '0')}
          </p>
        </div>

        <ol>
          {cfg.towers.map((t, i) => {
            const isHov = hovered === t.id
            return (
              <li key={t.id}>
                <button
                  onClick={() => onPick(t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="group flex w-full items-center gap-6 py-7 text-left transition-all duration-300 lg:gap-10 lg:py-10 cursor-pointer"
                  style={{
                    borderBottom: '1px solid rgba(212,160,23,0.1)',
                    transform: isHov ? 'translateX(8px)' : 'translateX(0)',
                  }}
                >
                  {/* Index */}
                  <span
                    className="hidden font-mono text-xs tabular-nums sm:block"
                    style={{ color: isHov ? GOLD : '#5A5248' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Huge typographic mark */}
                  <span
                    className="shrink-0 font-black leading-none transition-all duration-300"
                    style={{
                      color: isHov ? GOLD : 'rgba(212,160,23,0.28)',
                      fontFamily: 'var(--font-jakarta)',
                      fontSize: 'clamp(64px, 9vw, 128px)',
                      letterSpacing: '-0.06em',
                      WebkitTextStroke: isHov ? '0px' : '1.5px rgba(212,160,23,0.55)',
                    }}
                  >
                    {t.id}
                  </span>

                  {/* Name + tagline + meta */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-xl font-bold tracking-tight lg:text-2xl"
                      style={{
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                    >
                      {t.name}
                    </h3>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: '#A8A29E' }}
                    >
                      {t.tagline}
                    </p>
                    <div
                      className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: '#6B6560' }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers size={11} strokeWidth={1.5} />
                        {cfg.totalFloors} floors
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Building2 size={11} strokeWidth={1.5} />
                        {cfg.heightSamples.length} elevations
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Eye size={11} strokeWidth={1.5} style={{ color: TEAL }} />
                        360° ready
                      </span>
                    </div>
                  </div>

                  {/* CTA arrow */}
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300"
                    style={{
                      background: isHov ? GOLD : 'transparent',
                      border: `1px solid ${isHov ? GOLD : 'rgba(212,160,23,0.25)'}`,
                      color: isHov ? '#0A0908' : '#A8A29E',
                    }}
                  >
                    <ArrowUpRight
                      size={18}
                      strokeWidth={1.75}
                      style={{
                        transform: isHov ? 'translate(2px, -2px)' : 'none',
                        transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="py-16 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.24em]"
            style={{ color: '#5A5248' }}
          >
            Step inside any space
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Floor Stage ── */

function FloorStage({
  cfg,
  tower,
  floor,
  onChange,
  onPickUnit,
  onBack,
}: {
  cfg: MergedConfig
  tower: MergedTower
  floor: number
  onChange: (floor: number) => void
  onPickUnit: (unitId: string) => void
  onBack: () => void
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

  const centroid = (pts: Array<{ leftPct: number; topPct: number }>) => ({
    x: pts.reduce((s, p) => s + p.leftPct, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.topPct, 0) / pts.length,
  })

  const floorLineTopPct =
    12 + (1 - (floor - 1) / Math.max(cfg.totalFloors - 1, 1)) * 70

  const hoveredUnitData = hoveredUnit
    ? towerUnits.find((u) => u.id === hoveredUnit) ?? null
    : null

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
      {/* Header strip */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors cursor-pointer"
            style={{ color: '#6B6560' }}
          >
            <ArrowLeft size={11} strokeWidth={1.5} />
            All Towers
          </button>
          <div className="flex items-baseline gap-4">
            <span
              className="font-black leading-none"
              style={{
                color: GOLD,
                fontFamily: 'var(--font-jakarta)',
                fontSize: 'clamp(48px, 6vw, 80px)',
                letterSpacing: '-0.05em',
              }}
            >
              {tower.id}
            </span>
            <div>
              <h2
                className="text-2xl font-bold tracking-tight lg:text-3xl"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {tower.name}
              </h2>
              <p className="mt-0.5 text-sm" style={{ color: '#A8A29E' }}>
                {tower.tagline}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <p
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: '#6B6560' }}
            >
              Now viewing
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
            >
              {h.label} · Floor {floor}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* LEFT: tower elevation + vertical floor scale */}
        <div className="flex flex-col gap-5">
          <div
            className="relative aspect-[3/4] w-full overflow-hidden"
            style={{ background: '#0E0C0A' }}
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
              sizes="(min-width: 1024px) 280px, 100vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,9,8,0.4) 0%, transparent 30%, transparent 50%, rgba(10,9,8,0.85) 100%)',
              }}
            />

            {/* Floor indicator line */}
            <div
              className="absolute inset-x-0 pointer-events-none"
              style={{ top: `${floorLineTopPct}%` }}
            >
              <div className="relative flex items-center">
                <div
                  className="h-px flex-1"
                  style={{
                    background: GOLD,
                    boxShadow: `0 0 12px ${GOLD}`,
                  }}
                />
                <span
                  className="ml-2 mr-3 px-2 py-0.5 text-[10px] font-bold tracking-wider"
                  style={{
                    background: GOLD,
                    color: '#0A0908',
                    fontFamily: 'var(--font-jakarta)',
                    fontSize: 10,
                  }}
                >
                  {h.label}
                </span>
              </div>
            </div>

            {/* Editorial caption */}
            <div className="absolute bottom-4 left-4 right-4">
              <p
                className="text-[10px] uppercase tracking-[0.24em]"
                style={{ color: GOLD }}
              >
                Elevation
              </p>
              <p
                className="mt-1 text-base font-bold"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {tower.name}
              </p>
            </div>
          </div>

          {/* Floor scale — editorial vertical list */}
          <div>
            <div
              className="flex items-baseline justify-between pb-3"
              style={{ borderBottom: '1px solid rgba(212,160,23,0.15)' }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: GOLD }}
              >
                Elevations
              </p>
              <p
                className="font-mono text-[10px] tabular-nums"
                style={{ color: '#6B6560' }}
              >
                {cfg.heightSamples.length}
              </p>
            </div>
            <div className="space-y-px">
              {[...cfg.heightSamples].reverse().map((s) => {
                const active = s.heightM === h.heightM
                return (
                  <button
                    key={s.heightM}
                    onClick={() => onChange(s.floor)}
                    className="group flex w-full items-center justify-between py-3 text-left transition-all duration-150 cursor-pointer"
                    style={{
                      paddingLeft: 12,
                      paddingRight: 8,
                      background: active ? 'rgba(212,160,23,0.08)' : 'transparent',
                      borderLeft: active
                        ? `3px solid ${GOLD}`
                        : '3px solid transparent',
                    }}
                  >
                    <span
                      className="text-sm font-bold tracking-tight"
                      style={{
                        color: active ? GOLD : '#A8A29E',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="font-mono text-[10px] tabular-nums"
                      style={{ color: active ? GOLD : '#4A4540' }}
                    >
                      F{s.floor}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(212,160,23,0.1)' }}>
              <div
                className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em]"
                style={{ color: '#6B6560' }}
              >
                <span>Fine-tune</span>
                <span style={{ color: GOLD }}>F{floor}</span>
              </div>
              <input
                type="range"
                min={1}
                max={cfg.totalFloors}
                value={floor}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-[#D4A017]"
                aria-label="Floor fine-tune"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: floor plan */}
        <div className="flex flex-col gap-5">
          <div
            className="flex items-end justify-between pb-3"
            style={{ borderBottom: '1px solid rgba(212,160,23,0.15)' }}
          >
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: GOLD }}
              >
                Floor Plan
              </p>
              <p
                className="mt-1 text-base font-semibold"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                Tap your unit to step inside
              </p>
            </div>
            {hoveredUnitData &&
              (() => {
                const hasPano = cfg.hasUnitPanorama(
                  tower.id,
                  hoveredUnitData.id,
                )
                return (
                  <div
                    className="text-right"
                    style={{ color: hasPano ? TEAL : '#6B6560' }}
                  >
                    <p
                      className="font-mono text-[10px] uppercase tracking-[0.14em]"
                      style={{ color: hasPano ? TEAL : '#6B6560' }}
                    >
                      {hasPano ? '360° ready' : 'Coming soon'}
                    </p>
                    <p
                      className="mt-1 text-sm font-bold tracking-tight"
                      style={{
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                    >
                      {hoveredUnitData.name} · {hoveredUnitData.bhk} BHK
                      {hoveredUnitData.areaSqft
                        ? ` · ${hoveredUnitData.areaSqft} sqft`
                        : ''}
                    </p>
                  </div>
                )
              })()}
          </div>

          <div className="flex items-start justify-center">
            <div
              className="relative w-full"
              style={{ maxWidth: 520, aspectRatio: '4/5' }}
            >
              <Image
                src={tower.floorPlanUrl || '/legacy-towers/plans/tower-a-floor.jpg'}
                alt={`${tower.name} floor plan`}
                fill
                className="object-contain"
                sizes="520px"
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
                    const c = centroid(unit.points)
                    return (
                      <g key={unit.id} style={{ pointerEvents: 'all' }}>
                        <polygon
                          points={toSvgPoints(unit.points)}
                          fill={
                            isHov
                              ? 'rgba(45,212,191,0.28)'
                              : hasPano
                              ? 'rgba(212,160,23,0.1)'
                              : 'rgba(107,101,96,0.08)'
                          }
                          stroke={
                            isHov
                              ? TEAL
                              : hasPano
                              ? GOLD
                              : 'rgba(107,101,96,0.3)'
                          }
                          strokeWidth={isHov ? 0.7 : 0.4}
                          style={{
                            cursor: 'pointer',
                            transition:
                              'fill 200ms cubic-bezier(0.22, 1, 0.36, 1), stroke 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                          onMouseEnter={() => setHoveredUnit(unit.id)}
                          onMouseLeave={() => setHoveredUnit(null)}
                          onClick={() => onPickUnit(unit.id)}
                        />
                        <text
                          x={c.x}
                          y={c.y - 1.2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="2.8"
                          fontWeight="800"
                          fill={
                            isHov
                              ? TEAL
                              : hasPano
                              ? GOLD
                              : 'rgba(107,101,96,0.65)'
                          }
                          fontFamily="var(--font-jakarta)"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {unit.name}
                        </text>
                        <text
                          x={c.x}
                          y={c.y + 1.9}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="1.9"
                          fill={
                            isHov
                              ? 'rgba(45,212,191,0.85)'
                              : 'rgba(168,162,158,0.55)'
                          }
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {unit.bhk} BHK
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}
              {towerUnits.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p
                    className="px-4 py-2 text-xs"
                    style={{
                      background: 'rgba(10,9,8,0.85)',
                      color: '#6B6560',
                    }}
                  >
                    No unit areas configured
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Unit strip — minimalist row */}
          {towerUnits.length > 0 && (
            <div
              className="overflow-x-auto pt-4"
              style={{
                borderTop: '1px solid rgba(212,160,23,0.12)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <style>{`.unit-strip::-webkit-scrollbar { display: none; }`}</style>
              <div className="unit-strip flex gap-px">
                {towerUnits.map((u) => {
                  const hasPano = cfg.hasUnitPanorama(tower.id, u.id)
                  const isHov = hoveredUnit === u.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => onPickUnit(u.id)}
                      onMouseEnter={() => setHoveredUnit(u.id)}
                      onMouseLeave={() => setHoveredUnit(null)}
                      className="group flex shrink-0 flex-col items-start px-4 py-3 text-left transition-all cursor-pointer"
                      style={{
                        background: isHov
                          ? 'rgba(45,212,191,0.06)'
                          : 'rgba(245,243,239,0.02)',
                        borderTop: isHov
                          ? `2px solid ${TEAL}`
                          : hasPano
                          ? `2px solid ${GOLD}`
                          : '2px solid rgba(107,101,96,0.3)',
                        minWidth: 96,
                      }}
                    >
                      <span
                        className="text-base font-bold tracking-tight"
                        style={{
                          color: '#F5F3EF',
                          fontFamily: 'var(--font-jakarta)',
                        }}
                      >
                        {u.name}
                      </span>
                      <span
                        className="mt-0.5 text-[11px]"
                        style={{ color: '#A8A29E' }}
                      >
                        {u.bhk} BHK
                        {u.areaSqft ? ` · ${u.areaSqft}` : ''}
                      </span>
                      <span
                        className="mt-1.5 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em]"
                        style={{ color: hasPano ? TEAL : '#5A5248' }}
                      >
                        {hasPano ? (
                          <>
                            <Eye size={9} strokeWidth={1.5} /> 360°
                          </>
                        ) : (
                          'Soon'
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── View Stage ── */

function ViewStage({
  imageUrl,
  tower,
  floor,
  heightSample,
  heightSamples,
  unit,
  onChangeUnit,
  onChangeFloor,
  onChangeTower,
  onChangeFloorDirect,
  totalFloors,
  towerImg,
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
  const floorLineTopPct =
    12 + (1 - (floor - 1) / Math.max(totalFloors - 1, 1)) * 70

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
      {/* Editorial attribution — single line */}
      <div
        className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5"
        style={{ borderBottom: '1px solid rgba(212,160,23,0.15)' }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="text-[10px] uppercase tracking-[0.18em] font-semibold"
            style={{ color: GOLD }}
          >
            Tower {tower.id}
          </span>
          <span className="hidden sm:block h-3 w-px" style={{ background: 'rgba(212,160,23,0.3)' }} />
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: '#A8A29E' }}
          >
            {heightSample.label} · F{floor}
          </span>
          {unit && (
            <>
              <span className="hidden sm:block h-3 w-px" style={{ background: 'rgba(212,160,23,0.3)' }} />
              <span
                className="text-base font-bold tracking-tight"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {unit.name}
              </span>
              <span
                className="text-xs"
                style={{ color: '#A8A29E' }}
              >
                {unit.bhk} BHK
                {unit.areaSqft ? ` · ${unit.areaSqft} sqft` : ''}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {[
            { label: 'Tower', fn: onChangeTower },
            { label: 'Floor', fn: onChangeFloor },
            { label: 'Unit', fn: onChangeUnit },
          ].map(({ label, fn }, i, arr) => (
            <div key={label} className="flex items-center gap-1">
              <button
                onClick={fn}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-all cursor-pointer hover:text-[#F5F3EF]"
                style={{
                  color: '#6B6560',
                  background: 'rgba(245,243,239,0.04)',
                }}
              >
                <ArrowLeft size={9} strokeWidth={1.5} />
                {label}
              </button>
              {i < arr.length - 1 && (
                <span className="h-3 w-px" style={{ background: 'rgba(212,160,23,0.15)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* LEFT: panorama (dominant) */}
        <div
          className="relative overflow-hidden"
          style={{
            height: 'clamp(320px, 56vw, 72vh)',
            background: '#000',
          }}
        >
          <PanoramaViewer
            imageUrl={imageUrl}
            initialYaw={hasBalconyView ? balconyYaw : undefined}
            azimuthHalfArc={hasBalconyView ? Math.PI / 3 : Math.PI / 2}
            polarClampMin={hasBalconyView ? Math.PI / 2 : Math.PI / 3}
            polarClampMax={
              hasBalconyView ? Math.PI / 2 : (Math.PI * 2) / 3
            }
          />

          {/* Vertical elevation scale — left edge */}
          <div
            className="absolute left-0 top-0 bottom-0 flex flex-col justify-center"
            style={{ zIndex: 10 }}
          >
            <div
              className="flex flex-col gap-0 py-2 pl-3 pr-4 overflow-y-auto"
              style={{
                background: 'rgba(10,9,8,0.72)',
                backdropFilter: 'blur(16px)',
                borderLeft: `2px solid ${GOLD}`,
                maxHeight: '80%',
              }}
            >
              {[...heightSamples].reverse().map((s) => {
                const active = s.heightM === heightSample.heightM
                return (
                  <button
                    key={s.heightM}
                    onClick={() => onChangeFloorDirect(s.floor)}
                    className="flex items-center gap-2 py-2 text-left transition-all cursor-pointer"
                  >
                    <span
                      className="h-0.5 shrink-0 transition-all duration-200"
                      style={{
                        width: active ? 12 : 5,
                        background: active ? GOLD : 'rgba(168,162,158,0.35)',
                      }}
                    />
                    <span
                      className="whitespace-nowrap text-[10px] font-bold tracking-wider transition-colors"
                      style={{
                        color: active ? GOLD : '#6B6560',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Calibration notice */}
          {!hasBalconyView && (
            <div
              className="absolute right-4 top-4 flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] pointer-events-none"
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

          {/* Drag hint */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 text-[10px] uppercase tracking-[0.18em]"
            style={{
              color: 'rgba(168,162,158,0.6)',
              background: 'rgba(10,9,8,0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {hasBalconyView
              ? 'Balcony view · drag to pan'
              : 'Drag to look around'}
          </div>
        </div>

        {/* RIGHT: contextual sidebar */}
        <div className="flex flex-col gap-5">
          <div
            className="relative aspect-[3/4] w-full overflow-hidden"
            style={{ background: '#0E0C0A' }}
          >
            {towerImg ? (
              <Image
                src={towerImg}
                alt={tower.name}
                fill
                className="object-cover object-top"
                sizes="(min-width: 1024px) 280px, 100vw"
              />
            ) : (
              <div className="absolute inset-0" style={{ background: '#1B1916' }} />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,9,8,0.3) 0%, transparent 30%, transparent 60%, rgba(10,9,8,0.9) 100%)',
              }}
            />
            <div
              className="absolute inset-x-0 pointer-events-none"
              style={{ top: `${floorLineTopPct}%` }}
            >
              <div className="relative flex items-center">
                <div
                  className="h-px flex-1"
                  style={{
                    background: GOLD,
                    boxShadow: `0 0 12px ${GOLD}`,
                  }}
                />
                <span
                  className="ml-2 mr-3 px-2 py-0.5 text-[10px] font-bold tracking-wider"
                  style={{
                    background: GOLD,
                    color: '#0A0908',
                    fontFamily: 'var(--font-jakarta)',
                  }}
                >
                  You&apos;re here
                </span>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <p
                className="text-[10px] uppercase tracking-[0.24em]"
                style={{ color: GOLD }}
              >
                Tower {tower.id}
              </p>
              <p
                className="mt-1 text-base font-bold tracking-tight"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {tower.name}
              </p>
              {unit && (
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: '#A8A29E' }}
                >
                  {unit.name} · {unit.bhk} BHK
                  {unit.areaSqft ? ` · ${unit.areaSqft} sqft` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Specs editorial table */}
          {unit && (
            <div className="space-y-px">
              <p
                className="pb-2 text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: GOLD,
                  borderBottom: '1px solid rgba(212,160,23,0.15)',
                }}
              >
                Specifications
              </p>
              {[
                ['Type', `${unit.bhk} BHK`],
                ['Area', unit.areaSqft ? `${unit.areaSqft} sqft` : '—'],
                ['Elevation', heightSample.label],
                ['Floor', `F${floor} of ${totalFloors}`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}
                >
                  <span
                    className="text-[11px] uppercase tracking-[0.14em]"
                    style={{ color: '#6B6560' }}
                  >
                    {k}
                  </span>
                  <span
                    className="text-sm font-semibold tracking-tight"
                    style={{
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-jakarta)',
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          )}

          <a
            href="tel:+919999999999"
            className="flex items-center justify-between px-4 py-3 transition-all cursor-pointer"
            style={{
              background: GOLD,
              color: '#0A0908',
              fontFamily: 'var(--font-jakarta)',
            }}
          >
            <span className="text-sm font-bold tracking-tight">
              Schedule a visit
            </span>
            <Phone size={14} strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Page ── */

export default function LegacyTowersPublicPage() {
  const convexCfg = useQuery(api.legacyTowersConfig.getBySlug, { slug: SLUG })
  const cfg = useMemo(
    () => mergeConfig(convexCfg as ConvexCfg | null | undefined),
    [convexCfg],
  )

  const [stage, setStage] = useState<Stage>('tower')
  const [sel, setSel] = useState<Selection>({
    tower: null,
    floor: 20,
    unitId: null,
  })

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

  const jumpTo = (s: Stage) => {
    const order: Stage[] = ['tower', 'floor', 'view']
    if (order.indexOf(s) < order.indexOf(stage)) setStage(s)
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: '#0A0908' }}
    >
      {/* Editorial header */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(10,9,8,0.78)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(212,160,23,0.08)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <span
              className="text-[10px] uppercase tracking-[0.24em]"
              style={{ color: GOLD, fontFamily: 'var(--font-jakarta)' }}
            >
              Spazeo
            </span>
            <span
              className="h-4 w-px"
              style={{ background: 'rgba(212,160,23,0.2)' }}
            />
            <div className="hidden sm:flex flex-col leading-none">
              <span
                className="text-sm font-bold tracking-tight"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {cfg.projectName}
              </span>
              <span
                className="mt-1 text-[10px] uppercase tracking-[0.18em]"
                style={{ color: '#6B6560' }}
              >
                Hyderabad
              </span>
            </div>
          </div>

          <StageRibbon
            stage={stage}
            sel={sel}
            unit={selectedUnit}
            onJump={jumpTo}
          />

          <a
            href="tel:+919999999999"
            className="hidden md:flex cursor-pointer items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all hover:gap-3"
            style={{
              background: GOLD,
              color: '#0A0908',
              fontFamily: 'var(--font-jakarta)',
            }}
          >
            Book Visit
            <ArrowUpRight size={14} strokeWidth={2.25} />
          </a>
        </div>
      </header>

      <main>
        {convexCfg === undefined && (
          <div key="loading" style={{ animation: 'var(--animate-fadeIn)' }}>
            <LoadingSkeleton />
          </div>
        )}

        {convexCfg !== undefined && stage === 'tower' && (
          <div key="tower" style={{ animation: 'var(--animate-fadeUp)' }}>
            <TowerStage
              cfg={cfg}
              onPick={(t) => {
                setSel((s) => ({ ...s, tower: t, unitId: null }))
                setStage('floor')
              }}
            />
          </div>
        )}

        {convexCfg !== undefined && stage === 'floor' && tower && (
          <div key="floor" style={{ animation: 'var(--animate-fadeUp)' }}>
            <FloorStage
              cfg={cfg}
              tower={tower}
              floor={sel.floor}
              onChange={(floor) => setSel((s) => ({ ...s, floor }))}
              onPickUnit={(unitId) => {
                setSel((s) => ({ ...s, unitId }))
                setStage('view')
              }}
              onBack={() => setStage('tower')}
            />
          </div>
        )}

        {convexCfg !== undefined && stage === 'view' && tower && panoramaUrl && (
          <div key="view" style={{ animation: 'var(--animate-fadeUp)' }}>
            <ViewStage
              imageUrl={panoramaUrl}
              tower={tower}
              floor={sel.floor}
              heightSample={heightSample}
              heightSamples={cfg.heightSamples}
              unit={selectedUnit}
              onChangeUnit={() => setStage('floor')}
              onChangeFloor={() => setStage('floor')}
              onChangeTower={() => setStage('tower')}
              onChangeFloorDirect={(f) =>
                setSel((prev) => ({ ...prev, floor: f }))
              }
              totalFloors={cfg.totalFloors}
              towerImg={tower.heroUrl ?? cfg.heroUrl ?? null}
            />
          </div>
        )}

        {convexCfg !== undefined && stage === 'view' && tower && !panoramaUrl && (
          <div
            key="view-empty"
            style={{ animation: 'var(--animate-fadeUp)' }}
            className="mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-32 text-center"
          >
            <span
              className="text-[10px] uppercase tracking-[0.24em]"
              style={{ color: GOLD }}
            >
              Not yet captured
            </span>
            <p
              className="mt-4 text-3xl font-bold tracking-tight"
              style={{
                color: '#F5F3EF',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              No panorama here yet
            </p>
            <p className="mt-3 text-sm" style={{ color: '#A8A29E' }}>
              This unit hasn&apos;t been captured. Try a different unit on this floor.
            </p>
            <button
              onClick={() => setStage('floor')}
              className="mt-8 flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-all hover:gap-3 cursor-pointer"
              style={{
                background: GOLD,
                color: '#0A0908',
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              Choose a different unit
              <ArrowUpRight size={14} strokeWidth={2.25} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
