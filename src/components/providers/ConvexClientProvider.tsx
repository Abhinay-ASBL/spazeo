'use client'

import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { ConvexReactClient } from 'convex/react'
import { type ReactNode } from 'react'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export const isProvidersConfigured =
  convexUrl && (convexUrl.startsWith('https://') || convexUrl.startsWith('http://')) && clerkKey && clerkKey.startsWith('pk_')

const convex = isProvidersConfigured ? new ConvexReactClient(convexUrl as string) : null

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex || !isProvidersConfigured) {
    return <>{children}</>
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      appearance={{
        variables: {
          colorPrimary: '#D4A017',
          colorBackground: '#12100E',
          colorText: '#F5F3EF',
          colorInputBackground: '#1B1916',
          colorInputText: '#F5F3EF',
          borderRadius: '8px',
        },
        elements: {
          formButtonPrimary: 'bg-[#D4A017] hover:bg-[#E5B120] text-[#0A0908]',
          card: 'bg-[#12100E] border border-[rgba(212,160,23,0.12)]',
          headerTitle: 'text-[#F5F3EF]',
          headerSubtitle: 'text-[#A8A29E]',
          socialButtonsBlockButton:
            'border-[rgba(212,160,23,0.12)] text-[#A8A29E] hover:bg-[#1B1916]',
          formFieldLabel: 'text-[#A8A29E]',
          formFieldInput:
            'bg-[#1B1916] border-[rgba(212,160,23,0.12)] text-[#F5F3EF]',
          footerActionLink: 'text-[#D4A017] hover:text-[#E5B120]',
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
