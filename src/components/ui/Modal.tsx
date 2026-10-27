'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-5xl',
}

// Open modals, topmost last: only the top one reacts to Escape / Tab.
const openModalStack: string[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const modalId = useId()
  const titleId = `${modalId}-title`
  const dialogRef = useRef<HTMLDivElement>(null)
  // Latest onClose without re-running the open effect (inline handlers change every render)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    openModalStack.push(modalId)
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusables = () =>
      dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
    const initial = focusables()
    if (dialog && !dialog.contains(document.activeElement)) {
      ;(initial[0] ?? dialog).focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (openModalStack[openModalStack.length - 1] !== modalId) return
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const idx = openModalStack.lastIndexOf(modalId)
      if (idx !== -1) openModalStack.splice(idx, 1)
      document.body.style.overflow = prevOverflow
      if (prevFocus && typeof prevFocus.focus === 'function' && prevFocus.isConnected) {
        prevFocus.focus()
      }
    }
  }, [isOpen, modalId])

  if (!isOpen) return null

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 backdrop-blur-sm',
          'animate-in fade-in duration-200'
        )}
        style={{ backgroundColor: 'rgba(10,9,8,0.70)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal box */}
      <div
        className={cn(
          'relative w-full rounded-[12px] shadow-xl overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-200',
          size === 'xl' ? 'max-h-[90vh] flex flex-col' : '',
          sizeClasses[size]
        )}
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
            id={titleId}
            className="font-semibold"
            style={{ color: '#F5F3EF' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors duration-150 cursor-pointer hover:text-[#F5F3EF] hover:bg-[rgba(212,160,23,0.08)]"
            style={{ color: '#6B6560' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          className={size === 'xl' ? 'p-6 overflow-y-auto flex-1' : 'p-6'}
          style={{ color: '#A8A29E' }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-4 pb-4 pt-0 flex justify-end gap-3"
            style={{ borderTop: '1px solid rgba(212,160,23,0.12)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
