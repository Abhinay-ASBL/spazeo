'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '../../../../convex/_generated/api'
import { PLANS } from '@/lib/constants'
import type { UserPlan } from '@/types'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import {
  Map,
  Eye,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
  Globe,
  UserPlus,
  Sparkles,
  ImagePlus,
  Building2,
  Upload,
  BarChart3,
  ArrowRight,
  Rocket,
  Zap,
  FileEdit,
  LayoutGrid,
} from 'lucide-react'

/* ── Helpers ── */

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatViewingTime(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '0m'
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

const ACTIVITY_ICONS: Record<string, typeof Plus> = {
  tour_created: Plus,
  tour_published: Globe,
  lead_captured: UserPlus,
  ai_completed: Sparkles,
  scene_uploaded: ImagePlus,
  building_created: Building2,
  building_published: Building2,
}

const ACTIVITY_COLORS: Record<string, string> = {
  tour_created: '#D4A017',
  tour_published: '#34D399',
  lead_captured: '#2DD4BF',
  ai_completed: '#FB7A54',
  scene_uploaded: '#A8A29E',
  building_created: '#D4A017',
  building_published: '#34D399',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(168,162,158,0.12)', text: '#A8A29E', label: 'Draft' },
  published: { bg: 'rgba(52,211,153,0.12)', text: '#34D399', label: 'Published' },
  archived: { bg: 'rgba(107,101,96,0.12)', text: '#6B6560', label: 'Archived' },
}

/* ── Skeleton Components ── */

function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl px-6 py-5 flex flex-col gap-3"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="h-3 w-20 rounded animate-pulse"
          style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
        />
        <div
          className="h-5 w-5 rounded animate-pulse"
          style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
        />
      </div>
      <div
        className="h-8 w-24 rounded animate-pulse"
        style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
      />
      <div
        className="h-3 w-16 rounded animate-pulse"
        style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
      />
    </div>
  )
}

function TourCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div
        className="h-36 animate-pulse"
        style={{ backgroundColor: 'rgba(212,160,23,0.06)' }}
      />
      <div className="p-4 flex flex-col gap-2">
        <div
          className="h-4 w-3/4 rounded animate-pulse"
          style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
        />
        <div
          className="h-3 w-1/2 rounded animate-pulse"
          style={{ backgroundColor: 'rgba(212,160,23,0.06)' }}
        />
      </div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}
        >
          <div
            className="h-8 w-8 rounded-lg shrink-0 animate-pulse"
            style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
          />
          <div className="flex-1 flex flex-col gap-1.5">
            <div
              className="h-3.5 w-3/4 rounded animate-pulse"
              style={{ backgroundColor: 'rgba(212,160,23,0.08)' }}
            />
            <div
              className="h-2.5 w-16 rounded animate-pulse"
              style={{ backgroundColor: 'rgba(212,160,23,0.06)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Stat Card ── */

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
}: {
  label: string
  value: string
  icon: typeof Map
  trend?: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl px-6 py-5 flex flex-col gap-2 transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.08)]"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[13px]"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          {label}
        </span>
        <Icon size={18} style={{ color: '#6B6560' }} />
      </div>
      <span
        className="text-[32px] font-bold leading-tight"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        {value}
      </span>
      {trend !== undefined && trend !== 0 && (
        <div className="flex items-center gap-1">
          {trend > 0 ? (
            <TrendingUp size={12} style={{ color: '#34D399' }} />
          ) : (
            <TrendingDown size={12} style={{ color: '#F87171' }} />
          )}
          <span
            className="text-xs font-medium"
            style={{
              color: trend > 0 ? '#34D399' : '#F87171',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {trend > 0 ? '+' : ''}{trend}% vs last period
          </span>
        </div>
      )}
      {(trend === undefined || trend === 0) && (
        <div className="h-4" />
      )}
    </Link>
  )
}

/* ── Recent Tour Card ── */

function RecentTourCard({
  tour,
}: {
  tour: {
    _id: string
    title: string
    status: string
    viewCount: number
    _creationTime: number
    slug: string
    tourType?: string
  }
}) {
  const statusStyle = STATUS_STYLES[tour.status] || STATUS_STYLES.draft

  return (
    <Link
      href={`/tours/${tour._id}`}
      className="group rounded-xl overflow-hidden transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.08)]"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        className="h-36 relative flex items-center justify-center"
        style={{ backgroundColor: '#12100E' }}
      >
        <Map size={32} style={{ color: '#2E2A24' }} />
        {/* Status badge */}
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-semibold"
          style={{
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="p-4">
        <h4
          className="text-[14px] font-semibold truncate mb-1 group-hover:text-[#D4A017] transition-colors"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          {tour.title}
        </h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Eye size={12} style={{ color: '#6B6560' }} />
            <span
              className="text-[12px]"
              style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
            >
              {tour.viewCount.toLocaleString()} views
            </span>
          </div>
          <span
            className="text-[11px]"
            style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
          >
            {timeAgo(tour._creationTime)}
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Activity Feed ── */

function ActivityFeed({
  activities,
}: {
  activities: Array<{
    _id: string
    type: string
    message: string
    timestamp: number
    tourId?: string
  }>
}) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Sparkles size={32} style={{ color: '#6B6560' }} />
        <p
          className="mt-3 text-sm text-center"
          style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
        >
          No activity yet. Create your first tour to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {activities.map((activity) => {
        const IconComponent = ACTIVITY_ICONS[activity.type] || Sparkles
        const iconColor = ACTIVITY_COLORS[activity.type] || '#6B6560'

        return (
          <div
            key={activity._id}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-[rgba(212,160,23,0.03)]"
            style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${iconColor}14` }}
            >
              <IconComponent size={15} style={{ color: iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] leading-snug truncate"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
              >
                {activity.message}
              </p>
              <span
                className="text-[11px]"
                style={{ color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}
              >
                {timeAgo(activity.timestamp)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Quick Actions ── */

function QuickActions() {
  const actions = [
    { label: 'Create Tour', icon: Plus, href: '/tours?create=true', color: '#D4A017' },
    { label: 'Upload Panoramas', icon: Upload, href: '/tours?upload=true', color: '#2DD4BF' },
    { label: 'View Analytics', icon: BarChart3, href: '/analytics', color: '#FB7A54' },
    { label: 'Manage Leads', icon: Users, href: '/leads', color: '#A8A29E' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex items-center gap-2.5 px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-[0_0_12px_rgba(212,160,23,0.06)]"
          style={{
            backgroundColor: '#12100E',
            border: '1px solid rgba(212,160,23,0.08)',
          }}
        >
          <action.icon size={16} style={{ color: action.color }} />
          <span
            className="text-[13px] font-medium"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
          >
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  )
}

/* ── Tour Status Breakdown ── */

function TourStatusBreakdown({
  stats,
}: {
  stats: { total: number; draft: number; published: number; archived: number }
}) {
  if (stats.total === 0) return null

  const segments = [
    { label: 'Published', count: stats.published, color: '#34D399' },
    { label: 'Draft', count: stats.draft, color: '#D4A017' },
    { label: 'Archived', count: stats.archived, color: '#6B6560' },
  ]

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <LayoutGrid size={14} style={{ color: '#A8A29E' }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
        >
          Tour Breakdown
        </h3>
      </div>

      {/* Bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'rgba(212,160,23,0.06)' }}>
        {segments.map((seg) =>
          seg.count > 0 ? (
            <div
              key={seg.label}
              className="h-full transition-all duration-500"
              style={{
                width: `${(seg.count / stats.total) * 100}%`,
                backgroundColor: seg.color,
              }}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span
                className="text-[12px]"
                style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
              >
                {seg.label}
              </span>
            </div>
            <span
              className="text-[13px] font-medium"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
            >
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Top Tour Spotlight ── */

function TopTourSpotlight({
  topTour,
}: {
  topTour: { id: string; title: string; viewCount: number; slug: string }
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: '#12100E',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} style={{ color: '#D4A017' }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
        >
          Top Performing Tour
        </span>
      </div>
      <h4
        className="text-[15px] font-semibold truncate"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        {topTour.title}
      </h4>
      <div className="flex items-center gap-1 mt-1.5 mb-4">
        <Eye size={13} style={{ color: '#A8A29E' }} />
        <span
          className="text-[13px]"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          {topTour.viewCount.toLocaleString()} views
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/tours/${topTour.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
          style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
        >
          View Details
          <ArrowRight size={13} />
        </Link>
        <Link
          href={`/tours/${topTour.id}/edit`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
          style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
        >
          <FileEdit size={12} />
          Edit
        </Link>
      </div>
    </div>
  )
}

/* ── Free Tier Usage ── */

function FreeTierUsage({
  plan,
  totalTours,
  aiCreditsUsed,
}: {
  plan: string
  totalTours: number
  aiCreditsUsed: number
}) {
  const planKey = plan as UserPlan
  const planConfig = PLANS[planKey] || PLANS.free
  const tourLimit = planConfig.tourLimit
  const aiCreditLimit = planConfig.aiCredits

  if (tourLimit === -1) return null

  const tourPercent = Math.min((totalTours / tourLimit) * 100, 100)
  const aiPercent = aiCreditLimit > 0 ? Math.min((aiCreditsUsed / aiCreditLimit) * 100, 100) : 0

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        {planConfig.name} Plan Usage
      </h3>

      {/* Tour usage */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[12px]"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Tours
          </span>
          <span
            className="text-[12px] font-medium"
            style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
          >
            {totalTours}/{tourLimit} used
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${tourPercent}%`,
              backgroundColor: tourPercent >= 90 ? '#F87171' : '#D4A017',
            }}
          />
        </div>
      </div>

      {/* AI credits usage */}
      {aiCreditLimit > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[12px]"
              style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
            >
              AI Credits
            </span>
            <span
              className="text-[12px] font-medium"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-dmsans)' }}
            >
              {aiCreditsUsed}/{aiCreditLimit} used
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${aiPercent}%`,
                backgroundColor: aiPercent >= 90 ? '#F87171' : '#2DD4BF',
              }}
            />
          </div>
        </div>
      )}

      <Link
        href="/billing"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-[0_0_16px_rgba(212,160,23,0.2)]"
        style={{
          backgroundColor: 'rgba(212,160,23,0.12)',
          color: '#D4A017',
          fontFamily: 'var(--font-dmsans)',
        }}
      >
        Upgrade Plan
        <ArrowRight size={13} />
      </Link>
    </div>
  )
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center py-20 px-8 text-center"
      style={{
        backgroundColor: '#1B1916',
        border: '1px solid rgba(212,160,23,0.12)',
      }}
    >
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: 'rgba(212,160,23,0.1)' }}
      >
        <Rocket size={28} style={{ color: '#D4A017' }} />
      </div>
      <h2
        className="text-xl font-bold mb-2"
        style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
      >
        Create Your First Virtual Tour
      </h2>
      <p
        className="text-sm max-w-md mb-6"
        style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
      >
        Upload your 360 panorama photos and let our AI transform them into immersive virtual tours. It only takes a few minutes.
      </p>
      <Link
        href="/tours?create=true"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
        style={{
          backgroundColor: '#D4A017',
          color: '#0A0908',
          fontFamily: 'var(--font-dmsans)',
        }}
      >
        <Plus size={18} />
        Create Tour
      </Link>
    </div>
  )
}

/* ── Page Export ── */

export default function DashboardPage() {
  const { user } = useUser()
  const firstName = user?.firstName || 'there'

  const overview = useQuery(api.analytics.getDashboardOverview, { period: '30d' })
  const activity = useQuery(api.activity.getRecent)
  const tourStats = useQuery(api.tours.getStats)
  const recentTours = useQuery(api.tours.getRecent)

  const isLoading = overview === undefined
  const hasTours = overview !== null && overview !== undefined && overview.totalTours > 0
  const showFreeTier =
    overview !== null &&
    overview !== undefined &&
    (overview.plan === 'free' || overview.plan === 'starter')
  const showTopTour =
    overview !== null &&
    overview !== undefined &&
    overview.topTour !== null &&
    overview.publishedTours >= 2

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-[28px] font-bold"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F3EF' }}
          >
            {getGreeting()}, {firstName}
          </h1>
          <p
            className="text-[14px] mt-1"
            style={{ color: '#A8A29E', fontFamily: 'var(--font-dmsans)' }}
          >
            Here is what is happening with your tours today.
          </p>
        </div>
        <Link
          href="/tours?create=true"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(212,160,23,0.25)]"
          style={{
            backgroundColor: '#D4A017',
            color: '#0A0908',
            fontFamily: 'var(--font-dmsans)',
          }}
        >
          <Plus size={18} />
          Create New Tour
        </Link>
      </div>

      {/* ── Onboarding Checklist ── */}
      <OnboardingChecklist />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : overview ? (
          <>
            <StatCard
              label="Total Tours"
              value={overview.totalTours.toLocaleString()}
              icon={Map}
              trend={overview.trends.tours}
              href="/tours"
            />
            <StatCard
              label="Total Views"
              value={overview.totalViews.toLocaleString()}
              icon={Eye}
              trend={overview.trends.views}
              href="/analytics"
            />
            <StatCard
              label="Total Leads"
              value={overview.totalLeads.toLocaleString()}
              icon={Users}
              trend={overview.trends.leads}
              href="/leads"
            />
            <StatCard
              label="Viewing Hours"
              value={formatViewingTime(overview.totalViewingHours, overview.totalViewingMinutes)}
              icon={Clock}
              trend={overview.trends.viewingTime}
              href="/analytics"
            />
          </>
        ) : (
          <>
            <StatCard label="Total Tours" value="0" icon={Map} href="/tours" />
            <StatCard label="Total Views" value="0" icon={Eye} href="/analytics" />
            <StatCard label="Total Leads" value="0" icon={Users} href="/leads" />
            <StatCard label="Viewing Hours" value="0m" icon={Clock} href="/analytics" />
          </>
        )}
      </div>

      {/* ── Empty State (no tours) ── */}
      {!isLoading && !hasTours && <EmptyState />}

      {/* ── Recent Tours ── */}
      {(isLoading || hasTours) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base font-semibold"
              style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
            >
              Recent Tours
            </h2>
            <Link
              href="/tours"
              className="inline-flex items-center gap-1 text-[13px] font-medium transition-colors duration-150"
              style={{ color: '#D4A017', fontFamily: 'var(--font-dmsans)' }}
            >
              View All
              <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentTours === undefined ? (
              <>
                <TourCardSkeleton />
                <TourCardSkeleton />
                <TourCardSkeleton />
                <TourCardSkeleton />
              </>
            ) : recentTours.length > 0 ? (
              recentTours.slice(0, 4).map((tour) => (
                <RecentTourCard
                  key={tour._id}
                  tour={tour as {
                    _id: string
                    title: string
                    status: string
                    viewCount: number
                    _creationTime: number
                    slug: string
                    tourType?: string
                  }}
                />
              ))
            ) : null}
          </div>
        </div>
      )}

      {/* ── Main Content: Activity + Sidebar ── */}
      {(isLoading || hasTours) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Activity Feed (60%) */}
          <div
            className="lg:col-span-3 rounded-xl overflow-hidden"
            style={{
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.12)',
            }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(212,160,23,0.08)' }}>
              <h2
                className="text-base font-semibold"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
              >
                Recent Activity
              </h2>
            </div>
            {activity === undefined ? (
              <ActivitySkeleton />
            ) : (
              <ActivityFeed activities={activity as Array<{
                _id: string
                type: string
                message: string
                timestamp: number
                tourId?: string
              }>} />
            )}
          </div>

          {/* Right Column: Quick Actions + Tour Breakdown + Top Tour + Usage (40%) */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Quick Actions */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: '#1B1916',
                border: '1px solid rgba(212,160,23,0.12)',
              }}
            >
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: '#F5F3EF', fontFamily: 'var(--font-display)' }}
              >
                Quick Actions
              </h3>
              <QuickActions />
            </div>

            {/* Tour Status Breakdown */}
            {tourStats && tourStats.total > 0 && (
              <TourStatusBreakdown stats={tourStats} />
            )}

            {/* Top Tour Spotlight */}
            {showTopTour && overview!.topTour && (
              <TopTourSpotlight topTour={overview!.topTour as {
                id: string
                title: string
                viewCount: number
                slug: string
              }} />
            )}

            {/* Free Tier Usage */}
            {showFreeTier && overview && (
              <FreeTierUsage
                plan={overview.plan}
                totalTours={overview.totalTours}
                aiCreditsUsed={overview.aiCreditsUsed}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
