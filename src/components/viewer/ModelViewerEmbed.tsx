'use client'

import { useEffect, useRef, useState } from 'react'

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment React 19's JSX.IntrinsicElements
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          poster?: string
          alt?: string
          ar?: boolean
          'camera-controls'?: boolean
          'auto-rotate'?: boolean
          'auto-rotate-delay'?: string | number
          'rotation-per-second'?: string
          'disable-zoom'?: boolean
          exposure?: string | number
          'shadow-intensity'?: string | number
          'interaction-prompt'?: string
          loading?: 'auto' | 'lazy' | 'eager'
          reveal?: 'auto' | 'interaction' | 'manual'
        },
        HTMLElement
      >
    }
  }
}

export function ModelViewerEmbed({
  src,
  poster,
  alt,
  className,
  onError,
}: {
  src: string
  poster?: string
  alt?: string
  className?: string
  onError?: () => void
}) {
  const elRef = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('@google/model-viewer')
      .then(() =>
        customElements.whenDefined('model-viewer').then(() => {
          if (!cancelled) setReady(true)
        })
      )
      .catch((err) => {
        console.error('Failed to load model-viewer', err)
        if (!cancelled) onError?.()
      })
    return () => {
      cancelled = true
    }
  }, [onError])

  useEffect(() => {
    const el = elRef.current
    if (!el || !onError) return
    const handler = () => onError()
    el.addEventListener('error', handler)

    // Belt-and-suspenders: model-viewer's internal loader sometimes throws
    // inside an unawaited promise chain instead of dispatching 'error'.
    const onRejection = (e: PromiseRejectionEvent) => {
      if (String(e.reason).includes('GLTFLoader')) onError()
    }
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      el.removeEventListener('error', handler)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [onError])

  return (
    <model-viewer
      ref={elRef}
      // Withheld until the custom element has fully upgraded — assigning `src`
      // before then races the bundled meshopt WASM decoder's async init and
      // throws "setMeshoptDecoder must be called before loading compressed files".
      src={ready ? src : undefined}
      poster={poster}
      alt={alt ?? 'Interactive 3D model'}
      camera-controls
      auto-rotate
      auto-rotate-delay="0"
      rotation-per-second="18deg"
      disable-zoom
      shadow-intensity="1"
      exposure="1"
      loading="eager"
      reveal="auto"
      className={className}
      style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
    />
  )
}
