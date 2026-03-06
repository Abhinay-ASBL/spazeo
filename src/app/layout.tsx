import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import { CookieConsent } from '@/components/ui/CookieConsent'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dmsans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://spazeo.io'),
  title: {
    default: 'Spazeo — Step Inside Any Space',
    template: '%s | Spazeo',
  },
  description:
    'AI-powered 360° virtual tours for real estate professionals. Upload panoramas, add hotspots, publish — in minutes.',
  keywords: ['virtual tour', '360 tour', 'real estate', 'AI staging', 'panorama', 'proptech'],
  openGraph: {
    title: 'Spazeo — Step Inside Any Space',
    description: 'AI-powered 360° virtual tours for real estate professionals. Upload panoramas, add hotspots, publish — in minutes.',
    siteName: 'Spazeo',
    type: 'website',
    locale: 'en_US',
    url: 'https://spazeo.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spazeo — Step Inside Any Space',
    description: 'AI-powered 360° virtual tours for real estate professionals. Upload panoramas, add hotspots, publish — in minutes.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmSans.variable}`}>
      <body className="antialiased font-body">
        <ConvexClientProvider>
          <PostHogProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1B1916',
                  color: '#F5F3EF',
                  border: '1px solid rgba(212,160,23,0.18)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-dmsans), DM Sans, sans-serif',
                },
                success: { iconTheme: { primary: '#D4A017', secondary: '#1B1916' } },
                error: { iconTheme: { primary: '#EF4444', secondary: '#1B1916' } },
              }}
            />
            {children}
            <CookieConsent />
          </PostHogProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
