'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function CTA() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(212,160,23,0.1),transparent_70%)]" />

      <div className="relative max-w-4xl mx-auto px-6 lg:px-[60px] text-center">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#F5F3EF] mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Ready to Transform
          <br />
          <span className="text-gradient">Your Listings?</span>
        </h2>

        <p
          className="max-w-xl mx-auto text-base md:text-lg text-[#A8A29E] leading-relaxed mb-10"
          style={{ fontFamily: 'var(--font-dmsans)' }}
        >
          Join thousands of real estate professionals using Spazeo to create
          immersive virtual tours that sell properties faster.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            onClick={() => trackEvent('hero_cta_clicked', { location: 'bottom_cta' })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#D4A017] text-[#0A0908] text-base font-semibold transition-all duration-300 hover:bg-[#E5B120] hover:shadow-[0_0_30px_rgba(212,160,23,0.3)]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border border-[rgba(212,160,23,0.3)] text-[#F5F3EF] text-base font-medium transition-all duration-300 hover:border-[rgba(212,160,23,0.5)] hover:bg-[rgba(212,160,23,0.06)]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            View Pricing
          </Link>
        </div>

        {/* Fine print */}
        <p
          className="mt-6 text-xs text-[#6B6560]"
          style={{ fontFamily: 'var(--font-dmsans)' }}
        >
          No credit card required. Free plan includes 1 tour with up to 10 scenes.
        </p>
      </div>
    </section>
  )
}
