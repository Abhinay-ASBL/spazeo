'use client'

import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { SessionsTable } from '@/components/analytics/SessionsTable'
import { AttentionHeatmap } from '@/components/analytics/AttentionHeatmap'
import {
  AnalyticsTotals,
  TourPeopleReach,
} from '@/components/analytics/AnalyticsTotals'
import { AnalyticsMetricGlossary } from '@/components/analytics/AnalyticsMetricGlossary'
import {
  Calendar,
  Download,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  BarChart3,
  QrCode,
  Sun,
  Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all'

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

// ─── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString()
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

// ─── Page ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [tourSearch, setTourSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [selectedTourId, setSelectedTourId] = useState<Id<'tours'> | null>(null)
  const exportCsv = useAction(api.analytics.exportCsv)

  const overview = useQuery(api.analytics.getDashboardOverview, { period })
  const tourPerformance = useQuery(api.analytics.getTourPerformance, { period })
  const selectedTourScenes = useQuery(
    api.scenes.listByTour,
    selectedTourId ? { tourId: selectedTourId } : 'skip'
  )
  const visitorStats = useQuery(
    api.analytics.getUniqueVisitorStats,
    selectedTourId ? { tourId: selectedTourId, period } : 'skip'
  )
  const variantEngagement = useQuery(
    api.analytics.getVariantEngagement,
    selectedTourId ? { tourId: selectedTourId, period } : 'skip'
  )
  const qrAttribution = useQuery(
    api.analytics.getQrAttribution,
    selectedTourId ? { tourId: selectedTourId, period } : 'skip'
  )

  const isLoading = overview === undefined || tourPerformance === undefined

  // Filter tours by search
  const filteredTours = (tourPerformance ?? []).filter((t) =>
    t.title.toLowerCase().includes(tourSearch.toLowerCase())
  )

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
          color: '#A8A29E',
          gap: 10,
          fontFamily: 'var(--font-dmsans)',
        }}
      >
        <Loader2 size={20} className="animate-spin" />
        Loading analytics...
      </div>
    )
  }

  if (!overview) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
          color: '#6B6560',
          fontFamily: 'var(--font-dmsans)',
          fontSize: 14,
        }}
      >
        Sign in to view analytics
      </div>
    )
  }

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? '30D'

  // Build a simple bar chart from tour data
  const topToursForChart = filteredTours.slice(0, 7)
  const maxViews = Math.max(...topToursForChart.map((t) => t.views), 1)

  return (
    <div style={{ fontFamily: 'var(--font-dmsans)' }}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#F5F3EF',
              fontFamily: 'var(--font-display)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Analytics
          </h1>
          <p style={{ fontSize: 14, color: '#A8A29E', margin: '6px 0 0 0' }}>
            Devices, estimated people, and known contacts — not a single unique-visitor count.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Period Selector */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: 8,
              padding: 3,
            }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-dmsans)',
                  backgroundColor: period === opt.value ? '#12100E' : 'transparent',
                  color: period === opt.value ? '#F5F3EF' : '#6B6560',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0
                const startDate = periodDays > 0 ? Date.now() - periodDays * 24 * 60 * 60 * 1000 : 0
                const csv = await exportCsv({ startDate })
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `spazeo-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Analytics exported successfully')
              } catch {
                toast.error('Failed to export analytics')
              } finally {
                setExporting(false)
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: 8,
              color: exporting ? '#6B6560' : '#D4A017',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-dmsans)',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <AnalyticsTotals
        periodLabel={periodLabel as '7D' | '30D' | '90D' | 'All'}
        devices={overview.uniqueDevices ?? 0}
        estimated={overview.uniqueVisitorsEstimated ?? 0}
        knownContacts={overview.knownContacts ?? 0}
        hasVisitorIds={overview.hasVisitorIds ?? false}
        periodViews={overview.periodViews ?? 0}
        periodSessions={overview.periodSessions ?? 0}
        periodLeads={overview.periodLeads ?? 0}
        viewsTrend={overview.trends.views}
        leadsTrend={overview.trends.leads}
        avgSceneTime={overview.avgSceneTime}
        conversionRate={overview.conversionRate}
        allTimeViews={overview.totalViews}
        allTimeLeads={overview.totalLeads}
      />

      <AnalyticsMetricGlossary />

      {/* Charts Row */}
      <div className="flex flex-col lg:flex-row" style={{ gap: 16, marginBottom: 24 }}>
        {/* Views by Tour (bar chart) */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            borderRadius: 12,
            padding: 24,
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#F5F3EF',
                margin: 0,
                fontFamily: 'var(--font-display)',
              }}
            >
              Views by Tour
            </h3>
            <BarChart3 size={16} style={{ color: '#6B6560' }} />
          </div>
          {topToursForChart.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B6560',
                fontSize: 13,
              }}
            >
              No tour data for this period
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              {topToursForChart.map((tour) => (
                <div key={tour.tourId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#A8A29E',
                      width: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    title={tour.title}
                  >
                    {tour.title}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 24,
                      backgroundColor: '#12100E',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max((tour.views / maxViews) * 100, 2)}%`,
                        background: 'linear-gradient(90deg, #D4A017, #E5B120)',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#F5F3EF',
                      width: 48,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {formatNumber(tour.views)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div
          className="w-full lg:w-[320px] lg:flex-shrink-0"
          style={{
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            borderRadius: 12,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#F5F3EF',
              margin: 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            Summary
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Published Tours', value: overview.publishedTours, icon: Eye, color: '#D4A017' },
              { label: 'Total Tours', value: overview.totalTours, icon: BarChart3, color: '#2DD4BF' },
              { label: 'AI Jobs Completed', value: overview.completedAiJobs, icon: Monitor, color: '#FB7A54' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#12100E',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: `${item.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} style={{ color: item.color }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#A8A29E' }}>{item.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              )
            })}
          </div>

          {overview.topTour && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(212,160,23,0.06)',
                border: '1px solid rgba(212,160,23,0.12)',
                borderRadius: 8,
              }}
            >
              <p style={{ fontSize: 11, color: '#6B6560', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Top Tour
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F3EF', margin: '0 0 4px 0' }}>
                {overview.topTour.title}
              </p>
              <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>
                {formatNumber(overview.topTour.viewCount)} total views
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tour Performance Table */}
      <div
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.12)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(212,160,23,0.08)',
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#F5F3EF',
              margin: 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            Tour Performance
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#12100E',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: 8,
              padding: '6px 12px',
            }}
          >
            <Search size={14} style={{ color: '#6B6560' }} />
            <input
              type="text"
              placeholder="Search tours..."
              value={tourSearch}
              onChange={(e) => setTourSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#F5F3EF',
                fontSize: 13,
                fontFamily: 'var(--font-dmsans)',
                width: 140,
              }}
            />
          </div>
        </div>

        {filteredTours.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#6B6560',
              fontSize: 13,
            }}
          >
            {tourSearch ? 'No tours match your search' : 'No tours found. Create your first tour to see performance data.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                {['Tour Name', 'Status', 'Views', 'Sessions', 'Leads', 'Avg. Duration'].map(
                  (header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: 'left',
                        padding: '12px 24px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6B6560',
                        borderBottom: '1px solid rgba(212,160,23,0.08)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTours.map((tour, idx) => (
                <tr
                  key={tour.tourId}
                  onClick={() => setSelectedTourId(
                    selectedTourId === tour.tourId ? null : tour.tourId as Id<'tours'>
                  )}
                  style={{
                    borderBottom:
                      idx < filteredTours.length - 1
                        ? '1px solid rgba(212,160,23,0.06)'
                        : 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedTourId === tour.tourId ? 'rgba(212,160,23,0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#F5F3EF' }}>
                      {tour.title}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 500,
                        color:
                          tour.status === 'published'
                            ? '#34D399'
                            : tour.status === 'draft'
                              ? '#FBBF24'
                              : '#A8A29E',
                        backgroundColor:
                          tour.status === 'published'
                            ? 'rgba(52,211,153,0.13)'
                            : tour.status === 'draft'
                              ? 'rgba(251,191,36,0.13)'
                              : 'rgba(168,162,158,0.13)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tour.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: 13, color: '#A8A29E' }}>
                    {formatNumber(tour.views)}
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: 13, color: '#A8A29E' }}>
                    {formatNumber(tour.uniqueVisitors)}
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: 13, color: '#A8A29E' }}>
                    {tour.leads}
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: 13, color: '#A8A29E' }}>
                    {formatDuration(tour.avgDuration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Visitor Sessions & Attention Heatmap — shown when a tour is selected */}
      {selectedTourId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginTop: 32 }}>
          {/* Identity for the selected tour */}
          {visitorStats && (
            <TourPeopleReach
              devices={visitorStats.uniqueDevices}
              estimated={visitorStats.uniqueVisitorsEstimated}
              knownContacts={visitorStats.knownContacts}
              returning={visitorStats.returningVisitors}
              hasVisitorIds={visitorStats.hasVisitorIds}
            />
          )}

          {/* Variant engagement */}
          {variantEngagement && (
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                  marginBottom: 12,
                }}
              >
                Variant engagement
              </h2>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gap: 16 }}
              >
                <div
                  style={{
                    backgroundColor: '#1B1916',
                    border: '1px solid rgba(212,160,23,0.12)',
                    borderRadius: 12,
                    padding: '16px 20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#6B6560' }}>Switch rate</span>
                    <Sun size={16} style={{ color: '#D4A017' }} />
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: '#F5F3EF',
                      fontFamily: 'var(--font-jakarta)',
                    }}
                  >
                    {variantEngagement.switchRate}%
                  </div>
                  <p style={{ fontSize: 11, color: '#6B6560', margin: '4px 0 0' }}>
                    {variantEngagement.switchSessions} of {variantEngagement.viewSessions}{' '}
                    sessions switched
                  </p>
                </div>
                {Object.entries(variantEngagement.dwellByTimeOfDay).map(([tod, bucket]) => (
                  <div
                    key={tod}
                    style={{
                      backgroundColor: '#1B1916',
                      border: '1px solid rgba(212,160,23,0.12)',
                      borderRadius: 12,
                      padding: '16px 20px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: '#6B6560',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tod} dwell
                    </span>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: '#F5F3EF',
                        fontFamily: 'var(--font-jakarta)',
                        marginTop: 8,
                      }}
                    >
                      {formatDuration(bucket.avgDurationSec)}
                    </div>
                    <p style={{ fontSize: 11, color: '#6B6560', margin: '4px 0 0' }}>
                      {bucket.events} views
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR placement attribution */}
          {qrAttribution && qrAttribution.placements.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <QrCode size={16} style={{ color: '#D4A017' }} />
                QR placement
              </h2>
              <div
                style={{
                  backgroundColor: '#1B1916',
                  border: '1px solid rgba(212,160,23,0.12)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(212,160,23,0.08)' }}>
                        {['Placement (qr)', 'Micromarket', 'Campaign', 'Scans', 'Leads', 'Lead rate', 'With phone'].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#6B6560',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {qrAttribution.placements.map((row) => (
                        <tr
                          key={`${row.qr}|${row.mm}|${row.camp}`}
                          style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}
                        >
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#F5F3EF' }}>
                            {row.qr}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#A8A29E' }}>
                            {row.mm}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#A8A29E' }}>
                            {row.camp}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#A8A29E' }}>
                            {row.scans}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#A8A29E' }}>
                            {row.leads}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#2DD4BF' }}>
                            {row.leadRate}%
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#D4A017' }}>
                            {row.leadsWithPhone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#F5F3EF',
                fontFamily: 'var(--font-jakarta)',
                marginBottom: 12,
              }}
            >
              Visitor sessions
            </h2>
            <SessionsTable tourId={selectedTourId} />
          </div>

          {selectedTourScenes && selectedTourScenes.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#F5F3EF',
                  fontFamily: 'var(--font-jakarta)',
                  marginBottom: 12,
                }}
              >
                Attention heatmaps
              </h2>
              <div style={{ display: 'grid', gap: 16 }}>
                {selectedTourScenes.map((s) => (
                  <div key={s._id}>
                    <p style={{ fontSize: 12, color: '#A8A29E', marginBottom: 4 }}>{s.title}</p>
                    <AttentionHeatmap sceneId={s._id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
