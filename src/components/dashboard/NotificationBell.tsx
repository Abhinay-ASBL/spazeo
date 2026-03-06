'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Bell,
  Users,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Check,
} from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface Notification {
  _id: Id<'notifications'>
  _creationTime: number
  userId: Id<'users'>
  type: 'lead_captured' | 'tour_milestone' | 'ai_completed' | 'tour_error' | 'weekly_summary'
  title: string
  message: string
  tourId?: Id<'tours'>
  read: boolean
  createdAt: number
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'lead_captured':
      return <Users size={16} strokeWidth={1.5} className="text-[#2DD4BF]" />
    case 'ai_completed':
      return <Sparkles size={16} strokeWidth={1.5} className="text-[#D4A017]" />
    case 'tour_milestone':
      return <TrendingUp size={16} strokeWidth={1.5} className="text-[#34D399]" />
    case 'tour_error':
      return <AlertTriangle size={16} strokeWidth={1.5} className="text-[#F87171]" />
    case 'weekly_summary':
      return <BarChart3 size={16} strokeWidth={1.5} className="text-[#A8A29E]" />
    default:
      return <Bell size={16} strokeWidth={1.5} className="text-[#A8A29E]" />
  }
}

function getNotificationRoute(type: string, tourId?: string): string {
  switch (type) {
    case 'lead_captured':
      return '/leads'
    case 'ai_completed':
      return tourId ? `/tours/${tourId}` : '/tours'
    case 'tour_milestone':
      return tourId ? `/tours/${tourId}` : '/analytics'
    case 'tour_error':
      return tourId ? `/tours/${tourId}` : '/tours'
    case 'weekly_summary':
      return '/analytics'
    default:
      return '/dashboard'
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const notifications = useQuery(api.notifications.list, { limit: 20 })
  const unreadCount = useQuery(api.notifications.unreadCount)
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close dropdown on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markRead({ notificationId: notification._id })
    }
    const route = getNotificationRoute(notification.type, notification.tourId as string | undefined)
    setOpen(false)
    router.push(route)
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 bg-[rgba(212,160,23,0.06)] hover:bg-[rgba(212,160,23,0.12)] text-[#A8A29E] hover:text-[#F5F3EF] cursor-pointer"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} strokeWidth={1.5} />
        {(unreadCount ?? 0) > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: '#F87171',
              color: '#FFFFFF',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            {unreadCount! > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-[360px] max-h-[480px] rounded-xl border shadow-lg overflow-hidden z-50"
          style={{
            backgroundColor: '#1B1916',
            borderColor: 'rgba(212,160,23,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgba(212,160,23,0.08)' }}
          >
            <h3
              className="text-sm font-semibold text-[#F5F3EF]"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              Notifications
            </h3>
            {(unreadCount ?? 0) > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs text-[#D4A017] hover:text-[#E5B120] transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-dmsans)' }}
              >
                <Check size={14} strokeWidth={1.5} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[420px]">
            {notifications === undefined ? (
              <div className="flex items-center justify-center py-10">
                <div
                  className="w-5 h-5 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin"
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={24} strokeWidth={1.5} className="text-[#6B6560]" />
                <p
                  className="text-sm text-[#6B6560]"
                  style={{ fontFamily: 'var(--font-dmsans)' }}
                >
                  No notifications yet
                </p>
              </div>
            ) : (
              (notifications as Notification[]).map((notification: Notification) => (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className="flex items-start gap-3 w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-[rgba(212,160,23,0.04)] cursor-pointer"
                  style={{
                    backgroundColor: notification.read
                      ? 'transparent'
                      : 'rgba(212,160,23,0.03)',
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)]">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] font-medium truncate"
                        style={{
                          color: notification.read ? '#A8A29E' : '#F5F3EF',
                          fontFamily: 'var(--font-dmsans)',
                        }}
                      >
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#D4A017]" />
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{
                        color: notification.read ? '#6B6560' : '#A8A29E',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {notification.message}
                    </p>
                    <span
                      className="text-[11px] mt-1 inline-block"
                      style={{
                        color: '#6B6560',
                        fontFamily: 'var(--font-dmsans)',
                      }}
                    >
                      {getRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
