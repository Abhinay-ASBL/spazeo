import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { TourStatus } from '@/types'

export function useTourList(filters?: {
  status?: TourStatus
  search?: string
  sortBy?: 'created' | 'modified' | 'views' | 'alpha'
  tags?: string[]
}) {
  return useQuery(api.tours.list, filters ?? {})
}

export function useTourById(tourId: Id<'tours'>) {
  return useQuery(api.tours.getById, { tourId })
}

export function useTourBySlug(slug: string) {
  return useQuery(api.tours.getBySlug, { slug })
}

export function useTourStats() {
  return useQuery(api.tours.getStats)
}

export function useRecentTours() {
  return useQuery(api.tours.getRecent)
}

export function useTourMutations() {
  const create = useMutation(api.tours.create)
  const update = useMutation(api.tours.update)
  const remove = useMutation(api.tours.remove)
  const publish = useMutation(api.tours.publish)
  const unpublish = useMutation(api.tours.unpublish)
  const archive = useMutation(api.tours.archive)
  const duplicate = useMutation(api.tours.duplicate)
  const bulkArchive = useMutation(api.tours.bulkArchive)
  const bulkDelete = useMutation(api.tours.bulkDelete)
  const updateSlug = useMutation(api.tours.updateSlug)
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl)

  return {
    create,
    update,
    remove,
    publish,
    unpublish,
    archive,
    duplicate,
    bulkArchive,
    bulkDelete,
    updateSlug,
    generateUploadUrl,
  }
}
