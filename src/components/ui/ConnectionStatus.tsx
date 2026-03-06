'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

type ConnectionState = 'online' | 'reconnecting' | 'offline' | 'back_online'

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('online')
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offlineSinceRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current)
      offlineTimerRef.current = null
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    // Check initial state
    if (!navigator.onLine) {
      setState('offline')
      offlineSinceRef.current = Date.now()
    }

    const handleOffline = () => {
      offlineSinceRef.current = Date.now()
      setState('reconnecting')

      // After 30s of being offline, switch to offline state
      offlineTimerRef.current = setTimeout(() => {
        setState('offline')
      }, 30_000)
    }

    const handleOnline = () => {
      clearTimers()
      offlineSinceRef.current = null
      setState('back_online')

      // Auto-dismiss after 3s
      dismissTimerRef.current = setTimeout(() => {
        setState('online')
      }, 3_000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      clearTimers()
    }
  }, [clearTimers])

  if (state === 'online') return null

  const config = {
    reconnecting: {
      bg: '#92400E',
      border: 'rgba(251,191,36,0.3)',
      text: '#FDE68A',
      icon: <Loader2 size={16} strokeWidth={2} className="animate-spin text-[#FBBF24]" />,
      message: 'Reconnecting...',
    },
    offline: {
      bg: '#7F1D1D',
      border: 'rgba(248,113,113,0.3)',
      text: '#FCA5A5',
      icon: <WifiOff size={16} strokeWidth={2} className="text-[#F87171]" />,
      message: 'You are offline. Changes will sync when reconnected.',
    },
    back_online: {
      bg: '#064E3B',
      border: 'rgba(52,211,153,0.3)',
      text: '#A7F3D0',
      icon: <Wifi size={16} strokeWidth={2} className="text-[#34D399]" />,
      message: 'Back online!',
    },
  }[state]

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm"
      style={{
        backgroundColor: config.bg,
        borderBottom: `1px solid ${config.border}`,
        color: config.text,
        fontFamily: 'var(--font-dmsans)',
      }}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{config.message}</span>
    </div>
  )
}
