'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ShortcutDefinition {
  keys: string[]
  label: string
  description: string
  category: string
}

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    keys: ['N'],
    label: 'N',
    description: 'Create new tour',
    category: 'Actions',
  },
  {
    keys: ['/'],
    label: '/',
    description: 'Focus search input',
    category: 'Navigation',
  },
  {
    keys: ['G', 'D'],
    label: 'G then D',
    description: 'Go to Dashboard',
    category: 'Navigation',
  },
  {
    keys: ['G', 'T'],
    label: 'G then T',
    description: 'Go to Tours',
    category: 'Navigation',
  },
  {
    keys: ['Escape'],
    label: 'Esc',
    description: 'Close any open modal',
    category: 'General',
  },
  {
    keys: ['?'],
    label: '?',
    description: 'Show keyboard shortcuts',
    category: 'General',
  },
]

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tagName = el.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const [showOverlay, setShowOverlay] = useState(false)
  const pendingKeyRef = useRef<string | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeOverlay = useCallback(() => {
    setShowOverlay(false)
  }, [])

  const openOverlay = useCallback(() => {
    setShowOverlay(true)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if (isInputFocused()) return

      // Don't trigger with modifier keys (except Shift for ? and /)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key

      // Handle Escape globally (even in inputs for modal closing)
      if (key === 'Escape') {
        // Close the shortcuts overlay if open
        if (showOverlay) {
          e.preventDefault()
          closeOverlay()
          return
        }
        // Dispatch a custom event so modals can listen
        window.dispatchEvent(new CustomEvent('spazeo:escape'))
        return
      }

      // Handle pending G sequences
      if (pendingKeyRef.current === 'g') {
        pendingKeyRef.current = null
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current)
          pendingTimerRef.current = null
        }

        if (key === 'd' || key === 'D') {
          e.preventDefault()
          router.push('/dashboard')
          return
        }
        if (key === 't' || key === 'T') {
          e.preventDefault()
          router.push('/tours')
          return
        }
        // No match for second key, fall through
        return
      }

      // Start G sequence
      if (key === 'g' || key === 'G') {
        // Only start sequence if not shift+g (which would be ?)
        if (!e.shiftKey) {
          pendingKeyRef.current = 'g'
          pendingTimerRef.current = setTimeout(() => {
            pendingKeyRef.current = null
          }, 800)
          return
        }
      }

      // Single-key shortcuts
      if (key === '?') {
        e.preventDefault()
        openOverlay()
        return
      }

      if (key === '/') {
        e.preventDefault()
        // Try to find and focus a search input
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"], input[data-search]'
        )
        if (searchInput) {
          searchInput.focus()
        }
        return
      }

      if (key === 'n' || key === 'N') {
        if (!e.shiftKey) {
          e.preventDefault()
          router.push('/tours?create=true')
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current)
      }
    }
  }, [router, showOverlay, closeOverlay, openOverlay])

  return {
    showOverlay,
    openOverlay,
    closeOverlay,
  }
}
