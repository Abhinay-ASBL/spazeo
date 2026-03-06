'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/nextjs'
import { Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import toast from 'react-hot-toast'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ShortcutsOverlay } from '@/components/dashboard/ShortcutsOverlay'

const Sidebar = dynamic(
  () => import('@/components/layout/Sidebar').then((mod) => mod.Sidebar),
  { ssr: false }
)

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { isSignedIn } = useAuth()
  const user = useQuery(api.users.getCurrent)
  const ensureUser = useMutation(api.users.ensureUser)
  const ensuredRef = useRef(false)
  const reactivateAccount = useMutation(api.users.reactivateAccount)
  const { showOverlay, closeOverlay } = useKeyboardShortcuts()

  // Auto-create Convex user record when signed in via Clerk but not yet in DB
  useEffect(() => {
    if (isSignedIn && user === null && !ensuredRef.current) {
      ensuredRef.current = true
      ensureUser().catch(() => {
        ensuredRef.current = false
      })
    }
  }, [isSignedIn, user, ensureUser])

  // Show loading spinner only while Convex query is in-flight
  if (user === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: '#D4A017' }}
          />
          <p
            className="text-sm"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Loading your workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0908' }}>
      <ConnectionStatus />
      <Sidebar />
      <main id="main-content" className="md:ml-[240px] min-h-screen">
        {/* Top bar with notification bell */}
        <div
          className="sticky top-0 z-20 flex items-center justify-end px-6 md:px-10 py-3"
          style={{ backgroundColor: 'rgba(10,9,8,0.85)', backdropFilter: 'blur(12px)' }}
        >
          <NotificationBell />
        </div>
        {/* SPA-15: Account deletion reactivation banner */}
        {user && user.deletionRequestedAt && (
          <DeletionBanner
            deletionRequestedAt={user.deletionRequestedAt}
            onReactivate={async () => {
              try {
                await reactivateAccount()
                toast.success('Account reactivated successfully')
              } catch {
                toast.error('Failed to reactivate account')
              }
            }}
          />
        )}
        <div className="p-6 md:px-10 md:pb-8">{children}</div>
      </main>
      <ShortcutsOverlay isOpen={showOverlay} onClose={closeOverlay} />
    </div>
  )
}

/* SPA-15: Reactivation banner for accounts scheduled for deletion */
function DeletionBanner({
  deletionRequestedAt,
  onReactivate,
}: {
  deletionRequestedAt: number
  onReactivate: () => void
}) {
  const deletionDate = new Date(deletionRequestedAt + 30 * 24 * 60 * 60 * 1000)
  const daysRemaining = Math.max(
    0,
    Math.ceil((deletionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  )

  // Only show if within 30-day grace period
  if (daysRemaining <= 0) return null

  return (
    <div
      className="mx-6 md:mx-10 mt-2 rounded-lg flex items-center justify-between gap-4 px-4 py-3"
      style={{
        backgroundColor: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.2)',
      }}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} style={{ color: '#F87171', flexShrink: 0 }} />
        <p
          className="text-sm"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}
        >
          Your account is scheduled for deletion on{' '}
          <strong>{deletionDate.toLocaleDateString()}</strong> ({daysRemaining} days remaining).
        </p>
      </div>
      <button
        onClick={onReactivate}
        className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
        style={{
          backgroundColor: '#34D399',
          color: '#0A0908',
          fontFamily: 'var(--font-dmsans)',
          border: 'none',
        }}
      >
        Reactivate
      </button>
    </div>
  )
}
