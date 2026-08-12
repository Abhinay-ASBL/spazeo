'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Building2,
  Copy,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  Eye,
  MapPin,
  Minus,
  Tag,
  X,
} from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { HEIGHT_SAMPLES, type HeightSample } from '@/lib/legacyTowers'
import { PanoramaViewer } from '@/components/viewer/PanoramaViewer'

const SLUG = 'asbl-legacy-towers'

// Authoritative BHK data — overrides stale DB values in the panorama upload grid
const UNIT_SPEC: Record<string, { bhk: number }> = {
  a1:  { bhk: 4 }, a2:  { bhk: 4 }, a3:  { bhk: 3 }, a4:  { bhk: 3 },
  a5:  { bhk: 3 }, a6:  { bhk: 3 }, a7:  { bhk: 3 }, a8:  { bhk: 3 },
  a9:  { bhk: 4 }, a10: { bhk: 4 },
  b1:  { bhk: 4 }, b2:  { bhk: 4 }, b3:  { bhk: 3 }, b4:  { bhk: 3 },
  b5:  { bhk: 3 }, b6:  { bhk: 3 }, b7:  { bhk: 3 }, b8:  { bhk: 3 },
  b9:  { bhk: 4 }, b10: { bhk: 4 },
  c1:  { bhk: 4 }, c2:  { bhk: 4 }, c3:  { bhk: 3 }, c4:  { bhk: 3 },
  c5:  { bhk: 3 }, c6:  { bhk: 3 }, c7:  { bhk: 3 }, c8:  { bhk: 3 },
  c9:  { bhk: 4 }, c10: { bhk: 4 },
}

function resolveUnitBhk(towerId: string, unitName: string, fallback: number): number {
  const towerChar = towerId.toLowerCase()
  const unitNum = parseInt(unitName.replace(/\D/g, '') || '0', 10)
  return UNIT_SPEC[`${towerChar}${unitNum}`]?.bhk ?? fallback
}

type Tab = 'project' | 'towers' | 'floorPlan' | 'panoramas' | 'balcony'

export default function LegacyTowersAdminPage() {
  const cfg = useQuery(api.legacyTowersConfig.getBySlug, { slug: SLUG })
  const seed = useMutation(api.legacyTowersConfig.seedDefault)
  const [tab, setTab] = useState<Tab>('project')

  if (cfg === undefined) {
    return <FullscreenState icon={<Loader2 className="animate-spin" />} label="Loading config…" />
  }

  if (cfg === null) {
    return (
      <FullscreenState
        icon={<Building2 />}
        label="No config yet"
        action={
          <button
            onClick={() => seed({ slug: SLUG })}
            className="rounded-lg bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0908] hover:bg-[#E5B120]"
          >
            Create default Legacy Towers config
          </button>
        }
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0908]">
      <header className="sticky top-0 z-20 border-b border-[rgba(212,160,23,0.12)] bg-[#0A0908]/90 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/buildings/legacy-towers/view"
              className="flex items-center gap-2 rounded-lg border border-[rgba(212,160,23,0.15)] px-3 py-1.5 text-sm text-[#A8A29E] hover:text-[#F5F3EF]"
            >
              <ArrowLeft size={14} /> Sales view
            </Link>
            <div>
              <h1
                className="text-lg font-semibold text-[#F5F3EF]"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {cfg.projectName} — Admin
              </h1>
              <p className="text-xs text-[#6B6560]">
                {cfg.towers.length} towers · {cfg.unitTypes.length} unit types ·{' '}
                {cfg.panoramas.length} panoramas
              </p>
            </div>
          </div>
          <Link
              href="/buildings/legacy-towers/view"
            className="flex items-center gap-2 rounded-lg bg-[rgba(45,212,191,0.1)] px-3 py-1.5 text-sm text-[#2DD4BF] hover:bg-[rgba(45,212,191,0.16)]"
          >
            <Eye size={14} /> Preview sales view
          </Link>
        </div>

        <nav className="flex gap-1 border-t border-[rgba(212,160,23,0.08)] px-6">
          {(
            [
              { id: 'project', label: 'Project' },
              { id: 'towers', label: 'Towers' },
              { id: 'floorPlan', label: 'Floor plan' },
              { id: 'panoramas', label: 'Panoramas' },
              { id: 'balcony', label: 'Balcony Views' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-3 text-sm transition-colors ${
                tab === t.id
                  ? 'border-[#D4A017] text-[#D4A017]'
                  : 'border-transparent text-[#A8A29E] hover:text-[#F5F3EF]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl p-6">
        {(() => {
          const c = cfg as unknown as LegacyCfg
          return (
            <>
              {tab === 'project'   && <ProjectTab    cfg={c} />}
              {tab === 'towers'    && <TowersTab      cfg={c} />}
              {tab === 'floorPlan' && <FloorPlanTab   cfg={c} />}
              {tab === 'panoramas' && <PanoramasTab   cfg={c} />}
              {tab === 'balcony'   && <BalconyViewTab cfg={c} />}
            </>
          )
        })()}
      </div>
    </div>
  )
}

/* ═══ Project ═════════════════════════════════════════════════════════════ */

const FLOOR_HEIGHT_METERS = 3.7 // avg residential floor-to-floor

function generateHeightSamples(totalFloors: number, floorsPerSection: number) {
  const step = Math.max(1, Math.floor(floorsPerSection))
  const samples: { heightM: number; floor: number; label: string }[] = []
  for (let f = step; f <= totalFloors; f += step) {
    samples.push({
      floor: f,
      heightM: Math.round(f * FLOOR_HEIGHT_METERS),
      label: `Floor ${f}`,
    })
  }
  // Always include top floor if it wasn't hit by the step
  if (samples[samples.length - 1]?.floor !== totalFloors && totalFloors > 0) {
    samples.push({
      floor: totalFloors,
      heightM: Math.round(totalFloors * FLOOR_HEIGHT_METERS),
      label: `Floor ${totalFloors}`,
    })
  }
  return samples
}

function ProjectTab({ cfg }: { cfg: LegacyCfg }) {
  const patchMeta = useMutation(api.legacyTowersConfig.patchMeta)
  const [name, setName] = useState(cfg.projectName)
  const [tagline, setTagline] = useState(cfg.projectTagline ?? '')
  const [location, setLocation] = useState(cfg.projectLocation ?? '')
  const [totalFloors, setTotalFloors] = useState(cfg.totalFloors)
  const [floorsPerSection, setFloorsPerSection] = useState(cfg.floorsPerSection ?? 10)
  const [saving, setSaving] = useState(false)

  const previewSamples = useMemo(
    () => generateHeightSamples(totalFloors, floorsPerSection),
    [totalFloors, floorsPerSection]
  )

  const save = async () => {
    setSaving(true)
    try {
      await patchMeta({
        slug: SLUG,
        projectName: name,
        projectTagline: tagline || undefined,
        projectLocation: location || undefined,
        totalFloors,
        floorsPerSection,
        heightSamples: previewSamples,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Project details" />

      <Card>
        <Field label="Project name">
          <TextInput value={name} onChange={setName} />
        </Field>
        <Field label="Tagline">
          <TextInput value={tagline} onChange={setTagline} />
        </Field>
        <Field label="Location">
          <TextInput value={location} onChange={setLocation} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total floors">
            <TextInput
              type="number"
              value={String(totalFloors)}
              onChange={(v) => setTotalFloors(Math.max(1, Number(v) || 1))}
            />
          </Field>
          <Field label="Floors per section">
            <TextInput
              type="number"
              value={String(floorsPerSection)}
              onChange={(v) => setFloorsPerSection(Math.max(1, Number(v) || 1))}
            />
          </Field>
        </div>

        <div className="rounded-lg border border-[rgba(212,160,23,0.12)] bg-[#1B1916] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#6B6560]">
            Height samples preview ({previewSamples.length} sections)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {previewSamples.map((s) => (
              <span
                key={s.floor}
                className="rounded-full border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.06)] px-2 py-0.5 text-[11px] text-[#D4A017]"
              >
                F{s.floor} · {s.heightM}m
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#6B6560]">
            Each section gets one panorama upload slot per unit vertex. Heights assume{' '}
            {FLOOR_HEIGHT_METERS}m per floor.
          </p>
        </div>

        <div className="pt-2">
          <PrimaryButton onClick={save} loading={saving} icon={<Save size={14} />}>
            Save — regenerates {previewSamples.length} height samples
          </PrimaryButton>
        </div>
      </Card>

      <SectionHeader title="Project imagery" />
      <div className="grid gap-4 md:grid-cols-2">
        <ImageField
          label="Hero image (project render)"
          url={cfg.heroUrl}
          onStorageId={(id) => { void patchMeta({ slug: SLUG, heroStorageId: id }) }}
        />
        <ImageField
          label="Site plan"
          url={cfg.sitePlanUrl}
          onStorageId={(id) => { void patchMeta({ slug: SLUG, sitePlanStorageId: id }) }}
        />
      </div>
    </div>
  )
}

/* ═══ Towers ══════════════════════════════════════════════════════════════ */

function sanitizeTower(t: LegacyCfg['towers'][number]) {
  return {
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    floorPlanStorageId: t.floorPlanStorageId,
    heroStorageId: t.heroStorageId,
    heroLeftPct: t.heroLeftPct,
    heroTopPct: t.heroTopPct,
    heroRightPct: t.heroRightPct,
    heroBottomPct: t.heroBottomPct,
  }
}

function sanitizeUnit(u: LegacyCfg['unitTypes'][number]) {
  return {
    id: u.id,
    name: u.name,
    bhk: u.bhk,
    areaSqft: u.areaSqft,
    layoutStorageId: u.layoutStorageId,
    towerId: u.towerId,
    points: u.points,
    balconyYawRads: u.balconyYawRads,
    balconyHotspots: u.balconyHotspots,
    balconyStickyLabels: u.balconyStickyLabels,
  }
}

function TowersTab({ cfg }: { cfg: LegacyCfg }) {
  const setTowers = useMutation(api.legacyTowersConfig.setTowers)

  const updateTower = async (
    id: string,
    patch: Partial<{
      name: string
      tagline: string
      heroStorageId: Id<'_storage'>
      floorPlanStorageId: Id<'_storage'>
      heroLeftPct: number
      heroTopPct: number
      heroRightPct: number | null
      heroBottomPct: number | null
    }>
  ) => {
    const next = cfg.towers.map((t) => {
      const base = sanitizeTower(t)
      if (t.id !== id) return base
      return {
        ...base,
        name: patch.name ?? base.name,
        tagline: patch.tagline ?? base.tagline,
        heroStorageId: patch.heroStorageId ?? base.heroStorageId,
        floorPlanStorageId: patch.floorPlanStorageId ?? base.floorPlanStorageId,
        heroLeftPct: patch.heroLeftPct ?? base.heroLeftPct,
        heroTopPct: patch.heroTopPct ?? base.heroTopPct,
        heroRightPct:
          patch.heroRightPct === null
            ? undefined
            : patch.heroRightPct ?? base.heroRightPct,
        heroBottomPct:
          patch.heroBottomPct === null
            ? undefined
            : patch.heroBottomPct ?? base.heroBottomPct,
      }
    })
    await setTowers({ slug: SLUG, towers: next })
  }

  const addTower = async () => {
    const nextId = String.fromCharCode(65 + cfg.towers.length) // A, B, C...
    await setTowers({
      slug: SLUG,
      towers: [
        ...cfg.towers.map(sanitizeTower),
        { id: nextId, name: `Tower ${nextId}`, tagline: '' },
      ],
    })
  }

  const removeTower = async (id: string) => {
    await setTowers({
      slug: SLUG,
      towers: cfg.towers.filter((t) => t.id !== id).map(sanitizeTower),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Towers" />
        <PrimaryButton onClick={addTower} icon={<Plus size={14} />}>
          Add tower
        </PrimaryButton>
      </div>

      <HeroMarkerPicker
        heroUrl={cfg.heroUrl}
        towers={cfg.towers}
        onMove={(id, leftPct, topPct) =>
          updateTower(id, {
            heroLeftPct: leftPct,
            heroTopPct: topPct,
            heroRightPct: null,
            heroBottomPct: null,
          })
        }
        onArea={(id, l, t, r, b) =>
          updateTower(id, {
            heroLeftPct: l,
            heroTopPct: t,
            heroRightPct: r,
            heroBottomPct: b,
          })
        }
        onClear={(id) =>
          updateTower(id, { heroRightPct: null, heroBottomPct: null })
        }
      />

      <div className="space-y-4">
        {cfg.towers.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold"
                style={{ color: '#D4A017', borderColor: '#D4A017', fontFamily: 'var(--font-jakarta)' }}
              >
                {t.id}
              </div>
              <div className="flex-1 space-y-3">
                <Field label="Name">
                  <TextInput value={t.name} onChange={(v) => updateTower(t.id, { name: v })} />
                </Field>
                <Field label="Tagline">
                  <TextInput
                    value={t.tagline ?? ''}
                    onChange={(v) => updateTower(t.id, { tagline: v })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Hero marker left %">
                    <TextInput
                      type="number"
                      value={String(t.heroLeftPct ?? 50)}
                      onChange={(v) => updateTower(t.id, { heroLeftPct: Number(v) })}
                    />
                  </Field>
                  <Field label="Hero marker top %">
                    <TextInput
                      type="number"
                      value={String(t.heroTopPct ?? 50)}
                      onChange={(v) => updateTower(t.id, { heroTopPct: Number(v) })}
                    />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ImageField
                    label="Floor plan"
                    url={t.floorPlanUrl as string | null | undefined}
                    onStorageId={(id) => updateTower(t.id, { floorPlanStorageId: id })}
                  />
                  <ImageField
                    label="Tower hero"
                    url={t.heroUrl as string | null | undefined}
                    onStorageId={(id) => updateTower(t.id, { heroStorageId: id })}
                  />
                </div>
              </div>
              <button
                onClick={() => removeTower(t.id)}
                className="rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] p-2 text-[#F87171] hover:bg-[rgba(248,113,113,0.12)]"
                aria-label="Remove tower"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ── HeroMarkerPicker ───────────────────────────────────────────────────── */

type Mode = 'point' | 'area'
type DrawState = { id: string; startLeft: number; startTop: number; endLeft: number; endTop: number }

function HeroMarkerPicker({
  heroUrl,
  towers,
  onMove,
  onArea,
  onClear,
}: {
  heroUrl: string | null
  towers: LegacyCfg['towers']
  onMove: (id: string, leftPct: number, topPct: number) => void | Promise<void>
  onArea: (id: string, l: number, t: number, r: number, b: number) => void | Promise<void>
  onClear: (id: string) => void | Promise<void>
}) {
  const [mode, setMode] = useState<Mode>('point')
  const [selectedId, setSelectedId] = useState<string | null>(towers[0]?.id ?? null)
  const [preview, setPreview] = useState<Record<string, { leftPct: number; topPct: number }>>({})
  const [drawVis, setDrawVis] = useState<DrawState | null>(null)

  // Stable refs — updated every render, read inside native event handlers
  const containerRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(mode)
  const selectedIdRef = useRef(selectedId)
  const onMoveRef = useRef(onMove)
  const onAreaRef = useRef(onArea)
  const previewRef = useRef(preview)
  const dragRef = useRef<{ id: string } | null>(null)
  const drawRef = useRef<DrawState | null>(null)
  modeRef.current = mode
  selectedIdRef.current = selectedId
  onMoveRef.current = onMove
  onAreaRef.current = onArea
  previewRef.current = preview

  // Use native DOM listeners — bypasses React synthetic event system entirely.
  // mousemove/mouseup go on window so drag/draw keep working outside the container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const round = (n: number) => Math.round(n * 10) / 10
    const getPct = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect()
      return {
        leftPct: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
        topPct: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
      }
    }

    const onDown = (e: MouseEvent) => {
      const sid = selectedIdRef.current
      if (!sid) return
      if (modeRef.current === 'area') {
        const { leftPct, topPct } = getPct(e.clientX, e.clientY)
        const d: DrawState = { id: sid, startLeft: leftPct, startTop: topPct, endLeft: leftPct, endTop: topPct }
        drawRef.current = d
        setDrawVis({ ...d })
      }
      // point mode: nothing on down — handled on up
    }

    const onWinMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const { leftPct, topPct } = getPct(e.clientX, e.clientY)
        const id = dragRef.current.id
        previewRef.current = { ...previewRef.current, [id]: { leftPct, topPct } }
        setPreview(p => ({ ...p, [id]: { leftPct, topPct } }))
        return
      }
      if (drawRef.current) {
        const { leftPct, topPct } = getPct(e.clientX, e.clientY)
        const d: DrawState = { ...drawRef.current, endLeft: leftPct, endTop: topPct }
        drawRef.current = d
        setDrawVis({ ...d })
      }
    }

    const onWinUp = (e: MouseEvent) => {
      if (dragRef.current) {
        const id = dragRef.current.id
        const pos = previewRef.current[id]
        if (pos) void onMoveRef.current(id, round(pos.leftPct), round(pos.topPct))
        dragRef.current = null
        return
      }
      const d = drawRef.current
      if (d) {
        const l = Math.min(d.startLeft, d.endLeft)
        const r = Math.max(d.startLeft, d.endLeft)
        const t = Math.min(d.startTop, d.endTop)
        const b = Math.max(d.startTop, d.endTop)
        if (r - l >= 2 && b - t >= 2) {
          void onAreaRef.current(d.id, round(l), round(t), round(r), round(b))
        } else {
          // Too small — treat as a point at release position
          const sid = selectedIdRef.current
          if (sid) {
            const { leftPct, topPct } = getPct(e.clientX, e.clientY)
            setPreview(p => ({ ...p, [sid]: { leftPct, topPct } }))
            void onMoveRef.current(sid, round(leftPct), round(topPct))
          }
        }
        drawRef.current = null
        setDrawVis(null)
        return
      }
      // Point mode: place marker where mouse was released (only if inside container)
      if (modeRef.current === 'point') {
        const rect = el.getBoundingClientRect()
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return
        const sid = selectedIdRef.current
        if (!sid) return
        const { leftPct, topPct } = getPct(e.clientX, e.clientY)
        setPreview(p => ({ ...p, [sid]: { leftPct, topPct } }))
        void onMoveRef.current(sid, round(leftPct), round(topPct))
      }
    }

    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onWinMove)
    window.addEventListener('mouseup', onWinUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onWinMove)
      window.removeEventListener('mouseup', onWinUp)
    }
  }, [heroUrl]) // re-attach when container mounts/unmounts with heroUrl change

  if (!heroUrl) {
    return (
      <EmptyBox label="Upload a project hero image in the Project tab to place tower markers by clicking." />
    )
  }

  const selectedTower = towers.find((t) => t.id === selectedId)
  const hasArea = selectedTower?.heroRightPct !== undefined && selectedTower?.heroBottomPct !== undefined

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#6B6560]">
            Place tower markers on hero image
          </p>
          <p className="mt-0.5 text-xs text-[#A8A29E]">
            {mode === 'point'
              ? 'Click the image to place a marker, or drag an existing marker.'
              : 'Click and drag on the image to draw an area for the selected tower.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[rgba(212,160,23,0.2)]">
            {(['point', 'area'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  mode === m
                    ? 'bg-[#D4A017] text-[#0A0908]'
                    : 'bg-transparent text-[#A8A29E] hover:text-[#F5F3EF]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {hasArea && selectedId && (
            <button
              onClick={() => void onClear(selectedId)}
              className="rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-3 py-1.5 text-xs text-[#F87171] hover:bg-[rgba(248,113,113,0.12)]"
            >
              Clear area
            </button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {towers.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedId === t.id
                    ? 'border-[#D4A017] bg-[rgba(212,160,23,0.15)] text-[#D4A017]'
                    : 'border-[rgba(212,160,23,0.15)] text-[#A8A29E] hover:text-[#F5F3EF]'
                }`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`relative mt-3 aspect-[16/9] w-full select-none overflow-hidden rounded-lg border border-[rgba(212,160,23,0.15)] bg-[#0A0908] ${
          mode === 'area' ? 'cursor-crosshair' : 'cursor-pointer'
        }`}
      >
        <Image
          src={heroUrl}
          alt="Project hero"
          fill
          className="pointer-events-none object-cover"
          sizes="100vw"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* saved area rectangles */}
        {towers.map((t) => {
          if (t.heroRightPct === undefined || t.heroBottomPct === undefined) return null
          if (t.heroLeftPct === undefined || t.heroTopPct === undefined) return null
          const isSel = selectedId === t.id
          return (
            <div
              key={`rect-${t.id}`}
              className="pointer-events-none absolute rounded-md border-2"
              style={{
                left: `${t.heroLeftPct}%`,
                top: `${t.heroTopPct}%`,
                width: `${t.heroRightPct - t.heroLeftPct}%`,
                height: `${t.heroBottomPct - t.heroTopPct}%`,
                borderColor: isSel ? '#2DD4BF' : '#D4A017',
                backgroundColor: isSel ? 'rgba(45,212,191,0.10)' : 'rgba(212,160,23,0.08)',
              }}
            />
          )
        })}

        {/* live draw rectangle */}
        {drawVis && (
          <div
            className="pointer-events-none absolute rounded-md border-2 border-dashed border-[#2DD4BF]"
            style={{
              left: `${Math.min(drawVis.startLeft, drawVis.endLeft)}%`,
              top: `${Math.min(drawVis.startTop, drawVis.endTop)}%`,
              width: `${Math.abs(drawVis.endLeft - drawVis.startLeft)}%`,
              height: `${Math.abs(drawVis.endTop - drawVis.startTop)}%`,
              backgroundColor: 'rgba(45,212,191,0.12)',
            }}
          />
        )}

        {/* tower markers */}
        {towers.map((t) => {
          const p = preview[t.id]
          const isSel = selectedId === t.id
          const markerLeft = t.heroRightPct !== undefined && t.heroLeftPct !== undefined
            ? (t.heroLeftPct + t.heroRightPct) / 2
            : (p?.leftPct ?? t.heroLeftPct ?? 50)
          const markerTop = t.heroBottomPct !== undefined && t.heroTopPct !== undefined
            ? (t.heroTopPct + t.heroBottomPct) / 2
            : (p?.topPct ?? t.heroTopPct ?? 50)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              onMouseDown={() => {
                setSelectedId(t.id)
                selectedIdRef.current = t.id
                if (modeRef.current === 'point') dragRef.current = { id: t.id }
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${mode === 'area' ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
              style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
              aria-label={`Tower ${t.name} marker`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold shadow-lg"
                style={{
                  backgroundColor: 'rgba(10,9,8,0.85)',
                  borderColor: isSel ? '#2DD4BF' : '#D4A017',
                  color: isSel ? '#2DD4BF' : '#D4A017',
                  boxShadow: isSel ? '0 0 0 6px rgba(45,212,191,0.25)' : '0 0 0 4px rgba(212,160,23,0.18)',
                }}
              >
                {t.id}
              </span>
            </button>
          )
        })}
      </div>

      {selectedId && (
        <p className="mt-2 text-center text-[11px] text-[#6B6560]">
          Placing marker for{' '}
          <span className="text-[#2DD4BF]">
            {towers.find((t) => t.id === selectedId)?.name ?? selectedId}
          </span>{' '}
          · position:{' '}
          <span className="text-[#F5F3EF]">
            {(towers.find((t) => t.id === selectedId)?.heroLeftPct ?? 0).toFixed(1)}%,{' '}
            {(towers.find((t) => t.id === selectedId)?.heroTopPct ?? 0).toFixed(1)}%
          </span>
        </p>
      )}
    </Card>
  )
}

/* ═══ Floor plan (per-tower polygon editor) ═══════════════════════════════ */

function FloorPlanTab({ cfg }: { cfg: LegacyCfg }) {
  const setUnitTypes = useMutation(api.legacyTowersConfig.setUnitTypes)
  const [towerId, setTowerId] = useState<string | null>(cfg.towers[0]?.id ?? null)
  const [drawing, setDrawing] = useState<{
    startLeft: number; startTop: number; endLeft: number; endTop: number
  } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const tower = cfg.towers.find((t) => t.id === towerId)
  const floorPlanUrl = tower?.floorPlanUrl
  const unitsForTower = cfg.unitTypes.filter((u) => u.towerId === towerId)

  // Canvas aspect MUST match the floor plan image, otherwise object-contain
  // letterboxes the image and click coordinates land in box-space instead of
  // image-space — which is what the public view page expects. Tower B is
  // landscape (1600×1130); Towers A & C are portrait (1130×1600).
  const planAspect = towerId === 'B' ? 1600 / 1130 : 1130 / 1600

  const round = (n: number) => Math.round(n * 10) / 10
  const getPct = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      leftPct: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      topPct: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    }
  }

  const cancelDraw = () => {
    setDrawing(null)
    setIsDrawing(false)
  }

  const saveRect = async (l: number, t: number, r: number, b: number) => {
    if (!towerId) return
    setDrawing(null)
    setIsDrawing(false)
    const id = `u_${Date.now().toString(36)}`
    const pts = [
      { leftPct: round(l), topPct: round(t) },
      { leftPct: round(r), topPct: round(t) },
      { leftPct: round(r), topPct: round(b) },
      { leftPct: round(l), topPct: round(b) },
    ]
    const next = [
      ...cfg.unitTypes.map(sanitizeUnit),
      { id, name: `Unit ${unitsForTower.length + 1}`, bhk: 2, towerId, points: pts },
    ]
    setSaveError(null)
    try {
      await setUnitTypes({ slug: SLUG, unitTypes: next })
      setSelectedUnitId(id)
    } catch (err) {
      console.error('Failed to save unit', err)
      setSaveError(`Could not save unit: ${(err as Error).message ?? 'unknown error'}`)
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const p = getPct(e)
    setDrawing({ startLeft: p.leftPct, startTop: p.topPct, endLeft: p.leftPct, endTop: p.topPct })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return
    const p = getPct(e)
    setDrawing((d) => d ? { ...d, endLeft: p.leftPct, endTop: p.topPct } : d)
  }

  const handleCanvasMouseUp = () => {
    if (!drawing) return
    const l = Math.min(drawing.startLeft, drawing.endLeft)
    const r = Math.max(drawing.startLeft, drawing.endLeft)
    const t = Math.min(drawing.startTop, drawing.endTop)
    const b = Math.max(drawing.startTop, drawing.endTop)
    if (r - l < 2 || b - t < 2) { cancelDraw(); return }
    void saveRect(l, t, r, b)
  }

  const updateUnit = async (
    id: string,
    patch: Partial<{
      name: string
      bhk: number
      areaSqft: number
      layoutStorageId: Id<'_storage'>
      points: { leftPct: number; topPct: number }[]
    }>
  ) => {
    const next = cfg.unitTypes.map((u) => {
      const base = sanitizeUnit(u)
      if (u.id !== id) return base
      return {
        ...base,
        name: patch.name ?? base.name,
        bhk: patch.bhk ?? base.bhk,
        areaSqft: patch.areaSqft ?? base.areaSqft,
        layoutStorageId: patch.layoutStorageId ?? base.layoutStorageId,
        points: patch.points ?? base.points,
      }
    })
    await setUnitTypes({ slug: SLUG, unitTypes: next })
  }

  const removeUnit = async (id: string) => {
    await setUnitTypes({
      slug: SLUG,
      unitTypes: cfg.unitTypes.filter((u) => u.id !== id).map(sanitizeUnit),
    })
    if (selectedUnitId === id) setSelectedUnitId(null)
  }

  const polygonToPath = (points: { leftPct: number; topPct: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.leftPct},${p.topPct}`).join(' ') + ' Z'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Floor plan units" />
        <div className="flex flex-wrap gap-1.5">
          {cfg.towers.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTowerId(t.id)
                cancelDraw()
                setSelectedUnitId(null)
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                towerId === t.id
                  ? 'border-[#D4A017] bg-[rgba(212,160,23,0.15)] text-[#D4A017]'
                  : 'border-[rgba(212,160,23,0.15)] text-[#A8A29E] hover:text-[#F5F3EF]'
              }`}
            >
              {t.id}
            </button>
          ))}
        </div>
      </div>

      {!tower ? (
        <EmptyBox label="Add at least one tower in the Towers tab first." />
      ) : !floorPlanUrl ? (
        <EmptyBox
          label={`Upload a floor plan for ${tower.name} in the Towers tab to start placing units.`}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Floor plan canvas */}
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-[#6B6560]">
                {tower.name} floor plan
              </p>
              {isDrawing ? (
                <button
                  onClick={cancelDraw}
                  className="rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-3 py-1 text-xs text-[#F87171]"
                >
                  Cancel
                </button>
              ) : (
                <PrimaryButton onClick={() => { setIsDrawing(true); setSelectedUnitId(null) }} icon={<Plus size={14} />}>
                  Add unit
                </PrimaryButton>
              )}
            </div>

            <div
              className={`relative mt-3 mx-auto w-full select-none overflow-hidden rounded-lg border border-[rgba(212,160,23,0.15)] bg-[#0A0908] ${
                isDrawing ? 'cursor-crosshair' : 'cursor-default'
              }`}
              style={{ aspectRatio: planAspect, maxWidth: towerId === 'B' ? '100%' : 520 }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => { if (drawing) cancelDraw() }}
            >
              <Image
                src={floorPlanUrl}
                alt={`${tower.name} floor plan`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 60vw, 100vw"
                draggable={false}
              />

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                {/* Existing unit rectangles */}
                {unitsForTower.map((u) => {
                  if (!u.points || u.points.length === 0) return null
                  const isSel = selectedUnitId === u.id
                  return (
                    <path
                      key={u.id}
                      d={polygonToPath(u.points)}
                      fill={isSel ? 'rgba(45,212,191,0.18)' : 'rgba(212,160,23,0.12)'}
                      stroke={isSel ? '#2DD4BF' : '#D4A017'}
                      strokeWidth="0.4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                })}

                {/* In-progress rectangle drag preview */}
                {drawing && (
                  <rect
                    x={Math.min(drawing.startLeft, drawing.endLeft)}
                    y={Math.min(drawing.startTop, drawing.endTop)}
                    width={Math.abs(drawing.endLeft - drawing.startLeft)}
                    height={Math.abs(drawing.endTop - drawing.startTop)}
                    fill="rgba(45,212,191,0.12)"
                    stroke="#2DD4BF"
                    strokeWidth="0.5"
                    strokeDasharray="1.5 0.8"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>

              {/* Clickable centroid labels */}
              {!isDrawing &&
                unitsForTower.map((u) => {
                  if (!u.points || u.points.length === 0) return null
                  const cx = u.points.reduce((s, p) => s + p.leftPct, 0) / u.points.length
                  const cy = u.points.reduce((s, p) => s + p.topPct, 0) / u.points.length
                  const isSel = selectedUnitId === u.id
                  return (
                    <button
                      key={u.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUnitId(u.id)
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${cx}%`, top: `${cy}%` }}
                    >
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow"
                        style={{
                          backgroundColor: isSel ? '#2DD4BF' : 'rgba(10,9,8,0.85)',
                          color: isSel ? '#0A0908' : '#D4A017',
                          border: `1px solid ${isSel ? '#2DD4BF' : '#D4A017'}`,
                        }}
                      >
                        {u.name}
                      </span>
                    </button>
                  )
                })}
            </div>

            <p className="mt-2 text-center text-[11px] text-[#6B6560]">
              {isDrawing
                ? 'Click and drag to draw a unit area. Release to save.'
                : 'Click a unit label to select it. Press Add unit to draw a new area.'}
            </p>
          </Card>

          {/* Units list */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-[#6B6560]">
              Units in {tower.name} ({unitsForTower.length})
            </p>
            {unitsForTower.length === 0 ? (
              <EmptyBox label="No units yet — click Add unit to draw one on the floor plan." />
            ) : (
              unitsForTower.map((u) => {
                const isSel = selectedUnitId === u.id
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUnitId(u.id)}
                    className={`cursor-pointer space-y-2 rounded-xl border p-3 transition-colors ${
                      isSel
                        ? 'border-[#2DD4BF] bg-[rgba(45,212,191,0.06)]'
                        : 'border-[rgba(212,160,23,0.15)] bg-[#12100E] hover:border-[rgba(212,160,23,0.3)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Field label="Name">
                        <TextInput
                          value={u.name}
                          onChange={(v) => updateUnit(u.id, { name: v })}
                        />
                      </Field>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void removeUnit(u.id)
                        }}
                        className="self-end rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] p-2 text-[#F87171]"
                        aria-label="Remove unit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="BHK">
                        <TextInput
                          type="number"
                          value={String(u.bhk)}
                          onChange={(v) => updateUnit(u.id, { bhk: Number(v) || 1 })}
                        />
                      </Field>
                      <Field label="Area (sqft)">
                        <TextInput
                          type="number"
                          value={String(u.areaSqft ?? '')}
                          onChange={(v) => updateUnit(u.id, { areaSqft: Number(v) || 0 })}
                        />
                      </Field>
                    </div>
                    <p className="text-[10px] text-[#6B6560]">
                      {u.points?.length ?? 0} vertex{(u.points?.length ?? 0) === 1 ? '' : 'es'}
                    </p>
                    <ImageField
                      label="Layout image"
                      url={u.layoutUrl as string | null | undefined}
                      onStorageId={(id) => updateUnit(u.id, { layoutStorageId: id })}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
      {saveError && (
        <p className="rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-3 py-2 text-xs text-[#F87171]">
          {saveError}
        </p>
      )}
    </div>
  )
}

/* ═══ Panoramas ═══════════════════════════════════════════════════════════ */

function PanoramasTab({ cfg }: { cfg: LegacyCfg }) {
  const addPano = useMutation(api.legacyTowersConfig.addPanorama)
  const removePano = useMutation(api.legacyTowersConfig.removePanorama)
  const genUrl = useMutation(api.legacyTowersConfig.generateUploadUrl)
  const setUnitTypes = useMutation(api.legacyTowersConfig.setUnitTypes)
  const fixHeights = useMutation(api.legacyTowersConfig.fixPanoramaHeights)
  const fixStale = useMutation(api.legacyTowersConfig.fixStaleData)
  const [fixing, setFixing] = useState(false)
  const [fixMsg, setFixMsg] = useState<string | null>(null)
  const [fixingStale, setFixingStale] = useState(false)
  const [fixStaleMsg, setFixStaleMsg] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const reassignUnit = async (unitId: string, newTowerId: string) => {
    const next = cfg.unitTypes.map((u) => {
      const base = sanitizeUnit(u)
      if (u.id !== unitId) return base
      return { ...base, towerId: newTowerId }
    })
    await setUnitTypes({ slug: SLUG, unitTypes: next })
  }

  const [towerId, setTowerId] = useState<string>(cfg.towers[0]?.id ?? 'A')
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  // Always use static HEIGHT_SAMPLES — view page does the same. If we used DB
  // computed heights (3.7m × floor), panoramas would be stored at wrong keys
  // and the viewer would never find them.
  const effectiveHeightSamples = HEIGHT_SAMPLES

  useEffect(() => {
    if (cfg.towers.length === 0) return
    if (!cfg.towers.find((t) => t.id === towerId)) {
      setTowerId(cfg.towers[0].id)
    }
  }, [cfg.towers, towerId])

  const tower = cfg.towers.find((t) => t.id === towerId)
  const units = cfg.unitTypes.filter((u) => u.towerId === towerId || !u.towerId)
  const unitsNoTower = cfg.unitTypes.filter((u) => !u.towerId)

  // cornerId keyed by unit only — one panorama per unit per floor
  const cornerKey = (unitId: string) => `unit_${unitId}`

  const existing = useMemo(() => {
    const m = new Map<string, LegacyCfg['panoramas'][number]>()
    for (const p of cfg.panoramas) {
      m.set(`${p.towerId}|${p.cornerId}|${p.heightM}`, p)
    }
    return m
  }, [cfg.panoramas])

  const totalSlots = units.length * effectiveHeightSamples.length
  const filledSlots = effectiveHeightSamples.reduce(
    (acc, s) =>
      acc + units.filter((u) => existing.has(`${towerId}|${cornerKey(u.id)}|${s.heightM}`)).length,
    0
  )

  const upload = async (unitId: string, heightM: number, file: File): Promise<boolean> => {
    if (!file.type.startsWith('image/')) {
      setUploadError(`"${file.name}" is not an image — skipped.`)
      return false
    }
    const key = `${unitId}#${heightM}`
    setUploadingKey(key)
    setUploadError(null)
    try {
      const uploadUrl = await genUrl({})
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error(`Storage POST ${res.status}`)
      const json = (await res.json()) as { storageId: Id<'_storage'> }
      await addPano({
        slug: SLUG,
        panorama: {
          towerId,
          cornerId: cornerKey(unitId),
          heightM,
          storageId: json.storageId,
          unitId,
          vertexIndex: 0,
        },
      })
      return true
    } catch (err) {
      console.error('Upload failed', { file: file.name, unitId, heightM, err })
      setUploadError(`Upload failed for ${file.name}: ${(err as Error).message ?? 'unknown'}`)
      return false
    } finally {
      setUploadingKey(null)
    }
  }

  const remove = async (unitId: string, heightM: number) => {
    await removePano({
      slug: SLUG,
      towerId,
      cornerId: cornerKey(unitId),
      heightM,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionHeader title="Panoramas" />
          <p className="mt-1 text-sm text-[#A8A29E]">
            One 360° image per unit per floor section. Click a cell to upload or replace.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setFixingStale(true)
                setFixStaleMsg(null)
                try {
                  const result = await fixStale({ slug: SLUG })
                  const r = result as { towersFixed: number; unitsFixed: number }
                  setFixStaleMsg(`Done — ${r.towersFixed} towers, ${r.unitsFixed} units corrected`)
                } catch (err) {
                  setFixStaleMsg(`Error: ${(err as Error).message}`)
                } finally {
                  setFixingStale(false)
                }
              }}
              disabled={fixingStale}
              className="shrink-0 flex items-center gap-2 rounded-lg border border-[rgba(45,212,191,0.25)] bg-[rgba(45,212,191,0.06)] px-3 py-2 text-xs font-semibold text-[#2DD4BF] hover:bg-[rgba(45,212,191,0.12)] disabled:opacity-50"
              title="Patches stale DB data: tagline, totalFloors (50), heightSamples, tower hero coords, and unit BHK values"
            >
              {fixingStale ? <Loader2 size={12} className="animate-spin" /> : null}
              Fix stale data
            </button>
            <button
              onClick={async () => {
                setFixing(true)
                setFixMsg(null)
                try {
                  const result = await fixHeights({ slug: SLUG })
                  const r = result as { before: number; after: number }
                  setFixMsg(`Done — ${r.before} → ${r.after} panoramas`)
                } catch (err) {
                  setFixMsg(`Error: ${(err as Error).message}`)
                } finally {
                  setFixing(false)
                }
              }}
              disabled={fixing}
              className="shrink-0 flex items-center gap-2 rounded-lg border border-[rgba(251,122,84,0.25)] bg-[rgba(251,122,84,0.06)] px-3 py-2 text-xs font-semibold text-[#FB7A54] hover:bg-[rgba(251,122,84,0.12)] disabled:opacity-50"
              title="Remaps panoramas stored at wrong heights (35m→37m, 67m→74m, etc.) to the correct static keys"
            >
              {fixing ? <Loader2 size={12} className="animate-spin" /> : null}
              Fix height keys
            </button>
          </div>
          {fixStaleMsg && (
            <span className="text-[10px] text-[#A8A29E]">{fixStaleMsg}</span>
          )}
          {fixMsg && (
            <span className="text-[10px] text-[#A8A29E]">{fixMsg}</span>
          )}
        </div>
      </div>

      {uploadError && (
        <p className="rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-3 py-2 text-xs text-[#F87171]">
          {uploadError}
        </p>
      )}

      <Card>
        <Field label="Tower">
          <Select value={towerId} onChange={setTowerId}>
            {cfg.towers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-[11px] text-[#6B6560]">
          {effectiveHeightSamples.length} floor section{effectiveHeightSamples.length === 1 ? '' : 's'} ·{' '}
          {units.length} unit{units.length === 1 ? '' : 's'} · {filledSlots}/{totalSlots} uploaded
        </p>
      </Card>

      {unitsNoTower.length > 0 && tower && (
        <div className="rounded-lg border border-[rgba(251,122,84,0.25)] bg-[rgba(251,122,84,0.06)] p-3 text-xs">
          <p className="font-semibold text-[#FB7A54]">
            {unitsNoTower.length} unit{unitsNoTower.length === 1 ? '' : 's'} not assigned to any tower
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unitsNoTower.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 rounded-md border border-[rgba(212,160,23,0.15)] bg-[#1B1916] px-2 py-1"
              >
                <span className="text-[#F5F3EF]">{u.name}</span>
                <button
                  onClick={() => void reassignUnit(u.id, towerId)}
                  className="text-[10px] text-[#2DD4BF] hover:underline"
                >
                  Assign to {tower.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {effectiveHeightSamples.length === 0 ? (
        <EmptyBox label="No floor sections yet. Open the Project tab and set Total floors + Floors per section." />
      ) : !tower ? (
        <EmptyBox label="Add a tower first." />
      ) : units.length === 0 ? (
        <EmptyBox label={`No units in ${tower.name}. Open the Floor plan tab and add units first.`} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#6B6560]">
                  <th className="px-2 py-2 text-left">Floor</th>
                  {units.map((u) => (
                    <th key={u.id} className="px-2 py-2 text-center min-w-[64px]">
                      <div className="font-medium text-[#F5F3EF]">{u.name}</div>
                      <div className="text-[9px] text-[#6B6560]">{resolveUnitBhk(towerId, u.name, u.bhk)} BHK</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {effectiveHeightSamples.map((s) => (
                  <tr key={s.floor} className="border-t border-[rgba(212,160,23,0.08)]">
                    <td className="px-2 py-2 whitespace-nowrap font-medium text-[#D4A017]">
                      {s.label}
                    </td>
                    {units.map((u) => {
                      const ck = cornerKey(u.id)
                      const entry = existing.get(`${towerId}|${ck}|${s.heightM}`)
                      const busy = uploadingKey === `${u.id}#${s.heightM}`
                      return (
                        <td key={u.id} className="px-1 py-1 text-center">
                          <label
                            className={`group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                              entry
                                ? 'border-[#2DD4BF] bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]'
                                : 'border-dashed border-[rgba(212,160,23,0.25)] bg-[#1B1916] text-[#6B6560] hover:border-[#D4A017] hover:text-[#D4A017]'
                            }`}
                            title={
                              entry
                                ? `${u.name} · ${s.label} — click to replace`
                                : `${u.name} · ${s.label} — click to upload`
                            }
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : entry ? (
                              <ImageIcon size={14} />
                            ) : (
                              <Upload size={14} />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={busy}
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) void upload(u.id, s.heightM, f)
                                e.currentTarget.value = ''
                              }}
                            />
                            {entry && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  void remove(u.id, s.heightM)
                                }}
                                className="absolute -right-1 -top-1 rounded-full bg-[#F87171] p-0.5 text-[#0A0908] opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label="Remove panorama"
                              >
                                <Trash2 size={8} />
                              </button>
                            )}
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ═══ Balcony Views ═══════════════════════════════════════════════════════ */

function BalconyViewTab({ cfg }: { cfg: LegacyCfg }) {
  const setUnitBalconyYaw = useMutation(api.legacyTowersConfig.setUnitBalconyYaw)
  const setUnitBalconyYawAllFloors = useMutation(api.legacyTowersConfig.setUnitBalconyYawAllFloors)
  const [selectedTower, setSelectedTower] = useState(cfg.towers[0]?.id ?? 'A')
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [selectedHeight, setSelectedHeight] = useState<HeightSample>(HEIGHT_SAMPLES[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicated, setDuplicated] = useState(false)
  const viewDirRef = useRef<(() => { yaw: number; pitch: number; zoom?: number } | null) | null>(null)

  // Hotspot placement state
  const setUnitBalconyHotspots = useMutation(api.legacyTowersConfig.setUnitBalconyHotspots)
  const setUnitBalconyHotspotsAllFloors = useMutation(api.legacyTowersConfig.setUnitBalconyHotspotsAllFloors)
  const setUnitBalconyStickyLabelsAllFloors = useMutation(api.legacyTowersConfig.setUnitBalconyStickyLabelsAllFloors)
  const setUnitBalconyStickyLabelsAllPlan = useMutation(api.legacyTowersConfig.setUnitBalconyStickyLabelsAllPlan)
  const [copyingHotspots, setCopyingHotspots] = useState(false)
  const [copyingLabels, setCopyingLabels] = useState(false)
  const [copyingLabelsPlan, setCopyingLabelsPlan] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [pending, setPending] = useState<{ x: number; y: number; z: number } | null>(null)
  const [hsTitle, setHsTitle] = useState('')
  const [hsDesc, setHsDesc] = useState('')
  const [hsSaving, setHsSaving] = useState(false)

  // Sticky label state — text-only, pinned at the clicked point on the panorama
  const setUnitBalconyStickyLabels = useMutation(api.legacyTowersConfig.setUnitBalconyStickyLabels)
  const [labelText, setLabelText] = useState('')
  const [labelSaving, setLabelSaving] = useState(false)
  const [placingLabel, setPlacingLabel] = useState(false)
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number; z: number } | null>(null)

  const towerUnits = useMemo(
    () => cfg.unitTypes.filter((u) => u.towerId === selectedTower && (u.points?.length ?? 0) >= 3),
    [cfg.unitTypes, selectedTower],
  )
  const selectedUnit = useMemo(
    () => cfg.unitTypes.find((u) => u.id === selectedUnitId) ?? null,
    [cfg.unitTypes, selectedUnitId],
  )

  // Current floor's calibrated yaw for selected unit
  const currentYawRad = useMemo(() => {
    if (!selectedUnit?.balconyYawRads) return undefined
    return selectedUnit.balconyYawRads.find((e) => e.heightM === selectedHeight.heightM)?.yawRad
  }, [selectedUnit, selectedHeight])

  // Hotspots for the selected unit at the current floor
  const floorHotspots = useMemo(
    () => (selectedUnit?.balconyHotspots ?? []).filter((h) => h.heightM === selectedHeight.heightM),
    [selectedUnit, selectedHeight],
  )

  // Sticky labels for the selected unit at the current floor
  const floorStickyLabels = useMemo(
    () => (selectedUnit?.balconyStickyLabels ?? []).filter((l) => l.heightM === selectedHeight.heightM),
    [selectedUnit, selectedHeight],
  )

  // Positioned labels render anchored at their click point; legacy (positionless)
  // labels fall back to the top banner.
  const positionedStickyLabels = useMemo(
    () => floorStickyLabels.filter((l) => typeof l.x === 'number'),
    [floorStickyLabels],
  )
  const bannerStickyLabels = useMemo(
    () => floorStickyLabels.filter((l) => typeof l.x !== 'number'),
    [floorStickyLabels],
  )

  // Hotspots + positioned sticky labels mapped to PanoramaViewer's HotspotData shape
  const viewerHotspots = useMemo(
    () => [
      ...floorHotspots.map((h) => ({
        _id: h.id,
        sceneId: '',
        type: 'info' as const,
        position: { x: h.x, y: h.y, z: h.z },
        title: h.title,
        description: h.description,
        lineHeight: h.lineHeight,
      })),
      ...positionedStickyLabels.map((l) => ({
        _id: l.id,
        sceneId: '',
        type: 'info' as const,
        markerStyle: 'sticky' as const,
        readOnly: true,
        position: { x: l.x as number, y: l.y as number, z: l.z as number },
        title: l.text,
        size: l.size,
      })),
    ],
    [floorHotspots, positionedStickyLabels],
  )

  // Panorama for selected unit + floor (fall back to any panorama for tower+floor)
  const panoramaUrl = useMemo(() => {
    if (!selectedTower) return null
    if (selectedUnitId) {
      const unitKey = `unit_${selectedUnitId}`
      const unitMatch = cfg.panoramas.find(
        (p) => p.towerId === selectedTower && p.cornerId === unitKey && p.heightM === selectedHeight.heightM && p.imageUrl
      )
      if (unitMatch?.imageUrl) return unitMatch.imageUrl
      // fallback: any height for this unit
      const anyHeight = cfg.panoramas.find(
        (p) => p.towerId === selectedTower && p.cornerId === unitKey && p.imageUrl
      )
      if (anyHeight?.imageUrl) return anyHeight.imageUrl
    }
    // fallback: any panorama for tower at this height
    const towerMatch = cfg.panoramas.find(
      (p) => p.towerId === selectedTower && p.heightM === selectedHeight.heightM && p.imageUrl
    )
    if (towerMatch?.imageUrl) return towerMatch.imageUrl
    // last resort: any panorama for tower
    return cfg.panoramas.find((p) => p.towerId === selectedTower && p.imageUrl)?.imageUrl ?? null
  }, [cfg.panoramas, selectedTower, selectedUnitId, selectedHeight])

  const handleSetBalconyDir = useCallback(async () => {
    if (!selectedUnitId || !viewDirRef.current) return
    const viewDir = viewDirRef.current()
    if (!viewDir) return
    const balconyYawRad = -viewDir.yaw * Math.PI / 180
    setSaving(true)
    try {
      await setUnitBalconyYaw({
        slug: cfg.slug,
        unitId: selectedUnitId,
        heightM: selectedHeight.heightM,
        balconyYawRad,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [selectedUnitId, selectedHeight, setUnitBalconyYaw, cfg.slug])

  const handleClearFloor = useCallback(async () => {
    if (!selectedUnitId) return
    await setUnitBalconyYaw({
      slug: cfg.slug,
      unitId: selectedUnitId,
      heightM: selectedHeight.heightM,
      balconyYawRad: null,
    })
  }, [selectedUnitId, selectedHeight, setUnitBalconyYaw, cfg.slug])

  const handleDuplicateToAllFloors = useCallback(async () => {
    if (!selectedUnitId || currentYawRad === undefined) return
    setDuplicating(true)
    try {
      await setUnitBalconyYawAllFloors({
        slug: cfg.slug,
        unitId: selectedUnitId,
        yawRad: currentYawRad,
        heightMs: HEIGHT_SAMPLES.map((s) => s.heightM),
      })
      setDuplicated(true)
      setTimeout(() => setDuplicated(false), 2000)
    } finally {
      setDuplicating(false)
    }
  }, [selectedUnitId, currentYawRad, setUnitBalconyYawAllFloors, cfg.slug])

  // Commit a precise angle (degrees) typed or nudged in the angle field
  const commitDeg = useCallback(
    async (deg: number) => {
      if (!selectedUnitId || Number.isNaN(deg)) return
      await setUnitBalconyYaw({
        slug: cfg.slug,
        unitId: selectedUnitId,
        heightM: selectedHeight.heightM,
        balconyYawRad: (deg * Math.PI) / 180,
      })
    },
    [selectedUnitId, selectedHeight, setUnitBalconyYaw, cfg.slug],
  )

  // Persist the full hotspot list for the current unit + floor
  const persistHotspots = useCallback(
    async (next: typeof floorHotspots) => {
      if (!selectedUnitId) return
      await setUnitBalconyHotspots({
        slug: cfg.slug,
        unitId: selectedUnitId,
        heightM: selectedHeight.heightM,
        hotspots: next.map((h) => ({
          id: h.id,
          x: h.x,
          y: h.y,
          z: h.z,
          title: h.title,
          description: h.description,
          lineHeight: h.lineHeight,
        })),
      })
    },
    [selectedUnitId, selectedHeight, setUnitBalconyHotspots, cfg.slug],
  )

  const handleAddHotspot = useCallback(async () => {
    if (!pending || !hsTitle.trim()) return
    setHsSaving(true)
    try {
      const newHs = {
        id: `hs_${Date.now()}`,
        heightM: selectedHeight.heightM,
        x: pending.x,
        y: pending.y,
        z: pending.z,
        title: hsTitle.trim(),
        description: hsDesc.trim() || undefined,
      }
      await persistHotspots([...floorHotspots, newHs])
      setPending(null)
      setHsTitle('')
      setHsDesc('')
    } finally {
      setHsSaving(false)
    }
  }, [pending, hsTitle, hsDesc, selectedHeight, floorHotspots, persistHotspots])

  const handleDeleteHotspot = useCallback(
    async (id: string) => {
      await persistHotspots(floorHotspots.filter((h) => h.id !== id))
    },
    [floorHotspots, persistHotspots],
  )

  // Adjust a hotspot's connecting-line length (px). Default 32, clamped 0–120.
  const adjustHotspotLine = useCallback(
    async (id: string, delta: number) => {
      const next = floorHotspots.map((h) =>
        h.id === id ? { ...h, lineHeight: Math.max(0, Math.min(120, (h.lineHeight ?? 32) + delta)) } : h,
      )
      await persistHotspots(next)
    },
    [floorHotspots, persistHotspots],
  )

  const handleCopyHotspotsAllFloors = useCallback(async () => {
    if (!selectedUnitId || floorHotspots.length === 0) return
    setCopyingHotspots(true)
    try {
      await setUnitBalconyHotspotsAllFloors({
        slug: cfg.slug,
        unitId: selectedUnitId,
        heightMs: HEIGHT_SAMPLES.map((s) => s.heightM),
        hotspots: floorHotspots.map((h) => ({
          id: h.id,
          x: h.x,
          y: h.y,
          z: h.z,
          title: h.title,
          description: h.description,
          lineHeight: h.lineHeight,
        })),
      })
    } finally {
      setCopyingHotspots(false)
    }
  }, [selectedUnitId, floorHotspots, setUnitBalconyHotspotsAllFloors, cfg.slug])

  // Persist the full sticky-label list for the current unit + floor
  const persistStickyLabels = useCallback(
    async (next: typeof floorStickyLabels) => {
      if (!selectedUnitId) return
      await setUnitBalconyStickyLabels({
        slug: cfg.slug,
        unitId: selectedUnitId,
        heightM: selectedHeight.heightM,
        labels: next.map((l) => ({ id: l.id, text: l.text, x: l.x, y: l.y, z: l.z, size: l.size })),
      })
    },
    [selectedUnitId, selectedHeight, setUnitBalconyStickyLabels, cfg.slug],
  )

  const handleAddStickyLabel = useCallback(async () => {
    const text = labelText.trim()
    if (!text || !pendingLabel) return
    setLabelSaving(true)
    try {
      const newLabel = {
        id: `sl_${Date.now()}`,
        heightM: selectedHeight.heightM,
        text,
        x: pendingLabel.x,
        y: pendingLabel.y,
        z: pendingLabel.z,
      }
      await persistStickyLabels([...floorStickyLabels, newLabel])
      setLabelText('')
      setPendingLabel(null)
      setPlacingLabel(false)
    } finally {
      setLabelSaving(false)
    }
  }, [labelText, pendingLabel, selectedHeight, floorStickyLabels, persistStickyLabels])

  const handleDeleteStickyLabel = useCallback(
    async (id: string) => {
      await persistStickyLabels(floorStickyLabels.filter((l) => l.id !== id))
    },
    [floorStickyLabels, persistStickyLabels],
  )

  // Adjust a sticky label's font size (px). Default 12, clamped 8–32.
  const adjustLabelSize = useCallback(
    async (id: string, delta: number) => {
      const next = floorStickyLabels.map((l) =>
        l.id === id ? { ...l, size: Math.max(8, Math.min(32, (l.size ?? 12) + delta)) } : l,
      )
      await persistStickyLabels(next)
    },
    [floorStickyLabels, persistStickyLabels],
  )

  const handleCopyLabelsAllFloors = useCallback(async () => {
    if (!selectedUnitId || floorStickyLabels.length === 0) return
    setCopyingLabels(true)
    try {
      await setUnitBalconyStickyLabelsAllFloors({
        slug: cfg.slug,
        unitId: selectedUnitId,
        heightMs: HEIGHT_SAMPLES.map((s) => s.heightM),
        labels: floorStickyLabels.map((l) => ({
          id: l.id,
          text: l.text,
          x: l.x,
          y: l.y,
          z: l.z,
          size: l.size,
        })),
      })
    } finally {
      setCopyingLabels(false)
    }
  }, [selectedUnitId, floorStickyLabels, setUnitBalconyStickyLabelsAllFloors, cfg.slug])

  // Copy current floor's sticky labels to every unit across every tower and
  // every floor in the entire plan. Overwrites each unit's set on those heights.
  const handleCopyLabelsAllPlan = useCallback(async () => {
    if (floorStickyLabels.length === 0) return
    setCopyingLabelsPlan(true)
    try {
      await setUnitBalconyStickyLabelsAllPlan({
        slug: cfg.slug,
        heightMs: HEIGHT_SAMPLES.map((s) => s.heightM),
        labels: floorStickyLabels.map((l) => ({
          id: l.id,
          text: l.text,
          x: l.x,
          y: l.y,
          z: l.z,
          size: l.size,
        })),
      })
    } finally {
      setCopyingLabelsPlan(false)
    }
  }, [floorStickyLabels, setUnitBalconyStickyLabelsAllPlan, cfg.slug])

  const cancelPlacing = useCallback(() => {
    setPlacing(false)
    setPending(null)
    setHsTitle('')
    setHsDesc('')
  }, [])

  const cancelPlacingLabel = useCallback(() => {
    setPlacingLabel(false)
    setPendingLabel(null)
    setLabelText('')
  }, [])

  // Start hotspot placement — cancel any in-progress label placement first
  const startPlacingHotspot = useCallback(() => {
    setPlacingLabel(false)
    setPendingLabel(null)
    setLabelText('')
    setPlacing(true)
  }, [])

  // Start label placement — cancel any in-progress hotspot placement first
  const startPlacingLabel = useCallback(() => {
    setPlacing(false)
    setPending(null)
    setHsTitle('')
    setHsDesc('')
    setPlacingLabel(true)
  }, [])

  // Route a sphere click to whichever placement mode is active
  const handleSphereClick = useCallback(
    (pos: { x: number; y: number; z: number }) => {
      if (placingLabel) setPendingLabel(pos)
      else if (placing) setPending(pos)
    },
    [placing, placingLabel],
  )

  // Reset placement state when the admin switches unit or floor
  useEffect(() => {
    setPlacing(false)
    setPending(null)
    setHsTitle('')
    setHsDesc('')
    setPlacingLabel(false)
    setPendingLabel(null)
    setLabelText('')
  }, [selectedUnitId, selectedHeight])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-5">
        <h2 className="mb-1 text-base font-semibold text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
          Balcony View Calibration
        </h2>
        <p className="text-xs text-[#6B6560]">
          Pick tower → unit → floor. Drag the panorama until the crosshair points at the balcony direction. Click &quot;Set balcony direction&quot; to save for that floor.
        </p>
      </div>

      {/* Tower + Unit + Floor picker */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full lg:w-64 shrink-0 space-y-3">
          {/* Tower selector */}
          <div className="rounded-xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-[#6B6560]">Tower</p>
            <div className="flex gap-2">
              {cfg.towers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTower(t.id); setSelectedUnitId(null) }}
                  className="flex-1 rounded-lg py-2 text-sm font-bold transition-all cursor-pointer"
                  style={{
                    background: selectedTower === t.id ? 'rgba(212,160,23,0.15)' : '#1B1916',
                    border: `1px solid ${selectedTower === t.id ? '#D4A017' : 'rgba(212,160,23,0.1)'}`,
                    color: selectedTower === t.id ? '#D4A017' : '#A8A29E',
                  }}
                >
                  {t.id}
                </button>
              ))}
            </div>
          </div>

          {/* Unit list */}
          <div className="rounded-xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-[#6B6560]">Unit</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {towerUnits.length === 0 && (
                <p className="text-xs text-[#6B6560]">No units configured for this tower.</p>
              )}
              {towerUnits.map((u) => {
                const isSelected = selectedUnitId === u.id
                const calibratedCount = u.balconyYawRads?.length ?? 0
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUnitId(u.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all cursor-pointer"
                    style={{
                      background: isSelected ? 'rgba(212,160,23,0.1)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(212,160,23,0.4)' : 'transparent'}`,
                    }}
                  >
                    <span style={{ color: isSelected ? '#F5F3EF' : '#A8A29E' }}>{u.name}</span>
                    <span className="text-[10px]" style={{ color: calibratedCount > 0 ? '#34D399' : '#3A3530' }}>
                      {calibratedCount > 0 ? `${calibratedCount}/${HEIGHT_SAMPLES.length}` : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Floor selector */}
          <div className="rounded-xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-[#6B6560]">Floor</p>
            <div className="space-y-1">
              {HEIGHT_SAMPLES.map((s) => {
                const isSelected = selectedHeight.heightM === s.heightM
                const isCalibrated = !!selectedUnit?.balconyYawRads?.find((e) => e.heightM === s.heightM)
                return (
                  <button
                    key={s.heightM}
                    onClick={() => setSelectedHeight(s)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-all cursor-pointer"
                    style={{
                      background: isSelected ? 'rgba(212,160,23,0.1)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(212,160,23,0.4)' : 'transparent'}`,
                    }}
                  >
                    <span style={{ color: isSelected ? '#F5F3EF' : '#A8A29E' }}>{s.label}</span>
                    <span style={{ color: isCalibrated ? '#34D399' : '#3A3530', fontSize: 10 }}>
                      {isCalibrated ? '✓' : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panorama viewer + controls */}
        <div className="flex-1 space-y-3">
          {!panoramaUrl ? (
            <div
              className="flex h-80 items-center justify-center rounded-2xl"
              style={{ background: '#12100E', border: '1px solid rgba(212,160,23,0.12)' }}
            >
              <p className="text-sm text-[#6B6560]">No panorama uploaded for Tower {selectedTower} yet.</p>
            </div>
          ) : !selectedUnitId ? (
            <div
              className="flex h-80 items-center justify-center rounded-2xl"
              style={{ background: '#12100E', border: '1px solid rgba(212,160,23,0.12)' }}
            >
              <p className="text-sm text-[#6B6560]">Select a unit to calibrate its balcony direction.</p>
            </div>
          ) : (
            <>
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ height: '420px', border: '1px solid rgba(212,160,23,0.15)' }}
              >
                <PanoramaViewer
                  key={`${selectedUnitId}-${selectedHeight.heightM}`}
                  imageUrl={panoramaUrl}
                  initialYaw={currentYawRad}
                  polarClampMin={Math.PI / 2}
                  polarClampMax={Math.PI / 2}
                  onViewDirectionReady={(getter) => { viewDirRef.current = getter }}
                  hotspots={viewerHotspots}
                  isEditing={(placing && !pending) || (placingLabel && !pendingLabel)}
                  onSphereClick={handleSphereClick}
                />
                {!placing && !placingLabel && (
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ zIndex: 10 }}
                  >
                    <div style={{ position: 'relative', width: 32, height: 32 }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, background: 'rgba(212,160,23,0.8)' }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, background: 'rgba(212,160,23,0.8)' }} />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: '#D4A017' }} />
                    </div>
                  </div>
                )}
                {/* Floor badge */}
                <div
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold pointer-events-none"
                  style={{ background: 'rgba(10,9,8,0.8)', border: '1px solid rgba(212,160,23,0.3)', color: '#D4A017' }}
                >
                  {selectedHeight.label} · {selectedUnit?.name}
                </div>
                {/* Banner — legacy positionless sticky labels along the top */}
                {bannerStickyLabels.length > 0 && (
                  <div
                    className="absolute left-1/2 top-3 flex max-w-[70%] flex-wrap justify-center gap-1.5 -translate-x-1/2 pointer-events-none"
                  >
                    {bannerStickyLabels.map((l) => (
                      <span
                        key={l.id}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          background: 'rgba(10,9,8,0.82)',
                          border: '1px solid rgba(212,160,23,0.45)',
                          color: '#D4A017',
                        }}
                      >
                        <Tag size={10} strokeWidth={2} />
                        {l.text}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="absolute inset-x-0 bottom-3 text-center text-xs pointer-events-none"
                  style={{ color: placing || placingLabel ? '#2DD4BF' : 'rgba(168,162,158,0.6)' }}
                >
                  {placing
                    ? pending
                      ? 'Fill in the hotspot details below'
                      : 'Click anywhere on the panorama to drop a hotspot'
                    : placingLabel
                    ? pendingLabel
                      ? 'Type the label text below'
                      : 'Click anywhere on the panorama to pin a label'
                    : 'Drag until crosshair aligns with balcony direction'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 gap-y-2">
                <button
                  onClick={handleSetBalconyDir}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                  style={{ background: saved ? '#34D399' : '#D4A017', color: '#0A0908' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saved ? 'Saved!' : saving ? 'Saving…' : `Set for ${selectedHeight.label}`}
                </button>

                {currentYawRad !== undefined && (
                  <button
                    onClick={handleDuplicateToAllFloors}
                    disabled={duplicating}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                    style={{
                      background: duplicated ? 'rgba(52,211,153,0.12)' : 'rgba(45,212,191,0.1)',
                      border: `1px solid ${duplicated ? 'rgba(52,211,153,0.4)' : 'rgba(45,212,191,0.25)'}`,
                      color: duplicated ? '#34D399' : '#2DD4BF',
                    }}
                  >
                    {duplicating ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                    {duplicated ? 'Copied to all floors!' : duplicating ? 'Copying…' : 'Copy to all floors'}
                  </button>
                )}

                {currentYawRad !== undefined && (
                  <button
                    onClick={handleClearFloor}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs text-[#A8A29E] transition-all cursor-pointer hover:text-[#F87171]"
                    style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}
                  >
                    <Trash2 size={12} /> Clear floor
                  </button>
                )}

                {currentYawRad !== undefined && (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}
                  >
                    <span className="text-xs font-semibold text-[#34D399]">
                      ✓ {selectedHeight.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6560]">
                      Angle
                    </span>
                    <button
                      onClick={() => commitDeg(Number(((currentYawRad * 180) / Math.PI - 1).toFixed(1)))}
                      className="flex h-6 w-6 items-center justify-center rounded-md cursor-pointer transition-all hover:bg-[rgba(212,160,23,0.12)]"
                      style={{ border: '1px solid rgba(212,160,23,0.2)', color: '#A8A29E' }}
                      aria-label="Decrease angle by 1 degree"
                    >
                      <Minus size={11} />
                    </button>
                    <div className="relative flex items-center">
                      <input
                        key={`angle-${selectedUnitId}-${selectedHeight.heightM}-${currentYawRad}`}
                        type="number"
                        step="0.1"
                        defaultValue={((currentYawRad * 180) / Math.PI).toFixed(1)}
                        onBlur={(e) => commitDeg(parseFloat(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        className="w-20 rounded-md bg-[#1B1916] py-1 pl-2.5 pr-5 text-center text-xs font-semibold text-[#F5F3EF] outline-none focus:ring-1 focus:ring-[#D4A017] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        aria-label="Balcony angle in degrees"
                      />
                      <span className="pointer-events-none absolute right-2 text-xs text-[#6B6560]">
                        °
                      </span>
                    </div>
                    <button
                      onClick={() => commitDeg(Number(((currentYawRad * 180) / Math.PI + 1).toFixed(1)))}
                      className="flex h-6 w-6 items-center justify-center rounded-md cursor-pointer transition-all hover:bg-[rgba(212,160,23,0.12)]"
                      style={{ border: '1px solid rgba(212,160,23,0.2)', color: '#A8A29E' }}
                      aria-label="Increase angle by 1 degree"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Hotspots ── */}
              <div className="rounded-xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-[#6B6560]">
                    Hotspots — {selectedHeight.label} · {floorHotspots.length}
                  </p>
                  <div className="flex items-center gap-2">
                    {floorHotspots.length > 0 && (
                      <button
                        onClick={handleCopyHotspotsAllFloors}
                        disabled={copyingHotspots}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)', color: '#2DD4BF' }}
                      >
                        {copyingHotspots ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                        Copy to all floors
                      </button>
                    )}
                    <button
                      onClick={() => (placing ? cancelPlacing() : startPlacingHotspot())}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        background: placing ? 'rgba(248,113,113,0.1)' : 'rgba(45,212,191,0.1)',
                        border: `1px solid ${placing ? 'rgba(248,113,113,0.3)' : 'rgba(45,212,191,0.3)'}`,
                        color: placing ? '#F87171' : '#2DD4BF',
                      }}
                    >
                      {placing ? <X size={12} /> : <Plus size={12} />}
                      {placing ? 'Cancel' : 'Hotspot'}
                    </button>
                  </div>
                </div>

                {/* New hotspot form — shown after a click drops a point */}
                {pending && (
                  <div className="mb-3 space-y-2 rounded-lg bg-[#1B1916] p-3">
                    <input
                      autoFocus
                      value={hsTitle}
                      onChange={(e) => setHsTitle(e.target.value)}
                      placeholder="Hotspot title (e.g. Hussain Sagar Lake)"
                      className="w-full rounded-md bg-[#12100E] px-3 py-2 text-xs text-[#F5F3EF] outline-none focus:ring-1 focus:ring-[#D4A017]"
                    />
                    <textarea
                      value={hsDesc}
                      onChange={(e) => setHsDesc(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full resize-none rounded-md bg-[#12100E] px-3 py-2 text-xs text-[#F5F3EF] outline-none focus:ring-1 focus:ring-[#D4A017]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddHotspot}
                        disabled={hsSaving || !hsTitle.trim()}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                        style={{ background: '#D4A017', color: '#0A0908' }}
                      >
                        {hsSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Add hotspot
                      </button>
                      <button
                        onClick={() => { setPending(null); setHsTitle(''); setHsDesc('') }}
                        className="rounded-lg px-3 py-1.5 text-xs text-[#A8A29E] transition-all cursor-pointer hover:text-[#F5F3EF]"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing hotspots list */}
                {floorHotspots.length === 0 && !pending ? (
                  <p className="text-xs text-[#6B6560]">
                    {placing
                      ? 'Click the panorama to place your first hotspot.'
                      : 'No hotspots on this floor yet. Click "Hotspot" to add one.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {floorHotspots.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: '#1B1916', border: '1px solid rgba(212,160,23,0.08)' }}
                      >
                        <MapPin size={13} style={{ color: '#2DD4BF', flexShrink: 0 }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[#F5F3EF]">{h.title}</p>
                          {h.description && (
                            <p className="truncate text-[11px] text-[#6B6560]">{h.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1" title="Connecting line length">
                          <span className="text-[9px] uppercase tracking-wider text-[#6B6560]">Line</span>
                          <button
                            onClick={() => adjustHotspotLine(h.id, -8)}
                            className="flex h-5 w-5 items-center justify-center rounded cursor-pointer transition-all hover:bg-[rgba(45,212,191,0.12)]"
                            style={{ border: '1px solid rgba(45,212,191,0.2)', color: '#A8A29E' }}
                            aria-label="Shorten line"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-6 text-center text-[10px] font-semibold tabular-nums text-[#A8A29E]">
                            {h.lineHeight ?? 32}
                          </span>
                          <button
                            onClick={() => adjustHotspotLine(h.id, 8)}
                            className="flex h-5 w-5 items-center justify-center rounded cursor-pointer transition-all hover:bg-[rgba(45,212,191,0.12)]"
                            style={{ border: '1px solid rgba(45,212,191,0.2)', color: '#A8A29E' }}
                            aria-label="Lengthen line"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteHotspot(h.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md cursor-pointer transition-all hover:bg-[rgba(248,113,113,0.12)]"
                          style={{ color: '#6B6560' }}
                          aria-label={`Delete hotspot ${h.title}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sticky labels — click to pin text at a point on the panorama ── */}
              <div className="rounded-xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-[#6B6560]">
                    Sticky labels — {selectedHeight.label} · {floorStickyLabels.length}
                  </p>
                  <div className="flex items-center gap-2">
                    {floorStickyLabels.length > 0 && (
                      <button
                        onClick={handleCopyLabelsAllFloors}
                        disabled={copyingLabels}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.25)', color: '#D4A017' }}
                      >
                        {copyingLabels ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                        Copy to all floors
                      </button>
                    )}
                    {floorStickyLabels.length > 0 && (
                      <button
                        onClick={handleCopyLabelsAllPlan}
                        disabled={copyingLabelsPlan}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.35)', color: '#D4A017' }}
                        title="Apply to every unit across every tower and every floor"
                      >
                        {copyingLabelsPlan ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                        Copy to entire plan
                      </button>
                    )}
                    <button
                      onClick={() => (placingLabel ? cancelPlacingLabel() : startPlacingLabel())}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        background: placingLabel ? 'rgba(248,113,113,0.1)' : 'rgba(212,160,23,0.1)',
                        border: `1px solid ${placingLabel ? 'rgba(248,113,113,0.3)' : 'rgba(212,160,23,0.3)'}`,
                        color: placingLabel ? '#F87171' : '#D4A017',
                      }}
                    >
                      {placingLabel ? <X size={12} /> : <Plus size={12} />}
                      {placingLabel ? 'Cancel' : 'Label'}
                    </button>
                  </div>
                </div>

                {/* New label form — shown after a click pins a point */}
                {pendingLabel && (
                  <div className="mb-3 space-y-2 rounded-lg bg-[#1B1916] p-3">
                    <input
                      autoFocus
                      value={labelText}
                      onChange={(e) => setLabelText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleAddStickyLabel() }}
                      placeholder="Label text (e.g. Hussain Sagar this side)"
                      className="w-full rounded-md bg-[#12100E] px-3 py-2 text-xs text-[#F5F3EF] outline-none focus:ring-1 focus:ring-[#D4A017]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddStickyLabel}
                        disabled={labelSaving || !labelText.trim()}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                        style={{ background: '#D4A017', color: '#0A0908' }}
                      >
                        {labelSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Pin label
                      </button>
                      <button
                        onClick={() => { setPendingLabel(null); setLabelText('') }}
                        className="rounded-lg px-3 py-1.5 text-xs text-[#A8A29E] transition-all cursor-pointer hover:text-[#F5F3EF]"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing sticky labels */}
                {floorStickyLabels.length === 0 && !pendingLabel ? (
                  <p className="text-xs text-[#6B6560]">
                    {placingLabel
                      ? 'Click the panorama to pin your first label.'
                      : 'No sticky labels on this floor yet. Click "Label" to pin one.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {floorStickyLabels.map((l) => {
                      const positionless = typeof l.x !== 'number'
                      return (
                        <div
                          key={l.id}
                          className="flex items-center gap-2 rounded-lg px-3 py-2"
                          style={{ background: '#1B1916', border: '1px solid rgba(212,160,23,0.08)' }}
                        >
                          <Tag size={13} style={{ color: '#D4A017', flexShrink: 0 }} />
                          <p className="min-w-0 flex-1 truncate text-xs font-medium text-[#F5F3EF]">{l.text}</p>
                          {positionless ? (
                            <span className="shrink-0 text-[10px] text-[#6B6560]" title="Legacy label — shows in the top banner, not pinned">
                              banner
                            </span>
                          ) : (
                            <div className="flex shrink-0 items-center gap-1" title="Label text size">
                              <span className="text-[9px] uppercase tracking-wider text-[#6B6560]">Size</span>
                              <button
                                onClick={() => adjustLabelSize(l.id, -1)}
                                className="flex h-5 w-5 items-center justify-center rounded cursor-pointer transition-all hover:bg-[rgba(212,160,23,0.12)]"
                                style={{ border: '1px solid rgba(212,160,23,0.2)', color: '#A8A29E' }}
                                aria-label="Decrease label size"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="w-5 text-center text-[10px] font-semibold tabular-nums text-[#A8A29E]">
                                {l.size ?? 12}
                              </span>
                              <button
                                onClick={() => adjustLabelSize(l.id, 1)}
                                className="flex h-5 w-5 items-center justify-center rounded cursor-pointer transition-all hover:bg-[rgba(212,160,23,0.12)]"
                                style={{ border: '1px solid rgba(212,160,23,0.2)', color: '#A8A29E' }}
                                aria-label="Increase label size"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteStickyLabel(l.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md cursor-pointer transition-all hover:bg-[rgba(248,113,113,0.12)]"
                            style={{ color: '#6B6560' }}
                            aria-label={`Delete sticky label ${l.text}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary grid: units × floors */}
      <div className="rounded-2xl border border-[rgba(212,160,23,0.12)] bg-[#12100E] p-5">
        <p className="mb-4 text-sm font-semibold text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
          Calibration status — {selectedTower ? `Tower ${selectedTower}` : 'all towers'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="pb-2 pr-3 text-left text-[10px] uppercase tracking-wider text-[#6B6560]">Unit</th>
                {HEIGHT_SAMPLES.map((s) => (
                  <th key={s.heightM} className="pb-2 px-2 text-center text-[10px] uppercase tracking-wider text-[#6B6560]">
                    {s.label.replace('~', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {towerUnits.map((u) => (
                <tr key={u.id} className="border-t border-[rgba(212,160,23,0.06)]">
                  <td className="py-2 pr-3 font-medium text-[#A8A29E]">{u.name}</td>
                  {HEIGHT_SAMPLES.map((s) => {
                    const entry = u.balconyYawRads?.find((e) => e.heightM === s.heightM)
                    return (
                      <td key={s.heightM} className="px-2 py-2 text-center">
                        {entry ? (
                          <span title={`${(entry.yawRad * 180 / Math.PI).toFixed(1)}°`} style={{ color: '#34D399', fontSize: 13 }}>✓</span>
                        ) : (
                          <span style={{ color: '#3A3530' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═══ Shared UI ═══════════════════════════════════════════════════════════ */

type LegacyCfg = {
  _id: string
  slug: string
  projectName: string
  projectTagline?: string | null
  projectLocation?: string | null
  totalFloors: number
  floorsPerSection?: number | null
  heroUrl: string | null
  sitePlanUrl: string | null
  heroStorageId?: Id<'_storage'>
  sitePlanStorageId?: Id<'_storage'>
  heightSamples: Array<{ heightM: number; floor: number; label: string }>
  towers: Array<{
    id: string
    name: string
    tagline?: string
    heroLeftPct?: number
    heroTopPct?: number
    heroRightPct?: number
    heroBottomPct?: number
    floorPlanStorageId?: Id<'_storage'>
    heroStorageId?: Id<'_storage'>
    floorPlanUrl?: string | null
    heroUrl?: string | null
  }>
  corners: Array<{
    id: string
    direction: string
    sitePlanLeftPct: number
    sitePlanTopPct: number
    floorPlanLeftPct: number
    floorPlanTopPct: number
  }>
  unitTypes: Array<{
    id: string
    name: string
    bhk: number
    areaSqft?: number
    layoutStorageId?: Id<'_storage'>
    layoutUrl?: string | null
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
    storageId: Id<'_storage'>
    timeOfDay?: string
    imageUrl?: string | null
    unitId?: string
    vertexIndex?: number
  }>
}

function FullscreenState({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode
  label: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0908] text-[#A8A29E]">
      <div className="text-[#D4A017]">{icon}</div>
      <p>{label}</p>
      {action}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="text-lg font-semibold text-[#F5F3EF]"
      style={{ fontFamily: 'var(--font-jakarta)' }}
    >
      {title}
    </h2>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-[rgba(212,160,23,0.15)] bg-[#12100E] p-4">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="uppercase tracking-wider text-[#6B6560]">{label}</span>
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[rgba(212,160,23,0.15)] bg-[#1B1916] px-3 py-2 text-sm text-[#F5F3EF] outline-none focus:border-[#D4A017]"
    />
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[rgba(212,160,23,0.15)] bg-[#1B1916] px-3 py-2 text-sm text-[#F5F3EF] outline-none focus:border-[#D4A017]"
    >
      {children}
    </select>
  )
}

function PrimaryButton({
  children,
  onClick,
  loading,
  icon,
}: {
  children: React.ReactNode
  onClick: () => void | Promise<void>
  loading?: boolean
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0908] transition-colors hover:bg-[#E5B120] disabled:opacity-60"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

function EmptyBox({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(212,160,23,0.2)] bg-[#12100E] p-8 text-center text-sm text-[#6B6560]">
      {label}
    </div>
  )
}

function ImageField({
  label,
  url,
  onStorageId,
}: {
  label: string
  url: string | null | undefined
  onStorageId: (id: Id<'_storage'>) => void | Promise<void>
}) {
  const genUrl = useMutation(api.legacyTowersConfig.generateUploadUrl)
  const [busy, setBusy] = useState(false)

  const onPick = async (file: File) => {
    setBusy(true)
    try {
      const uploadUrl = await genUrl({})
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const json = (await res.json()) as { storageId: Id<'_storage'> }
      await onStorageId(json.storageId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 text-xs">
      <span className="uppercase tracking-wider text-[#6B6560]">{label}</span>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[rgba(212,160,23,0.15)] bg-[#1B1916]">
        {url ? (
          <Image src={url} alt={label} fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex h-full items-center justify-center text-[#6B6560]">
            <ImageIcon size={20} />
          </div>
        )}
        <label className="absolute inset-x-2 bottom-2 flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[rgba(10,9,8,0.8)] px-3 py-1.5 text-[#D4A017] backdrop-blur hover:bg-[rgba(10,9,8,0.92)]">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          <span>{busy ? 'Uploading…' : url ? 'Replace' : 'Upload'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPick(f)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
