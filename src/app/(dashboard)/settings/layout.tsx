import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Spazeo account, security, and notification preferences.',
  openGraph: {
    title: 'Settings — Spazeo',
    description: 'Manage your Spazeo account, security, and notification preferences.',
    siteName: 'Spazeo',
  },
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
