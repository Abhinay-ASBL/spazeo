'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { FloorPlanGeometry } from '@/stores/floorPlanEditorStore'
import { ChevronDown, ChevronUp, RotateCcw, History } from 'lucide-react'

interface VersionHistoryProps {
  floorPlanId: Id<'floorPlanDetails'>
  onRestore: (geometry: FloorPlanGeometry) => void
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

export function VersionHistory({ floorPlanId, onRestore }: VersionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null)

  const versions = useQuery(api.floorPlanVersions.listByFloorPlan, { floorPlanId })

  if (!versions || versions.length === 0) {
    return null
  }

  return (
    <div className="border-t border-[#2E2A24]">
      {/* Header toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-[#1B1916] transition-colors"
        style={{ color: '#F5F3EF' }}
        aria-label={isExpanded ? 'Collapse version history' : 'Expand version history'}
      >
        <span className="flex items-center gap-2">
          <History size={14} strokeWidth={1.5} style={{ color: '#D4A017' }} />
          Version History
          <span className="text-xs font-normal" style={{ color: '#6B6560' }}>
            ({versions.length})
          </span>
        </span>
        {isExpanded ? (
          <ChevronUp size={14} style={{ color: '#6B6560' }} />
        ) : (
          <ChevronDown size={14} style={{ color: '#6B6560' }} />
        )}
      </button>

      {/* Version list */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {versions.map((version) => {
            const isAi = version.source === 'ai'
            const isConfirming = confirmVersion === version.versionNumber

            return (
              <div
                key={version._id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(46, 42, 36, 0.6)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium" style={{ color: '#F5F3EF' }}>
                    v{version.versionNumber}
                  </span>
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: isAi
                        ? 'rgba(45, 212, 191, 0.15)'
                        : 'rgba(212, 160, 23, 0.15)',
                      color: isAi ? '#2DD4BF' : '#D4A017',
                    }}
                  >
                    {isAi ? 'AI' : 'Manual'}
                  </span>
                  <span className="text-[10px] truncate" style={{ color: '#6B6560' }}>
                    {timeAgo(version.createdAt)}
                  </span>
                </div>

                {/* Restore button / confirmation */}
                {isConfirming ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setConfirmVersion(null)}
                      className="px-2 py-0.5 text-[10px] rounded text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#2E2A24]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onRestore(version.geometry as FloorPlanGeometry)
                        setConfirmVersion(null)
                      }}
                      className="px-2 py-0.5 text-[10px] rounded font-medium"
                      style={{ backgroundColor: '#D4A017', color: '#0A0908' }}
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmVersion(version.versionNumber)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[#2E2A24] transition-colors"
                    aria-label={`Restore to version ${version.versionNumber}`}
                  >
                    <RotateCcw size={10} strokeWidth={1.5} />
                    Restore
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
