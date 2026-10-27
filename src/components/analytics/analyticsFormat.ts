export function formatCount(n: number): string {
  return n.toLocaleString()
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString()
}

export function formatDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
  if (total === 0) return '0s'
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function formatSectionCell(views: number, seconds: number): string {
  if (!views && !seconds) return '—'
  if (views && seconds) return `${views} · ${formatDuration(seconds)}`
  if (views) return String(views)
  return formatDuration(seconds)
}

export function formatScenesCell(
  scenes:
    | { title: string; views: number; seconds: number }[]
    | undefined
): string {
  if (!scenes?.length) return '—'
  return scenes
    .map((s) => `${s.title} · ${formatSectionCell(s.views, s.seconds)}`)
    .join('  ·  ')
}

export function formatHeatmapCell(
  scenes: { title: string; yawSamples?: number }[] | undefined
): string {
  const withLooks = (scenes ?? []).filter((s) => (s.yawSamples ?? 0) > 0)
  if (withLooks.length === 0) return '—'
  return withLooks
    .map((s) => `${s.title} · ${s.yawSamples}`)
    .join('  ·  ')
}

export function formatRate(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
