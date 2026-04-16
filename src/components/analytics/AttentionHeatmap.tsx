'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Props {
  sceneId: Id<'scenes'>
  width?: number
  height?: number
}

export function AttentionHeatmap({ sceneId, width = 720, height = 180 }: Props) {
  const data = useQuery(api.analytics.getYawHeatmap, { sceneId })
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
      ctx.fillText('No direction samples yet.', 12, canvas.height / 2)
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

  return (
    <div className="rounded-xl border border-[#2E2A24] bg-[#12100E] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#A8A29E]">
          Attention heatmap
        </span>
        <span className="text-xs text-[#6B6560]">{data?.total ?? 0} samples</span>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-md bg-[#0A0908]"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[#6B6560]">
        <span>0°</span>
        <span>90°</span>
        <span>180°</span>
        <span>270°</span>
        <span>360°</span>
      </div>
    </div>
  )
}
