import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up',
  description:
    'Create your free Spazeo account and start building immersive AI-powered 360° virtual tours in minutes.',
  openGraph: {
    title: 'Sign Up — Spazeo',
    description:
      'Create your free Spazeo account and start building immersive AI-powered 360° virtual tours in minutes.',
    siteName: 'Spazeo',
  },
}

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
