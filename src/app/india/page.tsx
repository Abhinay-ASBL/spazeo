import Link from 'next/link'
import {
  ArrowRight,
  Check,
  MapPin,
  MessageCircle,
  IndianRupee,
  Star,
  Building2,
  Camera,
  Sparkles,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const INR_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started at zero cost',
    accent: '#34D399',
    cardBg: '#12100E',
    cardBorder: 'rgba(212,160,23,0.12)',
    ctaLabel: 'Start Free',
    ctaHref: '/sign-up',
    features: [
      '3 virtual tours',
      '10 scenes per tour',
      'Basic 360 viewer',
      'AI scene analysis (3 credits)',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    description: 'For individual agents',
    accent: '#D4A017',
    cardBg: '#12100E',
    cardBorder: 'rgba(212,160,23,0.12)',
    ctaLabel: 'Start Starter',
    ctaHref: '/sign-up?plan=starter',
    features: [
      '10 virtual tours',
      '25 scenes per tour',
      'AI staging (5/month)',
      'AI descriptions',
      'Lead capture',
      'Custom branding',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 2499,
    description: 'For growing businesses',
    badge: 'Most Popular',
    accent: '#D4A017',
    cardBg: '#1B1916',
    cardBorder: 'rgba(212,160,23,0.35)',
    ctaLabel: 'Start Professional',
    ctaHref: '/sign-up?plan=professional',
    features: [
      'Unlimited tours',
      '50 scenes per tour',
      'Unlimited AI features',
      'Advanced analytics',
      'API access',
      'White-label',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 6999,
    description: 'For teams and enterprises',
    accent: '#2DD4BF',
    cardBg: '#12100E',
    cardBorder: 'rgba(45,212,191,0.2)',
    ctaLabel: 'Start Business',
    ctaHref: '/sign-up?plan=business',
    features: [
      'Everything in Professional',
      '100 scenes per tour',
      '5 team seats',
      'Bulk operations',
      'Custom domain',
      'Phone support',
      'Dedicated account manager',
    ],
  },
]

const SOCIAL_PROOF = [
  {
    icon: Building2,
    stat: '500+',
    label: 'Properties listed with Spazeo in India',
  },
  {
    icon: MapPin,
    stat: '25+',
    label: 'Cities across India',
  },
  {
    icon: Camera,
    stat: '10,000+',
    label: 'Panoramas uploaded',
  },
  {
    icon: Star,
    stat: '4.8/5',
    label: 'Average customer rating',
  },
]

export default function IndiaPage() {
  return (
    <main className="min-h-screen bg-[#0A0908]">
      <Navbar />

      {/* Hero */}
      <section
        className="pt-32 pb-20 text-center"
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
            <span className="flex items-center gap-1.5">
              <MapPin size={12} /> Made for India
            </span>
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
            India&apos;s First AI-Powered{' '}
            <span style={{ color: '#D4A017' }}>Virtual Tour</span> Platform
          </h1>

          <p
            className="text-lg mt-4 mx-auto"
            style={{
              color: '#A8A29E',
              maxWidth: 540,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Create stunning 360 degree virtual tours with AI features built for the Indian
            real estate market. INR pricing, local support, no international charges.
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
              Start Free Trial
              <ArrowRight size={14} />
            </Link>

            <a
              href="https://wa.me/919876543210?text=Hi%2C%20I%27m%20interested%20in%20Spazeo%20virtual%20tours"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <MessageCircle size={16} />
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6" style={{ backgroundColor: '#12100E' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {SOCIAL_PROOF.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
                >
                  <Icon size={22} style={{ color: '#D4A017' }} />
                </div>
                <p
                  className="text-2xl font-black"
                  style={{
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-jakarta)',
                  }}
                >
                  {item.stat}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: '#6B6560',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {item.label}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* INR Pricing Cards */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-bold mb-4"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Simple INR Pricing
          </h2>

          <p
            className="text-center text-base mb-12 mx-auto"
            style={{
              color: '#6B6560',
              maxWidth: 440,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            No international charges. Pay in Indian Rupees.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {INR_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl p-8 relative flex flex-col"
                style={{
                  backgroundColor: plan.cardBg,
                  border: `1px solid ${plan.cardBorder}`,
                  ...(plan.id === 'professional'
                    ? { boxShadow: '0 0 40px rgba(212,160,23,0.08)' }
                    : {}),
                }}
              >
                {/* Badge */}
                {'badge' in plan && plan.badge && (
                  <span
                    className="absolute top-4 right-4 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                    style={{
                      backgroundColor: 'rgba(212,160,23,0.15)',
                      color: '#D4A017',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3
                  className="text-lg font-bold"
                  style={{
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-jakarta)',
                  }}
                >
                  {plan.name}
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{
                    color: '#6B6560',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-0.5">
                  {plan.price === 0 ? (
                    <span
                      className="text-3xl font-black"
                      style={{
                        color: '#34D399',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                    >
                      Free
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-3xl font-black"
                        style={{
                          color: plan.id === 'professional' ? '#D4A017' : '#F5F3EF',
                          fontFamily: 'var(--font-jakarta)',
                        }}
                      >
                        <IndianRupee size={22} className="inline -mt-1" />
                        {plan.price.toLocaleString('en-IN')}
                      </span>
                      <span
                        className="text-sm"
                        style={{
                          color: '#6B6560',
                          fontFamily: 'var(--font-dmsans)',
                        }}
                      >
                        /mo
                      </span>
                    </>
                  )}
                </div>

                {/* UPI badge */}
                {plan.price > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(251,191,36,0.1)',
                        color: '#FBBF24',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      UPI Payment Coming Soon
                    </span>
                  </div>
                )}

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                      style={{
                        color: '#A8A29E',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      <Check
                        size={16}
                        strokeWidth={2.5}
                        style={{ color: plan.accent, flexShrink: 0 }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className="w-full mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl transition-all duration-200"
                  style={
                    plan.id === 'professional'
                      ? {
                          backgroundColor: '#D4A017',
                          color: '#0A0908',
                          boxShadow: '0 0 20px rgba(212,160,23,0.25)',
                          fontFamily: 'var(--font-dmsans)',
                        }
                      : plan.id === 'business'
                        ? {
                            backgroundColor: 'transparent',
                            color: '#2DD4BF',
                            border: '1.5px solid rgba(45,212,191,0.3)',
                            fontFamily: 'var(--font-dmsans)',
                          }
                        : {
                            backgroundColor: 'transparent',
                            color: '#D4A017',
                            border: '1.5px solid rgba(212,160,23,0.2)',
                            fontFamily: 'var(--font-dmsans)',
                          }
                  }
                >
                  {plan.ctaLabel}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp CTA */}
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
            Questions? Reach us on WhatsApp.
          </h2>

          <p
            className="mt-4 text-base mx-auto"
            style={{
              color: '#6B6560',
              maxWidth: 440,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Our India team is available Monday to Saturday, 9 AM to 7 PM IST.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <a
              href="https://wa.me/919876543210?text=Hi%2C%20I%27m%20interested%20in%20Spazeo%20virtual%20tours"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                boxShadow: '0 0 20px rgba(37,211,102,0.25)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>

            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                color: '#D4A017',
                border: '1.5px solid rgba(212,160,23,0.25)',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Start Free Trial
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
