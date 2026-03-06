'use client'

import { useState, useEffect } from 'react'
import { useQuery, useAction } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../../../convex/_generated/api'
import { PLANS } from '@/lib/constants'
import {
  CreditCard,
  Check,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  X,
  BarChart3,
  Zap,
  Image as ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'

type PlanKey = keyof typeof PLANS
type BillingInterval = 'monthly' | 'annual'

const DISPLAYABLE_PLANS: {
  key: PlanKey
  features: string[]
}[] = [
  {
    key: 'free',
    features: ['3 active tours', '10 scenes per tour', 'Basic analytics', 'Spazeo branding'],
  },
  {
    key: 'starter',
    features: ['10 active tours', '25 scenes per tour', 'AI staging (5/mo)', 'Lead capture', 'Custom branding'],
  },
  {
    key: 'professional',
    features: ['Unlimited tours', '50 scenes per tour', 'Unlimited AI', 'Advanced analytics', 'White-label'],
  },
  {
    key: 'business',
    features: ['Everything in Pro', '100 scenes per tour', '5 team seats', 'Custom domain', 'Dedicated support'],
  },
]

export default function BillingPage() {
  const searchParams = useSearchParams()
  const user = useQuery(api.users.getCurrent)
  const subscription = useQuery(api.subscriptions.getCurrent)
  const usage = useQuery(api.subscriptions.getUsage)

  const createCheckoutSession = useAction(api.subscriptions.createCheckoutSession)
  const createPortalSession = useAction(api.subscriptions.createCustomerPortalSession)
  const cancelSubscription = useAction(api.subscriptions.cancel)

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Handle Stripe checkout success/cancel redirects
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      toast.success('Upgrade successful! Your subscription is now active.')
    } else if (canceled === 'true') {
      toast.error('Checkout was canceled. Please try again.')
    }
  }, [searchParams])

  const isLoading = user === undefined || subscription === undefined || usage === undefined

  const currentPlan = (user?.plan ?? 'free') as PlanKey
  const currentPlanData = PLANS[currentPlan]
  const subscriptionStatus = subscription?.status ?? (currentPlan === 'free' ? 'active' : undefined)
  const isCanceled = subscriptionStatus === 'canceled'

  const handleUpgrade = async (planKey: PlanKey) => {
    if (planKey === 'free' || planKey === 'enterprise') return
    setLoadingPlan(planKey)
    try {
      const result = await createCheckoutSession({
        plan: planKey as 'starter' | 'professional' | 'business',
        interval: billingInterval,
      })
      if (result?.url) {
        window.location.href = result.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create checkout session')
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const result = await createPortalSession({})
      if (result?.url) {
        window.location.href = result.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCancel = async () => {
    setCancelLoading(true)
    try {
      await cancelSubscription({})
      toast.success('Subscription canceled. You will retain access until the end of your billing period.')
      setShowCancelDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setCancelLoading(false)
    }
  }

  const getCtaForPlan = (planKey: PlanKey) => {
    if (planKey === currentPlan) {
      return { label: 'Current Plan', disabled: true, style: 'current' as const }
    }
    const planOrder: PlanKey[] = ['free', 'starter', 'professional', 'business', 'enterprise']
    const currentIdx = planOrder.indexOf(currentPlan)
    const targetIdx = planOrder.indexOf(planKey)
    if (targetIdx < currentIdx) {
      return { label: 'Downgrade', disabled: false, style: 'downgrade' as const }
    }
    return { label: 'Upgrade', disabled: false, style: 'upgrade' as const }
  }

  const formatLimit = (limit: number) => (limit === -1 ? 'Unlimited' : `${limit}`)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4A017' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[28px] font-bold"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
          >
            Billing
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Manage your subscription and billing
          </p>
        </div>
        {currentPlan !== 'free' && (
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              border: '1px solid rgba(212,160,23,0.12)',
              color: '#A8A29E',
              backgroundColor: 'transparent',
              fontFamily: 'var(--font-dmsans)',
              opacity: portalLoading ? 0.6 : 1,
            }}
          >
            {portalLoading ? (
              <Loader2 size={14} className="animate-spin" style={{ color: '#6B6560' }} />
            ) : (
              <ExternalLink size={14} style={{ color: '#6B6560' }} />
            )}
            Manage Billing
          </button>
        )}
      </div>

      {/* Current Plan */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <CreditCard size={18} style={{ color: '#D4A017' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              Current Plan
            </h2>
          </div>
          <div className="flex items-baseline gap-1">
            {currentPlanData.price === -1 ? (
              <span
                className="text-[28px] font-bold"
                style={{ color: '#D4A017', fontFamily: 'var(--font-display)' }}
              >
                Custom
              </span>
            ) : (
              <>
                <span
                  className="text-[28px] font-bold"
                  style={{ color: '#D4A017', fontFamily: 'var(--font-display)' }}
                >
                  ${currentPlanData.price}
                </span>
                <span
                  className="text-sm"
                  style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                >
                  /month
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span
            className="text-[13px] font-bold px-3 py-1 rounded-md"
            style={{ backgroundColor: '#D4A017', color: '#0A0908', fontFamily: 'var(--font-dmsans)' }}
          >
            {currentPlanData.name}
          </span>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: isCanceled ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
              color: isCanceled ? '#F87171' : '#34D399',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {isCanceled ? 'Canceling' : 'Active'}
          </span>
        </div>

        <div className="flex flex-wrap gap-4">
          {currentPlanData.features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check size={14} style={{ color: '#D4A017' }} />
              <span
                className="text-[13px]"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>

        {subscription?.currentPeriodEnd && (
          <p
            className="text-xs mt-4"
            style={{ color: '#5A5248', fontFamily: 'var(--font-dmsans)' }}
          >
            {isCanceled ? 'Access until: ' : 'Next billing date: '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}

        {currentPlan !== 'free' && !isCanceled && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="mt-4 text-xs underline transition-colors"
            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          >
            Cancel subscription
          </button>
        )}
      </div>

      {/* Usage */}
      {usage && (
        <div>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
          >
            Usage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <UsageStat
              icon={<BarChart3 size={16} style={{ color: '#D4A017' }} />}
              label="Active Tours"
              value={usage.toursCreated}
              limit={usage.tourLimit}
            />
            <UsageStat
              icon={<ImageIcon size={16} style={{ color: '#2DD4BF' }} />}
              label="Total Scenes"
              value={usage.totalScenes}
              limit={null}
            />
            <UsageStat
              icon={<Zap size={16} style={{ color: '#FB7A54' }} />}
              label="AI Credits Used"
              value={usage.aiCreditsUsed}
              limit={usage.aiCreditLimit}
            />
          </div>
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex items-center gap-3 justify-center">
        <span
          className="text-sm font-medium"
          style={{
            color: billingInterval === 'monthly' ? '#F5F3EF' : '#6B6560',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Monthly
        </span>
        <button
          onClick={() => setBillingInterval((prev) => (prev === 'monthly' ? 'annual' : 'monthly'))}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{
            backgroundColor: billingInterval === 'annual' ? '#D4A017' : '#2E2A24',
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{
              left: billingInterval === 'annual' ? '22px' : '2px',
            }}
          />
        </button>
        <span
          className="text-sm font-medium"
          style={{
            color: billingInterval === 'annual' ? '#F5F3EF' : '#6B6560',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          Annual
        </span>
        {billingInterval === 'annual' && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'rgba(52,211,153,0.12)',
              color: '#34D399',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Save ~20%
          </span>
        )}
      </div>

      {/* Available Plans */}
      <div>
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {DISPLAYABLE_PLANS.map((dp) => {
            const plan = PLANS[dp.key]
            const cta = getCtaForPlan(dp.key)
            const isCurrent = dp.key === currentPlan
            const price = billingInterval === 'annual' ? plan.annualPrice : plan.price
            const isLoadingThis = loadingPlan === dp.key

            return (
              <div
                key={dp.key}
                className="rounded-xl p-6 relative flex flex-col"
                style={{
                  backgroundColor: isCurrent ? '#1B1916' : '#12100E',
                  border: isCurrent
                    ? '1px solid rgba(212,160,23,0.3)'
                    : '1px solid rgba(212,160,23,0.12)',
                }}
              >
                {isCurrent && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor: 'rgba(52,211,153,0.12)',
                      color: '#34D399',
                      fontFamily: 'var(--font-dmsans)',
                    }}
                  >
                    Current
                  </span>
                )}

                <h3
                  className="text-lg font-bold"
                  style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
                >
                  {plan.name}
                </h3>

                <div className="mt-2 mb-5">
                  {price === 0 ? (
                    <span
                      className="text-2xl font-black"
                      style={{ color: isCurrent ? '#D4A017' : '#F5F3EF', fontFamily: 'var(--font-display)' }}
                    >
                      Free
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-2xl font-black"
                        style={{
                          color: isCurrent ? '#D4A017' : '#F5F3EF',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        ${billingInterval === 'annual' ? Math.round(price / 12) : price}
                      </span>
                      <span className="text-sm" style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
                        /mo
                      </span>
                      {billingInterval === 'annual' && (
                        <span
                          className="block text-xs mt-0.5"
                          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                        >
                          ${price}/year
                        </span>
                      )}
                    </>
                  )}
                </div>

                <ul className="flex-1 flex flex-col gap-2.5 mb-6">
                  {dp.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-[13px]"
                      style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
                    >
                      <Check size={14} style={{ color: '#34D399', flexShrink: 0 }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor:
                      cta.style === 'upgrade'
                        ? '#D4A017'
                        : 'transparent',
                    color:
                      cta.style === 'upgrade'
                        ? '#0A0908'
                        : cta.style === 'current'
                          ? '#34D399'
                          : '#6B6560',
                    border:
                      cta.style === 'upgrade'
                        ? 'none'
                        : cta.style === 'current'
                          ? '1px solid rgba(52,211,153,0.2)'
                          : '1px solid rgba(107,101,96,0.2)',
                    fontFamily: 'var(--font-dmsans)',
                    opacity: isLoadingThis ? 0.7 : 1,
                    cursor: cta.disabled ? 'default' : 'pointer',
                  }}
                  disabled={cta.disabled || isLoadingThis}
                  onClick={() => {
                    if (cta.style === 'downgrade') {
                      handleManageBilling()
                    } else if (cta.style === 'upgrade') {
                      handleUpgrade(dp.key)
                    }
                  }}
                >
                  {isLoadingThis ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      {cta.label}
                      {!cta.disabled && <ArrowRight size={14} />}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full mx-4 relative"
            style={{ backgroundColor: '#1B1916', border: '1px solid rgba(212,160,23,0.2)' }}
          >
            <button
              onClick={() => setShowCancelDialog(false)}
              className="absolute top-4 right-4"
              style={{ color: '#6B6560' }}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} style={{ color: '#FBBF24' }} />
              <h3
                className="text-lg font-semibold"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
              >
                Cancel Subscription
              </h3>
            </div>

            <p
              className="text-sm mb-2"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              Are you sure you want to cancel your <strong style={{ color: '#F5F3EF' }}>{currentPlanData.name}</strong> plan?
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              You will retain access to your current features until the end of your billing period.
              After that, your account will revert to the Free plan.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: '1px solid rgba(212,160,23,0.12)',
                  color: '#A8A29E',
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(248,113,113,0.12)',
                  color: '#F87171',
                  border: '1px solid rgba(248,113,113,0.2)',
                  fontFamily: 'var(--font-dmsans)',
                  opacity: cancelLoading ? 0.6 : 1,
                }}
              >
                {cancelLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageStat({
  icon,
  label,
  value,
  limit,
}: {
  icon: React.ReactNode
  label: string
  value: number
  limit: number | null
}) {
  const percentage = limit && limit !== -1 ? Math.min((value / limit) * 100, 100) : null
  const isNearLimit = percentage !== null && percentage >= 80

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#12100E', border: '1px solid rgba(212,160,23,0.12)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span
          className="text-xs font-medium"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-bold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
        {limit !== null && (
          <span
            className="text-sm"
            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          >
            / {limit === -1 ? 'Unlimited' : limit}
          </span>
        )}
      </div>
      {percentage !== null && (
        <div
          className="w-full h-1.5 rounded-full mt-3"
          style={{ backgroundColor: '#2E2A24' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: isNearLimit ? '#FBBF24' : '#D4A017',
            }}
          />
        </div>
      )}
    </div>
  )
}
