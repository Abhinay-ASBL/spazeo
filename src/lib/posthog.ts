/**
 * PostHog analytics abstraction layer.
 *
 * Works without posthog-js installed — checks for `window.posthog` at runtime
 * so the library can be loaded via script tag or activated later.
 * Gracefully no-ops when PostHog is not available (dev mode, SSR).
 */

interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void
  identify: (userId: string, traits?: Record<string, unknown>) => void
  reset: () => void
  register: (properties: Record<string, unknown>) => void
}

function getPostHog(): PostHogInstance | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ph = (window as any).posthog as PostHogInstance | undefined
  return ph ?? null
}

/**
 * Track a named event with optional properties.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  const ph = getPostHog()
  if (!ph) return
  ph.capture(name, properties)
}

/**
 * Identify a user by ID and attach traits (email, name, plan, etc.).
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  const ph = getPostHog()
  if (!ph) return
  ph.identify(userId, traits)
}

/**
 * Reset PostHog state (call on sign-out).
 */
export function resetUser(): void {
  const ph = getPostHog()
  if (!ph) return
  ph.reset()
}

/**
 * Register super-properties that are sent with every subsequent event.
 */
export function registerProperties(properties: Record<string, unknown>): void {
  const ph = getPostHog()
  if (!ph) return
  ph.register(properties)
}
