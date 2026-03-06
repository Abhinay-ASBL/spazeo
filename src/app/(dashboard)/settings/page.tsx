'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useUser, useClerk, useSession } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  Check,
  Shield,
  Bell,
  AlertTriangle,
  Loader2,
  Globe,
  Building2,
  Camera,
  MapPin,
  Download,
  Monitor,
  Smartphone,
  LogOut,
  ShieldCheck,
  Lock,
  FileText,
  Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'profile' | 'security' | 'notifications' | 'privacy' | 'danger'

const ROLE_OPTIONS = [
  { label: 'Agent', value: 'agent' },
  { label: 'Developer', value: 'developer' },
  { label: 'Photographer', value: 'photographer' },
  { label: 'Manager', value: 'manager' },
  { label: 'Other', value: 'other' },
]

const PROPERTY_FOCUS_OPTIONS = [
  'Residential',
  'Commercial',
  'Hospitality',
  'Industrial',
  'Mixed Use',
]

const CAMERA_OPTIONS = [
  { label: 'Insta360', value: 'insta360' },
  { label: 'Ricoh Theta', value: 'ricoh_theta' },
  { label: 'GoPro Max', value: 'gopro_max' },
  { label: 'Smartphone', value: 'smartphone' },
  { label: 'DSLR Adapter', value: 'dslr_adapter' },
  { label: 'Other', value: 'other' },
]

const CONSENT_LABELS: Record<string, { label: string; description: string; required?: boolean }> = {
  tos: { label: 'Terms of Service', description: 'Agreement to Spazeo\'s Terms of Service', required: true },
  privacy: { label: 'Privacy Policy', description: 'Acknowledgment of data collection and processing', required: true },
  marketing: { label: 'Marketing Communications', description: 'Receive product updates, tips, and promotional content' },
  cookies: { label: 'Analytics Cookies', description: 'Allow analytics cookies for service improvement' },
  dpdp: { label: 'DPDP Compliance', description: 'Digital Personal Data Protection compliance acknowledgment' },
}

export default function SettingsPage() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const { session } = useSession()
  const router = useRouter()
  const convexUser = useQuery(api.users.getCurrent)
  const updateProfile = useMutation(api.users.updateProfile)
  const updateNotificationPreferences = useMutation(api.users.updateNotificationPreferences)
  const requestDeletion = useMutation(api.users.requestDeletion)
  const reactivateAccount = useMutation(api.users.reactivateAccount)
  const exportData = useAction(api.users.exportData)
  const consents = useQuery(api.consents.getAll)
  const consentHistory = useQuery(api.consents.getHistory)
  const grantConsent = useMutation(api.consents.grant)
  const revokeConsent = useMutation(api.consents.revoke)

  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [cameraType, setCameraType] = useState('')
  const [role, setRole] = useState('')
  const [propertyFocus, setPropertyFocus] = useState<string[]>([])
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Notification state
  const [notifNewLeads, setNotifNewLeads] = useState(true)
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(true)
  const [notifProductUpdates, setNotifProductUpdates] = useState(true)

  // Danger zone state
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Populate form from Clerk + Convex data
  useEffect(() => {
    if (clerkUser) {
      setFirstName(clerkUser.firstName ?? '')
      setLastName(clerkUser.lastName ?? '')
    }
  }, [clerkUser])

  useEffect(() => {
    if (convexUser) {
      setCompany(convexUser.company ?? '')
      setWebsite(convexUser.website ?? '')
      setCity(convexUser.city ?? '')
      setCountry(convexUser.country ?? '')
      setCameraType(convexUser.cameraType ?? '')
      setRole(convexUser.userType ?? '')
      setPropertyFocus(convexUser.propertyFocus ?? [])
      const prefs = convexUser.notificationPreferences
      if (prefs) {
        setNotifNewLeads(prefs.newLeads)
        setNotifWeeklyDigest(prefs.weeklyDigest)
        setNotifProductUpdates(prefs.productUpdates)
      }
    }
  }, [convexUser])

  const isLoading = !isClerkLoaded || convexUser === undefined

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: null },
    { id: 'security', label: 'Security', icon: <Shield size={14} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
    { id: 'privacy', label: 'Privacy & Consent', icon: <FileText size={14} /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={14} /> },
  ]

  const userInitials = `${(firstName || 'U')[0]}${(lastName || '')[0] || ''}`.toUpperCase()

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      await updateProfile({
        name: fullName || undefined,
        company: company || undefined,
        website: website || undefined,
        city: city || undefined,
        country: country || undefined,
        cameraType: cameraType || undefined,
        userType: (role as 'agent' | 'developer' | 'photographer' | 'manager' | 'other') || undefined,
        propertyFocus: propertyFocus.length > 0 ? propertyFocus : undefined,
      })
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleTogglePropertyFocus = (item: string) => {
    setPropertyFocus((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    )
  }

  const handleNotificationToggle = async (
    key: 'newLeads' | 'weeklyDigest' | 'productUpdates',
    value: boolean
  ) => {
    const updated = {
      newLeads: notifNewLeads,
      weeklyDigest: notifWeeklyDigest,
      productUpdates: notifProductUpdates,
      [key]: value,
    }

    if (key === 'newLeads') setNotifNewLeads(value)
    if (key === 'weeklyDigest') setNotifWeeklyDigest(value)
    if (key === 'productUpdates') setNotifProductUpdates(value)

    try {
      await updateNotificationPreferences(updated)
      toast.success('Notification preferences updated')
    } catch {
      if (key === 'newLeads') setNotifNewLeads(!value)
      if (key === 'weeklyDigest') setNotifWeeklyDigest(!value)
      if (key === 'productUpdates') setNotifProductUpdates(!value)
      toast.error('Failed to update preferences')
    }
  }

  const handleRequestDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setIsDeleting(true)
    try {
      await requestDeletion()
      toast.success('Account scheduled for deletion. You have 30 days to reactivate.')
      setDeleteConfirmText('')
    } catch {
      toast.error('Failed to schedule account deletion')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spazeo-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleConsentToggle = async (consentType: string, currentlyGranted: boolean) => {
    const info = CONSENT_LABELS[consentType]
    if (info?.required && currentlyGranted) {
      toast.error(`${info.label} is required and cannot be revoked`)
      return
    }
    try {
      if (currentlyGranted) {
        await revokeConsent({ consentType: consentType as 'tos' | 'privacy' | 'marketing' | 'cookies' | 'dpdp', version: '1.0' })
        toast.success(`${info?.label ?? consentType} consent revoked`)
      } else {
        await grantConsent({ consentType: consentType as 'tos' | 'privacy' | 'marketing' | 'cookies' | 'dpdp', version: '1.0' })
        toast.success(`${info?.label ?? consentType} consent granted`)
      }
    } catch {
      toast.error('Failed to update consent')
    }
  }

  // Get connected accounts from Clerk
  const connectedAccounts = clerkUser?.externalAccounts ?? []

  // Skeleton placeholder for loading state
  const SkeletonBlock = ({ width = '100%', height = 40 }: { width?: string | number; height?: number }) => (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        backgroundColor: '#12100E',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#12100E',
    border: '1px solid rgba(212,160,23,0.12)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#F5F3EF',
    fontSize: 13,
    fontFamily: 'var(--font-dmsans)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#A8A29E',
    fontFamily: 'var(--font-dmsans)',
    marginBottom: 6,
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 12,
    backgroundColor: '#1B1916',
    border: '1px solid rgba(212,160,23,0.12)',
    padding: 24,
  }

  return (
    <div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top Bar */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#F5F3EF',
            fontFamily: 'var(--font-display)',
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#A8A29E',
            fontFamily: 'var(--font-dmsans)',
            marginTop: 6,
          }}
        >
          Manage your account, security, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid rgba(212,160,23,0.12)',
          marginBottom: 32,
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const isDanger = tab.id === 'danger'
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--font-dmsans)',
                color: isActive
                  ? '#F5F3EF'
                  : isDanger
                    ? '#F87171'
                    : '#6B6560',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #D4A017' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ====== PROFILE TAB ====== */}
      {activeTab === 'profile' && (
        <div style={cardStyle}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#F5F3EF',
                fontFamily: 'var(--font-display)',
                margin: 0,
              }}
            >
              Profile Information
            </h2>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: isSavingProfile || isLoading ? '#8B7312' : '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: isSavingProfile || isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isSavingProfile && !isLoading) e.currentTarget.style.backgroundColor = '#E5B120'
              }}
              onMouseLeave={(e) => {
                if (!isSavingProfile && !isLoading) e.currentTarget.style.backgroundColor = '#D4A017'
              }}
            >
              {isSavingProfile && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              Save Changes
            </button>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <SkeletonBlock width={80} height={80} />
                <SkeletonBlock width={72} height={32} />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}><SkeletonBlock height={40} /></div>
                <div style={{ flex: 1 }}><SkeletonBlock height={40} /></div>
              </div>
              <SkeletonBlock height={40} />
              <SkeletonBlock height={40} />
              <SkeletonBlock height={40} />
              <SkeletonBlock height={40} />
            </div>
          ) : (
            <>
              {/* Avatar Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(45,212,191,0.13)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: '#2DD4BF',
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: 1,
                    }}
                  >
                    {userInitials}
                  </span>
                </div>
                <div>
                  <button
                    onClick={() => openUserProfile()}
                    style={{
                      border: '1px solid rgba(212,160,23,0.12)',
                      backgroundColor: 'transparent',
                      color: '#A8A29E',
                      fontSize: 12,
                      fontFamily: 'var(--font-dmsans)',
                      fontWeight: 500,
                      borderRadius: 6,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.4)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                  >
                    Change
                  </button>
                  <p style={{ fontSize: 11, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '6px 0 0' }}>
                    Managed via Clerk profile
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* First Name + Last Name Row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={labelStyle}>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                    />
                  </div>
                </div>

                {/* Email Address (Read-only) */}
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={clerkUser?.primaryEmailAddress?.emailAddress ?? ''}
                    readOnly
                    style={{ ...inputStyle, color: '#6B6560', cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: 11, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '4px 0 0' }}>
                    Managed by Clerk
                  </p>
                </div>

                {/* Company */}
                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={13} style={{ color: '#6B6560' }} />
                    Company
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company name"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                  />
                </div>

                {/* Website */}
                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Globe size={13} style={{ color: '#6B6560' }} />
                    Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                  />
                </div>

                {/* City + Country Row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} style={{ color: '#6B6560' }} />
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Your city"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={labelStyle}>Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Your country"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                    />
                  </div>
                </div>

                {/* Camera Type */}
                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={13} style={{ color: '#6B6560' }} />
                    Camera Type
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={cameraType}
                      onChange={(e) => setCameraType(e.target.value)}
                      style={{
                        ...inputStyle,
                        paddingRight: 36,
                        color: cameraType ? '#F5F3EF' : '#6B6560',
                        appearance: 'none' as const,
                        cursor: 'pointer',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                    >
                      <option value="" disabled>Select camera type</option>
                      {CAMERA_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6560" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label style={labelStyle}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{
                        ...inputStyle,
                        paddingRight: 36,
                        color: role ? '#F5F3EF' : '#6B6560',
                        appearance: 'none' as const,
                        cursor: 'pointer',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212,160,23,0.12)' }}
                    >
                      <option value="" disabled>Select your role</option>
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6560" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {/* Property Focus */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Property Focus</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PROPERTY_FOCUS_OPTIONS.map((item) => {
                      const isSelected = propertyFocus.includes(item)
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleTogglePropertyFocus(item)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 500,
                            fontFamily: 'var(--font-dmsans)',
                            border: isSelected ? '1px solid #D4A017' : '1px solid rgba(212,160,23,0.12)',
                            backgroundColor: isSelected ? 'rgba(212,160,23,0.15)' : 'transparent',
                            color: isSelected ? '#D4A017' : '#A8A29E',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {isSelected && <Check size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
                          {item}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ====== SECURITY TAB ====== */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Connected Accounts */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Shield size={18} style={{ color: '#D4A017' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: 0 }}>
                Connected Accounts
              </h2>
            </div>
            <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Social accounts linked to your Spazeo profile
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Google */}
              {(() => {
                const googleAccount = connectedAccounts.find((a) => a.provider === 'google')
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderRadius: 8,
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>Google</p>
                        <p style={{ fontSize: 12, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '2px 0 0' }}>
                          {googleAccount ? googleAccount.emailAddress : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: 'var(--font-dmsans)',
                        padding: '4px 10px',
                        borderRadius: 9999,
                        backgroundColor: googleAccount ? 'rgba(52,211,153,0.12)' : 'rgba(107,101,96,0.12)',
                        color: googleAccount ? '#34D399' : '#6B6560',
                      }}
                    >
                      {googleAccount ? 'Connected' : 'Not linked'}
                    </span>
                  </div>
                )
              })()}

              {/* Apple */}
              {(() => {
                const appleAccount = connectedAccounts.find((a) => a.provider === 'apple')
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderRadius: 8,
                      backgroundColor: '#12100E',
                      border: '1px solid rgba(212,160,23,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#F5F3EF">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z" />
                      </svg>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>Apple</p>
                        <p style={{ fontSize: 12, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '2px 0 0' }}>
                          {appleAccount ? appleAccount.emailAddress : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: 'var(--font-dmsans)',
                        padding: '4px 10px',
                        borderRadius: 9999,
                        backgroundColor: appleAccount ? 'rgba(52,211,153,0.12)' : 'rgba(107,101,96,0.12)',
                        color: appleAccount ? '#34D399' : '#6B6560',
                      }}
                    >
                      {appleAccount ? 'Connected' : 'Not linked'}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldCheck size={18} style={{ color: '#2DD4BF' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: 0 }}>
                Two-Factor Authentication
              </h3>
            </div>
            <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Add an extra layer of security to your account. Two-factor authentication (2FA) can be configured
              through your Clerk account settings using an authenticator app or SMS.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderRadius: 8,
                backgroundColor: '#12100E',
                border: '1px solid rgba(212,160,23,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Lock size={16} style={{ color: '#6B6560' }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>
                    2FA Status
                  </p>
                  <p style={{ fontSize: 12, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '2px 0 0' }}>
                    {clerkUser?.twoFactorEnabled ? 'Enabled via authenticator app' : 'Not enabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => openUserProfile()}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-dmsans)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  backgroundColor: clerkUser?.twoFactorEnabled ? 'rgba(52,211,153,0.12)' : 'rgba(212,160,23,0.12)',
                  color: clerkUser?.twoFactorEnabled ? '#34D399' : '#D4A017',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {clerkUser?.twoFactorEnabled ? 'Manage' : 'Enable'}
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Monitor size={18} style={{ color: '#D4A017' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: 0 }}>
                Active Sessions
              </h3>
            </div>
            <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Devices currently signed in to your account
            </p>

            {/* Current session */}
            {session && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: 8,
                  backgroundColor: '#12100E',
                  border: '1px solid rgba(212,160,23,0.08)',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Smartphone size={16} style={{ color: '#2DD4BF' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>
                        Current session
                      </p>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: 'rgba(52,211,153,0.12)',
                          color: '#34D399',
                        }}
                      >
                        Active
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '2px 0 0' }}>
                      Last active: {new Date(session.lastActiveAt ?? Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sign out other devices */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => openUserProfile()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#D4A017',
                  color: '#0A0908',
                  fontFamily: 'var(--font-dmsans)',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5B120' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4A017' }}
              >
                <ExternalLink size={14} />
                Manage Security Settings
              </button>
              <button
                onClick={async () => {
                  try {
                    await signOut({ redirectUrl: '/sign-in' })
                  } catch {
                    toast.error('Failed to sign out')
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'transparent',
                  color: '#F87171',
                  fontFamily: 'var(--font-dmsans)',
                  fontSize: 14,
                  fontWeight: 600,
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8,
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <LogOut size={14} />
                Sign Out All Devices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== NOTIFICATIONS TAB ====== */}
      {activeTab === 'notifications' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: '0 0 8px' }}>
            Notification Preferences
          </h2>
          <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 24px' }}>
            Choose which notifications you want to receive
          </p>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SkeletonBlock width={180} height={16} />
                    <SkeletonBlock width={300} height={14} />
                  </div>
                  <SkeletonBlock width={44} height={24} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <NotificationRow
                label="New Lead Notifications"
                description="Get notified when someone submits a lead form on your tours"
                checked={notifNewLeads}
                onChange={(val) => handleNotificationToggle('newLeads', val)}
              />
              <div style={{ height: 1, backgroundColor: 'rgba(212,160,23,0.08)' }} />
              <NotificationRow
                label="Weekly Performance Summary"
                description="Receive a weekly email with your tour stats and insights"
                checked={notifWeeklyDigest}
                onChange={(val) => handleNotificationToggle('weeklyDigest', val)}
              />
              <div style={{ height: 1, backgroundColor: 'rgba(212,160,23,0.08)' }} />
              <NotificationRow
                label="Product Updates"
                description="Stay informed about new features and tips"
                checked={notifProductUpdates}
                onChange={(val) => handleNotificationToggle('productUpdates', val)}
              />
            </div>
          )}
        </div>
      )}

      {/* ====== PRIVACY & CONSENT TAB (SPA-16) ====== */}
      {activeTab === 'privacy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Current Consents */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <FileText size={18} style={{ color: '#D4A017' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: 0 }}>
                Privacy & Consent Management
              </h2>
            </div>
            <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Manage your data privacy preferences and consent settings. Required consents cannot be revoked
              while maintaining an active account.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {Object.entries(CONSENT_LABELS).map(([type, info], idx) => {
                const currentConsent = consents?.find((c) => c.consentType === type)
                const isGranted = currentConsent?.granted ?? false

                return (
                  <div key={type}>
                    {idx > 0 && <div style={{ height: 1, backgroundColor: 'rgba(212,160,23,0.08)' }} />}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 0',
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>
                            {info.label}
                          </p>
                          {info.required && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: 'rgba(248,113,113,0.12)',
                                color: '#F87171',
                              }}
                            >
                              Required
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '4px 0 0' }}>
                          {info.description}
                        </p>
                        {currentConsent && (
                          <p style={{ fontSize: 11, color: '#4A4540', fontFamily: 'var(--font-dmsans)', margin: '4px 0 0' }}>
                            Last updated: {new Date(currentConsent.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isGranted}
                        aria-label={info.label}
                        onClick={() => handleConsentToggle(type, isGranted)}
                        style={{
                          position: 'relative',
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          border: 'none',
                          backgroundColor: isGranted ? '#D4A017' : '#2E2A24',
                          cursor: info.required && isGranted ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                          transition: 'background-color 0.2s',
                          padding: 0,
                          opacity: info.required && isGranted ? 0.6 : 1,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: isGranted ? 22 : 2,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: isGranted ? '#FFFFFF' : '#A8A29E',
                            transition: 'left 0.2s, background-color 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Consent History */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Eye size={18} style={{ color: '#A8A29E' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: 0 }}>
                Consent History
              </h3>
            </div>
            <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 16px' }}>
              Full audit trail of your consent changes
            </p>

            {!consentHistory || consentHistory.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6B6560', fontFamily: 'var(--font-dmsans)' }}>
                No consent history recorded yet.
              </p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {consentHistory.slice(0, 20).map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: idx < consentHistory.length - 1 ? '1px solid rgba(212,160,23,0.06)' : 'none',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>
                        {CONSENT_LABELS[entry.consentType]?.label ?? entry.consentType}
                      </p>
                      <p style={{ fontSize: 11, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '2px 0 0' }}>
                        {new Date(entry.timestamp).toLocaleString()} - v{entry.version}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: entry.granted ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                        color: entry.granted ? '#34D399' : '#F87171',
                      }}
                    >
                      {entry.granted ? 'Granted' : 'Revoked'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== DANGER ZONE TAB ====== */}
      {activeTab === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Export Data (SPA-14) */}
          <div style={{ ...cardStyle, border: '1px solid rgba(212,160,23,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Download size={20} style={{ color: '#D4A017' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F3EF', fontFamily: 'var(--font-display)', margin: 0 }}>
                Export My Data
              </h2>
            </div>
            <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Download a copy of all your data including profile information, tours, scenes, leads, analytics, and consent records as a JSON file.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#D4A017',
                color: '#0A0908',
                fontFamily: 'var(--font-dmsans)',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: isExporting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!isExporting) e.currentTarget.style.backgroundColor = '#E5B120' }}
              onMouseLeave={(e) => { if (!isExporting) e.currentTarget.style.backgroundColor = '#D4A017' }}
            >
              {isExporting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
              {isExporting ? 'Exporting...' : 'Download My Data'}
            </button>
          </div>

          {/* Delete Account (SPA-14) */}
          <div style={{ ...cardStyle, border: '1px solid rgba(248,113,113,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} style={{ color: '#F87171' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F87171', fontFamily: 'var(--font-display)', margin: 0 }}>
                Delete Account
              </h2>
            </div>

            {convexUser?.deletionRequestedAt ? (
              <>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    backgroundColor: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.15)',
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 14, color: '#F87171', fontFamily: 'var(--font-dmsans)', margin: 0, fontWeight: 600 }}>
                    Account scheduled for deletion
                  </p>
                  <p style={{ fontSize: 13, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '8px 0 0', lineHeight: 1.5 }}>
                    Your account will be permanently deleted on{' '}
                    <strong style={{ color: '#F5F3EF' }}>
                      {new Date(convexUser.deletionRequestedAt + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </strong>
                    . You can cancel the deletion by clicking the button below.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await reactivateAccount()
                      toast.success('Account reactivated successfully')
                    } catch {
                      toast.error('Failed to reactivate account')
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#34D399',
                    color: '#0A0908',
                    fontFamily: 'var(--font-dmsans)',
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                >
                  Cancel Deletion & Reactivate
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', margin: '0 0 20px', lineHeight: 1.6 }}>
                  This will schedule your account for deletion. You have a 30-day grace period during which you can
                  reactivate your account. After 30 days, all your tours, scenes, leads, and analytics data will be
                  permanently deleted.
                </p>

                <div
                  style={{
                    backgroundColor: '#12100E',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid rgba(248,113,113,0.1)',
                    marginBottom: 20,
                  }}
                >
                  <label style={{ display: 'block', fontSize: 12, color: '#A8A29E', fontFamily: 'var(--font-dmsans)', marginBottom: 8 }}>
                    Type <strong style={{ color: '#F87171' }}>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    style={{
                      ...inputStyle,
                      backgroundColor: '#0A0908',
                      border: '1px solid rgba(248,113,113,0.2)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)' }}
                  />
                </div>

                <button
                  onClick={handleRequestDeletion}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: deleteConfirmText === 'DELETE' && !isDeleting ? '#F87171' : '#3D2020',
                    color: deleteConfirmText === 'DELETE' && !isDeleting ? '#FFFFFF' : '#6B6560',
                    fontFamily: 'var(--font-dmsans)',
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: deleteConfirmText === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s, color 0.2s',
                  }}
                >
                  {isDeleting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isDeleting ? 'Scheduling...' : 'Schedule Account Deletion'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Notification row sub-component ---- */

function NotificationRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        gap: 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#F5F3EF', fontFamily: 'var(--font-dmsans)', margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 13, color: '#6B6560', fontFamily: 'var(--font-dmsans)', margin: '4px 0 0' }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          backgroundColor: checked ? '#D4A017' : '#2E2A24',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background-color 0.2s',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: checked ? '#FFFFFF' : '#A8A29E',
            transition: 'left 0.2s, background-color 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}
