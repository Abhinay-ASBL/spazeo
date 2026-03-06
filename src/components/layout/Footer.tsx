import Link from 'next/link'
import { Twitter, Linkedin, Instagram } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Integrations', href: '/integrations' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
]

const SOCIAL_LINKS = [
  { label: 'X (Twitter)', href: 'https://x.com/spazeo', icon: Twitter },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/spazeo', icon: Linkedin },
  { label: 'Instagram', href: 'https://instagram.com/spazeo', icon: Instagram },
]

export function Footer() {
  return (
    <footer
      aria-label="Site footer"
      className="bg-[#12100E] border-t border-[rgba(212,160,23,0.12)]"
    >
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px] pt-12 pb-10">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          {/* Brand column */}
          <div className="max-w-[300px]">
            <Logo href="/" />
            <p
              className="text-[13px] leading-relaxed text-[#A8A29E] mt-4"
              style={{ fontFamily: 'var(--font-dmsans)' }}
            >
              Step Inside Any Space. Create immersive 360&deg; virtual tours with AI-powered features.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h3
                  className="text-[13px] font-semibold text-[#F5F3EF] mb-3"
                  style={{ fontFamily: 'var(--font-dmsans)' }}
                >
                  {column.heading}
                </h3>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-[#A8A29E] transition-colors duration-200 hover:text-[#F5F3EF]"
                        style={{ fontFamily: 'var(--font-dmsans)' }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 lg:mx-[60px] h-px bg-[rgba(212,160,23,0.12)]" />

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-[60px] py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className="text-xs text-[#6B6560]"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            &copy; {new Date().getFullYear()} Spazeo. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Spazeo on ${social.label}`}
                  className="text-[#6B6560] transition-colors duration-200 hover:text-[#D4A017]"
                >
                  <Icon size={18} />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
