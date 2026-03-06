'use client'

import Link from 'next/link'
/* eslint-disable @next/next/no-img-element */
import { Eye, Images, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { TourStatus } from '@/types'

interface TourCardProps {
  tour: {
    _id: string
    title: string
    status: TourStatus
    viewCount: number
    sceneCount?: number
    thumbnailUrl?: string
    _creationTime: number
  }
  className?: string
}

const statusVariant: Record<TourStatus, 'published' | 'draft' | 'default'> = {
  draft: 'draft',
  published: 'published',
  archived: 'default',
}

export function TourCard({ tour, className }: TourCardProps) {
  return (
    <Link
      href={`/tours/${tour._id}`}
      className={cn(
        'block rounded-xl overflow-hidden bg-[#1B1916] border border-[rgba(212,160,23,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer',
        className
      )}
      style={{ width: 340 }}
    >
      {/* Thumbnail */}
      <div className="relative h-[200px] bg-[#2E2A24] flex items-center justify-center">
        {tour.thumbnailUrl ? (
          <img
            src={tour.thumbnailUrl}
            alt={tour.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span
            className="text-xs text-[#5A5248]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Tour image
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 p-4 px-5">
        {/* Name + Badge Row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[15px] font-semibold text-[#F5F3EF] truncate"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            {tour.title}
          </span>
          <Badge variant={statusVariant[tour.status]}>
            {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
          </Badge>
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-[#6B6560]">
            <Eye size={14} className="shrink-0" />
            {tour.viewCount} views
          </span>
          {tour.sceneCount !== undefined && (
            <span className="flex items-center gap-1.5 text-xs text-[#6B6560]">
              <Images size={14} className="shrink-0" />
              {tour.sceneCount} scenes
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-[#6B6560]">
            <Calendar size={14} className="shrink-0" />
            {formatDate(new Date(tour._creationTime))}
          </span>
        </div>
      </div>
    </Link>
  )
}
