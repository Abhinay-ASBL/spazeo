'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowRight,
  Check,
  Box,
  RotateCcw,
  Brain,
  Scan,
  Cloud,
  Home,
  Search,
  MapPin,
  LayoutGrid,
  ShoppingBag,
  Code,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const PLATFORM_FEATURES = [
  {
    title: 'Gaussian Splatting Engine',
    desc: 'Render photorealistic 3D environments with our cutting-edge Gaussian splatting technology. Experience real-time rendering with unmatched quality and performance.',
    bullets: [
      'Real-time 3D reconstruction from photos',
      'GPU-accelerated rendering pipeline',
      'Sub-millimeter accuracy and detail',
    ],
    imageSrc: '/images/product-gaussian.png',
    imageAlt: 'Gaussian Splatting 3D rendering visualization',
  },
  {
    title: 'AI-Powered Virtual Staging',
    desc: 'Transform empty spaces into fully furnished rooms with our AI staging engine. Choose from dozens of styles and let artificial intelligence handle the rest.',
    bullets: [
      'One-click room transformation',
      '30+ interior design styles available',
      'Photorealistic furniture placement',
    ],
    imageSrc: '/images/product-staging.png',
    imageAlt: 'AI Virtual Staging before and after',
  },
  {
    title: 'Real-Time Analytics Dashboard',
    desc: 'Track every interaction with precision. Know exactly how viewers engage with your tours — from heatmaps to session duration and conversion metrics.',
    bullets: [
      'Live visitor tracking and heatmaps',
      'Engagement and conversion analytics',
      'Exportable reports and team sharing',
    ],
    imageSrc: '/images/product-analytics.png',
    imageAlt: 'Analytics dashboard with heatmaps',
  },
]

const TECH_STACK = [
  { label: 'WebGL', icon: Box },
  { label: 'Three.js', icon: RotateCcw },
  { label: 'Neural Radiance', icon: Brain },
  { label: 'Depth AI', icon: Scan },
  { label: 'Cloud CDN', icon: Cloud },
]

const INTEGRATIONS = [
  {
    title: 'MLS',
    desc: 'Direct MLS listing integration for real estate agents.',
    icon: Home,
    color: '#D4A017',
  },
  {
    title: 'Zillow',
    desc: 'Sync tours directly with Zillow property listings.',
    icon: Search,
    color: '#2DD4BF',
  },
  {
    title: 'Realtor.com',
    desc: 'Embed virtual tours on Realtor.com listings.',
    icon: MapPin,
    color: '#FB7A54',
  },
  {
    title: 'WordPress',
    desc: 'One-click WordPress plugin for instant embedding.',
    icon: LayoutGrid,
    color: '#60A5FA',
  },
  {
    title: 'Shopify',
    desc: 'Add virtual product tours to your Shopify store.',
    icon: ShoppingBag,
    color: '#34D399',
  },
  {
    title: 'Custom API',
    desc: 'Build custom integrations with our RESTful API.',
    icon: Code,
    color: '#D4A017',
  },
]


/* ═══════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function ProductPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main>

        {/* ─── SECTION 1: PRODUCT HERO ──────────────────────────────── */}
        <section
          className="relative"
          style={{ background: '#0A0908', paddingTop: 164, paddingBottom: 80 }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px] flex flex-col items-center">
            {/* Badge */}
            <div
              className="inline-flex items-center rounded-full px-4 py-1.5 mb-12 animate-on-scroll"
              style={{
                background: 'rgba(212,160,23,0.05)',
                border: '1px solid rgba(212,160,23,0.20)',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
              >
                The Spazeo Platform
              </span>
            </div>

            {/* Title + Subtitle */}
            <div className="flex flex-col items-center gap-5 max-w-[900px] animate-on-scroll">
              <h1
                className="font-black leading-[1.1] tracking-tight text-center"
                style={{
                  fontSize: 'clamp(36px, 5vw, 56px)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-display)',
                }}
              >
                The Most Powerful Virtual Tour Engine
              </h1>
              <p
                className="text-lg leading-relaxed text-center max-w-[700px]"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                From single panoramas to multi-scene walkthroughs &mdash; build, customize, and
                publish immersive 3D experiences in minutes.
              </p>
            </div>

            {/* Product Screenshot */}
            <div
              className="mt-12 rounded-2xl overflow-hidden w-full animate-on-scroll"
              style={{
                maxWidth: 1200,
                aspectRatio: '1200/650',
                background: '#12100E',
                border: '1px solid rgba(212,160,23,0.12)',
                position: 'relative',
              }}
            >
              <Image
                src="/images/product-hero.png"
                alt="Spazeo platform product screenshot"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: PLATFORM OVERVIEW (Alternating Features) ──── */}
        <section
          className="relative"
          style={{ background: '#0A0908', paddingTop: 80, paddingBottom: 80 }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px] flex flex-col gap-20">
            {PLATFORM_FEATURES.map((feat, i) => {
              const isReversed = i % 2 === 1
              return (
                <div
                  key={feat.title}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[60px] items-center animate-on-scroll"
                >
                  {/* Image */}
                  <div className={isReversed ? 'lg:order-2' : ''}>
                    <div
                      className="rounded-2xl overflow-hidden relative"
                      style={{
                        width: '100%',
                        maxWidth: 540,
                        aspectRatio: '540/360',
                        background: '#12100E',
                        border: '1px solid rgba(212,160,23,0.12)',
                      }}
                    >
                      <Image
                        src={feat.imageSrc}
                        alt={feat.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 540px"
                      />
                    </div>
                  </div>

                  {/* Text */}
                  <div className={isReversed ? 'lg:order-1' : ''}>
                    <h3
                      className="text-2xl md:text-[32px] font-extrabold tracking-tight mb-5"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {feat.title}
                    </h3>
                    <p
                      className="text-base leading-relaxed mb-6"
                      style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {feat.desc}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {feat.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-sm" style={{ color: '#A8A29E' }}>
                          <Check
                            size={18}
                            className="flex-shrink-0"
                            style={{ color: '#34D399' }}
                          />
                          <span style={{ fontFamily: 'var(--font-dmsans)' }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── SECTION 3: TECH STACK BAR ────────────────────────────── */}
        <section
          style={{
            background: '#12100E',
            paddingTop: 40,
            paddingBottom: 40,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px] flex items-center justify-center gap-6 flex-wrap">
            {TECH_STACK.map((tech) => {
              const Icon = tech.icon
              return (
                <div
                  key={tech.label}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5"
                  style={{
                    border: '1px solid rgba(212,160,23,0.12)',
                  }}
                >
                  <Icon size={16} style={{ color: '#2DD4BF' }} />
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {tech.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── SECTION 4: INTEGRATIONS ──────────────────────────────── */}
        <section
          id="integrations"
          className="relative"
          style={{ background: '#0A0908', paddingTop: 80, paddingBottom: 80 }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-[60px]">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-12 animate-on-scroll">
              <h2
                className="font-extrabold tracking-tight"
                style={{
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-display)',
                  maxWidth: 700,
                }}
              >
                Works With Your Existing Tools
              </h2>
              <p
                className="mt-4 text-base leading-relaxed max-w-[600px]"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                Seamlessly connect Spazeo with the platforms you already use. No complex setup
                required.
              </p>
            </div>

            {/* Integration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {INTEGRATIONS.map((item, i) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl p-6 animate-on-scroll"
                    style={{
                      background: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background: `${item.color}15`,
                      }}
                    >
                      <Icon size={24} style={{ color: item.color }} />
                    </div>
                    <h3
                      className="text-base font-bold mb-2"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {item.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: CTA ───────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: 100, paddingBottom: 100 }}
        >
          {/* Radial gold gradient bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212,160,23,0.13) 0%, transparent 70%), #0A0908',
            }}
          />

          <div className="max-w-3xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
            <h2
              className="font-extrabold tracking-tight mb-8 animate-on-scroll"
              style={{
                fontSize: 'clamp(32px, 4vw, 44px)',
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
              }}
            >
              Start Building Tours Today
            </h2>
            <p
              className="text-lg leading-relaxed mb-10 max-w-[600px] animate-on-scroll"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Join thousands of professionals creating immersive virtual experiences with Spazeo.
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
                Get Started Free
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/contact"
                className="flex items-center justify-center font-medium text-[15px] px-8 py-3.5 rounded-lg transition-all duration-200 hover:bg-[rgba(212,160,23,0.06)]"
                style={{
                  border: '1px solid rgba(212,160,23,0.20)',
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </section>

        <Footer />

      </main>
    </>
  )
}
