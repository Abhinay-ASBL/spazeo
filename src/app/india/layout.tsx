import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "India's First AI-Powered Virtual Tour Platform",
  description:
    'Create stunning 360 degree virtual tours with AI features built for the Indian real estate market. INR pricing starting at Rs 0/month.',
  openGraph: {
    title: "Spazeo India — India's First AI-Powered Virtual Tour Platform",
    description:
      'Create stunning 360 degree virtual tours with AI features. INR pricing, local support.',
    siteName: 'Spazeo',
    type: 'website',
    locale: 'en_IN',
  },
}

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
