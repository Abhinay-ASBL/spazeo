export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    annualPrice: 0,
    tourLimit: 3,
    sceneLimit: 10,
    aiCredits: 3, // AI scene analysis only, 3 staging images total
    features: [
      '3 active tours',
      '10 scenes per tour',
      'AI scene analysis',
      'Basic analytics',
      'Spazeo branding',
      'Community support',
    ],
  },
  starter: {
    name: 'Starter',
    price: 19,
    annualPrice: 182, // ~20% discount
    tourLimit: 10,
    sceneLimit: 25,
    aiCredits: 5, // 5 AI staging/month
    features: [
      '10 active tours',
      '25 scenes per tour',
      'AI staging (5/month)',
      'AI descriptions',
      'Lead capture',
      'Custom branding',
      'Email support',
    ],
  },
  professional: {
    name: 'Professional',
    price: 49,
    annualPrice: 470,
    tourLimit: -1, // unlimited
    sceneLimit: 50,
    aiCredits: -1, // unlimited
    features: [
      'Unlimited tours',
      '50 scenes per tour',
      'Unlimited AI features',
      'Advanced analytics',
      'API access',
      'White-label',
      'Priority support',
    ],
  },
  business: {
    name: 'Business',
    price: 99,
    annualPrice: 950,
    tourLimit: -1,
    sceneLimit: 100,
    aiCredits: -1,
    features: [
      'Everything in Professional',
      '100 scenes per tour',
      '5 team seats',
      'Bulk operations',
      'Custom domain',
      'Phone support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: -1, // custom
    annualPrice: -1,
    tourLimit: -1,
    sceneLimit: -1,
    aiCredits: -1,
    features: [
      'Everything in Business',
      'Unlimited scenes',
      'Unlimited team seats',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated account manager',
      'On-premise option',
    ],
  },
} as const

export const AI_CREDITS_PER_PLAN = {
  free: 3,
  starter: 5,
  professional: -1, // unlimited
  business: -1,
  enterprise: -1,
} as const

export const TOUR_LIMITS = {
  free: 3,
  starter: 10,
  professional: -1,
  business: -1,
  enterprise: -1,
} as const

export const SCENE_LIMITS = {
  free: 10,
  starter: 25,
  professional: 50,
  business: 100,
  enterprise: -1,
} as const

export const STAGING_STYLES = [
  { value: 'modern', label: 'Modern', description: 'Clean lines, neutral colors, contemporary furniture' },
  { value: 'scandinavian', label: 'Scandinavian', description: 'Light wood, white walls, minimal cozy furniture' },
  { value: 'luxury', label: 'Luxury', description: 'High-end furniture, marble, gold accents' },
  { value: 'minimalist', label: 'Minimalist', description: 'Very few items, open space, zen-like' },
  { value: 'industrial', label: 'Industrial', description: 'Exposed brick, metal elements, loft style' },
] as const

export const DESCRIPTION_TONES = [
  { value: 'professional', label: 'Professional', description: 'Polished, suitable for high-end real estate' },
  { value: 'casual', label: 'Casual', description: 'Friendly, approachable, feels like home' },
  { value: 'luxury', label: 'Luxury', description: 'Aspirational, premium, exclusive' },
] as const

export const TOUR_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  vacation_rental: 'Vacation Rental',
  restaurant: 'Restaurant',
  other: 'Other',
}

export const TOUR_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  archived: 'Archived',
}

export const AI_JOB_TYPE_LABELS: Record<string, string> = {
  scene_analysis: 'Scene Analysis',
  staging: 'Virtual Staging',
  description: 'Description Generation',
  floor_plan: 'Floor Plan Generation',
  enhancement: 'Image Enhancement',
  auto_hotspots: 'Auto Hotspot Detection',
}

export const AI_JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

export const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone with the link can view' },
  { value: 'unlisted', label: 'Unlisted', description: 'Only people with the direct link' },
  { value: 'password_protected', label: 'Password Protected', description: 'Requires a password to view' },
] as const

export const GATE_BEHAVIOR_OPTIONS = [
  { value: 'before_tour', label: 'Before Tour', description: 'Show lead form before the tour starts' },
  { value: 'after_delay', label: 'After Delay', description: 'Show lead form after a set time' },
  { value: 'optional_sidebar', label: 'Optional Sidebar', description: 'Show lead form as an optional sidebar' },
] as const

// --- PRD-003: Onboarding Options ---

export const ROLE_OPTIONS = [
  { value: 'agent', label: 'Real Estate Agent', description: 'I list and sell properties', icon: 'Home' },
  { value: 'developer', label: 'Property Developer', description: 'I build residential/commercial projects', icon: 'Building2' },
  { value: 'photographer', label: 'Photographer / Videographer', description: 'I create virtual tours for clients', icon: 'Camera' },
  { value: 'manager', label: 'Property Manager', description: 'I manage properties and tenants', icon: 'Key' },
  { value: 'other', label: 'Other', description: 'Tell us what you do', icon: 'User' },
] as const

export const PROPERTY_FOCUS_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
] as const

export const CAMERA_TYPE_OPTIONS = [
  { value: 'insta360', label: 'Insta360 X3/X4', icon: 'Camera' },
  { value: 'ricoh_theta', label: 'Ricoh Theta Z1/X', icon: 'Camera' },
  { value: 'gopro_max', label: 'GoPro MAX', icon: 'Camera' },
  { value: 'smartphone', label: 'Smartphone', icon: 'Smartphone' },
  { value: 'dslr_adapter', label: 'DSLR + Adapter', icon: 'Aperture' },
  { value: 'other', label: 'Other', icon: 'HelpCircle' },
] as const

// --- PRD-010: 3D Building Viewer ---

export const BUILDING_ENVIRONMENT_OPTIONS = [
  { value: 'google3d', label: 'Google 3D Tiles', description: 'Real surrounding cityscape from Google Maps' },
  { value: 'hdri', label: 'HDRI Environment', description: 'Pre-captured 360° sky and surroundings' },
  { value: 'procedural', label: 'Procedural Sky', description: 'Physics-based dynamic sky simulation' },
] as const

export const TIME_OF_DAY_OPTIONS = [
  { value: 'morning', label: 'Morning', description: 'Sunrise, warm golden light' },
  { value: 'afternoon', label: 'Afternoon', description: 'Bright daylight, clear sky' },
  { value: 'sunset', label: 'Sunset', description: 'Golden hour, warm orange tones' },
  { value: 'night', label: 'Night', description: 'City lights, blue hour' },
] as const

export const VIEW_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW'] as const

export const UNIT_TYPES = [
  { value: '1BHK', label: '1 BHK' },
  { value: '2BHK', label: '2 BHK' },
  { value: '3BHK', label: '3 BHK' },
  { value: '4BHK', label: '4 BHK' },
  { value: 'penthouse', label: 'Penthouse' },
] as const

export const UNIT_STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  sold: 'Sold',
  reserved: 'Reserved',
}

export const SUPPORTED_3D_FORMATS = ['.blend', '.skp', '.fbx', '.obj', '.gltf', '.glb', '.ifc'] as const
export const MAX_3D_FILE_SIZE = 500 * 1024 * 1024 // 500MB

export const BUILDING_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
}
