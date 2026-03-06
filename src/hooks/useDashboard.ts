import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useDashboardOverview(period?: '7d' | '30d' | '90d') {
  return useQuery(api.analytics.getDashboardOverview, { period })
}

export function useDashboardStats() {
  return useQuery(api.analytics.getDashboardStats)
}

export function useRecentActivity() {
  return useQuery(api.activity.getRecent)
}

export function useAnalyticsOverview() {
  return useQuery(api.analytics.getOverview)
}
