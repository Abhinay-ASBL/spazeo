'use client'

import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(212,160,23,0.4) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="orb orb-gold absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-30" />
      <div className="orb orb-teal absolute bottom-0 right-0 w-[400px] h-[400px] opacity-20" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-[60px] py-24 md:py-32 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(212,160,23,0.2)] bg-[rgba(212,160,23,0.06)] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-[glow-pulse_3s_ease-in-out_infinite]" />
          <span
            className="text-sm font-medium text-[#D4A017]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            AI-Powered Virtual Tours for Real Estate
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="text-gradient-hero">Step Inside</span>
          <br />
          <span className="text-[#F5F3EF]">Any Space</span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-2xl mx-auto text-lg md:text-xl text-[#A8A29E] leading-relaxed mb-10"
          style={{ fontFamily: 'var(--font-dmsans)' }}
        >
          Create immersive 360° virtual tours that let buyers walk through
          properties from anywhere. Upload panoramas, let AI enhance them,
          and share in minutes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            onClick={() => trackEvent('hero_cta_clicked', { label: 'get_started_free' })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#D4A017] text-[#0A0908] text-base font-semibold transition-all duration-300 hover:bg-[#E5B120] hover:shadow-[0_0_30px_rgba(212,160,23,0.3)]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/demo"
            onClick={() => trackEvent('demo_cta_clicked', { location: 'hero' })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border border-[rgba(212,160,23,0.3)] text-[#F5F3EF] text-base font-medium transition-all duration-300 hover:border-[rgba(212,160,23,0.5)] hover:bg-[rgba(212,160,23,0.06)]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            <Play size={18} className="text-[#D4A017]" />
            View Demo
          </Link>
        </div>

        {/* Hero visual placeholder */}
        <div className="mt-16 relative max-w-4xl mx-auto">
          <div className="rounded-2xl border border-[rgba(212,160,23,0.15)] bg-[#12100E] overflow-hidden shadow-glow-gold">
            <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-[#12100E] to-[#1B1916]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-[rgba(212,160,23,0.3)] flex items-center justify-center bg-[rgba(212,160,23,0.08)]">
                  <Play size={32} className="text-[#D4A017] ml-1" />
                </div>
                <span
                  className="text-sm text-[#6B6560]"
                  style={{ fontFamily: 'var(--font-dmsans)' }}
                >
                  Interactive 360° Tour Preview
                </span>
              </div>
            </div>
          </div>
          {/* Glow behind */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(212,160,23,0.08),transparent_70%)]" />
        </div>
      </div>
    </section>
  )
}
