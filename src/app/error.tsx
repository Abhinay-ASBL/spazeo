'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#0A0908' }}
    >
      <AlertTriangle size={48} style={{ color: '#F87171' }} />

      <h1
        className="mt-6 text-2xl font-semibold md:text-3xl"
        style={{ fontFamily: 'var(--font-jakarta)', color: '#F5F3EF' }}
      >
        Something went wrong
      </h1>

      <p
        className="mt-2 max-w-md text-center text-sm"
        style={{ fontFamily: 'var(--font-dmsans)', color: '#6B6560' }}
      >
        {error.message || 'An unexpected error occurred.'}
      </p>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex h-10 cursor-pointer items-center rounded-lg px-6 text-sm font-bold transition-colors hover:opacity-90"
          style={{
            fontFamily: 'var(--font-dmsans)',
            backgroundColor: '#D4A017',
            color: '#0A0908',
          }}
        >
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg border-[1.5px] px-6 text-sm font-bold transition-colors hover:opacity-80"
          style={{
            fontFamily: 'var(--font-dmsans)',
            borderColor: '#D4A017',
            color: '#D4A017',
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
