'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Building2,
  Camera,
  Key,
  User,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  LayoutDashboard,
  Plus,
  Eye,
  Wand2,
  Share2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { trackEvent } from '@/lib/posthog'

/* ── Constants ── */

const BUSINESS_TYPES = [
  { id: 'agent', label: 'Real Estate Agent', icon: Home },
  { id: 'manager', label: 'Property Manager', icon: Key },
  { id: 'photographer', label: 'Photographer', icon: Camera },
  { id: 'developer', label: 'Developer', icon: Building2 },
  { id: 'other', label: 'Other', icon: User },
] as const

const USE_CASES = [
  'Residential Sales',
  'Commercial Leasing',
  'Vacation Rentals',
  'Construction',
  'Other',
] as const

const TEAM_SIZES = ['Solo', '2-5', '6-20', '20+'] as const

const REFERRAL_SOURCES = [
  'Search Engine',
  'Social Media',
  'Friend / Colleague',
  'Blog / Article',
  'Conference / Event',
  'Other',
] as const

const FEATURE_HIGHLIGHTS = [
  {
    icon: Eye,
    title: '360 Virtual Tours',
    description: 'Create immersive panoramic experiences from your photos.',
  },
  {
    icon: Wand2,
    title: 'AI-Powered Staging',
    description: 'Virtually stage empty rooms with AI in seconds.',
  },
  {
    icon: Share2,
    title: 'One-Click Sharing',
    description: 'Share tours via link, embed, QR code, or social media.',
  },
]

/* ── Animation variants ── */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

const slideTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const,
}

/* ── Progress Stepper ── */

function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = ['Profile', 'Business', 'Get Started']

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isCompleted = currentStep > stepNum
        const isActive = currentStep === stepNum

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                style={{
                  backgroundColor: isCompleted || isActive ? '#D4A017' : '#1B1916',
                  color: isCompleted || isActive ? '#0A0908' : '#6B6560',
                  border: isCompleted || isActive ? 'none' : '1px solid rgba(212,160,23,0.2)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {isCompleted ? <Check size={16} strokeWidth={2.5} /> : stepNum}
              </div>
              <span
                className="text-[11px] font-medium whitespace-nowrap"
                style={{
                  color: isCompleted || isActive ? '#F5F3EF' : '#6B6560',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className="w-16 sm:w-24 h-px mx-3 mb-6 transition-colors duration-300"
                style={{
                  backgroundColor: currentStep > stepNum
                    ? '#D4A017'
                    : 'rgba(212,160,23,0.15)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Skip Confirmation Dialog ── */

function SkipDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-sm rounded-xl p-6"
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.2)',
        }}
      >
        <h3
          className="text-lg font-bold mb-2"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          Skip Onboarding?
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Are you sure? We use this info to personalize your experience.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200"
            style={{
              backgroundColor: 'rgba(212,160,23,0.08)',
              color: '#A8A29E',
              border: '1px solid rgba(212,160,23,0.15)',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Yes, skip
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
            style={{
              backgroundColor: '#D4A017',
              color: '#0A0908',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Continue setup
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Step 1: Welcome & Profile ── */

function StepProfile({
  displayName,
  businessType,
  otherRole,
  useCase,
  onDisplayNameChange,
  onSelectBusinessType,
  onOtherRoleChange,
  onSelectUseCase,
}: {
  displayName: string
  businessType: string
  otherRole: string
  useCase: string
  onDisplayNameChange: (value: string) => void
  onSelectBusinessType: (type: string) => void
  onOtherRoleChange: (value: string) => void
  onSelectUseCase: (useCase: string) => void
}) {
  return (
    <div>
      <h2
        className="text-2xl sm:text-3xl font-bold mb-2 text-center"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        Welcome to Spazeo
      </h2>
      <p
        className="text-sm text-center mb-8"
        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
      >
        Let us personalize your experience. Tell us a bit about yourself.
      </p>

      {/* Display name */}
      <div className="mb-6">
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
          style={{
            backgroundColor: '#12100E',
            color: '#F5F3EF',
            border: '1px solid rgba(212,160,23,0.12)',
            fontFamily: 'var(--font-dmsans)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Business type */}
      <div className="mb-6">
        <label
          className="block text-xs font-medium mb-3"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Business Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUSINESS_TYPES.map((role) => {
            const Icon = role.icon
            const isSelected = businessType === role.id

            return (
              <button
                key={role.id}
                onClick={() => onSelectBusinessType(role.id)}
                className="relative flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: '#12100E',
                  border: isSelected
                    ? '2px solid #D4A017'
                    : '1px solid rgba(212,160,23,0.12)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(212,160,23,0.15)'
                      : 'rgba(212,160,23,0.06)',
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: isSelected ? '#D4A017' : '#6B6560' }}
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? '#F5F3EF' : '#A8A29E',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {role.label}
                </span>
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#D4A017' }}
                  >
                    <Check size={12} style={{ color: '#0A0908' }} strokeWidth={2.5} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {businessType === 'other' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden"
          >
            <input
              type="text"
              value={otherRole}
              onChange={(e) => onOtherRoleChange(e.target.value)}
              placeholder="Tell us your role..."
              maxLength={60}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                backgroundColor: '#12100E',
                color: '#F5F3EF',
                border: '1px solid rgba(212,160,23,0.2)',
                fontFamily: 'var(--font-dmsans)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,160,23,0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Primary use case */}
      <div>
        <label
          className="block text-xs font-medium mb-3"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Primary Use Case
        </label>
        <div className="flex flex-wrap gap-2">
          {USE_CASES.map((uc) => {
            const isSelected = useCase === uc
            return (
              <button
                key={uc}
                onClick={() => onSelectUseCase(uc)}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? '#D4A017' : '#1B1916',
                  color: isSelected ? '#0A0908' : '#A8A29E',
                  border: isSelected
                    ? '1px solid #D4A017'
                    : '1px solid rgba(212,160,23,0.12)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {uc}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Step 2: Business Details ── */

function StepBusiness({
  companyName,
  website,
  teamSize,
  referralSource,
  onCompanyChange,
  onWebsiteChange,
  onTeamSizeChange,
  onReferralChange,
}: {
  companyName: string
  website: string
  teamSize: string
  referralSource: string
  onCompanyChange: (value: string) => void
  onWebsiteChange: (value: string) => void
  onTeamSizeChange: (value: string) => void
  onReferralChange: (value: string) => void
}) {
  return (
    <div>
      <h2
        className="text-2xl sm:text-3xl font-bold mb-2 text-center"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        Your Business Details
      </h2>
      <p
        className="text-sm text-center mb-8"
        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
      >
        Help us recommend the best plan and features for you.
      </p>

      {/* Company name */}
      <div className="mb-5">
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Company / Agency Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => onCompanyChange(e.target.value)}
          placeholder="e.g. Acme Realty"
          maxLength={80}
          className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
          style={{
            backgroundColor: '#12100E',
            color: '#F5F3EF',
            border: '1px solid rgba(212,160,23,0.12)',
            fontFamily: 'var(--font-dmsans)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Website */}
      <div className="mb-5">
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Website URL <span style={{ color: '#6B6560' }}>(optional)</span>
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => onWebsiteChange(e.target.value)}
          placeholder="https://yoursite.com"
          className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
          style={{
            backgroundColor: '#12100E',
            color: '#F5F3EF',
            border: '1px solid rgba(212,160,23,0.12)',
            fontFamily: 'var(--font-dmsans)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Team size */}
      <div className="mb-5">
        <label
          className="block text-xs font-medium mb-3"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          Team Size
        </label>
        <div className="flex gap-2">
          {TEAM_SIZES.map((size) => {
            const isSelected = teamSize === size
            return (
              <button
                key={size}
                onClick={() => onTeamSizeChange(size)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? '#D4A017' : '#12100E',
                  color: isSelected ? '#0A0908' : '#A8A29E',
                  border: isSelected
                    ? '1px solid #D4A017'
                    : '1px solid rgba(212,160,23,0.12)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {size}
              </button>
            )
          })}
        </div>
      </div>

      {/* Referral source */}
      <div>
        <label
          className="block text-xs font-medium mb-3"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          How did you hear about us? <span style={{ color: '#6B6560' }}>(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_SOURCES.map((source) => {
            const isSelected = referralSource === source
            return (
              <button
                key={source}
                onClick={() => onReferralChange(isSelected ? '' : source)}
                className="px-4 py-2 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? 'rgba(212,160,23,0.15)' : '#1B1916',
                  color: isSelected ? '#D4A017' : '#6B6560',
                  border: isSelected
                    ? '1px solid rgba(212,160,23,0.4)'
                    : '1px solid rgba(212,160,23,0.08)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                {source}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Step 3: Get Started ── */

function StepGetStarted() {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: 'rgba(212,160,23,0.12)' }}
      >
        <Sparkles size={28} style={{ color: '#D4A017' }} />
      </div>

      <h2
        className="text-2xl sm:text-3xl font-bold mb-2"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        You're all set!
      </h2>
      <p
        className="text-sm mb-10 max-w-md mx-auto"
        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
      >
        Your account is ready. Here is what you can do with Spazeo.
      </p>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {FEATURE_HIGHLIGHTS.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="p-5 rounded-xl text-left"
              style={{
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.12)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
              >
                <Icon size={20} style={{ color: '#D4A017' }} />
              </div>
              <h3
                className="text-sm font-semibold mb-1"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
              >
                {feature.title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Onboarding Page ── */

export default function OnboardingPage() {
  const router = useRouter()
  const { user: clerkUser } = useUser()
  const currentUser = useQuery(api.users.getCurrent)
  const ensureUser = useMutation(api.users.ensureUser)
  const saveOnboardingStep = useMutation(api.users.saveOnboardingStep)
  const completeOnboarding = useMutation(api.users.completeOnboarding)
  const ensuredRef = useRef(false)

  // Auto-create Convex user record if not yet in DB
  useEffect(() => {
    if (currentUser === null && !ensuredRef.current) {
      ensuredRef.current = true
      ensureUser().catch(() => {
        ensuredRef.current = false
      })
    }
  }, [currentUser, ensureUser])

  // Wizard state
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSkipDialog, setShowSkipDialog] = useState(false)

  // Step 1 state
  const [displayName, setDisplayName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [otherRole, setOtherRole] = useState('')
  const [useCase, setUseCase] = useState('')

  // Step 2 state
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [referralSource, setReferralSource] = useState('')

  // Track onboarding started on mount
  useEffect(() => {
    trackEvent('onboarding_started')
  }, [])

  // Pre-fill display name from Clerk
  useEffect(() => {
    if (clerkUser && !displayName) {
      setDisplayName(clerkUser.fullName || clerkUser.firstName || '')
    }
  }, [clerkUser, displayName])

  // Redirect if onboarding is already complete, or resume from saved step
  useEffect(() => {
    if (currentUser === undefined) return
    if (currentUser === null) return

    if (currentUser.onboardingComplete) {
      router.push('/dashboard')
      return
    }

    if (currentUser.onboardingStep && currentUser.onboardingStep > 0) {
      setStep(currentUser.onboardingStep)
    }
  }, [currentUser, router])

  // Validation for current step
  const isStepValid = (): boolean => {
    switch (step) {
      case 1:
        return businessType !== '' && useCase !== ''
      case 2:
        return true // all fields optional or have defaults
      case 3:
        return true // confirmation step, always valid
      default:
        return false
    }
  }

  // Map use case to propertyFocus array for Convex
  const useCaseToPropertyFocus = (uc: string): string[] => {
    switch (uc) {
      case 'Residential Sales': return ['Residential']
      case 'Commercial Leasing': return ['Commercial']
      case 'Vacation Rentals': return ['Hospitality']
      case 'Construction': return ['Industrial']
      default: return [uc]
    }
  }

  const handleNext = async () => {
    if (!isStepValid()) return

    setIsSubmitting(true)
    try {
      const nextStep = step + 1

      if (step === 1) {
        await saveOnboardingStep({
          step: nextStep,
          userType: businessType as 'agent' | 'photographer' | 'developer' | 'manager' | 'other',
          roleOther: businessType === 'other' ? otherRole : undefined,
          propertyFocus: useCaseToPropertyFocus(useCase),
        })
      } else if (step === 2) {
        await saveOnboardingStep({
          step: nextStep,
          company: companyName || undefined,
          website: website || undefined,
        })
      }

      if (step < 3) {
        trackEvent('onboarding_step_completed', { step, nextStep })
        setDirection(1)
        setStep(nextStep)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async (destination: 'dashboard' | 'create') => {
    setIsSubmitting(true)
    try {
      await completeOnboarding({
        userType: businessType as 'agent' | 'photographer' | 'developer' | 'manager' | 'other' || 'other',
        roleOther: businessType === 'other' ? otherRole : undefined,
        propertyFocus: useCaseToPropertyFocus(useCase),
        company: companyName || undefined,
        website: website || undefined,
      })
      trackEvent('onboarding_completed', { destination, businessType, useCase })
      toast.success('Welcome to Spazeo!')
      router.push(destination === 'create' ? '/tours' : '/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step <= 1) return
    setDirection(-1)
    setStep((s) => s - 1)
  }

  const handleSkipConfirm = async () => {
    setShowSkipDialog(false)
    setIsSubmitting(true)
    try {
      await completeOnboarding({
        userType: 'other',
        propertyFocus: [],
      })
      toast.success('Welcome to Spazeo!')
      router.push('/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (currentUser === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0A0908' }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: '#D4A017' }}
        />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0A0908' }}
    >
      {/* Top bar: logo */}
      <div className="px-6 py-5">
        <Logo href="/" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
        {/* Progress stepper */}
        <div className="mb-10">
          <ProgressStepper currentStep={step} />
        </div>

        {/* Step content with slide animation */}
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              {step === 1 && (
                <StepProfile
                  displayName={displayName}
                  businessType={businessType}
                  otherRole={otherRole}
                  useCase={useCase}
                  onDisplayNameChange={setDisplayName}
                  onSelectBusinessType={setBusinessType}
                  onOtherRoleChange={setOtherRole}
                  onSelectUseCase={setUseCase}
                />
              )}
              {step === 2 && (
                <StepBusiness
                  companyName={companyName}
                  website={website}
                  teamSize={teamSize}
                  referralSource={referralSource}
                  onCompanyChange={setCompanyName}
                  onWebsiteChange={setWebsite}
                  onTeamSizeChange={setTeamSize}
                  onReferralChange={setReferralSource}
                />
              )}
              {step === 3 && (
                <StepGetStarted />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4"
        style={{
          backgroundColor: 'rgba(10,9,8,0.92)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(212,160,23,0.08)',
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium cursor-pointer transition-all duration-200 px-3 py-2 rounded-lg"
            style={{
              color: '#A8A29E',
              visibility: step === 1 ? 'hidden' : 'visible',
              fontFamily: 'var(--font-dmsans)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F5F3EF'
              e.currentTarget.style.backgroundColor = 'rgba(212,160,23,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#A8A29E'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Skip link (hidden on final step) */}
          {step < 3 && (
            <button
              onClick={() => setShowSkipDialog(true)}
              className="text-sm cursor-pointer transition-colors duration-200"
              style={{
                color: '#6B6560',
                fontFamily: 'var(--font-dmsans)',
                background: 'none',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#A8A29E'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6B6560'
              }}
            >
              Skip Onboarding
            </button>
          )}

          {/* Step 3 has two CTAs, steps 1-2 have Next */}
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
              style={{
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#E5B120'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#D4A017'
              }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Next
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleComplete('create')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-40"
                style={{
                  backgroundColor: 'transparent',
                  color: '#D4A017',
                  border: '1.5px solid #D4A017',
                  fontFamily: 'var(--font-dmsans)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(212,160,23,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <Plus size={14} />
                Create Your First Tour
              </button>
              <button
                onClick={() => handleComplete('dashboard')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-40 hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#E5B120'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#D4A017'
                }}
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <LayoutDashboard size={14} />
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Skip confirmation dialog */}
      <SkipDialog
        open={showSkipDialog}
        onConfirm={handleSkipConfirm}
        onCancel={() => setShowSkipDialog(false)}
      />
    </div>
  )
}
