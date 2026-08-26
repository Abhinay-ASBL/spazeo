export function formatCount(n: number): string {
  return n.toLocaleString()
}

export function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString()
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function formatRate(n: number): string {
  if (n === 0) return '0'
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
