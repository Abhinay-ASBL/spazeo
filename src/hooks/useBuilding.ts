import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { BuildingStatus } from '@/types'

// --- Building queries ---

export function useBuildingList(filters?: {
  status?: BuildingStatus
  search?: string
}) {
  return useQuery(api.buildings.list, filters ?? {})
}

export function useBuildingById(buildingId: Id<'buildings'>) {
  return useQuery(api.buildings.getById, { buildingId })
}

export function useBuildingBySlug(slug: string) {
  return useQuery(api.buildings.getBySlug, { slug })
}

export function useBuildingStats() {
  return useQuery(api.buildings.getStats)
}

export function useRecentBuildings() {
  return useQuery(api.buildings.getRecent)
}

// --- Building mutations ---

export function useBuildingMutations() {
  const create = useMutation(api.buildings.create)
  const update = useMutation(api.buildings.update)
  const remove = useMutation(api.buildings.remove)
  const publish = useMutation(api.buildings.publish)
  const unpublish = useMutation(api.buildings.unpublish)
  const updateSlug = useMutation(api.buildings.updateSlug)
  const generateUploadUrl = useMutation(api.buildings.generateUploadUrl)
  const setModelStorageId = useMutation(api.buildings.setModelStorageId)

  return {
    create,
    update,
    remove,
    publish,
    unpublish,
    updateSlug,
    generateUploadUrl,
    setModelStorageId,
  }
}

// --- Building blocks ---

export function useBuildingBlocks(buildingId: Id<'buildings'>) {
  return useQuery(api.buildingBlocks.listByBuilding, { buildingId })
}

export function useBuildingBlockMutations() {
  const create = useMutation(api.buildingBlocks.create)
  const update = useMutation(api.buildingBlocks.update)
  const remove = useMutation(api.buildingBlocks.remove)
  const bulkCreate = useMutation(api.buildingBlocks.bulkCreate)

  return { create, update, remove, bulkCreate }
}

// --- View positions ---

export function useViewPositions(buildingId: Id<'buildings'>) {
  return useQuery(api.viewPositions.listByBuilding, { buildingId })
}

export function useViewPositionsByFloor(
  blockId: Id<'buildingBlocks'>,
  floor: number
) {
  return useQuery(api.viewPositions.listByBlockAndFloor, { blockId, floor })
}

export function useViewPositionMutations() {
  const create = useMutation(api.viewPositions.create)
  const update = useMutation(api.viewPositions.update)
  const remove = useMutation(api.viewPositions.remove)
  const cloneToFloors = useMutation(api.viewPositions.cloneToFloors)
  const bulkCreate = useMutation(api.viewPositions.bulkCreate)

  return { create, update, remove, cloneToFloors, bulkCreate }
}

// --- Exterior panoramas ---

export function useExteriorPanoramas(buildingId: Id<'buildings'>) {
  return useQuery(api.exteriorPanoramas.listByBuilding, { buildingId })
}

export function usePanoramasByPosition(viewPositionId: Id<'viewPositions'>) {
  return useQuery(api.exteriorPanoramas.getByViewPosition, { viewPositionId })
}

export function useExteriorPanoramaMutations() {
  const remove = useMutation(api.exteriorPanoramas.remove)
  const generateUploadUrl = useMutation(api.exteriorPanoramas.generateUploadUrl)
  const savePanorama = useMutation(api.exteriorPanoramas.savePanorama)

  return { remove, generateUploadUrl, savePanorama }
}

// --- Building units ---

export function useBuildingUnits(buildingId: Id<'buildings'>) {
  return useQuery(api.buildingUnits.listByBuilding, { buildingId })
}

export function useBuildingUnitsByFloor(
  buildingId: Id<'buildings'>,
  floor: number
) {
  return useQuery(api.buildingUnits.listByFloor, { buildingId, floor })
}

export function useBuildingUnitStats(buildingId: Id<'buildings'>) {
  return useQuery(api.buildingUnits.getStats, { buildingId })
}

export function useBuildingUnitMutations() {
  const create = useMutation(api.buildingUnits.create)
  const update = useMutation(api.buildingUnits.update)
  const remove = useMutation(api.buildingUnits.remove)
  const linkTour = useMutation(api.buildingUnits.linkTour)
  const unlinkTour = useMutation(api.buildingUnits.unlinkTour)
  const updateStatus = useMutation(api.buildingUnits.updateStatus)
  const bulkCreate = useMutation(api.buildingUnits.bulkCreate)

  return { create, update, remove, linkTour, unlinkTour, updateStatus, bulkCreate }
}

// --- Conversion jobs ---

export function useConversionJobs(buildingId: Id<'buildings'>) {
  return useQuery(api.conversionJobs.listByBuilding, { buildingId })
}

export function useLatestConversionJob(buildingId: Id<'buildings'>) {
  return useQuery(api.conversionJobs.getLatest, { buildingId })
}

export function useConversionJobMutations() {
  const create = useMutation(api.conversionJobs.create)
  const retry = useMutation(api.conversionJobs.retry)
  const triggerConversion = useAction(api.conversionJobs.triggerConversion)

  return { create, retry, triggerConversion }
}

// --- Building analytics ---

export function useBuildingAnalytics(
  buildingId: Id<'buildings'>,
  dateRange?: { startDate?: number; endDate?: number }
) {
  return useQuery(api.buildingAnalytics.getByBuilding, {
    buildingId,
    ...dateRange,
  })
}

export function useBuildingAnalyticsOverview(buildingId: Id<'buildings'>) {
  return useQuery(api.buildingAnalytics.getOverview, { buildingId })
}

export function useBuildingFloorHeatmap(buildingId: Id<'buildings'>) {
  return useQuery(api.buildingAnalytics.getFloorHeatmap, { buildingId })
}

export function useBuildingUnitInteractions(buildingId: Id<'buildings'>) {
  return useQuery(api.buildingAnalytics.getUnitInteractions, { buildingId })
}
