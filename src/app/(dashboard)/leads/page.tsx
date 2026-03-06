'use client'

import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import {
  Download,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Globe,
  Monitor,
  UserPlus,
  Users,
  UserCheck,
  Archive,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────

type StatusFilter = 'all' | 'new' | 'contacted' | 'qualified' | 'archived'
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'archived'

const STATUS_TABS: { label: string; value: StatusFilter; icon: typeof Users }[] = [
  { label: 'All Leads', value: 'all', icon: Users },
  { label: 'New', value: 'new', icon: UserPlus },
  { label: 'Contacted', value: 'contacted', icon: Mail },
  { label: 'Qualified', value: 'qualified', icon: UserCheck },
  { label: 'Archived', value: 'archived', icon: Archive },
]

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  new: { color: '#FBBF24', bg: 'rgba(251,191,36,0.13)' },
  contacted: { color: '#2DD4BF', bg: 'rgba(45,212,191,0.13)' },
  qualified: { color: '#D4A017', bg: 'rgba(212,160,23,0.13)' },
  archived: { color: '#A8A29E', bg: 'rgba(168,162,158,0.13)' },
}

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'qualified', 'archived']

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

// ─── Page ──────────────────────────────────────────────────────

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLead, setExpandedLead] = useState<Id<'leads'> | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportCsv = useAction(api.leads.exportCsv)

  const leadStats = useQuery(api.leads.getStats)
  const tours = useQuery(api.tours.list, {})

  // Build query args
  const queryArgs: {
    status?: LeadStatus
    search?: string
  } = {}
  if (statusFilter !== 'all') queryArgs.status = statusFilter
  if (searchTerm.trim()) queryArgs.search = searchTerm.trim()

  const leads = useQuery(api.leads.listAll, queryArgs)
  const updateStatus = useMutation(api.leads.updateStatus)

  const isLoading = leads === undefined || leadStats === undefined

  const handleStatusChange = async (leadId: Id<'leads'>, newStatus: LeadStatus) => {
    try {
      await updateStatus({ leadId, status: newStatus })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update lead status')
    }
  }

  // Get tour title by ID
  const tourMap = new Map<string, string>()
  if (tours) {
    for (const tour of tours) {
      tourMap.set(tour._id, tour.title)
    }
  }

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
        Loading leads...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--font-dmsans)' }}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
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
            Leads
          </h1>
          <p style={{ fontSize: 14, color: '#A8A29E', margin: '6px 0 0 0' }}>
            Manage and follow up on captured leads from your tours
          </p>
        </div>
        <button
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              const csv = await exportCsv({})
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `spazeo-leads-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
              toast.success('Leads exported successfully')
            } catch {
              toast.error('Failed to export leads')
            } finally {
              setExporting(false)
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            backgroundColor: '#1B1916',
            border: '1px solid rgba(212,160,23,0.12)',
            borderRadius: 8,
            color: exporting ? '#6B6560' : '#D4A017',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'var(--font-dmsans)',
            cursor: exporting ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Lead Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Leads', value: leadStats?.total ?? 0 },
          { label: 'New This Week', value: leadStats?.newThisWeek ?? 0 },
          { label: 'Qualified', value: leadStats?.qualified ?? 0 },
          { label: 'Contacted', value: leadStats?.contacted ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: 12,
              padding: '20px 24px',
            }}
          >
            <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>{stat.label}</p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
                margin: '8px 0 0 0',
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Tab Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#1B1916',
            borderRadius: 8,
            padding: 3,
            flexWrap: 'wrap',
          }}
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-dmsans)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: statusFilter === tab.value ? '#12100E' : 'transparent',
                color: statusFilter === tab.value ? '#F5F3EF' : '#6B6560',
              }}
            >
              {tab.label}
              {tab.value !== 'all' && leadStats && (
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                  {tab.value === 'new'
                    ? leadStats.new
                    : tab.value === 'contacted'
                      ? leadStats.contacted
                      : tab.value === 'qualified'
                        ? leadStats.qualified
                        : leadStats.archived}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B6560',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '9px 14px 9px 36px',
              backgroundColor: '#1B1916',
              border: '1px solid rgba(212,160,23,0.12)',
              borderRadius: 8,
              color: '#F5F3EF',
              fontSize: 13,
              fontFamily: 'var(--font-dmsans)',
              outline: 'none',
              width: '100%',
              maxWidth: 240,
            }}
          />
        </div>
      </div>

      {/* Leads Table */}
      <div
        style={{
          backgroundColor: '#1B1916',
          border: '1px solid rgba(212,160,23,0.12)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {!leads || leads.length === 0 ? (
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
            }}
          >
            <UserPlus size={40} style={{ color: '#6B6560', margin: '0 auto 16px auto', display: 'block' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F3EF', margin: '0 0 6px 0' }}>
              {searchTerm || statusFilter !== 'all' ? 'No leads match your filters' : 'No leads yet'}
            </p>
            <p style={{ fontSize: 13, color: '#6B6560', margin: 0 }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Leads will appear here when visitors submit contact forms on your tours'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header — hidden on mobile */}
            <div
              className="hidden md:grid"
              style={{
                gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 40px',
                padding: '12px 24px',
                backgroundColor: '#12100E',
              }}
            >
              {['Name', 'Email', 'Tour', 'Date', 'Status', ''].map((col) => (
                <span
                  key={col || 'expand'}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6B6560',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {col}
                </span>
              ))}
            </div>

            {/* Table Rows */}
            {leads.map((lead, index) => {
              const initials = getInitials(lead.name)
              const status = (lead.status ?? 'new') as LeadStatus
              const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.new
              const isExpanded = expandedLead === lead._id
              const isLast = index === leads.length - 1
              const tourTitle = tourMap.get(lead.tourId) ?? 'Unknown Tour'

              return (
                <div key={lead._id}>
                  {/* Row — desktop: grid table, mobile: stacked card */}
                  <div
                    onClick={() => setExpandedLead(isExpanded ? null : lead._id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpandedLead(isExpanded ? null : lead._id)
                      }
                    }}
                    className="hidden md:grid"
                    style={{
                      gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 40px',
                      padding: '14px 24px',
                      alignItems: 'center',
                      borderBottom: isLast && !isExpanded ? 'none' : '1px solid rgba(212,160,23,0.08)',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#12100E'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Name + Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: statusStyle.bg,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: statusStyle.color,
                          }}
                        >
                          {initials}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#F5F3EF' }}>
                        {lead.name}
                      </span>
                    </div>

                    {/* Email */}
                    <span style={{ fontSize: 13, color: '#A8A29E' }}>{lead.email}</span>

                    {/* Tour */}
                    <span
                      style={{
                        fontSize: 13,
                        color: '#A8A29E',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={tourTitle}
                    >
                      {tourTitle}
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: 13, color: '#A8A29E' }}>
                      {formatDate(lead._creationTime)}
                    </span>

                    {/* Status Badge */}
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 500,
                          color: statusStyle.color,
                          backgroundColor: statusStyle.bg,
                          textTransform: 'capitalize',
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Expand Arrow */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {isExpanded ? (
                        <ChevronUp size={16} style={{ color: '#6B6560' }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: '#6B6560' }} />
                      )}
                    </div>
                  </div>

                  {/* Mobile card view */}
                  <div
                    onClick={() => setExpandedLead(isExpanded ? null : lead._id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpandedLead(isExpanded ? null : lead._id)
                      }
                    }}
                    className="flex md:hidden flex-col gap-2 p-4"
                    style={{
                      borderBottom: isLast && !isExpanded ? 'none' : '1px solid rgba(212,160,23,0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: statusStyle.bg,
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 600, color: statusStyle.color }}>
                            {initials}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#F5F3EF' }}>
                            {lead.name}
                          </span>
                          <span style={{ fontSize: 12, color: '#A8A29E' }}>{lead.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 500,
                            color: statusStyle.color,
                            backgroundColor: statusStyle.bg,
                            textTransform: 'capitalize',
                          }}
                        >
                          {status}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={16} style={{ color: '#6B6560' }} />
                        ) : (
                          <ChevronDown size={16} style={{ color: '#6B6560' }} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between" style={{ fontSize: 12, color: '#6B6560' }}>
                      <span className="truncate" style={{ maxWidth: '60%' }}>{tourTitle}</span>
                      <span>{formatDate(lead._creationTime)}</span>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '20px 24px',
                        backgroundColor: '#12100E',
                        borderBottom: isLast ? 'none' : '1px solid rgba(212,160,23,0.08)',
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20 }}>
                        {/* Contact Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#6B6560',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              margin: 0,
                            }}
                          >
                            Contact
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Mail size={14} style={{ color: '#D4A017' }} />
                            <a
                              href={`mailto:${lead.email}`}
                              style={{ fontSize: 13, color: '#D4A017', textDecoration: 'none' }}
                            >
                              {lead.email}
                            </a>
                          </div>
                          {lead.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Phone size={14} style={{ color: '#A8A29E' }} />
                              <span style={{ fontSize: 13, color: '#A8A29E' }}>{lead.phone}</span>
                            </div>
                          )}
                          {lead.message && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <MessageSquare size={14} style={{ color: '#A8A29E', marginTop: 2 }} />
                              <span style={{ fontSize: 13, color: '#A8A29E' }}>{lead.message}</span>
                            </div>
                          )}
                        </div>

                        {/* Engagement */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#6B6560',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              margin: 0,
                            }}
                          >
                            Engagement
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={14} style={{ color: '#A8A29E' }} />
                            <span style={{ fontSize: 13, color: '#A8A29E' }}>
                              Time spent: {formatDuration(lead.timeSpent)}
                            </span>
                          </div>
                          {lead.viewedScenes && lead.viewedScenes.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Globe size={14} style={{ color: '#A8A29E' }} />
                              <span style={{ fontSize: 13, color: '#A8A29E' }}>
                                {lead.viewedScenes.length} scenes viewed
                              </span>
                            </div>
                          )}
                          {lead.deviceInfo?.type && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Monitor size={14} style={{ color: '#A8A29E' }} />
                              <span style={{ fontSize: 13, color: '#A8A29E' }}>
                                {lead.deviceInfo.type}
                                {lead.deviceInfo.browser ? ` / ${lead.deviceInfo.browser}` : ''}
                              </span>
                            </div>
                          )}
                          {lead.locationInfo?.country && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MapPin size={14} style={{ color: '#A8A29E' }} />
                              <span style={{ fontSize: 13, color: '#A8A29E' }}>
                                {lead.locationInfo.city ? `${lead.locationInfo.city}, ` : ''}
                                {lead.locationInfo.country}
                              </span>
                            </div>
                          )}
                          {lead.source && (
                            <span style={{ fontSize: 12, color: '#6B6560' }}>
                              Source: {lead.source}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#6B6560',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              margin: 0,
                            }}
                          >
                            Update Status
                          </p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {STATUS_OPTIONS.map((s) => {
                              const style = STATUS_STYLES[s]
                              const isActive = status === s
                              return (
                                <button
                                  key={s}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStatusChange(lead._id, s)
                                  }}
                                  aria-label={`Set status to ${s}`}
                                  aria-pressed={isActive}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    border: isActive
                                      ? `1.5px solid ${style.color}`
                                      : '1px solid rgba(212,160,23,0.12)',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-dmsans)',
                                    backgroundColor: isActive ? style.bg : 'transparent',
                                    color: isActive ? style.color : '#A8A29E',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {s}
                                </button>
                              )
                            })}
                          </div>

                          {/* Notes */}
                          {lead.notes && lead.notes.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <p
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#6B6560',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  margin: '0 0 8px 0',
                                }}
                              >
                                Notes
                              </p>
                              {lead.notes.map((note, i) => (
                                <div
                                  key={i}
                                  style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#1B1916',
                                    borderRadius: 6,
                                    marginBottom: 6,
                                  }}
                                >
                                  <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>
                                    {note.text}
                                  </p>
                                  <p style={{ fontSize: 11, color: '#6B6560', margin: '4px 0 0 0' }}>
                                    {formatDate(note.createdAt)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
