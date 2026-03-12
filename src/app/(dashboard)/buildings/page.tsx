'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import Link from 'next/link'
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
} from 'lucide-react'
import { toast } from 'react-hot-toast'

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
    // Pre-fill name from filename
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
      // 1. Create building record
      setProgress('Creating building record...')
      const buildingId = await createBuilding({
        name: name.trim() || 'My Building',
        totalFloors,
        totalBlocks,
        location: { lat: 0, lng: 0 },
        environmentType: 'hdri',
      })

      // 2. Get upload URL
      setProgress('Preparing upload...')
      const uploadUrl = await generateUploadUrl()

      // 3. Upload file
      setProgress(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`)
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'model/gltf-binary' },
        body: file,
      })

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)

      const { storageId } = await res.json()

      // 4. Link model to building
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

        {/* Header */}
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

          {/* Step 1: Drop zone */}
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

          {/* Step 2: Building details */}
          {step === 'details' && file && (
            <>
              {/* File chip */}
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

          {/* Step 3: Uploading */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 size={36} className="text-[#D4A017] animate-spin" />
              <p className="text-sm text-[#A8A29E] text-center">{progress}</p>
            </div>
          )}

          {/* Step 4: Done */}
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

// ─── Building Card ─────────────────────────────────────────────────────────────

function BuildingCard({ building }: {
  building: {
    _id: string
    name: string
    totalFloors: number
    totalBlocks: number
    status: string
    modelStorageId?: string
    optimizedModelStorageId?: string
  }
}) {
  const hasModel = !!(building.modelStorageId || building.optimizedModelStorageId)
  return (
    <div className="group bg-[#12100E] border border-[rgba(212,160,23,0.12)] rounded-xl overflow-hidden hover:border-[rgba(212,160,23,0.3)] transition-all duration-300">
      <div className="h-40 bg-[#1B1916] flex items-center justify-center border-b border-[rgba(212,160,23,0.08)]">
        <div className="text-center">
          <Building2
            size={40}
            strokeWidth={1}
            className={hasModel ? 'text-[#D4A017] mx-auto mb-2' : 'text-[#3A3530] mx-auto mb-2'}
          />
          <span className="text-xs text-[#6B6560]">
            {hasModel ? '3D Model Ready' : 'No model yet'}
          </span>
        </div>
        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs ${
          building.status === 'published'
            ? 'bg-[rgba(52,211,153,0.15)] text-[#34D399]'
            : 'bg-[rgba(168,162,158,0.1)] text-[#6B6560]'
        }`}>
          {building.status}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[#F5F3EF] truncate mb-1"
          style={{ fontFamily: 'var(--font-jakarta)' }}>
          {building.name}
        </h3>
        <div className="flex items-center gap-3 text-xs text-[#6B6560] mb-4">
          <span className="flex items-center gap-1"><Layers size={12} />{building.totalFloors} floors</span>
          <span>{building.totalBlocks} block{building.totalBlocks !== 1 ? 's' : ''}</span>
        </div>
        <Link
          href={`/buildings/${building._id}/exterior`}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium bg-[rgba(212,160,23,0.08)] text-[#D4A017] hover:bg-[rgba(212,160,23,0.16)] border border-[rgba(212,160,23,0.2)] transition-all"
        >
          <Eye size={14} strokeWidth={1.5} />
          View Exterior
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BuildingsPage() {
  const buildings = useQuery(api.buildings.list, {})
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="min-h-screen bg-[#0A0908] p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3EF]"
            style={{ fontFamily: 'var(--font-jakarta)' }}>
            Buildings
          </h1>
          <p className="text-sm text-[#6B6560] mt-1">
            3D exterior views — every 10 floors from all corners
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4A017] text-[#0A0908] text-sm font-semibold hover:bg-[#E5B120] transition-colors"
        >
          <Upload size={16} strokeWidth={2} />
          Upload Building
        </button>
      </div>

      {buildings === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-[#12100E] animate-pulse" />
          ))}
        </div>
      ) : buildings.length === 0 ? (
        /* Empty state — big upload zone */
        <div
          onClick={() => setShowUpload(true)}
          className="flex flex-col items-center justify-center border-2 border-dashed border-[rgba(212,160,23,0.2)] rounded-2xl h-72 cursor-pointer hover:border-[rgba(212,160,23,0.4)] hover:bg-[rgba(212,160,23,0.02)] transition-all"
        >
          <Upload size={44} className="text-[#D4A017] mb-4" strokeWidth={1.2} />
          <h3 className="text-base font-semibold text-[#F5F3EF] mb-2"
            style={{ fontFamily: 'var(--font-jakarta)' }}>
            Upload your first building
          </h3>
          <p className="text-sm text-[#6B6560] max-w-xs text-center">
            Drop a .glb file to create a building and instantly preview exterior views from every floor and corner.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {buildings.map((b) => (
            <BuildingCard
              key={b._id}
              building={b as Parameters<typeof BuildingCard>[0]['building']}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadBuildingModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
