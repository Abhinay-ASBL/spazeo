import type { Metadata } from 'next'
import { DashboardLayoutClient } from '@/components/dashboard/DashboardLayoutClient'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard — Spazeo',
    template: '%s | Spazeo',
  },
  description: 'Manage your virtual tours, analytics, leads, and account settings on Spazeo.',
  openGraph: {
    title: 'Dashboard — Spazeo',
    description: 'Manage your virtual tours, analytics, leads, and account settings on Spazeo.',
    siteName: 'Spazeo',
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
