'use client'

import { useState } from 'react'
import { ExternalLink, ChevronUp, ChevronDown, ShoppingCart } from 'lucide-react'

interface CostItem {
  name: string
  price: number
  amazonUrl?: string
}

interface CostSummaryPanelProps {
  placements: CostItem[]
  furnitureVisible: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

export function CostSummaryPanel({
  placements,
  furnitureVisible,
}: CostSummaryPanelProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const totalCost = placements.reduce((sum, item) => sum + item.price, 0)
  const itemCount = placements.length
  const itemsWithLinks = placements.filter((p) => !!p.amazonUrl)

  const handleViewAllOnAmazon = () => {
    itemsWithLinks.forEach((item) => {
      if (item.amazonUrl) {
        window.open(item.amazonUrl, '_blank', 'noopener,noreferrer')
      }
    })
  }

  const panelContent = (
    <>
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid rgba(212,160,23,0.12)' }}
      >
        <h2
          className="text-base font-semibold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          Furniture Cost Summary
        </h2>
        <div className="flex items-center gap-3 mt-1.5">
          <span
            className="text-xl font-bold"
            style={{ color: '#D4A017', fontFamily: 'var(--font-display)' }}
          >
            {formatPrice(totalCost)}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              color: '#A8A29E',
              backgroundColor: 'rgba(168,162,158,0.12)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Item list or hidden state */}
      {!furnitureVisible ? (
        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <p
            className="text-sm text-center"
            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          >
            Furniture hidden — toggle to view items
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <ul className="flex flex-col gap-2">
            {placements.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                style={{ backgroundColor: '#1B1916' }}
              >
                <span
                  className="text-sm flex-1 min-w-0 truncate mr-3"
                  style={{
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {item.name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: '#D4A017',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    {formatPrice(item.price)}
                  </span>
                  {item.amazonUrl && (
                    <a
                      href={item.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${item.name} on Amazon`}
                      className="flex items-center justify-center w-7 h-7 rounded transition-colors"
                      style={{ color: '#A8A29E' }}
                    >
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View All on Amazon button */}
      {furnitureVisible && itemsWithLinks.length > 0 && (
        <div
          className="px-5 py-4"
          style={{ borderTop: '1px solid rgba(212,160,23,0.12)' }}
        >
          <button
            onClick={handleViewAllOnAmazon}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-bold transition-colors"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            <ShoppingCart size={16} strokeWidth={1.5} />
            View All on Amazon
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar (md+) */}
      <div
        className="hidden md:flex flex-col h-full"
        style={{
          width: 320,
          flexShrink: 0,
          backgroundColor: '#12100E',
          borderLeft: '1px solid rgba(212,160,23,0.08)',
        }}
      >
        {panelContent}
      </div>

      {/* Mobile collapsible bottom panel (< md) */}
      <div
        className="block md:hidden"
        style={{
          backgroundColor: '#12100E',
          borderTop: '1px solid rgba(212,160,23,0.12)',
        }}
      >
        {/* Mobile toggle bar */}
        <button
          onClick={() => setMobileExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3"
          aria-label={
            mobileExpanded ? 'Collapse cost summary' : 'Expand cost summary'
          }
        >
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-semibold"
              style={{
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Total: {formatPrice(totalCost)}
            </span>
            <span
              className="text-xs"
              style={{
                color: '#6B6560',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          {mobileExpanded ? (
            <ChevronDown size={18} style={{ color: '#A8A29E' }} />
          ) : (
            <ChevronUp size={18} style={{ color: '#A8A29E' }} />
          )}
        </button>

        {/* Expanded content */}
        {mobileExpanded && (
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            {panelContent}
          </div>
        )}
      </div>
    </>
  )
}
