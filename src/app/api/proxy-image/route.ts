import { type NextRequest, NextResponse } from 'next/server'

/**
 * Proxy Convex local-dev storage images to avoid cross-origin issues with
 * Three.js TextureLoader (127.0.0.1:3210 → localhost:3001).
 * Only proxies requests to the local Convex dev server — production Convex
 * cloud URLs (*.convex.cloud) are same-site from Three.js's perspective and
 * don't need proxying.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 })
  }

  // Only allow proxying to local Convex dev server for security
  const parsed = new URL(url)
  const isLocalConvex =
    (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
    parsed.port === '3210' &&
    parsed.pathname.startsWith('/api/storage/')

  if (!isLocalConvex) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return new NextResponse('Image not found', { status: 404 })
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 })
  }
}
