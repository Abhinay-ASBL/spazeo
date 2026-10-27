'use client'

import { use, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import { Id } from '../../../../../../convex/_generated/dataModel'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'

const GeoMapModelViewer = dynamic(
  () => import('@/components/viewer/GeoMapModelViewer').then((m) => m.GeoMapModelViewer),
  { ssr: false, loading: () => <MapLoadingFallback /> }
)

function MapLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0A0908]">
      <Loader2 className="animate-spin text-[#D4A017]" size={28} />
    </div>
  )
}

// ASBL Legacy Towers site — same origin used by BuildingExteriorViewer's KML plot
const DEFAULT_ORIGIN: [number, number] = [78.50295053690694, 17.40337129161836]

export default function BuildingMapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const building = useQuery(api.buildings.getById, { buildingId: id as Id<'buildings'> })
  const setMasterPlanGeoJson = useMutation(api.buildings.setMasterPlanGeoJson)

  const handleSaveMasterPlan = useCallback(
    async (geoJson: string) => {
      await setMasterPlanGeoJson({ buildingId: id as Id<'buildings'>, geoJson })
    },
    [id, setMasterPlanGeoJson]
  )

  // Memoized so GeoMapModelViewer gets a stable array (hooks must run before
  // the early returns below, hence building?.).
  const lat = building?.location?.lat
  const lng = building?.location?.lng
  const origin = useMemo<[number, number]>(
    () => (lat && lng ? [lng, lat] : DEFAULT_ORIGIN),
    [lat, lng]
  )

  if (building === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0908]">
        <Loader2 className="animate-spin text-[#D4A017]" size={32} />
      </div>
    )
  }

  if (building === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0A0908]">
        <Building2 size={48} className="text-[#3A3530]" strokeWidth={1} />
        <p className="text-[#A8A29E]">Building not found</p>
        <Link href="/buildings" className="text-sm text-[#D4A017] hover:underline">
          Back to buildings
        </Link>
      </div>
    )
  }

  const modelUrl = building.optimizedModelUrl ?? building.modelUrl ?? null

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0A0908]">
      <header className="z-10 flex shrink-0 items-center gap-3 border-b border-[rgba(245,243,239,0.06)] bg-[rgba(10,9,8,0.9)] px-4 py-3 backdrop-blur-xl">
        <Link
          href={`/buildings/${id}/exterior`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.1)] text-[#D4A017] transition-colors hover:bg-[rgba(212,160,23,0.18)]"
          aria-label="Back"
        >
          <ArrowLeft size={16} strokeWidth={2.25} />
        </Link>
        <div>
          <p className="text-[13px] font-bold leading-none text-[#F5F3EF]" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {building.name}
          </p>
          <p className="mt-1 text-[11px] text-[#6B6560]">On real-world map — georeferenced 3D model</p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {modelUrl ? (
          <GeoMapModelViewer
            modelUrl={modelUrl}
            origin={origin}
            className="h-full w-full"
            enableDrawing
            initialMasterPlanGeoJson={building.masterPlanGeoJson}
            onSaveMasterPlan={handleSaveMasterPlan}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#6B6560]">
            No 3D model uploaded for this building yet.
          </div>
        )}
      </div>
    </div>
  )
}
