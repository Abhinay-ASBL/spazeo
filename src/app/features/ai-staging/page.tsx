'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowRight,
  Upload,
  Wand2,
  Download,
  Sofa,
  BedDouble,
  UtensilsCrossed,
  Bath,
  Building,
  Briefcase,
  Palette,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    icon: Upload,
    step: '01',
    title: 'Upload Your Panorama',
    description:
      'Upload your 360-degree panorama of an empty or under-furnished room. Our AI automatically detects the room type, dimensions, and lighting conditions.',
  },
  {
    icon: Wand2,
    step: '02',
    title: 'Choose a Style',
    description:
      'Select from 15+ professionally curated interior design styles. Our AI understands room geometry and generates furniture placements that respect spatial constraints.',
  },
  {
    icon: Download,
    step: '03',
    title: 'Get Your Staged Scene',
    description:
      'In under 30 seconds, receive a photorealistic staged version of your scene. Generate multiple style variations and pick the one that best fits your listing.',
  },
]

interface RoomType {
  icon: LucideIcon
  label: string
  color: string
}

const ROOM_TYPES: RoomType[] = [
  { icon: Sofa, label: 'Living Room', color: '#D4A017' },
  { icon: BedDouble, label: 'Bedroom', color: '#2DD4BF' },
  { icon: UtensilsCrossed, label: 'Kitchen', color: '#FB7A54' },
  { icon: Bath, label: 'Bathroom', color: '#60A5FA' },
  { icon: Building, label: 'Office', color: '#34D399' },
  { icon: Briefcase, label: 'Commercial', color: '#D4A017' },
]

const STYLE_OPTIONS = [
  { name: 'Modern Minimalist', description: 'Clean lines, neutral tones, functional elegance' },
  { name: 'Scandinavian', description: 'Light wood, cozy textiles, airy open spaces' },
  { name: 'Industrial', description: 'Exposed brick, metal accents, raw aesthetics' },
  { name: 'Mid-Century Modern', description: 'Retro-inspired, organic curves, warm wood' },
  { name: 'Traditional', description: 'Classic furniture, rich fabrics, timeless appeal' },
  { name: 'Coastal', description: 'Blue accents, natural textures, beachy relaxation' },
  { name: 'Bohemian', description: 'Eclectic patterns, global influences, layered textures' },
  { name: 'Luxury', description: 'Premium materials, statement pieces, opulent finishes' },
]

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function AIStagingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in-view')
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: '#0A0908', minHeight: '100vh' }}>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 164, paddingBottom: 60 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(212,160,23,0.07) 0%, transparent 70%), #0A0908',
            }}
          />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <div
              className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 animate-on-scroll"
              style={{
                background: 'rgba(212,160,23,0.05)',
                border: '1px solid rgba(212,160,23,0.20)',
              }}
            >
              <Sparkles size={14} className="mr-2" style={{ color: '#D4A017' }} />
              <span
                className="text-[13px] font-medium"
                style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
              >
                AI Virtual Staging
              </span>
            </div>

            <h1
              className="font-black leading-[1.1] tracking-tight animate-on-scroll"
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Transform Empty Spaces Into Stunning Interiors
            </h1>

            <p
              className="mt-6 text-lg leading-relaxed max-w-[640px] mx-auto animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Our AI analyzes room geometry, lighting, and style to generate photorealistic
              furniture and decor placements in seconds. No design skills required.
            </p>

            <div className="flex gap-4 flex-wrap items-center justify-center mt-8 animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(212,160,23,0.35)] hover:-translate-y-0.5"
                style={{
                  background: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Try AI Staging Free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/features"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(212,160,23,0.06)]"
                style={{
                  border: '1px solid rgba(212,160,23,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                All Features
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3-Step Process ─────────────────────────────────── */}
        <section style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-14 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              How AI Virtual Staging Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.step}
                    className="rounded-2xl p-8 text-center animate-on-scroll"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5"
                      style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
                    >
                      <Icon size={28} style={{ color: '#D4A017' }} />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-wider mb-2 block"
                      style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
                    >
                      Step {step.step}
                    </span>
                    <h3
                      className="text-lg font-bold mb-3"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {step.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Supported Room Types ───────────────────────────── */}
        <section
          style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#12100E' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-14 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Supported Room Types
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {ROOM_TYPES.map((room, i) => {
                const Icon = room.icon
                return (
                  <div
                    key={room.label}
                    className="rounded-2xl p-5 text-center animate-on-scroll"
                    style={{
                      backgroundColor: '#0A0908',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: `${room.color}15` }}
                    >
                      <Icon size={24} style={{ color: room.color }} />
                    </div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {room.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Before/After Gallery Placeholder ────────────────── */}
        <section style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-14 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              See the Difference
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-on-scroll">
              {/* Before */}
              <div
                className="rounded-2xl overflow-hidden flex flex-col items-center justify-center"
                style={{
                  aspectRatio: '16/10',
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.12)',
                }}
              >
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  Before
                </p>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(107,101,96,0.15)' }}
                >
                  <Building size={32} style={{ color: '#6B6560' }} />
                </div>
                <p
                  className="text-xs mt-3"
                  style={{ color: '#3D3830', fontFamily: 'var(--font-dmsans)' }}
                >
                  Empty room panorama
                </p>
              </div>

              {/* After */}
              <div
                className="rounded-2xl overflow-hidden flex flex-col items-center justify-center"
                style={{
                  aspectRatio: '16/10',
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.2)',
                }}
              >
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
                >
                  After AI Staging
                </p>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
                >
                  <Sparkles size={32} style={{ color: '#D4A017' }} />
                </div>
                <p
                  className="text-xs mt-3"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  AI-staged with Modern Minimalist style
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Style Options Showcase ──────────────────────────── */}
        <section
          style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#12100E' }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            <h2
              className="text-center font-extrabold tracking-tight mb-4 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              15+ Design Styles
            </h2>
            <p
              className="text-center text-base mb-14 max-w-[560px] mx-auto animate-on-scroll"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              Each style is trained on thousands of professional interior design photos for
              authentic, photorealistic results.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STYLE_OPTIONS.map((style, i) => (
                <div
                  key={style.name}
                  className="rounded-xl p-5 animate-on-scroll"
                  style={{
                    backgroundColor: '#0A0908',
                    border: '1px solid rgba(212,160,23,0.12)',
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <Palette size={16} style={{ color: '#D4A017' }} />
                    <h3
                      className="text-sm font-bold"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {style.name}
                    </h3>
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {style.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 100, paddingBottom: 100 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,160,23,0.1) 0%, transparent 70%), #0A0908',
            }}
          />
          <div className="max-w-3xl mx-auto px-6 relative z-10 text-center">
            <h2
              className="font-extrabold tracking-tight mb-6 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Stage Any Room in Seconds
            </h2>
            <p
              className="text-lg leading-relaxed mb-10 max-w-[500px] mx-auto animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Join thousands of real estate professionals using AI Virtual Staging to sell
              properties faster.
            </p>
            <div className="flex gap-4 flex-wrap items-center justify-center animate-on-scroll">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:shadow-[0_8px_32px_rgba(212,160,23,0.35)] hover:-translate-y-0.5"
                style={{
                  background: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Start Free Trial
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(212,160,23,0.06)]"
                style={{
                  border: '1px solid rgba(212,160,23,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
