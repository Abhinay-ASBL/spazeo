'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
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
            id="modal-title"
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
        <div className="p-6" style={{ color: '#A8A29E' }}>
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
