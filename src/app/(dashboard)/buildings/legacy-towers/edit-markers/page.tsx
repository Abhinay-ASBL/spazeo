'use client'

/**
 * Dev-only marker placement editor for the Legacy Towers showcase.
 *
 * Usage:
 *   1. Go to /buildings/legacy-towers/edit-markers
 *   2. Pick an image (site plan / tower hero / a floor plan)
 *   3. Pick the label you want to pin (A, B, C, D, E, F)
 *   4. Click on the image — marker is placed, coords stored in %
 *   5. Click "Copy JSON" — paste into src/lib/legacyTowers.ts
 *
 * No data is persisted. This exists purely to generate accurate
 * `{ left, top }` overlay percentages for the showcase.
 */

import { useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Copy, RotateCcw, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

type Label = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

const LABELS: Label[] = ['A', 'B', 'C', 'D', 'E', 'F']

interface ImageOption {
  id: string
  title: string
  src: string
  aspect: string
  description: string
}

const IMAGES: ImageOption[] = [
  {
    id: 'site-plan',
    title: 'Site plan (satellite)',
    src: '/legacy-towers/plans/site-plan.jpg',
    aspect: '9/16',
    description: 'Used in Stage 3 — corner picker',
  },
  {
    id: 'tower-hero',
    title: 'Tower hero render',
    src: '/legacy-towers/plans/tower-hero.jpg',
    aspect: '16/9',
    description: 'Used in Stage 1 — tower picker',
  },
  {
    id: 'tower-a-floor',
    title: 'Tower A floor plan',
    src: '/legacy-towers/plans/tower-a-floor.jpg',
    aspect: '4/5',
    description: 'Used in Stage 2 — floor picker',
  },
  {
    id: 'tower-b-floor',
    title: 'Tower B floor plan',
    src: '/legacy-towers/plans/tower-b-floor.jpg',
    aspect: '4/5',
    description: 'Used in Stage 2 — floor picker',
  },
  {
    id: 'tower-c-floor',
    title: 'Tower C floor plan',
    src: '/legacy-towers/plans/tower-c-floor.jpg',
    aspect: '4/5',
    description: 'Used in Stage 2 — floor picker',
  },
]

interface Marker {
  label: Label
  /** left % */
  x: number
  /** top % */
  y: number
}

export default function MarkerEditorPage() {
  const [imageId, setImageId] = useState<string>(IMAGES[0].id)
  const [activeLabel, setActiveLabel] = useState<Label>('A')
  const [markers, setMarkers] = useState<Record<string, Marker[]>>({})
  const [justCopied, setJustCopied] = useState(false)
  const imageWrapRef = useRef<HTMLDivElement>(null)

  const image = useMemo(() => IMAGES.find(i => i.id === imageId)!, [imageId])
  const imageMarkers = useMemo(() => markers[imageId] ?? [], [markers, imageId])

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = imageWrapRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      setMarkers((prev) => {
        const current = prev[imageId] ?? []
        // Replace any existing marker with the same label
        const filtered = current.filter((m) => m.label !== activeLabel)
        const next = [...filtered, { label: activeLabel, x, y }].sort((a, b) =>
          a.label.localeCompare(b.label),
        )
        return { ...prev, [imageId]: next }
      })

      // Auto-advance to next unplaced label for faster flow
      const nextIdx = LABELS.indexOf(activeLabel) + 1
      if (nextIdx < LABELS.length) setActiveLabel(LABELS[nextIdx])
    },
    [activeLabel, imageId],
  )

  const handleReset = () => {
    setMarkers((prev) => ({ ...prev, [imageId]: [] }))
    setActiveLabel('A')
  }

  const handleRemove = (label: Label) => {
    setMarkers((prev) => ({
      ...prev,
      [imageId]: (prev[imageId] ?? []).filter((m) => m.label !== label),
    }))
  }

  const json = useMemo(() => {
    const sorted = [...imageMarkers].sort((a, b) => a.label.localeCompare(b.label))
    const lines = sorted.map(
      (m) =>
        `  { id: '${m.label}', left: '${m.x.toFixed(1)}%', top: '${m.y.toFixed(1)}%' },`,
    )
    return `// ${image.title}\n[\n${lines.join('\n')}\n]`
  }, [imageMarkers, image.title])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setJustCopied(true)
      toast.success('Coordinates copied')
      setTimeout(() => setJustCopied(false), 1500)
    } catch {
      toast.error('Clipboard blocked — select & copy manually')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0908]">
      <div className="sticky top-0 z-20 border-b border-[rgba(212,160,23,0.12)] bg-[#0A0908]/85 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/buildings/legacy-towers/view"
              className="flex items-center gap-2 rounded-lg border border-[rgba(212,160,23,0.15)] px-3 py-1.5 text-sm text-[#A8A29E] hover:text-[#F5F3EF]"
            >
              <ArrowLeft size={14} /> Back to showcase
            </Link>
            <div>
              <h1
                className="text-lg font-semibold text-[#F5F3EF]"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                Marker editor
              </h1>
              <p className="text-xs text-[#6B6560]">
                Click on the image to pin A–F. Copy JSON → paste into{' '}
                <code className="rounded bg-[#1B1916] px-1.5 py-0.5 text-[11px] text-[#D4A017]">
                  src/lib/legacyTowers.ts
                </code>
              </p>
            </div>
          </div>

          <span className="rounded-full border border-[rgba(251,122,84,0.25)] bg-[rgba(251,122,84,0.08)] px-3 py-1 text-xs text-[#FB7A54]">
            Dev tool · Not linked in UI
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
        {/* Image canvas */}
        <div className="overflow-hidden rounded-2xl border border-[rgba(212,160,23,0.15)] bg-[#12100E]">
          <div className="flex items-center justify-between border-b border-[rgba(212,160,23,0.08)] px-5 py-3">
            <div>
              <p
                className="text-sm font-semibold text-[#F5F3EF]"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                {image.title}
              </p>
              <p className="text-xs text-[#6B6560]">{image.description}</p>
            </div>
            <p className="text-xs text-[#A8A29E]">
              Placing: <span className="font-semibold text-[#D4A017]">{activeLabel}</span>
            </p>
          </div>
          <div
            ref={imageWrapRef}
            onClick={handleImageClick}
            className="relative w-full cursor-crosshair bg-[#0A0908]"
            style={{ aspectRatio: image.aspect }}
          >
            <Image
              src={image.src}
              alt={image.title}
              fill
              className="pointer-events-none object-contain"
              sizes="70vw"
              priority
            />
            {imageMarkers.map((m) => (
              <span
                key={m.label}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold shadow-lg"
                  style={{
                    backgroundColor: 'rgba(10,9,8,0.88)',
                    borderColor: '#D4A017',
                    color: '#D4A017',
                    boxShadow: '0 0 0 5px rgba(212,160,23,0.2)',
                  }}
                >
                  {m.label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <aside className="flex flex-col gap-4">
          {/* Image picker */}
          <div className="rounded-2xl border border-[rgba(212,160,23,0.15)] bg-[#12100E] p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#6B6560]">Image</p>
            <div className="flex flex-col gap-1.5">
              {IMAGES.map((i) => {
                const active = i.id === imageId
                const count = (markers[i.id] ?? []).length
                return (
                  <button
                    key={i.id}
                    onClick={() => setImageId(i.id)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                      active
                        ? 'border-[#D4A017] bg-[rgba(212,160,23,0.08)] text-[#F5F3EF]'
                        : 'border-[rgba(212,160,23,0.12)] bg-[#1B1916] text-[#A8A29E] hover:border-[rgba(212,160,23,0.3)]'
                    }`}
                  >
                    <span>{i.title}</span>
                    <span className="text-xs text-[#6B6560]">
                      {count}/6
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Label picker */}
          <div className="rounded-2xl border border-[rgba(212,160,23,0.15)] bg-[#12100E] p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#6B6560]">
              Label to place
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {LABELS.map((l) => {
                const placed = imageMarkers.some((m) => m.label === l)
                const active = l === activeLabel
                return (
                  <button
                    key={l}
                    onClick={() => setActiveLabel(l)}
                    className={`relative rounded-lg border py-2 text-sm font-bold transition-all ${
                      active
                        ? 'border-[#D4A017] bg-[rgba(212,160,23,0.15)] text-[#D4A017]'
                        : placed
                        ? 'border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.08)] text-[#34D399]'
                        : 'border-[rgba(212,160,23,0.15)] bg-[#1B1916] text-[#A8A29E] hover:border-[rgba(212,160,23,0.3)]'
                    }`}
                  >
                    {l}
                    {placed && !active && (
                      <span className="absolute right-1 top-1">
                        <Check size={9} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#6B6560]">
              Click the image to pin the active label. Auto-advances to next label.
              Click same label again to move it.
            </p>
          </div>

          {/* Placed list */}
          <div className="rounded-2xl border border-[rgba(212,160,23,0.15)] bg-[#12100E] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-[#6B6560]">
                Placed markers
              </p>
              {imageMarkers.length > 0 && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-[#FB7A54] hover:text-[#E5B120]"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {imageMarkers.length === 0 ? (
              <p className="py-3 text-center text-xs text-[#6B6560]">
                No markers yet. Click the image.
              </p>
            ) : (
              <ul className="space-y-1">
                {imageMarkers.map((m) => (
                  <li
                    key={m.label}
                    className="flex items-center justify-between rounded-lg bg-[#1B1916] px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-[#D4A017]">{m.label}</span>
                    <span className="font-mono text-[#A8A29E]">
                      {m.x.toFixed(1)}%, {m.y.toFixed(1)}%
                    </span>
                    <button
                      onClick={() => handleRemove(m.label)}
                      className="text-[#6B6560] hover:text-[#FB7A54]"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Output */}
          <div className="rounded-2xl border border-[rgba(212,160,23,0.15)] bg-[#12100E] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-[#6B6560]">Output</p>
              <button
                onClick={handleCopy}
                disabled={imageMarkers.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-[#D4A017] px-3 py-1.5 text-xs font-semibold text-[#0A0908] transition-colors hover:bg-[#E5B120] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {justCopied ? <Check size={12} /> : <Copy size={12} />}
                {justCopied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="max-h-60 overflow-auto rounded-lg bg-[#0A0908] p-3 text-[11px] leading-relaxed text-[#A8A29E]">
              <code>{json}</code>
            </pre>
          </div>
        </aside>
      </div>
    </div>
  )
}
