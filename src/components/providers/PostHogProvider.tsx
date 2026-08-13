'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { trackEvent, identifyUser, resetUser } from '@/lib/posthog'
import { isProvidersConfigured } from './ConvexClientProvider'

function ClerkIdentitySync() {
  const { user, isSignedIn } = useUser()

  useEffect(() => {
    if (isSignedIn && user) {
      identifyUser(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
      })
    } else if (isSignedIn === false) {
      resetUser()
    }
  }, [isSignedIn, user])

  return null
}

/**
 * PostHogProvider
 *
 * - Auto-identifies the current Clerk user on auth state changes.
 * - Tracks `$pageview` events on route changes.
 * - Safe to render even if PostHog script is not loaded, or if Clerk is unconfigured
 *   (ConvexClientProvider renders without a ClerkProvider ancestor in that case).
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Track page views on route change
  useEffect(() => {
    trackEvent('$pageview', { path: pathname })
  }, [pathname])

  return (
    <>
      {isProvidersConfigured && <ClerkIdentitySync />}
      {children}
    </>
  )
}
