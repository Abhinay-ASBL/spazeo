'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X, Settings } from 'lucide-react'

interface CookiePreferences {
  essential: boolean // always true
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = 'spazeo_cookie_consent'

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function storePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const stored = getStoredPreferences()
    if (!stored) {
      // first-time visitor
      setVisible(true)
    } else {
      setPreferences(stored)
    }
  }, [])

  const handleAcceptAll = useCallback(() => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    storePreferences(prefs)
    setPreferences(prefs)
    setVisible(false)
    setShowModal(false)
  }, [])

  const handleSavePreferences = useCallback(() => {
    storePreferences(preferences)
    setVisible(false)
    setShowModal(false)
  }, [preferences])

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
                We use cookies to enhance your experience, analyze site traffic,
                and for marketing purposes. By clicking &quot;Accept All,&quot;
                you consent to our use of cookies. Read our{' '}
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

            <div className="flex items-center gap-3 shrink-0">
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
                onClick={handleAcceptAll}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                }}
              >
                Accept All
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
              {/* Essential */}
              <CookieToggle
                label="Essential"
                description="Required for authentication, security, and basic platform functionality."
                checked={true}
                disabled
                onChange={() => {}}
              />

              {/* Analytics */}
              <CookieToggle
                label="Analytics"
                description="Help us understand how visitors use our platform to improve the experience."
                checked={preferences.analytics}
                onChange={(val) =>
                  setPreferences((p) => ({ ...p, analytics: val }))
                }
              />

              {/* Marketing */}
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
                Accept All
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
