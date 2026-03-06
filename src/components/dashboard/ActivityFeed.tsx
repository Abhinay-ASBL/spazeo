'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Plus,
  Globe,
  UserPlus,
  Sparkles,
  ImagePlus,
  Building2,
  Loader2,
} from 'lucide-react'

/* ── Constants ── */

const ACTIVITY_ICONS: Record<string, typeof Plus> = {
  tour_created: Plus,
  tour_published: Globe,
  lead_captured: UserPlus,
  ai_completed: Sparkles,
  scene_uploaded: ImagePlus,
  building_created: Building2,
  building_published: Building2,
}

const ACTIVITY_COLORS: Record<string, string> = {
  tour_created: '#D4A017',
  tour_published: '#34D399',
  lead_captured: '#2DD4BF',
  ai_completed: '#FB7A54',
  scene_uploaded: '#A8A29E',
  building_created: '#D4A017',
  building_published: '#34D399',
}

/* ── Helpers ── */

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/* ── Activity Item ── */

function ActivityItem({
  activity,
}: {
  activity: {
    _id: string
    type: string
    message: string
    timestamp: number
    tourId?: string
  }
}) {
  const IconComponent = ACTIVITY_ICONS[activity.type] || Sparkles
  const iconColor = ACTIVITY_COLORS[activity.type] || '#6B6560'

  const content = (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[rgba(212,160,23,0.03)]"
      style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}14` }}
      >
        <IconComponent size={15} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] leading-snug truncate"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
        >
          {activity.message}
        </p>
        <span
          className="text-[11px]"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          {timeAgo(activity.timestamp)}
        </span>
      </div>
    </div>
  )

  if (activity.tourId) {
    return (
      <Link href={`/tours/${activity.tourId}`} className="block">
        {content}
      </Link>
    )
  }

  return content
}

/* ── Skeleton ── */

function ActivityItemSkeleton() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}
    >
      <div
        className="h-8 w-8 rounded-lg shrink-0 animate-pulse"
        style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
      />
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="h-3.5 w-3/4 rounded animate-pulse"
          style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
        />
        <div
          className="h-2.5 w-16 rounded animate-pulse"
          style={{ backgroundColor: 'rgba(212,160,23,0.06)' }}
        />
      </div>
    </div>
  )
}

/* ── Empty State ── */

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Sparkles size={32} style={{ color: '#6B6560' }} />
      <p
        className="mt-3 text-sm text-center"
        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
      >
        No activity yet. Create your first tour to get started.
      </p>
    </div>
  )
}

/* ── Main Component ── */

export function ActivityFeed({
  compact = false,
  maxItems,
}: {
  compact?: boolean
  maxItems?: number
}) {
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [allItems, setAllItems] = useState<Array<{
    _id: string
    type: string
    message: string
    timestamp: number
    tourId?: string
  }>>([])
  const [hasLoadedMore, setHasLoadedMore] = useState(false)

  const pageSize = maxItems ?? (compact ? 5 : 20)

  // Use the simple getRecent for the initial load (reactive, real-time)
  const recentActivity = useQuery(api.activity.getRecent)

  // Use paginated list for "load more" (only when cursor is set)
  const paginatedResult = useQuery(
    api.activity.list,
    cursor !== undefined ? { limit: pageSize, cursor } : 'skip'
  )

  const isLoading = recentActivity === undefined

  // Build the display list
  const displayItems = hasLoadedMore
    ? [...allItems, ...(paginatedResult?.items ?? [])]
    : (recentActivity ?? [])

  const limitedItems = maxItems ? displayItems.slice(0, maxItems) : displayItems
  const hasMore = !compact && !maxItems && (
    hasLoadedMore
      ? paginatedResult?.nextCursor != null
      : (recentActivity?.length ?? 0) >= 20
  )

  const handleLoadMore = useCallback(() => {
    if (!hasLoadedMore && recentActivity) {
      // First "load more" — transition from reactive getRecent to paginated list
      setAllItems(recentActivity as typeof allItems)
      const lastItem = recentActivity[recentActivity.length - 1]
      if (lastItem) {
        setCursor(lastItem.timestamp)
        setHasLoadedMore(true)
      }
    } else if (paginatedResult?.nextCursor) {
      // Subsequent "load more"
      setAllItems((prev) => [...prev, ...(paginatedResult.items as typeof allItems)])
      setCursor(paginatedResult.nextCursor)
    }
  }, [hasLoadedMore, recentActivity, paginatedResult])

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: compact ? 5 : 8 }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (limitedItems.length === 0) {
    return <EmptyActivity />
  }

  return (
    <div className="flex flex-col">
      {limitedItems.map((activity) => (
        <ActivityItem
          key={activity._id}
          activity={activity as {
            _id: string
            type: string
            message: string
            timestamp: number
            tourId?: string
          }}
        />
      ))}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={hasLoadedMore && paginatedResult === undefined}
          className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-colors duration-150 hover:bg-[rgba(212,160,23,0.03)]"
          style={{
            color: '#D4A017',
            fontFamily: 'var(--font-dmsans)',
            borderTop: '1px solid rgba(212,160,23,0.06)',
          }}
        >
          {hasLoadedMore && paginatedResult === undefined ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </>
          ) : (
            'Load more activity'
          )}
        </button>
      )}
    </div>
  )
}
