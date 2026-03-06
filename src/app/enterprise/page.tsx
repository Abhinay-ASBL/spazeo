'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import {
  ArrowRight,
  Shield,
  Lock,
  Key,
  Users,
  Headphones,
  Zap,
  Globe,
  Server,
  FileCheck,
  Building2,
  Sparkles,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

const ENTERPRISE_FEATURES = [
  {
    icon: Key,
    title: 'SSO / SAML',
    description: 'Single sign-on with your existing identity provider. Supports Okta, Azure AD, Google Workspace.',
  },
  {
    icon: Globe,
    title: 'Custom Branding',
    description: 'White-label the entire platform with your logo, colors, and custom domain.',
  },
  {
    icon: Server,
    title: 'API Access',
    description: 'Full REST API for programmatic tour creation, management, and integration with your stack.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    description: 'Named account manager with guaranteed response times and onboarding assistance.',
  },
  {
    icon: FileCheck,
    title: 'SLA Guarantee',
    description: '99.9% uptime SLA with priority incident response and custom terms.',
  },
  {
    icon: Sparkles,
    title: 'Priority AI',
    description: 'Unlimited AI credits with priority processing queue and custom model fine-tuning.',
  },
]

const SECURITY_ITEMS = [
  {
    icon: Shield,
    title: 'SOC 2 Type II',
    description: 'Independently audited security controls and processes.',
  },
  {
    icon: Lock,
    title: 'GDPR Compliant',
    description: 'Full compliance with EU data protection regulations and data residency options.',
  },
  {
    icon: Key,
    title: 'Encryption',
    description: 'AES-256 encryption at rest. TLS 1.3 in transit. Zero-knowledge architecture.',
  },
]

const CASE_STUDIES = [
  {
    company: 'National Real Estate Group',
    industry: 'Real Estate',
    stat: '2,400+ tours created',
    quote: 'Spazeo transformed how we present properties to remote buyers. Our engagement rates tripled.',
  },
  {
    company: 'Global Hospitality Chain',
    industry: 'Hospitality',
    stat: '85% faster turnaround',
    quote: 'AI staging saves our team 40+ hours per week across all our hotel properties.',
  },
  {
    company: 'Commercial Property Firm',
    industry: 'Commercial',
    stat: '3x more qualified leads',
    quote: 'The lead capture and analytics features gave us insights we never had before.',
  },
]

const TEAM_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']

export default function EnterprisePage() {
  const submitContact = useMutation(api.contact.submit)
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
    honeypot: '', // bot trap
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formState.honeypot) return // bot detected

    setSubmitting(true)
    try {
      await submitContact({
        name: formState.name,
        email: formState.email,
        company: formState.company || undefined,
        teamSize: formState.teamSize || undefined,
        message: formState.message,
        page: 'enterprise',
      })
      setSubmitted(true)
      toast.success('Message sent. We will be in touch shortly.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0908]">
      <Navbar />

      {/* Hero */}
      <section
        className="pt-32 pb-20 text-center"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(45,212,191,0.06) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-[0.16em] px-4 py-1.5 rounded-full mb-6"
            style={{
              color: '#2DD4BF',
              border: '1px solid rgba(45,212,191,0.3)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Enterprise
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
            Virtual Tours at Scale
          </h1>

          <p
            className="text-lg mt-4 mx-auto"
            style={{
              color: '#A8A29E',
              maxWidth: 540,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Enterprise-grade security, unlimited capacity, and dedicated
            support for teams that need AI-powered virtual tours at scale.
          </p>

          <a
            href="#contact"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: '#2DD4BF',
              color: '#0A0908',
              boxShadow: '0 0 20px rgba(45,212,191,0.25)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Contact Sales
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-bold mb-12"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Enterprise Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ENTERPRISE_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl p-8"
                  style={{
                    backgroundColor: '#12100E',
                    border: '1px solid rgba(212,160,23,0.08)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(45,212,191,0.1)' }}
                  >
                    <Icon size={20} style={{ color: '#2DD4BF' }} />
                  </div>
                  <h3
                    className="text-base font-bold"
                    style={{
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-jakarta)',
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm mt-2 leading-relaxed"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 px-6" style={{ backgroundColor: '#12100E' }}>
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
            Security & Compliance
          </h2>

          <p
            className="text-center text-base mb-12 mx-auto"
            style={{
              color: '#A8A29E',
              maxWidth: 480,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Built for organizations that take data protection seriously.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SECURITY_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-2xl p-8 text-center"
                  style={{
                    backgroundColor: '#1B1916',
                    border: '1px solid rgba(212,160,23,0.08)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
                  >
                    <Icon size={22} style={{ color: '#D4A017' }} />
                  </div>
                  <h3
                    className="text-base font-bold"
                    style={{
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-jakarta)',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm mt-2 leading-relaxed"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-bold mb-12"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Trusted by Industry Leaders
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CASE_STUDIES.map((study) => (
              <div
                key={study.company}
                className="rounded-2xl p-8 flex flex-col"
                style={{
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.08)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
                  >
                    <Building2 size={18} style={{ color: '#D4A017' }} />
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                    >
                      {study.company}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: '#6B6560',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {study.industry}
                    </p>
                  </div>
                </div>

                <p
                  className="text-2xl font-black mb-3"
                  style={{
                    color: '#D4A017',
                    fontFamily: 'var(--font-jakarta)',
                  }}
                >
                  {study.stat}
                </p>

                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{
                    color: '#A8A29E',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  &ldquo;{study.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Sales Form */}
      <section id="contact" className="py-20 px-6" style={{ backgroundColor: '#12100E' }}>
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-center font-bold mb-4"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1px',
            }}
          >
            Contact Sales
          </h2>

          <p
            className="text-center text-base mb-10 mx-auto"
            style={{
              color: '#A8A29E',
              maxWidth: 440,
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Tell us about your needs and we will craft a tailored plan for your
            organization.
          </p>

          {submitted ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(45,212,191,0.2)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(45,212,191,0.1)' }}
              >
                <Clock size={28} style={{ color: '#2DD4BF' }} />
              </div>
              <h3
                className="text-xl font-bold"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                Message received
              </h3>
              <p
                className="text-sm mt-2"
                style={{
                  color: '#A8A29E',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Our enterprise team will get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-8 space-y-5"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.12)',
              }}
            >
              {/* Honeypot field - hidden from users, visible to bots */}
              <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website_url">Website</label>
                <input
                  id="website_url"
                  name="website_url"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formState.honeypot}
                  onChange={(e) => setFormState((s) => ({ ...s, honeypot: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-1.5"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-[rgba(212,160,23,0.5)]"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-1.5"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    Work Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-[rgba(212,160,23,0.5)]"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium mb-1.5"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={formState.company}
                    onChange={(e) => setFormState((s) => ({ ...s, company: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-[rgba(212,160,23,0.5)]"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="teamSize"
                    className="block text-sm font-medium mb-1.5"
                    style={{
                      color: '#A8A29E',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    Team Size
                  </label>
                  <select
                    id="teamSize"
                    value={formState.teamSize}
                    onChange={(e) => setFormState((s) => ({ ...s, teamSize: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-[rgba(212,160,23,0.5)]"
                    style={{
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.12)',
                      color: formState.teamSize ? '#F5F3EF' : '#6B6560',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    <option value="">Select team size</option>
                    {TEAM_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} people
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-1.5"
                  style={{
                    color: '#A8A29E',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  value={formState.message}
                  onChange={(e) => setFormState((s) => ({ ...s, message: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-[rgba(212,160,23,0.5)] resize-none"
                  style={{
                    backgroundColor: '#12100E',
                    border: '1px solid rgba(212,160,23,0.12)',
                    color: '#F5F3EF',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                  placeholder="Tell us about your requirements..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor: '#2DD4BF',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {submitting ? 'Sending...' : 'Contact Sales'}
                {!submitting && <ArrowRight size={14} />}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
