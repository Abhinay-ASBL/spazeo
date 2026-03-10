'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react'
import { useFurnitureStore } from '@/hooks/useFurnitureStore'

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)

export function CostTracker() {
  const [isExpanded, setIsExpanded] = useState(false)

  const placedItems = useFurnitureStore((s) => s.placedItems)
  const totalCost = useFurnitureStore((s) => s.totalCost)
  const setSelectedId = useFurnitureStore((s) => s.setSelectedId)
  const setCenterOnItem = useFurnitureStore((s) => s.setCenterOnItem)

  const itemCount = placedItems.length

  const handleItemClick = (item: (typeof placedItems)[number]) => {
    setSelectedId(item.instanceId)
    setCenterOnItem(item.position)
  }

  const handleViewAllOnAmazon = () => {
    const amazonItems = placedItems.filter((item) => item.amazonUrl)
    for (const item of amazonItems) {
      if (item.amazonUrl) {
        window.open(item.amazonUrl, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const amazonItemCount = placedItems.filter((item) => item.amazonUrl).length

  if (itemCount === 0) {
    return (
      <div className="border-t border-[#2E2A24] px-3 py-3">
        <p className="text-center text-xs text-[#6B6560]">
          No furniture placed yet
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-[#2E2A24]">
      {/* Collapsed summary bar */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-3 text-left transition-colors hover:bg-[#1B1916]"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[#D4A017]">
            {formatPrice(totalCost)}
          </span>
          <span className="text-xs text-[#6B6560]">
            ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} strokeWidth={1.5} className="text-[#A8A29E]" />
        ) : (
          <ChevronUp size={16} strokeWidth={1.5} className="text-[#A8A29E]" />
        )}
      </button>

      {/* Expanded itemized list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto px-3 scrollbar-none">
              {placedItems.map((item) => (
                <button
                  key={item.instanceId}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="flex w-full items-center justify-between rounded-[4px] px-2 py-2 text-left transition-colors hover:bg-[#1B1916]"
                >
                  <span className="truncate text-sm text-[#F5F3EF]">
                    {item.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[#A8A29E]">
                      {formatPrice(item.price)}
                    </span>
                    {item.amazonUrl && (
                      <a
                        href={item.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#6B6560] transition-colors hover:text-[#D4A017]"
                        aria-label={`View ${item.name} on Amazon`}
                      >
                        <ExternalLink size={12} strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* View All on Amazon */}
            {amazonItemCount > 0 && (
              <div className="px-3 pb-3 pt-2">
                <button
                  type="button"
                  onClick={handleViewAllOnAmazon}
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0908] transition-colors hover:bg-[#E5B120]"
                >
                  <ExternalLink size={14} strokeWidth={1.5} />
                  View All on Amazon
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
