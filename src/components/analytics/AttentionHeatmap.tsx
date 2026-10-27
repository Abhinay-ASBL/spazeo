'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Props {
  sceneId: Id<'scenes'>
  width?: number
  height?: number
  visitorId?: Id<'visitors'>
  sessionId?: string
  startTs?: number
  endTs?: number
  sessionStartedAt?: number
  sessionEndedAt?: number
  showDurationFilter?: boolean
}

const DURATION_OPTIONS = [
  { label: 'Full session', seconds: 0 },
  { label: 'First 30s', seconds: 30 },
  { label: 'First 1 min', seconds: 60 },
  { label: 'First 3 min', seconds: 180 },
  { label: 'First 5 min', seconds: 300 },
] as const

export function AttentionHeatmap({
  sceneId,
  width = 720,
  height = 180,
  visitorId,
  sessionId,
  startTs,
  endTs,
  sessionStartedAt,
  sessionEndedAt,
  showDurationFilter = false,
}: Props) {
  const [windowSec, setWindowSec] = useState(0)
  // Anchor for "now" when a session is still live (no sessionEndedAt/endTs yet).
  // Computed once via lazy state init rather than Date.now() in the render body,
  // so re-renders don't keep shifting the query's endTs and re-triggering fetches.
  const [liveNow] = useState(() => Date.now())

  const rangeStart = sessionStartedAt ?? startTs
  const durationEnd =
    showDurationFilter && windowSec > 0 && rangeStart
      ? rangeStart + windowSec * 1000
      : undefined
  const rangeEnd = durationEnd
    ? Math.min(sessionEndedAt ?? endTs ?? liveNow, durationEnd)
    : (sessionEndedAt ?? endTs)

  const data = useQuery(api.analytics.getYawHeatmap, {
    sceneId,
    ...(visitorId ? { visitorId } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(rangeStart ? { startTs: rangeStart } : {}),
    ...(rangeEnd ? { endTs: rangeEnd } : {}),
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { grid, yawBins, pitchBins, total } = data
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (total === 0) {
      ctx.fillStyle = '#6B6560'
      ctx.font = '12px sans-serif'
      ctx.fillText('No look-direction samples in this window.', 12, canvas.height / 2)
      return
    }

    const cellW = canvas.width / yawBins
    const cellH = canvas.height / pitchBins
    let max = 0
    for (const row of grid) for (const v of row) if (v > max) max = v

    for (let p = 0; p < pitchBins; p++) {
      for (let y = 0; y < yawBins; y++) {
        const v = grid[p][y] / Math.max(1, max)
        if (v === 0) continue
        const alpha = Math.min(1, 0.15 + v * 0.85)
        ctx.fillStyle = `rgba(212, 160, 23, ${alpha})`
        ctx.fillRect(y * cellW, (pitchBins - 1 - p) * cellH, cellW + 1, cellH + 1)
      }
    }
  }, [data])

  const peak =
    data?.peakYaw != null
      ? `Peak look ${data.peakYaw}° yaw / ${data.peakPitch}° pitch`
      : null
  const yawSpan =
    data?.yawRanges && data.yawRanges.length > 0
      ? `Yaw ${data.yawRanges.map((r) => `${r.from}°–${r.to}°`).join(', ')}`
      : data?.yawFrom != null && data.yawTo != null
        ? `Yaw ${data.yawFrom}°–${data.yawTo}°`
        : null
  const pitchSpan =
    data?.pitchRanges && data.pitchRanges.length > 0
      ? `pitch ${data.pitchRanges.map((r) => `${r.from}°–${r.to}°`).join(', ')}`
      : data?.pitchFrom != null && data.pitchTo != null
        ? `pitch ${data.pitchFrom}°–${data.pitchTo}°`
        : null

  return (
    <div className="rounded-xl border border-[#2E2A24] bg-[#12100E] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[#A8A29E]">
          Attention heatmap
        </span>
        <span className="text-xs text-[#6B6560]">{data?.total ?? 0} samples</span>
      </div>
      {showDurationFilter && (
        <div className="mb-2 flex flex-wrap gap-1">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setWindowSec(opt.seconds)}
              className="cursor-pointer rounded-md px-2 py-1 text-[11px]"
              style={{
                border: '1px solid rgba(212,160,23,0.2)',
                backgroundColor: windowSec === opt.seconds ? 'rgba(212,160,23,0.16)' : 'transparent',
                color: windowSec === opt.seconds ? '#D4A017' : '#A8A29E',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-md bg-[#0A0908]"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[#6B6560]">
        <span>0° yaw</span>
        <span>90°</span>
        <span>180°</span>
        <span>270°</span>
        <span>360°</span>
      </div>
      <p className="mt-0.5 mb-0 text-[10px] text-[#6B6560]">
        Vertical = pitch (−90° look-down at the bottom, +90° look-up at the top)
      </p>
      {(peak || yawSpan) && (
        <p className="mt-2 mb-0 text-[11px] text-[#A8A29E]">
          {peak}
          {peak && yawSpan ? ' · ' : ''}
          {yawSpan}
          {pitchSpan ? ` · ${pitchSpan}` : ''}
        </p>
      )}
    </div>
  )
}
