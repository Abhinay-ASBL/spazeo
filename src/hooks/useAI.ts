import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useAI() {
  const analyzeScene = useAction(api.aiActions.analyzeScene)
  const generateDescription = useAction(api.aiActions.generateDescription)
  const stageScene = useAction(api.aiActions.stageScene)
  const enhanceImage = useAction(api.aiActions.enhanceImage)
  const generateSceneDescription = useAction(api.aiActions.generateSceneDescription)

  return {
    analyzeScene,
    generateDescription,
    stageScene,
    enhanceImage,
    generateSceneDescription,
  }
}

export function useAIJobs(filters?: {
  type?: 'scene_analysis' | 'staging' | 'description' | 'floor_plan' | 'enhancement' | 'auto_hotspots'
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  tourId?: Id<'tours'>
}) {
  return useQuery(api.ai.listJobs, filters ?? {})
}

export function useAIJobsByTour(tourId: Id<'tours'>) {
  return useQuery(api.ai.getJobsByTour, { tourId })
}

export function useAIUsage() {
  return useQuery(api.ai.getUsage)
}

export function useRetryJob() {
  return useMutation(api.aiHelpers.retryJob)
}
