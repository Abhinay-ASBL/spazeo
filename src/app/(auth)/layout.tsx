import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Spazeo — AI-Powered 360° Virtual Tours',
    template: '%s — Spazeo',
  },
  description:
    'Sign in or create your Spazeo account to start building immersive AI-powered 360° virtual tours.',
  openGraph: {
    siteName: 'Spazeo',
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
