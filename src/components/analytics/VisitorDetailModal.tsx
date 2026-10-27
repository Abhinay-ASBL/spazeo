'use client'

import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Modal } from '@/components/ui/Modal'
import { AttentionHeatmap } from '@/components/analytics/AttentionHeatmap'
import { formatDuration, formatSectionCell } from '@/components/analytics/analyticsFormat'

const EVENT_LABEL: Record<string, string> = {
  tour_view: 'Opened tour',
  building_view: 'Opened building',
  model_view: 'Viewed 3D model',
  scene_view: 'Entered scene',
  scene_exit: 'Left scene',
  section_dwell: 'Time on section',
  hotspot_click: 'Clicked hotspot',
  hotspot_media_view: 'Viewed media',
  lead_form_shown: 'Saw lead form',
  lead_form_submitted: 'Submitted lead',
  session_end: 'Ended session',
  floor_select: 'Selected floor',
  unit_select: 'Selected unit',
  variant_switch: 'Switched time of day',
  variant_view: 'Viewed variant',
}

type OpenRow = {
  rowKey: string
  visitorId: string
  sessionIds?: string[]
  isLead?: boolean
}

export function VisitorDetailModal({
  row,
  onClose,
  initialTab = 'session',
  initialSceneTitle,
}: {
  row: OpenRow | null
  onClose: () => void
  initialTab?: 'session' | 'lead'
  initialSceneTitle?: string
}) {
  const sessionOnly = !!row?.rowKey.startsWith('session:')
  const visitorId = !sessionOnly && row?.visitorId
    ? (row.visitorId as Id<'visitors'>)
    : undefined
  const fallbackSession = sessionOnly
    ? row?.visitorId
    : row?.sessionIds?.[0]

  const detail = useQuery(
    api.visitors.getDetailForOwner,
    row
      ? {
          ...(visitorId ? { visitorId } : {}),
          ...(fallbackSession ? { sessionId: fallbackSession } : {}),
        }
      : 'skip'
  )

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tab, setTab] = useState<'session' | 'lead'>(initialTab)
  const [heatmapScene, setHeatmapScene] = useState(initialSceneTitle ?? 'all')

  const sessions = detail?.sessions ?? []
  const activeSessionId = sessionId ?? sessions[0]?.sessionId ?? fallbackSession ?? null
  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) ?? sessions[0]

  const scenes = activeSession
    ? (activeSession.scenes ?? [])
    : (detail?.scenes ?? [])
  const visibleScenes =
    heatmapScene === 'all'
      ? scenes
      : scenes.filter(
          (s) => s.sceneId === heatmapScene || s.title === heatmapScene
        )
  const heatmapScenes = visibleScenes.length > 0 ? visibleScenes : scenes

  const timeline = useMemo(() => {
    if (!detail) return []
    if (!activeSessionId) return detail.timeline
    return detail.timeline.filter((e) => e.sessionId === activeSessionId)
  }, [detail, activeSessionId])

  return (
    <Modal
      isOpen={row != null}
      onClose={onClose}
      title={detail?.lead?.name ? `Visit · ${detail.lead.name}` : 'Visit details'}
      size="xl"
    >
      {detail === undefined && (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading session...
        </div>
      )}
      {detail === null && (
        <p className="text-sm">No session data for this visitor yet.</p>
      )}
      {detail && (
        <div className="space-y-5 text-left">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Device" value={activeSession?.device ?? '—'} />
            <Stat
              label="Time on this session"
              value={formatDuration(activeSession?.durationSec ?? 0)}
            />
            <Stat label="Location kind" value={detail.locationKind} />
            <Stat
              label="City (network)"
              value={
                activeSession?.city || detail.geoCity
                  ? `${activeSession?.city ?? detail.geoCity}${
                      activeSession?.country || detail.geoCountry
                        ? `, ${activeSession?.country ?? detail.geoCountry}`
                        : ''
                    }`
                  : '—'
              }
            />
            <Stat label="Micromarket" value={detail.micromarket ?? '—'} />
            <Stat label="Platform sessions" value={String(sessions.length)} />
            <Stat
              label="Look samples"
              value={String(activeSession?.yawSamples ?? 0)}
            />
            <Stat
              label="Hotspot clicks"
              value={String(activeSession?.hotspotClicks ?? 0)}
            />
          </dl>
          {scenes.length > 0 ? (
            <div className="space-y-4">
              <p className="mb-0 mt-0 text-xs font-medium uppercase tracking-wide">
                Scenes and look heatmap
              </p>
              {scenes.length > 1 ? (
                <div className="flex flex-wrap gap-1">
                  <FilterChip
                    label="All scenes"
                    active={heatmapScene === 'all'}
                    onClick={() => setHeatmapScene('all')}
                  />
                  {scenes.map((s) => (
                    <FilterChip
                      key={s.sceneId}
                      label={s.title}
                      active={
                        heatmapScene === s.sceneId || heatmapScene === s.title
                      }
                      onClick={() => setHeatmapScene(s.sceneId)}
                    />
                  ))}
                </div>
              ) : null}
              {heatmapScenes.map((s) => (
                <div key={s.sceneId} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="m-0 text-[13px] font-medium text-[#F5F3EF]">
                      {s.title}
                    </p>
                    <p className="m-0 text-[12px] text-[#A8A29E]">
                      {formatSectionCell(s.views ?? 0, s.seconds ?? 0)}
                      {s.yawSamples
                        ? ` · ${s.yawSamples} look${s.yawSamples === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                  <AttentionHeatmap
                    sceneId={s.sceneId}
                    visitorId={visitorId}
                    sessionId={activeSessionId ?? undefined}
                    sessionStartedAt={activeSession?.startedAt}
                    sessionEndedAt={activeSession?.endedAt}
                    showDurationFilter
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px]">
              No 360 scenes in this session yet. Heatmap appears after the
              visitor looks around a room.
            </p>
          )}
          {campaignLine(activeSession?.campaign) ? (
            <p className="m-0 text-[12px] text-[#A8A29E]">
              Campaign · {campaignLine(activeSession?.campaign)}
            </p>
          ) : null}
          <p className="m-0 text-[11px] text-[#6B6560]">
            Raw IP is never stored. Actual = QR / declared / GPS. Intent = property
            address. IP Based = network city only, which is often a carrier gateway
            in India — not a home address.
          </p>

          <div className="flex gap-1">
            {(['session', 'lead'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="cursor-pointer rounded-md px-3 py-1.5 text-[13px]"
                style={{
                  border: 'none',
                  backgroundColor: tab === id ? '#12100E' : 'transparent',
                  color: tab === id ? '#F5F3EF' : '#6B6560',
                }}
              >
                {id === 'session' ? 'Session' : 'Lead'}
              </button>
            ))}
          </div>

          {sessions.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {sessions.map((s) => (
                <button
                  key={s.sessionId}
                  type="button"
                  onClick={() => setSessionId(s.sessionId)}
                  className="cursor-pointer rounded-md px-2 py-1 text-[11px]"
                  style={{
                    border: '1px solid rgba(212,160,23,0.2)',
                    backgroundColor:
                      s.sessionId === activeSessionId
                        ? 'rgba(212,160,23,0.16)'
                        : 'transparent',
                    color: s.sessionId === activeSessionId ? '#D4A017' : '#A8A29E',
                  }}
                >
                  {s.tourTitle ?? s.buildingName ?? 'Session'} ·{' '}
                  {new Date(s.startedAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          )}

          {tab === 'lead' ? (
            detail.lead ? (
              <div className="rounded-xl border border-[#2E2A24] bg-[#12100E] p-4 text-[13px]">
                <p className="mt-0 mb-3 font-semibold text-[#F5F3EF]">
                  {detail.lead.name || 'Lead'}
                </p>
                <p className="m-0">Phone · {detail.lead.phone || '—'}</p>
                <p className="m-0">Email · {detail.lead.email || '—'}</p>
                <p className="m-0">Status · {detail.lead.status}</p>
                <p className="m-0">Project · {detail.lead.tourTitle || '—'}</p>
                <p className="m-0">Source · {detail.lead.source || '—'}</p>
                <p className="m-0">
                  Created · {new Date(detail.lead.createdAt).toLocaleString('en-IN')}
                </p>
                <p className="m-0">Micromarket · {detail.lead.micromarket || '—'}</p>
                {detail.lead.locationInfo?.city ? (
                  <p className="m-0">
                    Declared city · {detail.lead.locationInfo.city}
                    {detail.lead.locationInfo.country
                      ? `, ${detail.lead.locationInfo.country}`
                      : ''}
                  </p>
                ) : null}
                {detail.lead.deviceInfo?.type ? (
                  <p className="m-0">
                    Device · {[detail.lead.deviceInfo.type, detail.lead.deviceInfo.browser, detail.lead.deviceInfo.os].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {detail.lead.timeSpent ? (
                  <p className="m-0">Time on tour · {formatDuration(detail.lead.timeSpent)}</p>
                ) : null}
                {detail.lead.message ? (
                  <p className="mb-0 mt-2">{detail.lead.message}</p>
                ) : null}
                {Array.isArray(detail.lead.notes) && detail.lead.notes.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {detail.lead.notes.map((note) => (
                      <p key={note.createdAt} className="m-0 text-[#A8A29E]">
                        {note.text}
                        <span className="ml-2 text-[11px] text-[#6B6560]">
                          {new Date(note.createdAt).toLocaleString('en-IN')}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm">This visit has not submitted a lead form.</p>
            )
          ) : (
            <div>
                <p className="mb-2 mt-0 text-xs font-medium uppercase tracking-wide">
                  Timeline
                </p>
                <ol className="m-0 max-h-64 space-y-1.5 overflow-y-auto p-0">
                  {timeline.length === 0 ? (
                    <li className="text-[13px]">No events in this session.</li>
                  ) : (
                    timeline.map((e) => (
                      <li key={e._id} className="text-[12px]">
                        <span className="text-[#F5F3EF]">
                          {EVENT_LABEL[e.event] ?? e.event}
                        </span>
                        {e.sceneTitle ? (
                          <span> · {e.sceneTitle}</span>
                        ) : null}
                        {e.section ? <span> · {e.section}</span> : null}
                        {e.duration ? <span> · {e.duration}s</span> : null}
                        {e.floor != null ? <span> · floor {e.floor}</span> : null}
                        {e.unitNumber ? <span> · unit {e.unitNumber}</span> : null}
                        {e.timeOfDay ? <span> · {e.timeOfDay}</span> : null}
                        {e.src ? <span> · {e.src}</span> : null}
                        {e.tourTitle ? <span> · {e.tourTitle}</span> : null}
                        {e.buildingName ? <span> · {e.buildingName}</span> : null}
                        <span className="ml-2 text-[#6B6560]">
                          {new Date(e.timestamp).toLocaleTimeString('en-IN')}
                        </span>
                      </li>
                    ))
                  )}
                </ol>
              </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function campaignLine(
  campaign:
    | {
        utmSource?: string
        utmMedium?: string
        utmCampaign?: string
        src?: string
        mlid?: string
        cid?: string
        mm?: string
      }
    | undefined
): string {
  if (!campaign) return ''
  return [
    campaign.src,
    campaign.utmSource,
    campaign.utmMedium,
    campaign.utmCampaign,
    campaign.mlid ? `MLID ${campaign.mlid}` : '',
    campaign.cid ? `CID ${campaign.cid}` : '',
    campaign.mm,
  ]
    .filter(Boolean)
    .join(' · ')
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-md px-2 py-1 text-[11px]"
      style={{
        border: '1px solid rgba(212,160,23,0.2)',
        backgroundColor: active ? 'rgba(45,212,191,0.16)' : 'transparent',
        color: active ? '#2DD4BF' : '#A8A29E',
      }}
    >
      {label}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2E2A24] bg-[#12100E] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-[#6B6560]">{label}</dt>
      <dd className="m-0 mt-1 text-[13px] text-[#F5F3EF]">{value}</dd>
    </div>
  )
}
