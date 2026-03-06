'use client'

import { Component, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldOff, Clock, XCircle } from 'lucide-react'

interface AuthErrorInfo {
  title: string
  message: string
  icon: ReactNode
  action?: { label: string; href?: string; onClick?: () => void }
}

function getErrorInfo(error: Error): AuthErrorInfo {
  const msg = error.message?.toLowerCase() ?? ''

  // Popup/window closed
  if (msg.includes('popup') || msg.includes('window closed') || msg.includes('cancelled')) {
    return {
      title: 'Sign-in window closed',
      message: 'The authentication window was closed before completing. Please try again.',
      icon: <XCircle size={28} style={{ color: '#FBBF24' }} />,
      action: { label: 'Try again', onClick: () => window.location.reload() },
    }
  }

  // CSRF mismatch
  if (msg.includes('csrf') || msg.includes('cross-site') || msg.includes('token mismatch')) {
    return {
      title: 'Session verification failed',
      message: 'Your session could not be verified. This usually happens when the page has been open too long. Please refresh and try again.',
      icon: <ShieldOff size={28} style={{ color: '#F87171' }} />,
      action: { label: 'Refresh page', onClick: () => window.location.reload() },
    }
  }

  // Rate limiting
  if (msg.includes('rate') || msg.includes('too many') || msg.includes('throttl')) {
    return {
      title: 'Too many attempts',
      message: 'You have made too many sign-in attempts. Please wait a few minutes before trying again.',
      icon: <Clock size={28} style={{ color: '#FBBF24' }} />,
      action: { label: 'Go to homepage', href: '/' },
    }
  }

  // Revoked permissions / provider error
  if (msg.includes('revoked') || msg.includes('permission') || msg.includes('access_denied') || msg.includes('consent')) {
    return {
      title: 'Access permissions revoked',
      message: 'The required permissions were not granted or have been revoked. Please re-authorize access and try again.',
      icon: <ShieldOff size={28} style={{ color: '#FB7A54' }} />,
      action: { label: 'Try again', onClick: () => window.location.reload() },
    }
  }

  // Suspended / blocked account
  if (msg.includes('suspend') || msg.includes('blocked') || msg.includes('banned') || msg.includes('disabled')) {
    return {
      title: 'Account suspended',
      message: 'Your account has been suspended. Please contact support at support@spazeo.io for assistance.',
      icon: <AlertTriangle size={28} style={{ color: '#F87171' }} />,
      action: { label: 'Contact support', href: 'mailto:support@spazeo.io' },
    }
  }

  // Generic fallback
  return {
    title: 'Authentication error',
    message: 'An unexpected error occurred during authentication. Please try again or contact support if the problem persists.',
    icon: <AlertTriangle size={28} style={{ color: '#F87171' }} />,
    action: { label: 'Try again', onClick: () => window.location.reload() },
  }
}

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('[AuthErrorBoundary]', error)
  }

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    const info = getErrorInfo(this.state.error)

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: '#0A0908' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
          }}
        >
          <div className="flex justify-center mb-5">{info.icon}</div>
          <h2
            className="text-xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
          >
            {info.title}
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-dmsans)', color: '#A8A29E' }}
          >
            {info.message}
          </p>

          <div className="flex flex-col gap-3">
            {info.action && (
              info.action.href ? (
                <Link
                  href={info.action.href}
                  className="inline-flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: '#D4A017',
                    color: '#0A0908',
                    fontFamily: 'var(--font-dmsans)',
                  }}
                >
                  {info.action.label}
                </Link>
              ) : (
                <button
                  onClick={info.action.onClick}
                  className="inline-flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
                  style={{
                    backgroundColor: '#D4A017',
                    color: '#0A0908',
                    fontFamily: 'var(--font-dmsans)',
                    border: 'none',
                  }}
                >
                  <RefreshCw size={14} />
                  {info.action.label}
                </button>
              )
            )}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: '#A8A29E',
                fontFamily: 'var(--font-dmsans)',
                border: '1px solid rgba(212,160,23,0.12)',
              }}
            >
              <ArrowLeft size={14} />
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
