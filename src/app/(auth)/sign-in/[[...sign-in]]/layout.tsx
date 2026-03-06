import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to your Spazeo account to manage your 360° virtual tours, analytics, and leads.',
  openGraph: {
    title: 'Sign In — Spazeo',
    description:
      'Sign in to your Spazeo account to manage your 360° virtual tours, analytics, and leads.',
    siteName: 'Spazeo',
  },
}

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
