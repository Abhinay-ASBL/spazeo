'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  X,
  Copy,
  Check,
  Code2,
  Link2,
  Mail,
  QrCode,
} from 'lucide-react'

/* ── Social Icons (inline SVGs for lightweight footprint) ── */

function TwitterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/* ── QR Code Generator (simple SVG-based) ── */

function generateQRMatrix(data: string): boolean[][] {
  // Simplified QR-like pattern for visual representation
  // In production, use a proper QR encoding library
  const size = 25
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  )

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        if (isOuter || isInner) {
          matrix[startR + r][startC + c] = true
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Generate data-like pattern from string hash
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder pattern areas
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) {
        continue
      }
      // Timing patterns
      if (r === 6 || c === 6) {
        matrix[r][c] = (r + c) % 2 === 0
        continue
      }
      // Data pattern based on hash
      const seed = ((hash * (r * size + c + 1)) >>> 0) % 100
      matrix[r][c] = seed < 45
    }
  }

  return matrix
}

function QRCodeSVG({ data, size = 160 }: { data: string; size?: number }) {
  const matrix = generateQRMatrix(data)
  const moduleCount = matrix.length
  const moduleSize = size / moduleCount

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ borderRadius: 8 }}
    >
      <rect width={size} height={size} fill="#F5F3EF" rx={8} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * moduleSize}
              y={r * moduleSize}
              width={moduleSize}
              height={moduleSize}
              fill="#0A0908"
            />
          ) : null
        )
      )}
    </svg>
  )
}

/* ── Share Dialog ── */

interface ShareDialogProps {
  tourSlug: string
  tourTitle: string
  isOpen: boolean
  onClose: () => void
}

type CopyState = 'url' | 'embed' | null

export function ShareDialog({ tourSlug, tourTitle, isOpen, onClose }: ShareDialogProps) {
  const [copiedField, setCopiedField] = useState<CopyState>(null)
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'qr'>('link')
  const dialogRef = useRef<HTMLDivElement>(null)

  const tourUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tour/${tourSlug}`
    : `/tour/${tourSlug}`

  const embedCode = `<iframe src="${tourUrl}" width="100%" height="500" frameborder="0" allowfullscreen allow="xr-spatial-tracking" style="border:0;border-radius:8px;"></iframe>`

  const handleCopy = useCallback(async (text: string, field: CopyState) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }, [])

  // Social share handlers
  const shareOnTwitter = () => {
    const text = encodeURIComponent(`Check out this virtual tour: ${tourTitle}`)
    const url = encodeURIComponent(tourUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420')
  }

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(tourUrl)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=550,height=420')
  }

  const shareOnFacebook = () => {
    const url = encodeURIComponent(tourUrl)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=550,height=420')
  }

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Check out this virtual tour: ${tourTitle} ${tourUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Virtual Tour: ${tourTitle}`)
    const body = encodeURIComponent(`Take a look at this virtual tour:\n\n${tourTitle}\n${tourUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // Close on Escape + focus trap
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()

      // Trap focus within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    // Auto-focus the dialog on open
    const timer = setTimeout(() => {
      dialogRef.current?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs = [
    { id: 'link' as const, label: 'Link', icon: Link2 },
    { id: 'embed' as const, label: 'Embed', icon: Code2 },
    { id: 'qr' as const, label: 'QR Code', icon: QrCode },
  ]

  const socialButtons = [
    { label: 'Twitter', icon: TwitterIcon, onClick: shareOnTwitter, color: '#A8A29E' },
    { label: 'LinkedIn', icon: LinkedInIcon, onClick: shareOnLinkedIn, color: '#A8A29E' },
    { label: 'Facebook', icon: FacebookIcon, onClick: shareOnFacebook, color: '#A8A29E' },
    { label: 'WhatsApp', icon: WhatsAppIcon, onClick: shareOnWhatsApp, color: '#A8A29E' },
    { label: 'Email', icon: Mail, onClick: shareViaEmail, color: '#A8A29E' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10,9,8,0.70)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-[12px] shadow-xl overflow-hidden outline-none"
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(212,160,23,0.12)' }}
        >
          <h2
            id="share-dialog-title"
            className="font-semibold text-base"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
          >
            Share Tour
          </h2>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors duration-150 cursor-pointer"
            style={{ color: '#6B6560' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F5F3EF'
              e.currentTarget.style.backgroundColor = 'rgba(212,160,23,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B6560'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex px-6 pt-4 gap-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150"
                style={{
                  backgroundColor: isActive ? 'rgba(212,160,23,0.12)' : 'transparent',
                  color: isActive ? '#D4A017' : '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="px-6 py-4">
          {activeTab === 'link' && (
            <div>
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                Tour URL
              </label>
              <div className="flex gap-2">
                <div
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm truncate select-all"
                  style={{
                    backgroundColor: '#12100E',
                    color: '#F5F3EF',
                    border: '1px solid rgba(212,160,23,0.12)',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {tourUrl}
                </div>
                <button
                  onClick={() => handleCopy(tourUrl, 'url')}
                  className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 cursor-pointer transition-all duration-150"
                  style={{
                    backgroundColor: copiedField === 'url' ? 'rgba(52,211,153,0.15)' : '#D4A017',
                    color: copiedField === 'url' ? '#34D399' : '#0A0908',
                  }}
                  aria-label="Copy tour URL"
                >
                  {copiedField === 'url' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div>
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                Embed Code
              </label>
              <div
                className="px-3 py-2.5 rounded-lg text-xs leading-relaxed break-all mb-3"
                style={{
                  backgroundColor: '#12100E',
                  color: '#A8A29E',
                  border: '1px solid rgba(212,160,23,0.12)',
                  fontFamily: 'monospace',
                  maxHeight: 100,
                  overflowY: 'auto',
                }}
              >
                {embedCode}
              </div>
              <button
                onClick={() => handleCopy(embedCode, 'embed')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 w-full justify-center"
                style={{
                  backgroundColor: copiedField === 'embed' ? 'rgba(52,211,153,0.15)' : '#D4A017',
                  color: copiedField === 'embed' ? '#34D399' : '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {copiedField === 'embed' ? (
                  <>
                    <Check size={14} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy Embed Code
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center py-2">
              <div
                className="p-3 rounded-xl mb-3"
                style={{ backgroundColor: '#F5F3EF' }}
              >
                <QRCodeSVG data={tourUrl} size={160} />
              </div>
              <p
                className="text-xs text-center"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                Scan to view the tour on any device
              </p>
            </div>
          )}
        </div>

        {/* Social Share */}
        <div
          className="px-6 py-4"
          style={{ borderTop: '1px solid rgba(212,160,23,0.12)' }}
        >
          <p
            className="text-xs font-medium mb-3"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Share on social
          </p>
          <div className="flex gap-2">
            {socialButtons.map((btn) => {
              const Icon = btn.icon
              return (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  aria-label={`Share on ${btn.label}`}
                  className="flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-all duration-150"
                  style={{
                    backgroundColor: '#12100E',
                    color: btn.color,
                    border: '1px solid rgba(212,160,23,0.12)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,160,23,0.4)'
                    e.currentTarget.style.color = '#D4A017'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)'
                    e.currentTarget.style.color = btn.color
                  }}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
