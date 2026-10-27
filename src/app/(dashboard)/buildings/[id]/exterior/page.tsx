'use client'

import { use, useState, useRef, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import { Id } from '../../../../../../convex/_generated/dataModel'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Upload,
  Layers,
  Navigation,
  Info,
  Building2,
  Eye,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { type CornerKey, CORNERS, getFloorLevels } from '@/components/viewer/BuildingExteriorViewer'

// Load Three.js viewer client-side only
const BuildingExteriorViewer = dynamic(
  () =>
    import('@/components/viewer/BuildingExteriorViewer').then(
      (m) => m.BuildingExteriorViewer
    ),
  { ssr: false, loading: () => <ViewerSkeleton /> }
)

function ViewerSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0A0908]">
      <div className="text-center">
        <Building2 size={48} className="text-[#3A3530] mx-auto mb-4" strokeWidth={1} />
        <p className="text-sm text-[#6B6560]">Loading viewer...</p>
      </div>
    </div>
  )
}

const CORNER_ICONS: Record<CornerKey, string> = {
  NE: '↗',
  NW: '↖',
  SE: '↘',
  SW: '↙',
  aerial: '↑',
}

export default function BuildingExteriorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const building = useQuery(api.buildings.getById, { buildingId: id as Id<'buildings'> })

  const generateUploadUrl = useMutation(api.buildings.generateUploadUrl)
  const setModelStorageId = useMutation(api.buildings.setModelStorageId)

  const floorLevels = getFloorLevels(building?.totalFloors ?? 40)
  const [selectedFloor, setSelectedFloor] = useState<number>(1)
  const [selectedCorner, setSelectedCorner] = useState<CornerKey>('NE')
  const [isUploading, setIsUploading] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset load state whenever the underlying model changes (new upload)
  const lastModelUrl = useRef<string | null>(null)

  // Initialize floor selection when building loads
  const hasInitializedFloor = useRef(false)
  if (building && !hasInitializedFloor.current) {
    hasInitializedFloor.current = true
    const levels = getFloorLevels(building.totalFloors)
    setSelectedFloor(levels[0])
  }

  const handleModelUpload = useCallback(
    async (file: File) => {
      if (!building) return
      if (!file.name.match(/\.(glb|gltf)$/i)) {
        toast.error('Please upload a .glb or .gltf file')
        return
      }
      if (file.size > 500 * 1024 * 1024) {
        toast.error('File too large — max 500 MB')
        return
      }
      setModelLoaded(false)
      setModelError(null)
      setIsUploading(true)
      const sizeMb = (file.size / (1024 * 1024)).toFixed(0)
      const toastId = toast.loading(`Uploading 3D model (${sizeMb} MB)…`)
      try {
        const uploadUrl = await generateUploadUrl()
        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: file,
          headers: { 'Content-Type': file.type || 'model/gltf-binary' },
        })
        if (!res.ok) {
          throw new Error(`Upload failed (${res.status})`)
        }
        const body = await res.json()
        if (!body.storageId) {
          throw new Error('Upload failed — no storage ID returned')
        }
        await setModelStorageId({
          buildingId: building._id as Id<'buildings'>,
          modelStorageId: body.storageId,
        })
        toast.success('3D model uploaded — loading preview…', { id: toastId })
      } catch (err) {
        console.error('Model upload error:', err)
        toast.error((err as Error).message || 'Upload failed — try again', { id: toastId })
      } finally {
        setIsUploading(false)
      }
    },
    [building, generateUploadUrl, setModelStorageId]
  )

  const handleModelLoaded = useCallback(() => {
    setModelError(null)
    setModelLoaded(true)
  }, [])

  const handleModelError = useCallback((message: string) => {
    setModelLoaded(false)
    setModelError(message)
    toast.error('3D model failed to load — try re-uploading')
  }, [])

  if (building === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0908]">
        <Loader2 className="text-[#D4A017] animate-spin" size={32} />
      </div>
    )
  }

  if (building === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0A0908] gap-4">
        <Building2 size={48} className="text-[#3A3530]" strokeWidth={1} />
        <p className="text-[#A8A29E]">Building not found</p>
        <Link href="/buildings" className="text-sm text-[#D4A017] hover:underline">
          Back to buildings
        </Link>
      </div>
    )
  }

  const modelUrl = building.optimizedModelUrl ?? building.modelUrl ?? null
  if (lastModelUrl.current !== modelUrl) {
    lastModelUrl.current = modelUrl
    setModelLoaded(false)
    setModelError(null)
  }
  const hasModel = modelLoaded && !modelError
  const isLoadingModel = Boolean(modelUrl) && !hasModel && !modelError
  const currentCorner = CORNERS.find((c) => c.key === selectedCorner)!

  return (
    // fixed: breaks out of dashboard layout padding; left-[240px] accounts for sidebar
    <div className="fixed inset-0 md:left-[240px] flex bg-[#0A0908] overflow-hidden" style={{ top: '49px', zIndex: 20 }}>
      {/* ── Left sidebar: Floor selector ───────────────────────────────────── */}
      <div className="w-[72px] flex-shrink-0 bg-[#12100E] border-r border-[rgba(212,160,23,0.1)] flex flex-col">
        {/* Back button */}
        <Link
          href="/buildings"
          className="flex items-center justify-center h-14 text-[#6B6560] hover:text-[#D4A017] transition-colors border-b border-[rgba(212,160,23,0.08)]"
          title="Back to buildings"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </Link>

        {/* Floor label */}
        <div className="flex items-center justify-center py-3 border-b border-[rgba(212,160,23,0.08)]">
          <Layers size={14} className="text-[#6B6560]" strokeWidth={1.5} />
        </div>

        {/* Floor buttons */}
        <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5 scrollbar-hide">
          {[...floorLevels].reverse().map((floor) => {
            const isActive = selectedFloor === floor
            return (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                title={`Floor ${floor}`}
                className={`w-11 h-11 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#D4A017] text-[#0A0908]'
                    : 'text-[#6B6560] hover:text-[#F5F3EF] hover:bg-[rgba(212,160,23,0.08)]'
                }`}
                style={{ fontFamily: 'var(--font-dmsans)' }}
              >
                {floor === building.totalFloors && floor !== 1 ? (
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[9px] opacity-70">TOP</span>
                    <span>{floor}</span>
                  </span>
                ) : (
                  `F${floor}`
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main viewer area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-[rgba(10,9,8,0.85)] to-transparent">
          {/* Building name + current position */}
          <div>
            <h1
              className="text-sm font-semibold text-[#F5F3EF]"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {building.name}
            </h1>
            <p className="text-xs text-[#6B6560] mt-0.5">
              Floor {selectedFloor} · {currentCorner.label}
            </p>
          </div>

          {/* Corner selectors */}
          <div className="flex items-center gap-1.5">
            <Navigation size={14} className="text-[#6B6560] mr-1" strokeWidth={1.5} />
            {CORNERS.map((corner) => {
              const isActive = selectedCorner === corner.key
              return (
                <button
                  key={corner.key}
                  onClick={() => setSelectedCorner(corner.key)}
                  title={corner.label}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? corner.key === 'aerial'
                        ? 'bg-[#2DD4BF] text-[#0A0908]'
                        : 'bg-[#D4A017] text-[#0A0908]'
                      : 'bg-[rgba(18,16,14,0.8)] text-[#6B6560] border border-[rgba(212,160,23,0.15)] hover:text-[#F5F3EF] hover:border-[rgba(212,160,23,0.3)]'
                  }`}
                >
                  <span className="mr-1">{CORNER_ICONS[corner.key]}</span>
                  {corner.short}
                </button>
              )
            })}
          </div>
        </div>

        {/* Three.js Canvas */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <BuildingExteriorViewer
              modelUrl={modelUrl}
              totalFloors={building.totalFloors}
              selectedFloor={selectedFloor}
              selectedCorner={selectedCorner}
              onModelLoaded={handleModelLoaded}
              onModelError={handleModelError}
            />
          </div>
        </div>

        {/* Bottom overlay — model upload + info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-[rgba(10,9,8,0.9)] to-transparent">
          <div className="flex items-center justify-between">
            {/* Info chips */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(18,16,14,0.8)] border border-[rgba(212,160,23,0.12)] text-xs text-[#A8A29E]">
                <Building2 size={12} strokeWidth={1.5} />
                {building.totalFloors} floors · {building.totalBlocks} block{building.totalBlocks !== 1 ? 's' : ''}
              </span>
              {!modelUrl && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(45,212,191,0.12)] border border-[rgba(45,212,191,0.2)] text-xs text-[#2DD4BF]">
                  <Info size={12} strokeWidth={1.5} />
                  Dev preview — local all-towers.glb
                </span>
              )}
              {isLoadingModel && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,160,23,0.12)] border border-[rgba(212,160,23,0.2)] text-xs text-[#D4A017]">
                  <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                  Loading 3D model (100 MB)…
                </span>
              )}
              {modelError && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.2)] text-xs text-[#F87171]">
                  <Info size={12} strokeWidth={1.5} />
                  Model load failed
                </span>
              )}
              {hasModel && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.2)] text-xs text-[#34D399]">
                  <Eye size={12} strokeWidth={1.5} />
                  3D model loaded
                </span>
              )}
            </div>

            {/* Upload model button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleModelUpload(file)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all bg-[rgba(212,160,23,0.1)] border border-[rgba(212,160,23,0.3)] text-[#D4A017] hover:bg-[rgba(212,160,23,0.2)] disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} strokeWidth={1.5} />
                )}
                {hasModel ? 'Replace Model' : 'Upload .glb Model'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: View map legend ────────────────────────────────────── */}
      <div className="w-[200px] flex-shrink-0 bg-[#12100E] border-l border-[rgba(212,160,23,0.1)] flex flex-col p-4">
        <p className="text-xs font-semibold text-[#A8A29E] mb-4 uppercase tracking-wider">
          View Positions
        </p>

        {/* Floor levels overview */}
        <div className="mb-5">
          <p className="text-xs text-[#6B6560] mb-2">Floor levels</p>
          <div className="space-y-1">
            {[...floorLevels].reverse().map((fl) => (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedFloor === fl
                    ? 'bg-[rgba(212,160,23,0.12)] text-[#D4A017]'
                    : 'text-[#6B6560] hover:text-[#A8A29E]'
                }`}
              >
                Floor {fl}
                {fl === 1 && ' (Ground)'}
                {fl === building.totalFloors && ' (Top)'}
              </button>
            ))}
          </div>
        </div>

        {/* Corner overview */}
        <div>
          <p className="text-xs text-[#6B6560] mb-2">Corners</p>
          <div className="space-y-1">
            {CORNERS.map((corner) => (
              <button
                key={corner.key}
                onClick={() => setSelectedCorner(corner.key)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                  selectedCorner === corner.key
                    ? 'bg-[rgba(212,160,23,0.12)] text-[#D4A017]'
                    : 'text-[#6B6560] hover:text-[#A8A29E]'
                }`}
              >
                <span className="text-base leading-none">{CORNER_ICONS[corner.key]}</span>
                {corner.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversion guide */}
        <div className="mt-auto pt-4 border-t border-[rgba(212,160,23,0.08)]">
          <p className="text-[10px] text-[#6B6560] leading-relaxed">
            Convert your .skp file to .glb using{' '}
            <span className="text-[#D4A017]">FabConvert.com</span> or{' '}
            <span className="text-[#D4A017]">ImageToStl.com</span>, then upload here.
          </p>
        </div>
      </div>
    </div>
  )
}
