'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser, useClerk } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  LayoutDashboard,
  Compass,
  Map,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tours', href: '/tours', icon: Compass },
  { label: 'Floor Plans', href: '/floor-plans', icon: Map },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Leads', href: '/leads', icon: Users },
]

const BOTTOM_NAV: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Billing', href: '/billing', icon: CreditCard },
]

function NavLinkItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick?: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer',
        isActive
          ? 'bg-[rgba(212,160,23,0.08)] text-[#D4A017] font-medium'
          : 'text-[#A8A29E] hover:text-[#F5F3EF] hover:bg-[rgba(212,160,23,0.06)]'
      )}
      style={{ fontFamily: 'var(--font-dmsans)' }}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        className={cn('shrink-0', isActive ? 'text-[#D4A017]' : 'text-[#6B6560]')}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  )
}

function SidebarContent({
  pathname,
  onNavClick,
  plan,
}: {
  pathname: string
  onNavClick?: () => void
  plan?: string
}) {
  const { user } = useUser()
  const { signOut } = useClerk()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Logo */}
      <div className="px-1 mb-6">
        <Logo href="/dashboard" />
      </div>

      {/* Main nav items */}
      <nav className="flex flex-col gap-1" aria-label="Dashboard navigation">
        {MAIN_NAV.map((item) => (
          <NavLinkItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav items */}
      <nav className="flex flex-col gap-1 mb-4" aria-label="Settings navigation">
        {BOTTOM_NAV.map((item) => (
          <NavLinkItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="h-px bg-[rgba(212,160,23,0.12)] mb-4" />

      {/* User section */}
      <div className="flex items-center gap-3 px-1 py-2">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-9 h-9',
            },
          }}
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[13px] font-medium text-[#F5F3EF] truncate"
            style={{ fontFamily: 'var(--font-dmsans)' }}
          >
            {user?.fullName ?? 'User'}
          </span>
          <span
            className="inline-block w-fit text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(212,160,23,0.13)',
              color: '#D4A017',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {plan ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` : 'Free Plan'}
          </span>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={() => signOut({ redirectUrl: '/' })}
        className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-sm text-[#A8A29E] transition-all duration-200 hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.06)] cursor-pointer"
        style={{ fontFamily: 'var(--font-dmsans)' }}
        aria-label="Sign out"
      >
        <LogOut
          size={20}
          strokeWidth={1.5}
          className="shrink-0 text-[#6B6560]"
          aria-hidden="true"
        />
        Log Out
      </button>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentUser = useQuery(api.users.getCurrent)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 w-[240px] h-full flex-col z-30 bg-[#12100E] border-r border-[rgba(212,160,23,0.12)]"
        aria-label="Dashboard sidebar"
      >
        <SidebarContent pathname={pathname} plan={currentUser?.plan} />
      </aside>

      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-3.5 left-4 z-40 flex items-center justify-center w-9 h-9 rounded-xl backdrop-blur-xl transition-colors duration-200 bg-[rgba(18,16,14,0.88)] border border-[rgba(212,160,23,0.12)] text-[#A8A29E]"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 backdrop-blur-sm md:hidden"
              style={{ backgroundColor: 'rgba(10, 9, 8, 0.60)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              key="sidebar-drawer"
              id="mobile-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
              className="fixed left-0 top-0 z-50 w-[240px] h-full flex flex-col md:hidden bg-[#12100E] border-r border-[rgba(212,160,23,0.12)]"
            >
              <button
                className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-xl transition-colors duration-200 text-[#6B6560] hover:text-[#F5F3EF]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={18} strokeWidth={1.5} />
              </button>

              <SidebarContent
                pathname={pathname}
                onNavClick={() => setMobileOpen(false)}
                plan={currentUser?.plan}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar
