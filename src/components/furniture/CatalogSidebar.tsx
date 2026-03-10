'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFurnitureStore } from '@/hooks/useFurnitureStore'
import { CatalogItemCard } from './CatalogItemCard'

type CategoryValue =
  | 'sofas'
  | 'beds'
  | 'tables'
  | 'chairs'
  | 'storage'
  | 'decor'

type StyleValue = 'scandinavian' | 'modern' | 'luxury' | 'industrial'

const CATEGORIES: { label: string; value: CategoryValue | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Sofas', value: 'sofas' },
  { label: 'Beds', value: 'beds' },
  { label: 'Tables', value: 'tables' },
  { label: 'Chairs', value: 'chairs' },
  { label: 'Storage', value: 'storage' },
  { label: 'Decor', value: 'decor' },
]

const STYLES: { label: string; value: StyleValue | undefined }[] = [
  { label: 'All Styles', value: undefined },
  { label: 'Scandinavian', value: 'scandinavian' },
  { label: 'Modern', value: 'modern' },
  { label: 'Luxury', value: 'luxury' },
  { label: 'Industrial', value: 'industrial' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function CatalogSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState<
    CategoryValue | undefined
  >(undefined)
  const [activeStyle, setActiveStyle] = useState<StyleValue | undefined>(
    undefined
  )

  const debouncedSearch = useDebounce(searchInput, 300)
  const isSearching = debouncedSearch.trim().length > 0

  const setGhostItem = useFurnitureStore((s) => s.setGhostItem)

  // Conditionally call the right query
  const listItems = useQuery(
    api.furnitureItems.list,
    isSearching ? 'skip' : { category: activeCategory, style: activeStyle }
  )

  const searchItems = useQuery(
    api.furnitureItems.search,
    isSearching
      ? {
          searchTerm: debouncedSearch.trim(),
          category: activeCategory,
          style: activeStyle,
        }
      : 'skip'
  )

  const items = isSearching ? searchItems : listItems
  const isLoading = items === undefined

  const handleItemClick = useCallback(
    (item: NonNullable<typeof items>[number]) => {
      if (!item.glbUrl) return
      setGhostItem(item._id, item.glbUrl, {
        name: item.name,
        price: item.priceUsd,
        amazonUrl: item.amazonUrl,
      })
    },
    [setGhostItem]
  )

  // Skeleton placeholders
  const skeletons = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="aspect-[3/4] animate-pulse rounded-[8px] bg-[#1B1916]"
        />
      )),
    []
  )

  return (
    <div className="relative flex">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="absolute -left-8 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-l-[8px] bg-[#12100E] text-[#A8A29E] transition-colors hover:text-[#D4A017]"
        aria-label={isOpen ? 'Collapse catalog' : 'Expand catalog'}
      >
        {isOpen ? (
          <ChevronRight size={18} strokeWidth={1.5} />
        ) : (
          <ChevronLeft size={18} strokeWidth={1.5} />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex h-full flex-col overflow-hidden border-l border-[#2E2A24] bg-[#12100E]"
          >
            <div className="flex flex-1 flex-col overflow-hidden p-3">
              {/* Search bar */}
              <div className="relative mb-3">
                <Search
                  size={16}
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560]"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search furniture..."
                  className="w-full rounded-[4px] bg-[#1B1916] py-2 pl-9 pr-3 text-sm text-[#F5F3EF] placeholder-[#6B6560] outline-none transition-colors focus:ring-1 focus:ring-[#D4A017]"
                />
              </div>

              {/* Category tabs */}
              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActiveCategory(cat.value)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      activeCategory === cat.value
                        ? 'bg-[#D4A017] text-[#0A0908]'
                        : 'bg-[#1B1916] text-[#A8A29E] hover:text-[#F5F3EF]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Style dropdown */}
              <select
                value={activeStyle ?? ''}
                onChange={(e) =>
                  setActiveStyle(
                    (e.target.value as StyleValue) || undefined
                  )
                }
                className="mb-3 w-full rounded-[4px] bg-[#1B1916] px-3 py-2 text-sm text-[#F5F3EF] outline-none transition-colors focus:ring-1 focus:ring-[#D4A017]"
              >
                {STYLES.map((s) => (
                  <option key={s.label} value={s.value ?? ''}>
                    {s.label}
                  </option>
                ))}
              </select>

              {/* Item grid */}
              <div className="flex-1 overflow-y-auto scrollbar-none">
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-2">{skeletons}</div>
                ) : items && items.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => (
                      <CatalogItemCard
                        key={item._id}
                        item={item}
                        onClick={() => handleItemClick(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm text-[#6B6560]">No items found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
