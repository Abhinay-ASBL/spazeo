import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { COMPETITORS } from '@/lib/comparisons'

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#0A0908]">
      <Navbar />

      {/* Hero */}
      <section
        className="pt-32 pb-16 text-center"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-[0.16em] px-4 py-1.5 rounded-full mb-6"
            style={{
              color: '#D4A017',
              border: '1px solid rgba(212,160,23,0.3)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Compare
          </span>

          <h1
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(36px, 5vw, 52px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1.5px',
            }}
          >
            See How Spazeo Compares
          </h1>

          <p
            className="text-lg mt-4 mx-auto"
            style={{
              color: '#6B6560',
              maxWidth: 520,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            AI-powered virtual tours with better features, better pricing, and
            no hardware lock-in.
          </p>
        </div>
      </section>

      {/* Competitor Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMPETITORS.map((competitor) => (
            <Link
              key={competitor.slug}
              href={`/compare/${competitor.slug}`}
              className="group rounded-2xl p-8 flex flex-col transition-all duration-300 hover:border-[rgba(212,160,23,0.35)]"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.12)',
              }}
            >
              <h2
                className="text-xl font-bold"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                Spazeo vs {competitor.name}
              </h2>

              <p
                className="text-sm mt-2 flex-1"
                style={{
                  color: '#A8A29E',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {competitor.tagline}
              </p>

              <div className="mt-6 flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: '#D4A017',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  Compare features
                </span>
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: '#D4A017' }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="py-24 px-6 text-center"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(212,160,23,0.06) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h2
            className="font-bold"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Ready to switch?
          </h2>

          <p
            className="mt-4 text-base"
            style={{
              color: '#6B6560',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Start free and see the difference for yourself.
          </p>

          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: '#FB7A54',
              color: '#FFFFFF',
              boxShadow: '0 0 24px rgba(251,122,84,0.3)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Start Free Trial
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
