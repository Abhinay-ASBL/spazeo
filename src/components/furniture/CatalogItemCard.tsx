'use client'

import { ExternalLink } from 'lucide-react'
import { useGLTF } from '@react-three/drei'
import type { Id } from '../../../convex/_generated/dataModel'

interface CatalogItemCardProps {
  item: {
    _id: Id<'furnitureItems'>
    name: string
    category: string
    style: string
    priceUsd: number
    dimensions: { width: number; depth: number; height: number }
    amazonUrl?: string
    glbUrl: string | null
    thumbnailUrl: string | null
  }
  onClick: () => void
}

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)

const styleLabel: Record<string, string> = {
  scandinavian: 'Scandinavian',
  modern: 'Modern',
  luxury: 'Luxury',
  industrial: 'Industrial',
}

export function CatalogItemCard({ item, onClick }: CatalogItemCardProps) {
  const handleMouseEnter = () => {
    if (item.glbUrl) {
      try {
        useGLTF.preload(item.glbUrl)
      } catch {
        // Preload is best-effort; ignore errors
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      className="group flex w-full flex-col overflow-hidden rounded-[8px] border border-transparent bg-[#1B1916] text-left transition-colors hover:border-[#D4A017]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2E2A24] to-[#1B1916]">
            <span className="text-xs text-[#6B6560]">No preview</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2">
        <span className="truncate text-sm font-medium text-[#F5F3EF]">
          {item.name}
        </span>

        <span className="text-sm font-semibold text-[#D4A017]">
          {formatPrice(item.priceUsd)}
        </span>

        <span className="text-xs text-[#6B6560]">
          {item.dimensions.width} x {item.dimensions.depth} x{' '}
          {item.dimensions.height} m
        </span>

        <div className="mt-1 flex items-center justify-between">
          <span className="rounded-full bg-[#2E2A24] px-2 py-0.5 text-[10px] font-medium text-[#A8A29E]">
            {styleLabel[item.style] ?? item.style}
          </span>

          {item.amazonUrl && (
            <a
              href={item.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#A8A29E] transition-colors hover:text-[#D4A017]"
              aria-label={`View ${item.name} on Amazon`}
            >
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </button>
  )
}
