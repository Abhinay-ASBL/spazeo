import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#0A0908' }}
    >
      <p
        className="text-[120px] font-bold leading-none md:text-[160px]"
        style={{ fontFamily: 'var(--font-jakarta)', color: '#D4A017' }}
      >
        404
      </p>

      <h1
        className="mt-4 text-2xl font-semibold md:text-3xl"
        style={{ fontFamily: 'var(--font-jakarta)', color: '#F5F3EF' }}
      >
        Page Not Found
      </h1>

      <p
        className="mt-2 text-base"
        style={{ fontFamily: 'var(--font-dmsans)', color: '#A8A29E' }}
      >
        The page you&apos;re looking for doesn&apos;t exist.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-lg px-6 text-sm font-bold transition-colors hover:opacity-90"
        style={{
          fontFamily: 'var(--font-dmsans)',
          backgroundColor: '#D4A017',
          color: '#0A0908',
        }}
      >
        Go Home
      </Link>
    </div>
  )
}
