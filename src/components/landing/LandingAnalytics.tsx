'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'
import { captureUTMParams } from '@/hooks/useUTMCapture'

/**
 * LandingAnalytics — client component rendered at the bottom of the landing page.
 *
 * Handles:
 * - `homepage_viewed` event on mount
 * - Scroll depth tracking (25%, 50%, 75%, 100%)
 * - UTM parameter capture
 * - Sticky mobile CTA bar
 */
export function LandingAnalytics() {
  const firedThresholds = useRef(new Set<number>())

  useEffect(() => {
    // Track homepage view
    trackEvent('homepage_viewed')

    // Capture UTM parameters
    captureUTMParams()

    // Scroll depth tracking
    const thresholds = [25, 50, 75, 100]

    function handleScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return

      const scrollPercent = Math.round((scrollTop / docHeight) * 100)

      for (const threshold of thresholds) {
        if (scrollPercent >= threshold && !firedThresholds.current.has(threshold)) {
          firedThresholds.current.add(threshold)
          trackEvent('scroll_depth', { depth: threshold, page: 'homepage' })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="mobile-cta-bar" aria-label="Mobile call to action">
      <Link
        href="/sign-up"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all duration-200"
        style={{
          backgroundColor: '#D4A017',
          color: '#0A0908',
          fontFamily: 'var(--font-dmsans)',
          boxShadow: '0 0 20px rgba(212,160,23,0.25)',
        }}
        onClick={() => trackEvent('hero_cta_clicked', { location: 'mobile_sticky_bar' })}
      >
        Start Free
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}
