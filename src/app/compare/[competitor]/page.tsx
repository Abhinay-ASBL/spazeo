import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, X, ArrowRight, Minus } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  getCompetitorBySlug,
  getAllCompetitorSlugs,
  type CompetitorFeature,
} from '@/lib/comparisons'

interface PageProps {
  params: Promise<{ competitor: string }>
}

export function generateStaticParams() {
  return getAllCompetitorSlugs().map((slug) => ({ competitor: slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competitor: slug } = await params
  const data = getCompetitorBySlug(slug)
  if (!data) return {}

  return {
    title: `Spazeo vs ${data.name} — Compare Features & Pricing`,
    description: `Compare Spazeo and ${data.name} side by side. See which virtual tour platform offers better AI features, pricing, and flexibility.`,
    openGraph: {
      title: `Spazeo vs ${data.name} — Compare Features & Pricing`,
      description: `Compare Spazeo and ${data.name} side by side.`,
      siteName: 'Spazeo',
      type: 'website',
    },
  }
}

export default async function CompetitorPage({ params }: PageProps) {
  const { competitor: slug } = await params
  const data = getCompetitorBySlug(slug)

  if (!data) notFound()

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
            Comparison
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
            Spazeo vs{' '}
            <span style={{ color: '#D4A017' }}>{data.name}</span>
          </h1>

          <p
            className="text-lg mt-4 mx-auto"
            style={{
              color: '#A8A29E',
              maxWidth: 520,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {data.tagline}
          </p>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-center font-bold mb-12"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Feature Comparison
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table
              className="w-full"
              style={{ borderCollapse: 'separate', borderSpacing: 0 }}
            >
              <thead>
                <tr>
                  <th
                    className="text-left py-4 px-4 text-sm font-medium"
                    style={{
                      color: '#6B6560',
                      fontFamily: 'var(--font-dmsans)',
                      borderBottom: '1px solid rgba(212,160,23,0.08)',
                      width: '50%',
                    }}
                  >
                    Feature
                  </th>
                  <th
                    className="text-center py-4 px-4 text-sm font-semibold"
                    style={{
                      color: '#D4A017',
                      fontFamily: 'var(--font-jakarta)',
                      borderBottom: '1px solid rgba(212,160,23,0.08)',
                      width: '25%',
                    }}
                  >
                    Spazeo
                  </th>
                  <th
                    className="text-center py-4 px-4 text-sm font-semibold"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-jakarta)',
                      borderBottom: '1px solid rgba(212,160,23,0.08)',
                      width: '25%',
                    }}
                  >
                    {data.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((feature) => (
                  <tr
                    key={feature.label}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <td
                      className="py-3.5 px-4 text-sm"
                      style={{
                        color: '#A8A29E',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {feature.label}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <FeatureCell value={feature.spazeo} isSpazeo />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <FeatureCell value={feature.competitor} isSpazeo={false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked */}
          <div className="md:hidden space-y-3">
            {data.features.map((feature) => (
              <div
                key={feature.label}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.06)',
                }}
              >
                <p
                  className="text-sm font-medium mb-3"
                  style={{
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {feature.label}
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider mb-1"
                      style={{
                        color: '#D4A017',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      Spazeo
                    </p>
                    <FeatureCell value={feature.spazeo} isSpazeo />
                  </div>
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider mb-1"
                      style={{
                        color: '#6B6560',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {data.name}
                    </p>
                    <FeatureCell value={feature.competitor} isSpazeo={false} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section
        className="py-20 px-6"
        style={{ backgroundColor: '#12100E' }}
      >
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-center font-bold mb-12"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Pricing Comparison
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spazeo pricing */}
            <div
              className="rounded-2xl p-8"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.35)',
                boxShadow: '0 0 40px rgba(212,160,23,0.08)',
              }}
            >
              <h3
                className="text-lg font-bold"
                style={{
                  color: '#D4A017',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                Spazeo
              </h3>
              <p
                className="text-3xl font-black mt-4"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {data.pricing.spazeo}
              </p>
              <p
                className="text-sm mt-3 leading-relaxed"
                style={{
                  color: '#A8A29E',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {data.pricing.spazeoNote}
              </p>
            </div>

            {/* Competitor pricing */}
            <div
              className="rounded-2xl p-8"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.08)',
              }}
            >
              <h3
                className="text-lg font-bold"
                style={{
                  color: '#A8A29E',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {data.name}
              </h3>
              <p
                className="text-3xl font-black mt-4"
                style={{
                  color: '#6B6560',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                {data.pricing.competitor}
              </p>
              <p
                className="text-sm mt-3 leading-relaxed"
                style={{
                  color: '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {data.pricing.competitorNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Migration CTA */}
      <section className="py-20 px-6">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-12 text-center"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.2)',
          }}
        >
          <h2
            className="font-bold"
            style={{
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Switch to Spazeo in minutes
          </h2>

          <p
            className="mt-4 text-base mx-auto"
            style={{
              color: '#A8A29E',
              maxWidth: 440,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Upload your existing 360 panoramas and let our AI do the rest.
            No proprietary formats, no vendor lock-in.
          </p>

          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              boxShadow: '0 0 20px rgba(212,160,23,0.25)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Start Free Trial
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Demo CTA */}
      <section
        className="py-24 px-6 text-center"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(212,160,23,0.06) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="mx-auto mb-6"
            style={{
              width: 60,
              height: 3,
              borderRadius: 2,
              backgroundColor: '#D4A017',
            }}
          />

          <h2
            className="font-bold"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            See Spazeo in action
          </h2>

          <p
            className="mt-4 text-base"
            style={{
              color: '#6B6560',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Experience the difference AI-powered virtual tours can make for
            your business.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: '#FB7A54',
                color: '#FFFFFF',
                boxShadow: '0 0 24px rgba(251,122,84,0.3)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Try Free Demo
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                color: '#D4A017',
                border: '1.5px solid rgba(212,160,23,0.25)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              View All Comparisons
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

/* Helper: render feature cell value */
function FeatureCell({
  value,
  isSpazeo,
}: {
  value: CompetitorFeature['spazeo']
  isSpazeo: boolean
}) {
  if (value === true) {
    return (
      <Check
        size={16}
        strokeWidth={2.5}
        style={{
          color: isSpazeo ? '#D4A017' : '#34D399',
          margin: '0 auto',
        }}
      />
    )
  }
  if (value === false) {
    return (
      <X
        size={16}
        strokeWidth={1.5}
        style={{ color: '#3D3830', margin: '0 auto' }}
      />
    )
  }
  return (
    <span
      className="text-sm"
      style={{
        color: isSpazeo ? '#D4A017' : '#6B6560',
        fontFamily: 'var(--font-dmsans)',
      }}
    >
      {value}
    </span>
  )
}
