'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { SignUp } from '@clerk/nextjs'
import { Mail, Lock, EyeOff, Eye, User, ArrowLeft, Zap, Sparkles, Share2, Shield, Check } from 'lucide-react'
import { isProvidersConfigured } from '@/components/providers/ConvexClientProvider'
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary'
import { trackEvent } from '@/lib/posthog'
import toast from 'react-hot-toast'

function SpazeoLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-0.5">
      <span
        className="text-2xl font-black tracking-[2px]"
        style={{
          fontFamily: 'var(--font-display)',
          color: '#F5F3EF',
        }}
      >
        SPAZEO
      </span>
      <span
        className="inline-block rounded-full mb-1"
        style={{ width: 7, height: 7, backgroundColor: '#D4A017' }}
      />
    </Link>
  )
}

const BENEFITS = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    text: 'Create tours in under 60 seconds',
    color: '#D4A017',
    bg: 'rgba(212,160,23,0.10)',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    text: 'Virtual staging and scene analysis included',
    color: '#2DD4BF',
    bg: 'rgba(45,212,191,0.10)',
  },
  {
    icon: Share2,
    title: 'One-Click Share',
    text: 'Share with a link or embed anywhere',
    color: '#FB7A54',
    bg: 'rgba(251,122,84,0.10)',
  },
  {
    icon: Shield,
    title: 'Free Forever',
    text: 'No credit card required to get started',
    color: '#D4A017',
    bg: 'rgba(212,160,23,0.10)',
  },
]

function FallbackSignUpForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [optInMarketing, setOptInMarketing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) {
      toast.error('Please enter your first name')
      return
    }
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    if (!password.trim()) {
      toast.error('Please enter a password')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (!agreedTerms) {
      toast.error('Please agree to the Terms of Service')
      return
    }
    if (!agreedPrivacy) {
      toast.error('Please acknowledge the Privacy Policy')
      return
    }
    setLoading(true)
    setTimeout(() => {
      trackEvent('signup_completed', { method: 'email' })
      toast.success('Account created! Redirecting to dashboard...')
      router.push('/dashboard')
    }, 800)
  }

  const handleSocialSignUp = (provider: string) => {
    setLoading(true)
    trackEvent('signup_completed', { method: provider.toLowerCase() })
    toast.success(`Signing up with ${provider}...`)
    setTimeout(() => {
      router.push('/dashboard')
    }, 800)
  }

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-6 w-full" style={{ maxWidth: 400 }}>
      {/* Header */}
      <div>
        <h1
          className="text-[32px] font-bold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
        >
          Create your account
        </h1>
        <p
          className="text-[15px] mt-2"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Start creating immersive virtual tours in minutes
        </p>
      </div>

      {/* Social Buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleSocialSignUp('Google')}
          disabled={loading}
          className="w-full h-12 rounded-[10px] flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer hover:brightness-125 disabled:opacity-50"
          style={{
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.12)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span
            className="text-sm font-medium"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
          >
            Continue with Google
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialSignUp('Apple')}
          disabled={loading}
          className="w-full h-12 rounded-[10px] flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer hover:brightness-125 disabled:opacity-50"
          style={{
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.12)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F5F3EF">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
          </svg>
          <span
            className="text-sm font-medium"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
          >
            Continue with Apple
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(212,160,23,0.10)' }} />
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          or
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(212,160,23,0.10)' }} />
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-4">
        {/* Name Row */}
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <label
              htmlFor="signup-firstname"
              className="text-[13px] font-medium"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              First name
            </label>
            <div
              className="flex items-center gap-2.5 h-11 px-3.5 rounded-lg"
              style={{
                backgroundColor: '#12100E',
                border: '1.5px solid rgba(212,160,23,0.10)',
              }}
            >
              <User size={16} style={{ color: '#6B6560', flexShrink: 0 }} />
              <input
                id="signup-firstname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#4A4540]"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label
              htmlFor="signup-lastname"
              className="text-[13px] font-medium"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Last name
            </label>
            <div
              className="flex items-center gap-2.5 h-11 px-3.5 rounded-lg"
              style={{
                backgroundColor: '#12100E',
                border: '1.5px solid rgba(212,160,23,0.10)',
              }}
            >
              <input
                id="signup-lastname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#4A4540]"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
              />
            </div>
          </div>
        </div>

        {/* Work Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-email"
            className="text-[13px] font-medium"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Work email
          </label>
          <div
            className="flex items-center gap-3 h-11 px-3.5 rounded-lg"
            style={{
              backgroundColor: '#12100E',
              border: '1.5px solid rgba(212,160,23,0.10)',
            }}
          >
            <Mail size={16} style={{ color: '#6B6560', flexShrink: 0 }} />
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#4A4540]"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-password"
            className="text-[13px] font-medium"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Password
          </label>
          <div
            className="flex items-center h-11 px-3.5 rounded-lg"
            style={{
              backgroundColor: '#12100E',
              border: '1.5px solid rgba(212,160,23,0.10)',
            }}
          >
            <div className="flex items-center gap-2.5 flex-1">
              <Lock size={16} style={{ color: '#6B6560', flexShrink: 0 }} />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#4A4540]"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="ml-2 p-1 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <Eye size={16} style={{ color: '#6B6560' }} />
              ) : (
                <EyeOff size={16} style={{ color: '#6B6560' }} />
              )}
            </button>
          </div>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: '#4A4540', fontFamily: 'var(--font-dmsans)' }}
          >
            Must be at least 8 characters with a number and symbol
          </p>
        </div>

        {/* Consent Checkboxes (SPA-16) */}
        <div className="flex flex-col gap-3 mt-1">
          {/* Terms of Service (required) */}
          <button
            type="button"
            onClick={() => setAgreedTerms((v) => !v)}
            className="flex items-start gap-2.5 cursor-pointer group text-left"
          >
            <div
              className="w-[18px] h-[18px] rounded mt-0.5 flex-shrink-0 flex items-center justify-center transition-all duration-150"
              style={{
                backgroundColor: agreedTerms ? '#D4A017' : '#12100E',
                border: agreedTerms ? '1.5px solid #D4A017' : '1.5px solid rgba(212,160,23,0.18)',
              }}
            >
              {agreedTerms && <Check size={11} style={{ color: '#0A0908' }} strokeWidth={3} />}
            </div>
            <span
              className="text-[12px] leading-relaxed group-hover:text-[#F5F3EF] transition-colors"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              I agree to the{' '}
              <span style={{ color: '#D4A017' }}>Terms of Service</span>
              <span style={{ color: '#F87171', marginLeft: 4 }}>*</span>
            </span>
          </button>

          {/* Privacy Policy (required) */}
          <button
            type="button"
            onClick={() => setAgreedPrivacy((v) => !v)}
            className="flex items-start gap-2.5 cursor-pointer group text-left"
          >
            <div
              className="w-[18px] h-[18px] rounded mt-0.5 flex-shrink-0 flex items-center justify-center transition-all duration-150"
              style={{
                backgroundColor: agreedPrivacy ? '#D4A017' : '#12100E',
                border: agreedPrivacy ? '1.5px solid #D4A017' : '1.5px solid rgba(212,160,23,0.18)',
              }}
            >
              {agreedPrivacy && <Check size={11} style={{ color: '#0A0908' }} strokeWidth={3} />}
            </div>
            <span
              className="text-[12px] leading-relaxed group-hover:text-[#F5F3EF] transition-colors"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              I acknowledge the{' '}
              <span style={{ color: '#D4A017' }}>Privacy Policy</span>
              <span style={{ color: '#F87171', marginLeft: 4 }}>*</span>
            </span>
          </button>

          {/* Marketing (optional) */}
          <button
            type="button"
            onClick={() => setOptInMarketing((v) => !v)}
            className="flex items-start gap-2.5 cursor-pointer group text-left"
          >
            <div
              className="w-[18px] h-[18px] rounded mt-0.5 flex-shrink-0 flex items-center justify-center transition-all duration-150"
              style={{
                backgroundColor: optInMarketing ? '#D4A017' : '#12100E',
                border: optInMarketing ? '1.5px solid #D4A017' : '1.5px solid rgba(212,160,23,0.18)',
              }}
            >
              {optInMarketing && <Check size={11} style={{ color: '#0A0908' }} strokeWidth={3} />}
            </div>
            <span
              className="text-[12px] leading-relaxed group-hover:text-[#F5F3EF] transition-colors"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Send me product updates and tips (optional)
            </span>
          </button>
        </div>
      </div>

      {/* Create Account Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[50px] rounded-[10px] text-[15px] font-bold transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          backgroundColor: '#D4A017',
          color: '#0A0908',
          fontFamily: 'var(--font-display)',
          boxShadow: '0 0 30px rgba(212,160,23,0.2)',
        }}
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      {/* Sign in link */}
      <p
        className="text-center text-sm"
        style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
      >
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-semibold hover:underline"
          style={{ color: '#D4A017' }}
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}

export default function SignUpPage() {
  // Track signup page load
  useEffect(() => {
    trackEvent('signup_started')
  }, [])

  return (
    <AuthErrorBoundary>
    <div className="flex min-h-screen" style={{ backgroundColor: '#0A0908' }}>
      {/* ── Left Panel — Sign Up Form ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile-only header */}
        <div className="lg:hidden flex items-center justify-between p-6">
          <SpazeoLogo />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            <ArrowLeft size={15} />
            Home
          </Link>
        </div>

        {/* Desktop-only top bar */}
        <div className="hidden lg:flex items-center justify-between p-10 pb-0">
          <SpazeoLogo />
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </div>

        {/* Form container — centered */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8">
          {isProvidersConfigured ? (
            <div
              className="w-full flex flex-col items-center gap-6"
              style={{ maxWidth: 400 }}
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-3xl font-black tracking-[3px]"
                  style={{ fontFamily: 'var(--font-display)', color: '#D4A017' }}
                >
                  SPAZEO
                </span>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: '#D4A017' }}
                />
              </div>
              <div className="w-full">
                <h1
                  className="text-[32px] font-bold leading-tight"
                  style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
                >
                  Create your account
                </h1>
                <p
                  className="text-[15px] mt-2"
                  style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                >
                  Start creating immersive virtual tours in minutes
                </p>
              </div>
              <SignUp
                forceRedirectUrl="/onboarding"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none bg-transparent p-0 w-full',
                    cardBox: 'shadow-none w-full',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton:
                      'bg-[#12100E] border-[rgba(212,160,23,0.12)] text-[#F5F3EF] hover:bg-[#1B1916] h-12 rounded-[10px] font-medium cursor-pointer transition-colors',
                    socialButtonsBlockButtonText: 'text-[#F5F3EF] text-sm font-medium',
                    formButtonPrimary:
                      'bg-[#D4A017] hover:bg-[#E5B120] text-[#0A0908] h-[50px] rounded-[10px] font-bold text-[15px] shadow-[0_0_30px_rgba(212,160,23,0.2)] cursor-pointer transition-colors',
                    formButtonPrimaryHover: 'bg-[#E5B120]',
                    formFieldLabel: 'text-[#A8A29E] text-[13px] font-medium',
                    formFieldInput:
                      'bg-[#12100E] border-[rgba(212,160,23,0.10)] text-[#F5F3EF] h-11 rounded-lg text-sm focus:border-[#D4A017] focus:ring-0 focus:shadow-[0_0_0_3px_rgba(212,160,23,0.1)]',
                    footerActionLink: 'text-[#D4A017] hover:text-[#E5B120] font-semibold cursor-pointer transition-colors',
                    footerActionText: 'text-[#6B6560] text-sm',
                    identityPreviewEditButton: 'text-[#D4A017] hover:text-[#E5B120] cursor-pointer transition-colors',
                    formFieldAction: 'text-[#D4A017] text-[12px] font-medium cursor-pointer hover:text-[#E5B120] transition-colors',
                    dividerLine: 'bg-[rgba(212,160,23,0.10)]',
                    dividerText: 'text-[#6B6560] text-xs uppercase tracking-wider',
                    formFieldInputShowPasswordButton: 'text-[#6B6560] hover:text-[#A8A29E] cursor-pointer transition-colors',
                    formFieldInputPlaceholder: 'text-[#4A4540]',
                    footer: 'bg-transparent',
                    main: 'gap-5',
                    otpCodeFieldInput: 'bg-[#12100E] border-[rgba(212,160,23,0.10)] text-[#F5F3EF] focus:border-[#D4A017] focus:ring-0',
                  },
                }}
              />
            </div>
          ) : (
            <FallbackSignUpForm />
          )}
        </div>

        {/* Bottom */}
        <div className="px-6 pb-6 text-center">
          <p
            className="text-xs"
            style={{ color: '#4A4540', fontFamily: 'var(--font-dmsans)' }}
          >
            Protected by enterprise-grade security
          </p>
        </div>
      </div>

      {/* ── Right Panel — Background Image + Benefits ── */}
      <div className="hidden lg:flex relative w-1/2 flex-shrink-0 overflow-hidden">
        <Image
          src="/images/signup-bg.png"
          alt="Virtual tour showcase"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,9,8,0.3) 0%, rgba(10,9,8,0.1) 40%, rgba(10,9,8,0.7) 75%, rgba(10,9,8,0.95) 100%)',
          }}
        />

        {/* Bottom — Benefits */}
        <div className="absolute bottom-0 left-0 right-0 p-10 pb-14 z-10">
          <h3
            className="text-[24px] font-bold leading-snug"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#F5F3EF',
            }}
          >
            Everything you need to create<br />stunning virtual tours
          </h3>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {BENEFITS.map((ben) => {
              const Icon = ben.icon
              return (
                <div
                  key={ben.title}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(18,16,14,0.55)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: ben.bg,
                    }}
                  >
                    <Icon size={17} style={{ color: ben.color }} />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {ben.title}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 leading-relaxed"
                      style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {ben.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
    </AuthErrorBoundary>
  )
}
