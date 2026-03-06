import { useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'

/**
 * useTrackPageView — fires a `page_view` event on mount with the given page name.
 *
 * Usage:
 *   useTrackPageView('pricing')
 */
export function useTrackPageView(pageName: string, properties?: Record<string, unknown>): void {
  useEffect(() => {
    trackEvent('page_view', { page: pageName, ...properties })
    // Only fire on mount — pageName is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
