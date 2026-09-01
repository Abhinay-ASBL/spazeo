'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X, Settings } from 'lucide-react'
import { useMutation } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { isProvidersConfigured } from '@/components/providers/ConvexClientProvider'

export interface CookiePreferences {
  essential: boolean // always true
  analytics: boolean
  fingerprinting: boolean
  marketing: boolean
}

export const STORAGE_KEY = 'spazeo_cookie_consent'
export const POLICY_VERSION = '2026-08-26'
export const CONSENT_UPDATED_EVENT = 'spazeo:consent-updated'
const SESSION_STORAGE_KEY = 'spz_sid'

// ponytail: codegen may lag parallel agent; FunctionReference works before api.* exists
const visitorConsentsGrant = makeFunctionReference<'mutation'>(
  'visitorConsents:grant'
)

export function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>
    return {
      essential: true,
      analytics: !!parsed.analytics,
      fingerprinting: !!parsed.fingerprinting,
      marketing: !!parsed.marketing,
    }
  } catch {
    return null
  }
}

function storePreferencesLocal(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function notifyConsentUpdated(prefs: CookiePreferences) {
  window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: prefs }))
}

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

type ConsentPurpose =
  | 'essential'
  | 'analytics'
  | 'fingerprinting'
  | 'geolocation'
  | 'marketing'

type GrantFn = (prefs: CookiePreferences) => Promise<void>

/** Public entry — skips Convex hooks when providers are not configured. */
export function CookieConsent() {
  if (!isProvidersConfigured) {
    return <CookieConsentUI persistToConvex={async () => {}} />
  }
  return <CookieConsentWithConvex />
}

function CookieConsentWithConvex() {
  const grantConsent = useMutation(visitorConsentsGrant)

  const persistToConvex = useCallback(
    async (prefs: CookiePreferences) => {
      const sessionId = getOrCreateSessionId()
      const purposes: ConsentPurpose[] = [
        'essential',
        'analytics',
        'fingerprinting',
        'marketing',
      ]
      try {
        await grantConsent({
          sessionId,
          policyVersion: POLICY_VERSION,
          grants: purposes.map((purpose) => ({
            purpose,
            granted:
              purpose === 'essential'
                ? true
                : purpose === 'analytics'
                  ? prefs.analytics
                  : purpose === 'fingerprinting'
                    ? prefs.fingerprinting
                    : prefs.marketing,
          })),
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        })
      } catch {
        /* Convex APIs may still be landing; localStorage remains source of UX truth */
      }
    },
    [grantConsent]
  )

  return <CookieConsentUI persistToConvex={persistToConvex} />
}

function CookieConsentUI({ persistToConvex }: { persistToConvex: GrantFn }) {
  const [visible, setVisible] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    fingerprinting: false,
    marketing: false,
  })

  useEffect(() => {
    const stored = getStoredPreferences()
    if (!stored) {
      // Stored preferences live in localStorage — client-only, post-mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true)
    } else {
      setPreferences(stored)
    }
  }, [])

  const commit = useCallback(
    async (prefs: CookiePreferences) => {
      setPreferences(prefs)
      setVisible(false)
      setShowModal(false)
      storePreferencesLocal(prefs)
      // Convex grant first, then notify so identity resolve runs after audit write
      await persistToConvex(prefs)
      notifyConsentUpdated(prefs)
    },
    [persistToConvex]
  )

  const handleAcceptAll = useCallback(() => {
    void commit({
      essential: true,
      analytics: true,
      fingerprinting: true,
      marketing: true,
    })
  }, [commit])

  const handleEssentialOnly = useCallback(() => {
    void commit({
      essential: true,
      analytics: false,
      fingerprinting: false,
      marketing: false,
    })
  }, [commit])

  const handleSavePreferences = useCallback(() => {
    void commit({ ...preferences, essential: true })
  }, [commit, preferences])

  if (!visible) return null

  return (
    <>
      {/* Banner */}
      {!showModal && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] p-4 md:p-6"
          style={{
            backgroundColor: 'rgba(18, 16, 14, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(212,160,23,0.12)',
          }}
        >
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: '#A8A29E',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                We use cookies for essential site functions and, with your
                consent, analytics and device recognition. By clicking
                &quot;Accept,&quot; you allow analytics and fingerprinting.
                Read our{' '}
                <Link
                  href="/privacy"
                  className="underline transition-colors duration-200"
                  style={{ color: '#D4A017' }}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  color: '#A8A29E',
                  border: '1px solid rgba(212,160,23,0.15)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                <Settings size={14} />
                Manage Preferences
              </button>

              <button
                onClick={handleEssentialOnly}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  color: '#D4A017',
                  border: '1px solid rgba(212,160,23,0.25)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Essential only
              </button>

              <button
                onClick={handleAcceptAll}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{
              backgroundColor: 'rgba(10, 9, 8, 0.8)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setShowModal(false)}
          />

          <div
            className="fixed z-[61] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 rounded-2xl p-8"
            style={{
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.15)',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold"
                style={{
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                }}
              >
                Cookie Preferences
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#6B6560] transition-colors duration-200 hover:text-[#F5F3EF]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <CookieToggle
                label="Essential"
                description="Required for authentication, security, and basic platform functionality."
                checked={true}
                disabled
                onChange={() => {}}
              />

              <CookieToggle
                label="Analytics"
                description="Help us understand how visitors use our platform to improve the experience."
                checked={preferences.analytics}
                onChange={(val) =>
                  setPreferences((p) => ({ ...p, analytics: val }))
                }
              />

              <CookieToggle
                label="Fingerprinting"
                description="Recognizes returning browsers across visits. Used only as a link hint — never as sole identity."
                checked={preferences.fingerprinting}
                onChange={(val) =>
                  setPreferences((p) => ({ ...p, fingerprinting: val }))
                }
              />

              <CookieToggle
                label="Marketing"
                description="Used to deliver relevant advertisements and measure campaign effectiveness."
                checked={preferences.marketing}
                onChange={(val) =>
                  setPreferences((p) => ({ ...p, marketing: val }))
                }
              />
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={handleEssentialOnly}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  color: '#A8A29E',
                  border: '1px solid rgba(212,160,23,0.15)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Essential only
              </button>

              <button
                onClick={handleSavePreferences}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  color: '#D4A017',
                  border: '1px solid rgba(212,160,23,0.25)',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Save Preferences
              </button>

              <button
                onClick={handleAcceptAll}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function CookieToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <p
          className="text-sm font-medium"
          style={{
            color: '#F5F3EF',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {label}
          {disabled && (
            <span
              className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(52,211,153,0.12)',
                color: '#34D399',
              }}
            >
              Always on
            </span>
          )}
        </p>
        <p
          className="text-xs mt-1 leading-relaxed"
          style={{
            color: '#6B6560',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {description}
        </p>
      </div>

      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className="relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 mt-0.5"
        style={{
          backgroundColor: checked
            ? disabled
              ? '#34D399'
              : '#D4A017'
            : 'rgba(212,160,23,0.15)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        aria-label={`Toggle ${label} cookies`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-300"
          style={{
            backgroundColor: checked ? '#0A0908' : '#6B6560',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  )
}

export default CookieConsent
