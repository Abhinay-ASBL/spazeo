import type { Id } from '../../convex/_generated/dataModel'

// --- Core enums ---

export type TourStatus = 'draft' | 'published' | 'archived'
export type UserPlan = 'free' | 'starter' | 'professional' | 'business' | 'enterprise'
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type HotspotType = 'navigation' | 'info' | 'media' | 'link'
export type PanoramaType = 'equirectangular' | 'cubemap' | 'gaussian'
export type AIJobType = 'scene_analysis' | 'staging' | 'description' | 'floor_plan' | 'enhancement' | 'auto_hotspots'
export type AIJobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type TourType = 'residential' | 'commercial' | 'vacation_rental' | 'restaurant' | 'other'
export type TourPrivacy = 'public' | 'unlisted' | 'password_protected'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'archived'
export type UserType = 'agent' | 'photographer' | 'developer' | 'manager' | 'other'
export type CameraTypeOption = 'insta360' | 'ricoh_theta' | 'gopro_max' | 'smartphone' | 'dslr_adapter' | 'other'
export type PropertyFocusOption = 'residential' | 'commercial' | 'hospitality' | 'industrial' | 'mixed_use'
export type StagingStyle = 'modern' | 'scandinavian' | 'luxury' | 'minimalist' | 'industrial'
export type DescriptionTone = 'professional' | 'casual' | 'luxury'
export type DeviceType = 'desktop' | 'mobile' | 'tablet'
export type ActivityType = 'tour_created' | 'tour_published' | 'lead_captured' | 'ai_completed' | 'scene_uploaded' | 'building_created' | 'building_published'
export type LeadGateBehavior = 'before_tour' | 'after_delay' | 'optional_sidebar'

// --- Config objects ---

export interface NotificationPreferences {
  newLeads: boolean
  weeklyDigest: boolean
  productUpdates: boolean
}

export interface LeadCaptureConfig {
  enabled: boolean
  fields: string[]
  gateBehavior: LeadGateBehavior
  delaySeconds?: number
}

export interface BrandingConfig {
  logoStorageId?: Id<'_storage'>
  brandColor?: string
  showPoweredBy?: boolean
}

export interface SeoConfig {
  metaTitle?: string
  metaDescription?: string
  socialImageStorageId?: Id<'_storage'>
}

export interface DeviceInfo {
  type?: string
  browser?: string
  os?: string
}

export interface LocationInfo {
  country?: string
  city?: string
}

export interface LeadNote {
  text: string
  createdAt: number
}

// --- Stats ---

export interface TourStats {
  totalTours: number
  activeTours: number
  totalViews: number
  avgViewsPerTour: number
  totalLeads?: number
  topTour?: { title: string; viewCount: number; id: Id<'tours'> }
}

export interface TourCountByStatus {
  total: number
  draft: number
  published: number
  archived: number
}

export interface LeadStats {
  total: number
  new: number
  contacted: number
  qualified: number
  archived: number
  newThisWeek: number
}

export interface DashboardStats {
  viewsThisWeek: number
  leadsThisWeek: number
  totalTours: number
  activeTours: number
}

export interface AIUsage {
  creditsUsed: number
  limit: number
  isUnlimited: boolean
  remaining: number
}

export interface UsageInfo {
  toursCreated: number
  tourLimit: number
  totalScenes: number
  aiCreditsUsed: number
  aiCreditLimit: number
  plan: UserPlan
}

// --- Upload ---

export interface UploadedFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  storageId?: Id<'_storage'>
}

// --- Viewer ---

export interface Hotspot {
  id: string
  scene_id?: string
  target_scene_id?: string | null
  position_x: number
  position_y: number
  position_z: number
  label: string | null
  icon: string
}

export interface Scene {
  id: string
  tour_id?: string
  title: string
  panorama_url: string
  thumbnail_url: string | null
  position_order: number
  hotspots?: Hotspot[]
}

export interface ViewerScene {
  id: string
  title: string
  imageUrl: string | null
  thumbnailUrl: string | null
  order: number
  hotspots: Array<{
    id: string
    targetSceneId?: string
    type: HotspotType
    position: { x: number; y: number; z: number }
    tooltip?: string
    icon?: string
  }>
}

// --- Invoice ---

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: string | null
  date: number
  pdfUrl: string | null
  hostedUrl: string | null
}

// --- Activity ---

export interface ActivityItem {
  _id: string
  userId: Id<'users'>
  type: ActivityType
  tourId?: Id<'tours'>
  message: string
  timestamp: number
}

// --- PRD-010: 3D Model Viewer & Exterior Views ---

export type BuildingStatus = 'draft' | 'published'
export type EnvironmentType = 'google3d' | 'hdri' | 'procedural'
export type TimeOfDay = 'morning' | 'afternoon' | 'sunset' | 'night'
export type ViewDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW'
export type CornerType = 'corner' | 'middle'
export type UnitType = '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'penthouse'
export type UnitStatus = 'available' | 'sold' | 'reserved'
export type ConversionJobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type BuildingEvent = 'model_view' | 'floor_select' | 'unit_click' | 'panorama_view' | 'comparison_view'

export interface BuildingLocation {
  lat: number
  lng: number
  elevation?: number
}

export interface BuildingSettings {
  autoRotate?: boolean
  showFloorSelector?: boolean
  showPositionSelector?: boolean
  allowComparison?: boolean
  defaultFloor?: number
  cameraDistance?: number
  cameraAngle?: number
}

export interface ViewCoordinates {
  x: number
  y: number
  z: number
}

export interface CameraDirection {
  heading: number
  pitch: number
  roll: number
}

export interface PanoramaResolution {
  w: number
  h: number
}
