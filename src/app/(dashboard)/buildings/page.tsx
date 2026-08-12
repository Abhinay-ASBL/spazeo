'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Eye,
  Layers,
  ChevronRight,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Compass,
  MapPin,
  Plus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { TOWERS, TOTAL_FLOORS, CORNERS } from '@/lib/legacyTowers'

// ─── Upload + Create flow ─────────────────────────────────────────────────────

function UploadBuildingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const createBuilding   = useMutation(api.buildings.create)
  const generateUploadUrl = useMutation(api.buildings.generateUploadUrl)
  const setModelStorageId = useMutation(api.buildings.setModelStorageId)

  const [file, setFile]           = useState<File | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [name, setName]           = useState('Legacy Towers')
  const [totalFloors, setFloors]  = useState(40)
  const [totalBlocks, setBlocks]  = useState(2)
  const [step, setStep]           = useState<'pick' | 'details' | 'uploading' | 'done'>('pick')
  const [progress, setProgress]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptFile = useCallback((f: File) => {
    if (!f.name.match(/\.(glb|gltf)$/i)) {
      toast.error('Please select a .glb or .gltf file')
      return
    }
    setFile(f)
    const guessed = f.name.replace(/\.(glb|gltf)$/i, '').replace(/[-_]/g, ' ')
    setName(guessed || 'Legacy Towers')
    setStep('details')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [acceptFile])

  async function handleCreate() {
    if (!file) return
    setStep('uploading')

    try {
      setProgress('Creating building record...')
      const buildingId = await createBuilding({
        name: name.trim() || 'My Building',
        totalFloors,
        totalBlocks,
        location: { lat: 0, lng: 0 },
        environmentType: 'hdri',
      })

      setProgress('Preparing upload...')
      const uploadUrl = await generateUploadUrl()

      setProgress(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`)
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'model/gltf-binary' },
        body: file,
      })

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)

      const { storageId } = await res.json()

      setProgress('Linking model...')
      await setModelStorageId({
        buildingId: buildingId as Id<'buildings'>,
        modelStorageId: storageId as Id<'_storage'>,
      })

      setStep('done')
      setTimeout(() => {
        router.push(`/buildings/${buildingId}/exterior`)
      }, 800)
    } catch (err) {
      console.error(err)
      toast.error((err as Error).message || 'Upload failed — try again')
      setStep('details')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#12100E] border border-[rgba(212,160,23,0.2)] rounded-2xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(212,160,23,0.1)]">
          <h2 className="text-base font-semibold text-[#F5F3EF]"
            style={{ fontFamily: 'var(--font-jakarta)' }}>
            {step === 'pick'      ? 'Upload Building Model' :
             step === 'details'   ? 'Building Details' :
             step === 'uploading' ? 'Uploading...' : 'Done!'}
          </h2>
          {step !== 'uploading' && step !== 'done' && (
            <button onClick={onClose} className="text-[#6B6560] hover:text-[#F5F3EF] transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6">

          {step === 'pick' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 h-52 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                  ${dragging
                    ? 'border-[#D4A017] bg-[rgba(212,160,23,0.06)]'
                    : 'border-[rgba(212,160,23,0.2)] bg-[#1B1916] hover:border-[rgba(212,160,23,0.4)] hover:bg-[rgba(212,160,23,0.04)]'}
                `}
              >
                <Upload size={36} className="text-[#D4A017]" strokeWidth={1.2} />
                <div className="text-center">
                  <p className="text-sm font-medium text-[#F5F3EF]">
                    Drop your .glb file here
                  </p>
                  <p className="text-xs text-[#6B6560] mt-1">or click to browse</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[rgba(212,160,23,0.1)] text-xs text-[#D4A017] border border-[rgba(212,160,23,0.2)]">
                  .glb · .gltf · up to 500 MB
                </span>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f) }}
              />

              <div className="mt-4 p-3 rounded-lg bg-[rgba(251,122,84,0.06)] border border-[rgba(251,122,84,0.15)]">
                <p className="text-xs text-[#A8A29E] leading-relaxed">
                  <span className="text-[#FB7A54] font-medium">Have a .skp file?</span>{' '}
                  Convert it free at{' '}
                  <a href="https://fabconvert.com/convert/skp/to/glb" target="_blank"
                    className="text-[#D4A017] underline underline-offset-2">
                    fabconvert.com
                  </a>{' '}
                  — upload takes ~5 seconds, then come back here.
                </p>
              </div>
            </>
          )}

          {step === 'details' && file && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.15)] mb-5">
                <CheckCircle2 size={16} className="text-[#34D399] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#F5F3EF] truncate">{file.name}</p>
                  <p className="text-xs text-[#6B6560]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button
                  onClick={() => { setFile(null); setStep('pick') }}
                  className="text-[#6B6560] hover:text-[#F5F3EF]"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-[#A8A29E] mb-1.5">Building Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Legacy Towers"
                    className="w-full bg-[#1B1916] border border-[rgba(212,160,23,0.15)] rounded-lg px-3 py-2.5 text-sm text-[#F5F3EF] placeholder-[#6B6560] outline-none focus:border-[rgba(212,160,23,0.5)] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A8A29E] mb-1.5">Total Floors</label>
                    <input
                      type="number" min={1} max={200}
                      value={totalFloors}
                      onChange={e => setFloors(Number(e.target.value))}
                      className="w-full bg-[#1B1916] border border-[rgba(212,160,23,0.15)] rounded-lg px-3 py-2.5 text-sm text-[#F5F3EF] outline-none focus:border-[rgba(212,160,23,0.5)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A8A29E] mb-1.5">Total Blocks</label>
                    <input
                      type="number" min={1} max={20}
                      value={totalBlocks}
                      onChange={e => setBlocks(Number(e.target.value))}
                      className="w-full bg-[#1B1916] border border-[rgba(212,160,23,0.15)] rounded-lg px-3 py-2.5 text-sm text-[#F5F3EF] outline-none focus:border-[rgba(212,160,23,0.5)] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('pick')}
                  className="flex-1 py-2.5 rounded-lg text-sm text-[#A8A29E] border border-[rgba(212,160,23,0.15)] hover:text-[#F5F3EF] transition-colors">
                  Back
                </button>
                <button onClick={handleCreate}
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#D4A017] text-[#0A0908] hover:bg-[#E5B120] disabled:opacity-50 transition-all">
                  Upload & View
                </button>
              </div>
            </>
          )}

          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 size={36} className="text-[#D4A017] animate-spin" />
              <p className="text-sm text-[#A8A29E] text-center">{progress}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 size={40} className="text-[#34D399]" />
              <p className="text-sm font-medium text-[#F5F3EF]">Model uploaded!</p>
              <p className="text-xs text-[#6B6560]">Opening exterior viewer...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Delete dialog ─────────────────────────────────────────────────────────────

function DeleteBuildingDialog({
  building,
  onClose,
}: {
  building: { _id: string; name: string }
  onClose: () => void
}) {
  const removeBuilding = useMutation(api.buildings.remove)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const canDelete = confirmName.trim() === building.name.trim() && !deleting

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    try {
      await removeBuilding({ buildingId: building._id as Id<'buildings'> })
      toast.success('Building deleted')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error((err as Error).message || 'Failed to delete building')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#12100E] border border-[rgba(248,113,113,0.3)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(248,113,113,0.15)]">
          <h2
            className="flex items-center gap-2 text-base font-semibold text-[#F5F3EF]"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            <AlertTriangle size={18} className="text-[#F87171]" />
            Delete Building
          </h2>
          {!deleting && (
            <button onClick={onClose} className="text-[#6B6560] hover:text-[#F5F3EF] transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#A8A29E] leading-relaxed">
            This will permanently delete{' '}
            <span className="text-[#F5F3EF] font-medium">{building.name}</span>,
            its 3D model, exterior panoramas, view positions, units, and analytics. This action cannot be undone.
          </p>

          <div>
            <label className="block text-xs text-[#A8A29E] mb-1.5">
              Type <span className="text-[#F5F3EF] font-medium">{building.name}</span> to confirm
            </label>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={deleting}
              placeholder={building.name}
              className="w-full bg-[#1B1916] border border-[rgba(248,113,113,0.2)] rounded-lg px-3 py-2.5 text-sm text-[#F5F3EF] placeholder-[#6B6560] outline-none focus:border-[rgba(248,113,113,0.5)] transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-lg text-sm text-[#A8A29E] border border-[rgba(212,160,23,0.15)] hover:text-[#F5F3EF] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#F87171] text-[#0A0908] hover:bg-[#EF4444] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Building row (replaces grid card) ─────────────────────────────────────────

type Building = {
  _id: string
  name: string
  totalFloors: number
  totalBlocks: number
  status: string
  modelStorageId?: string
  optimizedModelStorageId?: string
}

function FloorBars({ count, ready }: { count: number; ready: boolean }) {
  const bars = Math.min(count, 12)
  return (
    <div className="flex h-full w-full items-end gap-[2px] px-1.5 py-1.5">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${20 + (i * 70) / bars}%`,
            background: ready
              ? `rgba(212,160,23,${0.25 + (i / bars) * 0.55})`
              : 'rgba(168,162,158,0.18)',
          }}
        />
      ))}
    </div>
  )
}

function BuildingRow({ building }: { building: Building }) {
  const [showDelete, setShowDelete] = useState(false)
  const hasModel = !!(building.modelStorageId || building.optimizedModelStorageId)
  const published = building.status === 'published'

  return (
    <div className="group relative">
      <Link
        href={`/buildings/${building._id}/exterior`}
        className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-transparent hover:border-[rgba(212,160,23,0.2)] hover:bg-[rgba(212,160,23,0.03)] transition-all duration-200"
      >
        {/* Floor-bar status glyph */}
        <div
          className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition-transform duration-200 group-hover:scale-[1.03] ${
            hasModel
              ? 'border-[rgba(212,160,23,0.25)] bg-[#161412]'
              : 'border-dashed border-[rgba(168,162,158,0.2)] bg-[#15130F]'
          }`}
        >
          {hasModel ? (
            <FloorBars count={building.totalFloors} ready />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#6B6560]">
              <Upload size={18} strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate text-base font-semibold text-[#F5F3EF]"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {building.name}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                published
                  ? 'bg-[rgba(52,211,153,0.12)] text-[#34D399]'
                  : 'bg-[rgba(168,162,158,0.08)] text-[#6B6560]'
              }`}
            >
              {building.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#6B6560]">
            <span className="inline-flex items-center gap-1">
              <Layers size={12} strokeWidth={1.5} />
              {building.totalFloors} floors
            </span>
            <span className="text-[#3A3530]">·</span>
            <span>{building.totalBlocks} block{building.totalBlocks !== 1 ? 's' : ''}</span>
            <span className="text-[#3A3530]">·</span>
            <span className={hasModel ? 'text-[#A8A29E]' : 'text-[#6B6560]'}>
              {hasModel ? '3D model ready' : 'Model pending'}
            </span>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.06)] px-3 py-1.5 text-xs font-medium text-[#D4A017] transition-colors group-hover:bg-[rgba(212,160,23,0.14)] sm:inline-flex">
            <Eye size={13} strokeWidth={1.8} />
            View exterior
            <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </span>
          <ChevronRight size={16} className="text-[#6B6560] sm:hidden" />
        </div>
      </Link>

      {/* Delete trigger sits outside <Link> stacking */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowDelete(true)
        }}
        aria-label={`Delete ${building.name}`}
        title="Delete building"
        className="absolute right-3 top-3 hidden h-7 w-7 items-center justify-center rounded-md border border-[rgba(248,113,113,0.2)] bg-[rgba(10,9,8,0.7)] text-[#A8A29E] opacity-0 transition-all group-hover:opacity-100 hover:border-[rgba(248,113,113,0.5)] hover:bg-[rgba(248,113,113,0.1)] hover:text-[#F87171] md:flex"
      >
        <Trash2 size={13} strokeWidth={1.5} />
      </button>

      {showDelete && (
        <DeleteBuildingDialog
          building={{ _id: building._id, name: building.name }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}

// ─── Marquee — Legacy Towers showcase (leads page) ─────────────────────────────

function LegacyTowersMarquee() {
  return (
    <Link
      href="/buildings/asbl-legacy-towers/view"
      className="group relative block overflow-hidden rounded-2xl border border-[rgba(212,160,23,0.18)] bg-[#0E0C0A] transition-colors hover:border-[rgba(212,160,23,0.32)]"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr]">
        {/* Image */}
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[340px]">
          <Image
            src="/legacy-towers/plans/tower-hero.jpg"
            alt="ASBL Legacy Towers — completed skyline"
            fill
            priority
            quality={75}
            className="object-cover transition-transform duration-[1200ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            sizes="(min-width: 768px) 55vw, 100vw"
          />
          {/* Edge gradient — bleeds into content panel */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0E0C0A] md:bg-gradient-to-r md:from-[#0A0908]/30 md:via-transparent md:to-[#0E0C0A]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0E0C0A]/95 to-transparent md:hidden" />

          {/* Tower badges */}
          <div className="absolute left-5 top-5 flex gap-1.5">
            {TOWERS.map((t) => (
              <span
                key={t.id}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4A017] bg-[#0A0908]/55 text-sm font-bold text-[#D4A017] backdrop-blur-sm"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {t.id}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col justify-center gap-5 p-6 md:p-8">
          <p className="text-sm font-medium text-[#2DD4BF]">
            Featured showcase
          </p>

          <h2
            className="text-2xl font-bold leading-[1.1] text-[#F5F3EF] md:text-[28px]"
            style={{ fontFamily: 'var(--font-jakarta)', letterSpacing: '-0.02em' }}
          >
            Step inside the completed
            <br />
            <span className="text-[#D4A017]">ASBL Legacy</span> skyline.
          </h2>

          <p className="max-w-prose text-sm leading-relaxed text-[#A8A29E]">
            Orbit the 3D twin, then dive into drone-captured 360° balcony views —
            5 heights by 6 corners per tower.
          </p>

          <div className="flex flex-wrap gap-1.5">
            <Chip
              icon={<Building2 size={11} strokeWidth={1.8} />}
              label={`${TOWERS.length} Towers`}
            />
            <Chip
              icon={<Layers size={11} strokeWidth={1.8} />}
              label={`${TOTAL_FLOORS} Floors`}
            />
            <Chip
              icon={<Compass size={11} strokeWidth={1.8} />}
              label={`${CORNERS.length} Corners`}
            />
            <Chip icon={<MapPin size={11} strokeWidth={1.8} />} label="Hyderabad" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg bg-[rgba(45,212,191,0.1)] px-3.5 py-2 text-sm font-semibold text-[#2DD4BF] transition-colors group-hover:bg-[rgba(45,212,191,0.16)]">
            Open 3D showcase
            <ChevronRight
              size={15}
              className="transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,160,23,0.18)] bg-[rgba(212,160,23,0.06)] px-2.5 py-1 text-[11px] font-medium text-[#D4A017]">
      {icon}
      {label}
    </span>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BuildingsPage() {
  const buildings = useQuery(api.buildings.list, {})
  const [showUpload, setShowUpload] = useState(false)

  const loading = buildings === undefined
  const list: Building[] = (buildings ?? []) as Building[]
  const totalBuildings = list.length
  const totalFloors = list.reduce((sum, b) => sum + (b.totalFloors || 0), 0)
  const modelsReady = list.filter(
    (b) => b.modelStorageId || b.optimizedModelStorageId
  ).length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1
            className="text-[32px] font-extrabold leading-[1.05] text-[#F5F3EF] md:text-[36px]"
            style={{ fontFamily: 'var(--font-jakarta)', letterSpacing: '-0.025em' }}
          >
            Buildings
          </h1>
          <p className="mt-2 max-w-prose text-sm text-[#A8A29E]">
            Every floor, every corner. Pick a building to walk its exterior, or explore the ASBL Legacy showcase.
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A017] px-4 py-2.5 text-sm font-semibold text-[#0A0908] transition-colors hover:bg-[#E5B120] sm:w-auto"
        >
          <Plus size={15} strokeWidth={2} />
          New building
        </button>
      </div>

        {/* ── Portfolio strip (typographic, not metric tiles) ───────── */}
        {!loading && totalBuildings > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-[rgba(212,160,23,0.08)] py-3 text-[13px] text-[#A8A29E]">
            <span>
              <span className="font-medium text-[#F5F3EF]">{totalBuildings}</span>{' '}
              {totalBuildings === 1 ? 'building' : 'buildings'}
            </span>
            <span className="text-[#3A3530]">·</span>
            <span>
              <span className="font-medium text-[#F5F3EF]">{totalFloors}</span> floors total
            </span>
            <span className="text-[#3A3530]">·</span>
            <span>
              <span className="font-medium text-[#34D399]">{modelsReady}</span> ready,{' '}
              <span className="text-[#6B6560]">{totalBuildings - modelsReady}</span> pending
            </span>
          </div>
        )}

        {/* ── Marquee — Legacy Towers showcase leads ───────────────── */}
        <div className="mb-10">
          <LegacyTowersMarquee />
        </div>

        {/* ── Portfolio section ────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2
              className="text-lg font-semibold text-[#F5F3EF]"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              Your portfolio
              {!loading && totalBuildings > 0 && (
                <span className="ml-2 text-sm font-normal text-[#6B6560]">
                  · {totalBuildings}
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-[92px] animate-pulse rounded-xl bg-[#12100E]"
                />
              ))}
            </div>
          ) : totalBuildings === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(212,160,23,0.18)] bg-[#12100E] px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(212,160,23,0.08)]">
                <Building2 size={22} className="text-[#D4A017]" strokeWidth={1.5} />
              </div>
              <h3
                className="text-lg font-semibold text-[#F5F3EF]"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                No buildings yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#A8A29E]">
                Upload a .glb model to create your first building and preview exterior views from every floor and corner.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D4A017] px-4 py-2.5 text-sm font-semibold text-[#0A0908] transition-colors hover:bg-[#E5B120]"
                >
                  <Upload size={14} strokeWidth={1.8} />
                  Upload a building
                </button>
                <Link
                  href="/buildings/asbl-legacy-towers/view"
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(45,212,191,0.25)] px-4 py-2.5 text-sm font-medium text-[#2DD4BF] transition-colors hover:bg-[rgba(45,212,191,0.08)]"
                >
                  <Eye size={14} strokeWidth={1.8} />
                  Explore Legacy Towers demo
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2 xl:gap-x-3 xl:gap-y-1.5">
              {list.map((b) => (
                <BuildingRow key={b._id} building={b} />
              ))}
            </div>
          )}
        </section>

      {showUpload && <UploadBuildingModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
