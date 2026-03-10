'use client'

import { useState, useCallback } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion'
import { CatalogSidebar } from './CatalogSidebar'
import { CostTracker } from './CostTracker'

type SheetState = 'hidden' | 'half' | 'full'

const SNAP_POINTS: Record<SheetState, number> = {
  hidden: 100, // percentage offscreen from bottom
  half: 50, // 50vh visible
  full: 10, // 90vh visible
}

export function CatalogBottomSheet() {
  const [sheetState, setSheetState] = useState<SheetState>('half')
  const y = useMotionValue(0)

  // Map y motion to opacity for smooth transitions
  const backdropOpacity = useTransform(y, [-400, 0, 400], [0.4, 0.2, 0])

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y
      const offset = info.offset.y

      // Determine target state based on velocity and direction
      if (velocity > 500 || offset > 100) {
        // Swiping down
        if (sheetState === 'full') {
          setSheetState('half')
        } else {
          setSheetState('hidden')
        }
      } else if (velocity < -500 || offset < -100) {
        // Swiping up
        if (sheetState === 'hidden') {
          setSheetState('half')
        } else {
          setSheetState('full')
        }
      }
    },
    [sheetState]
  )

  const handleOpen = useCallback(() => {
    setSheetState('half')
  }, [])

  const topPosition = `${SNAP_POINTS[sheetState]}vh`

  return (
    <>
      {/* Backdrop - only when sheet is visible */}
      {sheetState !== 'hidden' && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          style={{ opacity: backdropOpacity }}
          onClick={() => setSheetState('hidden')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Pull-up tab when hidden */}
      {sheetState === 'hidden' && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center bg-[#12100E] pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"
        >
          <div className="mb-2 h-1 w-10 rounded-full bg-[#6B6560]" />
        </button>
      )}

      {/* Bottom sheet */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[12px] bg-[#12100E] pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ y }}
        animate={{ top: topPosition }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 items-center justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[#6B6560]" />
        </div>

        {/* Catalog content - reuses CatalogSidebar internals */}
        <div className="flex-1 overflow-y-auto">
          <CatalogSidebar />
        </div>

        {/* Cost tracker footer */}
        <div className="shrink-0">
          <CostTracker />
        </div>
      </motion.div>
    </>
  )
}
