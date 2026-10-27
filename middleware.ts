import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const isClerkConfigured = clerkKey && clerkKey.startsWith('pk_')

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/tours(.*)',
  '/floor-plans(.*)',
  '/analytics(.*)',
  '/leads(.*)',
  '/settings(.*)',
  '/billing(.*)',
  '/onboarding(.*)',
  '/tour/(.*)/sales(.*)',
  // Dashboard building routes; /buildings/:id/view and /buildings/legacy-towers/view stay public
  '/buildings',
  '/buildings/(.*)/exterior(.*)',
  '/buildings/(.*)/map(.*)',
  '/buildings/legacy-towers/admin(.*)',
  '/buildings/legacy-towers/edit-markers(.*)',
])

// When Clerk is properly configured, use Clerk middleware for route protection
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

// When Clerk is NOT configured (placeholder keys), allow all routes through
function passthroughHandler() {
  return NextResponse.next()
}

export default isClerkConfigured ? clerkHandler : passthroughHandler

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
