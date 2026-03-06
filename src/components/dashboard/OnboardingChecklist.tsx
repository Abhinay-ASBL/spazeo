'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
  Map,
  Image,
  Sparkles,
  Globe,
  Eye,
  ArrowRight,
} from 'lucide-react'

interface StepConfig {
  key: string
  title: string
  description: string
  actionLabel: string
  actionHref: string
  icon: typeof UserCheck
}

const STEPS: StepConfig[] = [
  {
    key: 'profileComplete',
    title: 'Complete your profile',
    description: 'Set up your account details and preferences.',
    actionLabel: 'Go to Settings',
    actionHref: '/settings',
    icon: UserCheck,
  },
  {
    key: 'hasFirstTour',
    title: 'Create your first tour',
    description: 'Start by creating a new virtual tour project.',
    actionLabel: 'Create Tour',
    actionHref: '/tours?create=true',
    icon: Map,
  },
  {
    key: 'hasScenes',
    title: 'Upload panorama scenes',
    description: 'Add 360-degree panorama images to your tour.',
    actionLabel: 'Upload Scenes',
    actionHref: '/tours',
    icon: Image,
  },
  {
    key: 'hasAiAnalysis',
    title: 'Run AI scene analysis',
    description: 'Let AI analyze your scenes for smart suggestions.',
    actionLabel: 'Analyze Scenes',
    actionHref: '/tours',
    icon: Sparkles,
  },
  {
    key: 'hasPublishedTour',
    title: 'Publish your first tour',
    description: 'Make your tour live and shareable with the world.',
    actionLabel: 'Publish Tour',
    actionHref: '/tours',
    icon: Globe,
  },
  {
    key: 'hasFirstView',
    title: 'Get your first view',
    description: 'Share your published tour and track visitor engagement.',
    actionLabel: 'View Analytics',
    actionHref: '/analytics',
    icon: Eye,
  },
]

export function OnboardingChecklist() {
  const progress = useQuery(api.users.getOnboardingProgress)
  const dismissChecklist = useMutation(api.users.dismissChecklist)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [prevCompleted, setPrevCompleted] = useState<number | null>(null)

  const steps = progress?.steps
  const completedCount = steps
    ? Object.values(steps).filter(Boolean).length
    : 0
  const allComplete = completedCount === 6

  // Trigger confetti when all 6 steps become complete
  useEffect(() => {
    if (prevCompleted !== null && prevCompleted < 6 && completedCount === 6) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(timer)
    }
    if (completedCount !== null) {
      setPrevCompleted(completedCount)
    }
  }, [completedCount, prevCompleted])

  // Don't render while loading, if dismissed, or if no progress data
  if (progress === undefined || progress === null || progress.checklistDismissed) {
    return null
  }

  function handleDismiss() {
    dismissChecklist()
  }

  return (
    <div className="relative">
      {/* Confetti animation */}
      {showConfetti && (
        <div
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1.5}s`,
                backgroundColor: ['#D4A017', '#2DD4BF', '#FB7A54', '#34D399', '#F5F3EF'][
                  i % 5
                ],
              }}
            />
          ))}
          <style>{`
            @keyframes confetti-fall {
              0% {
                transform: translateY(-10vh) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(110vh) rotate(720deg);
                opacity: 0;
              }
            }
            .confetti-piece {
              position: absolute;
              top: 0;
              width: 8px;
              height: 8px;
              border-radius: 2px;
              animation: confetti-fall 3s ease-out forwards;
            }
          `}</style>
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 cursor-pointer"
          style={{ borderBottom: isCollapsed ? 'none' : '1px solid rgba(212,160,23,0.08)' }}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(212,160,23,0.12)' }}
            >
              {allComplete ? (
                <CheckCircle2 size={16} style={{ color: '#34D399' }} />
              ) : (
                <span
                  className="text-xs font-bold"
                  style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
                >
                  {completedCount}
                </span>
              )}
            </div>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
              >
                {allComplete ? 'Setup Complete!' : 'Getting Started'}
              </h3>
              <p
                className="text-xs mt-0.5"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                {completedCount} of 6 steps complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress bar (mini) */}
            <div
              className="hidden sm:block h-2 w-24 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / 6) * 100}%`,
                  backgroundColor: allComplete ? '#34D399' : '#D4A017',
                }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss()
              }}
              className="p-1 rounded-md transition-colors hover:bg-[rgba(212,160,23,0.08)]"
              aria-label="Dismiss checklist"
            >
              <X size={14} style={{ color: '#6B6560' }} />
            </button>
            {isCollapsed ? (
              <ChevronDown size={16} style={{ color: '#6B6560' }} />
            ) : (
              <ChevronUp size={16} style={{ color: '#6B6560' }} />
            )}
          </div>
        </div>

        {/* Steps */}
        {!isCollapsed && steps && (
          <div className="px-4 py-3">
            {STEPS.map((step) => {
              const isComplete = steps[step.key as keyof typeof steps]
              const StepIcon = step.icon

              return (
                <div
                  key={step.key}
                  className="flex items-start gap-3 px-2 py-3 rounded-lg transition-colors"
                  style={{
                    opacity: isComplete ? 0.6 : 1,
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {isComplete ? (
                      <CheckCircle2 size={18} style={{ color: '#34D399' }} />
                    ) : (
                      <Circle size={18} style={{ color: '#6B6560' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StepIcon size={13} style={{ color: isComplete ? '#34D399' : '#A8A29E' }} />
                      <span
                        className="text-[13px] font-medium"
                        style={{
                          color: isComplete ? '#A8A29E' : '#F5F3EF',
                          fontFamily: 'var(--font-dmsans)',
                          textDecoration: isComplete ? 'line-through' : 'none',
                        }}
                      >
                        {step.title}
                      </span>
                    </div>
                    <p
                      className="text-[12px] mt-0.5 ml-[21px]"
                      style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
                    >
                      {step.description}
                    </p>
                  </div>
                  {!isComplete && (
                    <Link
                      href={step.actionHref}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 hover:shadow-[0_0_12px_rgba(212,160,23,0.15)]"
                      style={{
                        backgroundColor: 'rgba(212,160,23,0.1)',
                        color: '#D4A017',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {step.actionLabel}
                      <ArrowRight size={11} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
