import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enterprise — Virtual Tours at Scale',
  description:
    'Enterprise-grade virtual tour platform with SSO, custom branding, API access, dedicated support, and SLA guarantees. Contact sales for a tailored plan.',
  openGraph: {
    title: 'Spazeo Enterprise — Virtual Tours at Scale',
    description:
      'Enterprise-grade virtual tour platform with SSO, custom branding, API access, and dedicated support.',
    siteName: 'Spazeo',
    type: 'website',
  },
}

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
