'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Check, X, ChevronDown, ArrowRight, Minus } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

/* ─── Plan Data ─────────────────────────────────────────────── */

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'Get started with the basics',
    badge: null,
    accent: '#34D399',
    cardBorder: 'rgba(212,160,23,0.12)',
    cardBg: '#12100E',
    ctaVariant: 'outline-gold' as const,
    ctaLabel: 'Get Started Free',
    ctaHref: '/sign-up',
    features: [
      '3 virtual tours',
      '10 scenes per tour',
      'Basic 360 viewer',
      'Spazeo watermark',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 29, annual: 23 },
    description: 'Everything you need to grow',
    badge: 'Most Popular',
    accent: '#D4A017',
    cardBorder: 'rgba(212,160,23,0.35)',
    cardBg: '#1B1916',
    ctaVariant: 'filled-gold' as const,
    ctaLabel: 'Start Pro Trial',
    ctaHref: '/sign-up?plan=pro',
    features: [
      'Unlimited tours',
      '50 scenes per tour',
      'AI scene analysis',
      'Virtual staging',
      'Lead capture forms',
      'Custom branding (no watermark)',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: -1, annual: -1 },
    description: 'For teams and large organizations',
    badge: null,
    accent: '#2DD4BF',
    cardBorder: 'rgba(45,212,191,0.2)',
    cardBg: '#12100E',
    ctaVariant: 'outline-teal' as const,
    ctaLabel: 'Contact Sales',
    ctaHref: 'mailto:sales@spazeo.io',
    features: [
      'Everything in Pro',
      'Unlimited scenes',
      'Team collaboration',
      'Custom domain',
      'API access',
      'Dedicated account manager',
      'SSO & advanced security',
    ],
  },
]

/* ─── Feature Comparison ────────────────────────────────────── */

type FeatureValue = boolean | string

interface ComparisonCategory {
  category: string
  rows: { label: string; free: FeatureValue; pro: FeatureValue; enterprise: FeatureValue }[]
}

const COMPARISON: ComparisonCategory[] = [
  {
    category: 'Tours & Scenes',
    rows: [
      { label: 'Virtual tours', free: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Scenes per tour', free: '10', pro: '50', enterprise: 'Unlimited' },
      { label: '360 panorama viewer', free: true, pro: true, enterprise: true },
      { label: 'Tour embedding', free: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'AI Features',
    rows: [
      { label: 'AI scene analysis', free: false, pro: true, enterprise: true },
      { label: 'Virtual staging', free: false, pro: true, enterprise: true },
      { label: 'AI descriptions', free: false, pro: true, enterprise: true },
      { label: 'Floor plan generation', free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Marketing & Leads',
    rows: [
      { label: 'Lead capture forms', free: false, pro: true, enterprise: true },
      { label: 'Custom branding', free: false, pro: true, enterprise: true },
      { label: 'Analytics dashboard', free: 'Basic', pro: 'Advanced', enterprise: 'Advanced' },
      { label: 'Custom domain', free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Collaboration & Security',
    rows: [
      { label: 'Team members', free: '1', pro: '1', enterprise: 'Unlimited' },
      { label: 'API access', free: false, pro: false, enterprise: true },
      { label: 'SSO / SAML', free: false, pro: false, enterprise: true },
      { label: 'SLA guarantee', free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Community support', free: true, pro: true, enterprise: true },
      { label: 'Priority support', free: false, pro: true, enterprise: true },
      { label: 'Dedicated account manager', free: false, pro: false, enterprise: true },
    ],
  },
]

/* ─── FAQ Data ──────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the remaining balance will be credited to your account.',
  },
  {
    question: 'What happens when my trial ends?',
    answer:
      'After your 14-day free trial ends, you\'ll automatically be moved to the Free plan. You won\'t lose any of your existing tours, but you\'ll be limited to 3 active tours until you upgrade.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer:
      'Yes! You save 20% when you choose annual billing. The discount is applied automatically when you switch to yearly billing on any paid plan.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express), as well as bank transfers for Enterprise plans. All payments are securely processed through Stripe.',
  },
  {
    question: 'Is there a limit on tour views?',
    answer:
      'No. All plans include unlimited tour views for your visitors. We never restrict the number of people who can experience your virtual tours.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Absolutely. You can cancel your subscription at any time from your billing settings. Your plan will remain active until the end of your current billing period, and you will not be charged again.',
  },
  {
    question: 'Do you offer a refund policy?',
    answer:
      'We offer a full refund within the first 14 days of any paid subscription. After that, you can cancel at any time but refunds are not provided for partial billing periods.',
  },
  {
    question: 'What happens to my tours if I downgrade?',
    answer:
      'Your existing tours will remain accessible, but you won\'t be able to create new tours beyond your new plan\'s limit. You can archive tours to free up slots at any time.',
  },
]

/* ─── Component ─────────────────────────────────────────────── */

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    trackEvent('pricing_viewed')
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
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
          className="pt-32 pb-16 text-center"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-4xl mx-auto px-6 animate-on-scroll">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-[0.16em] px-4 py-1.5 rounded-full mb-6"
              style={{
                color: '#D4A017',
                border: '1px solid rgba(212,160,23,0.3)',
                background: 'transparent',
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Pricing
            </span>

            <h1
              className="font-bold leading-tight"
              style={{
                fontSize: 'clamp(36px, 5vw, 52px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1.5px',
              }}
            >
              Simple, Transparent Pricing
            </h1>

            <p
              className="text-lg mt-4 mx-auto"
              style={{
                color: '#6B6560',
                maxWidth: 480,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Start free, scale as you grow
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span
                className="text-sm font-medium"
                style={{
                  color: billing === 'monthly' ? '#F5F3EF' : '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Monthly
              </span>

              <button
                onClick={() =>
                  setBilling((b) => (b === 'monthly' ? 'annual' : 'monthly'))
                }
                className="relative w-12 h-6 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    billing === 'annual' ? '#D4A017' : 'rgba(212,160,23,0.2)',
                }}
                aria-label={`Switch to ${billing === 'monthly' ? 'annual' : 'monthly'} billing`}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-300"
                  style={{
                    backgroundColor: billing === 'annual' ? '#0A0908' : '#A8A29E',
                    transform:
                      billing === 'annual' ? 'translateX(26px)' : 'translateX(2px)',
                  }}
                />
              </button>

              <span
                className="text-sm font-medium"
                style={{
                  color: billing === 'annual' ? '#F5F3EF' : '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Annual
              </span>

              {billing === 'annual' && (
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(52,211,153,0.12)',
                    color: '#34D399',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  Save 20%
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Pricing Cards ─────────────────────────────────── */}
        <section className="pb-24 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 sm:overflow-x-auto md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className="animate-on-scroll rounded-2xl p-8 relative flex flex-col"
                style={{
                  backgroundColor: plan.cardBg,
                  border: `1px solid ${plan.cardBorder}`,
                  animationDelay: `${i * 100}ms`,
                  ...(plan.id === 'pro'
                    ? { boxShadow: '0 0 40px rgba(212,160,23,0.08)' }
                    : {}),
                }}
              >
                {/* Badge */}
                {plan.badge && (
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

                {/* Plan Name */}
                <h3
                  className="text-lg font-bold"
                  style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                >
                  {plan.name}
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-5">
                  {plan.price.monthly === -1 ? (
                    <span
                      className="text-4xl font-black"
                      style={{ color: '#2DD4BF', fontFamily: 'var(--font-display)' }}
                    >
                      Custom
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-4xl font-black"
                        style={{
                          color: plan.id === 'pro' ? '#D4A017' : '#F5F3EF',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        ${billing === 'monthly' ? plan.price.monthly : plan.price.annual}
                      </span>
                      <span
                        className="text-sm ml-1"
                        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                      >
                        /month
                      </span>
                    </>
                  )}
                </div>

                {/* Annual savings note */}
                {billing === 'annual' && plan.price.monthly > 0 && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#34D399', fontFamily: 'var(--font-dmsans)' }}
                  >
                    Billed ${plan.price.annual * 12}/year
                  </p>
                )}

                {/* Features */}
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                      style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
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

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  onClick={() => trackEvent('plan_selected', { plan: plan.id, billing, location: 'pricing_page' })}
                  className="w-full mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl transition-all duration-200"
                  style={
                    plan.ctaVariant === 'filled-gold'
                      ? {
                          backgroundColor: '#D4A017',
                          color: '#0A0908',
                          boxShadow: '0 0 20px rgba(212,160,23,0.25)',
                          fontFamily: 'var(--font-dmsans)',
                        }
                      : plan.ctaVariant === 'outline-teal'
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
        </section>

        {/* ── Feature Comparison Table ───────────────────────── */}
        <section className="py-20 px-6" style={{ backgroundColor: '#0A0908' }}>
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-center font-bold mb-12 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Compare Plans
            </h2>

            {/* Desktop table */}
            <div className="hidden md:block animate-on-scroll overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th
                      className="text-left py-4 px-4 text-sm font-medium"
                      style={{
                        color: '#6B6560',
                        fontFamily: 'var(--font-dmsans)',
                        borderBottom: '1px solid rgba(212,160,23,0.08)',
                        width: '40%',
                      }}
                    >
                      Feature
                    </th>
                    {['Free', 'Pro', 'Enterprise'].map((name) => (
                      <th
                        key={name}
                        className="text-center py-4 px-4 text-sm font-semibold"
                        style={{
                          color: name === 'Pro' ? '#D4A017' : '#F5F3EF',
                          fontFamily: 'var(--font-display)',
                          borderBottom: '1px solid rgba(212,160,23,0.08)',
                          width: '20%',
                        }}
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((section) => (
                    <Fragment key={`cat-${section.category}`}>
                      <tr>
                        <td
                          colSpan={4}
                          className="pt-6 pb-2 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{
                            color: '#A8A29E',
                            fontFamily: 'var(--font-dmsans)',
                          }}
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr
                          key={row.label}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        >
                          <td
                            className="py-3 px-4 text-sm"
                            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                          >
                            {row.label}
                          </td>
                          {([row.free, row.pro, row.enterprise] as FeatureValue[]).map(
                            (val, idx) => (
                              <td key={idx} className="py-3 px-4 text-center">
                                {renderCellValue(val, idx)}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile comparison - stacked cards */}
            <div className="md:hidden space-y-6 animate-on-scroll">
              {COMPARISON.map((section) => (
                <div key={section.category}>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
                    style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                  >
                    {section.category}
                  </h4>
                  <div className="space-y-2">
                    {section.rows.map((row) => (
                      <div
                        key={row.label}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: '#12100E',
                          border: '1px solid rgba(212,160,23,0.06)',
                        }}
                      >
                        <p
                          className="text-sm font-medium mb-2"
                          style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                        >
                          {row.label}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {(['Free', 'Pro', 'Enterprise'] as const).map((planName, idx) => {
                            const val = idx === 0 ? row.free : idx === 1 ? row.pro : row.enterprise
                            return (
                              <div key={planName}>
                                <p
                                  className="text-[10px] uppercase tracking-wider mb-1"
                                  style={{
                                    color: '#6B6560',
                                    fontFamily: 'var(--font-dmsans)',
                                  }}
                                >
                                  {planName}
                                </p>
                                {renderCellValue(val, idx)}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="py-20 px-6" style={{ backgroundColor: '#12100E' }}>
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-center font-bold mb-12 animate-on-scroll"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="animate-on-scroll rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: '#1B1916',
                    border: '1px solid rgba(212,160,23,0.08)',
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {item.question}
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        color: '#6B6560',
                        flexShrink: 0,
                        transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.3s ease',
                      }}
                    />
                  </button>

                  <div
                    style={{
                      maxHeight: openFaq === i ? '200px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <p
                      className="px-6 pb-5 text-sm leading-relaxed"
                      style={{
                        color: '#A8A29E',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────── */}
        <section
          className="py-24 px-6 text-center"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(212,160,23,0.06) 0%, transparent 70%)',
          }}
        >
          <div className="max-w-2xl mx-auto animate-on-scroll">
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
                fontFamily: 'var(--font-display)',
                color: '#F5F3EF',
                letterSpacing: '-1px',
              }}
            >
              Still have questions?
            </h2>

            <p
              className="mt-4 text-base mx-auto"
              style={{
                color: '#6B6560',
                maxWidth: 440,
                fontFamily: 'var(--font-dmsans)',
              }}
            >
              Our team is here to help you find the right plan for your business.
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

              <Link
                href="mailto:sales@spazeo.io"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  color: '#D4A017',
                  border: '1.5px solid rgba(212,160,23,0.25)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Contact Sales
              </Link>
            </div>

            <p
              className="mt-6 text-xs"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              No credit card required. 14-day free trial on all paid plans.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}

/* ─── Helper: render comparison cell value ──────────────────── */

function renderCellValue(val: FeatureValue, colIdx: number) {
  if (val === true) {
    const color = colIdx === 0 ? '#34D399' : colIdx === 1 ? '#D4A017' : '#2DD4BF'
    return <Check size={16} strokeWidth={2.5} style={{ color, margin: '0 auto' }} />
  }
  if (val === false) {
    return <Minus size={16} strokeWidth={1.5} style={{ color: '#3D3830', margin: '0 auto' }} />
  }
  return (
    <span
      className="text-sm"
      style={{
        color: colIdx === 1 ? '#D4A017' : '#A8A29E',
        fontFamily: 'var(--font-dmsans)',
      }}
    >
      {val}
    </span>
  )
}
