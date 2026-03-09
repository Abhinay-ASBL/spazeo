import type { NextConfig } from 'next'
import { resolve } from 'path'

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://clerk.spazeo.io https://*.clerk.accounts.dev https://challenges.cloudflare.com https://js.stripe.com https://us.i.posthog.com https://sparkjs.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.convex.cloud https://img.clerk.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://picsum.photos https://images.unsplash.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' data: https://*.convex.cloud wss://*.convex.cloud ws://127.0.0.1:3210 ws://localhost:* http://127.0.0.1:3210 http://localhost:* https://clerk.spazeo.io https://*.clerk.accounts.dev https://api.stripe.com https://us.i.posthog.com https://sparkjs.dev https://sparkjsdev.github.io",
      "frame-src https://challenges.cloudflare.com https://js.stripe.com https://*.clerk.accounts.dev https://www.youtube.com https://youtube.com https://player.vimeo.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Prevent spark.js WASM/Worker from being bundled server-side
  serverExternalPackages: ['@sparkjsdev/spark'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  typescript: {
    // Convex CLI handles type-checking for convex/ files separately.
    // The generated api.d.ts imports all convex source files, which creates
    // circular type references that break the Next.js build.
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '*.convex.cloud',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3210',
      },
    ],
  },
}

export default nextConfig
