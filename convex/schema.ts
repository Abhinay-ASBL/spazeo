import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    plan: v.union(v.literal('free'), v.literal('starter'), v.literal('professional'), v.literal('business'), v.literal('enterprise')),
    role: v.union(v.literal('owner'), v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    onboardingComplete: v.boolean(),
    // Onboarding data
    userType: v.optional(
      v.union(
        v.literal('agent'),
        v.literal('photographer'),
        v.literal('developer'),
        v.literal('manager'),
        v.literal('other')
      )
    ),
    roleOther: v.optional(v.string()),
    country: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    company: v.optional(v.string()),
    website: v.optional(v.string()),
    // Onboarding wizard state
    onboardingStep: v.optional(v.number()),
    propertyFocus: v.optional(v.array(v.string())),
    cameraType: v.optional(v.string()),
    // Login tracking
    lastLoginAt: v.optional(v.number()),
    loginCount: v.optional(v.number()),
    // Notification preferences
    notificationPreferences: v.optional(
      v.object({
        newLeads: v.boolean(),
        weeklyDigest: v.boolean(),
        productUpdates: v.boolean(),
      })
    ),
    // API access (Professional+ plans)
    apiKey: v.optional(v.string()),
    // AI usage tracking
    aiCreditsUsed: v.optional(v.number()),
    // Account lockout (SPA-15)
    failedLoginAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    // Account deletion (SPA-14)
    deletionRequestedAt: v.optional(v.number()),
    // City for profile (SPA-14)
    city: v.optional(v.string()),
    // Dashboard checklist (SPA-25)
    checklistDismissed: v.optional(v.boolean()),
  })
    .index('by_clerkId', ['clerkId'])
    .index('by_email', ['email']),

  tours: defineTable({
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    slug: v.string(),
    status: v.union(v.literal('draft'), v.literal('published'), v.literal('archived')),
    settings: v.optional(
      v.object({
        autoRotate: v.optional(v.boolean()),
        showMiniMap: v.optional(v.boolean()),
        allowFullscreen: v.optional(v.boolean()),
        brandingEnabled: v.optional(v.boolean()),
      })
    ),
    thumbnailStorageId: v.optional(v.id('_storage')),
    viewCount: v.number(),
    publishedAt: v.optional(v.number()),
    embedCode: v.optional(v.string()),
    // New fields
    address: v.optional(v.string()),
    tourType: v.optional(
      v.union(
        v.literal('residential'),
        v.literal('commercial'),
        v.literal('vacation_rental'),
        v.literal('restaurant'),
        v.literal('other')
      )
    ),
    privacy: v.optional(
      v.union(v.literal('public'), v.literal('unlisted'), v.literal('password_protected'))
    ),
    password: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    coverSceneId: v.optional(v.id('scenes')),
    autoplay: v.optional(v.boolean()),
    autoplaySpeed: v.optional(v.number()),
    leadCaptureConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        fields: v.array(v.string()),
        gateBehavior: v.union(
          v.literal('before_tour'),
          v.literal('after_delay'),
          v.literal('optional_sidebar')
        ),
        delaySeconds: v.optional(v.number()),
      })
    ),
    brandingConfig: v.optional(
      v.object({
        logoStorageId: v.optional(v.id('_storage')),
        brandColor: v.optional(v.string()),
        showPoweredBy: v.optional(v.boolean()),
      })
    ),
    seoConfig: v.optional(
      v.object({
        metaTitle: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        socialImageStorageId: v.optional(v.id('_storage')),
      })
    ),
  })
    .index('by_userId', ['userId'])
    .index('by_slug', ['slug'])
    .index('by_status', ['status'])
    .searchIndex('search_tours', {
      searchField: 'title',
      filterFields: ['userId', 'status'],
    }),

  scenes: defineTable({
    tourId: v.id('tours'),
    title: v.string(),
    imageStorageId: v.id('_storage'),
    thumbnailStorageId: v.optional(v.id('_storage')),
    order: v.number(),
    panoramaType: v.union(v.literal('equirectangular'), v.literal('cubemap'), v.literal('gaussian')),
    roomType: v.optional(v.string()),
    aiAnalysis: v.optional(
      v.object({
        objects: v.optional(v.array(v.string())),
        features: v.optional(v.array(v.string())),
        qualityScore: v.optional(v.number()),
        suggestions: v.optional(v.array(v.string())),
      })
    ),
    stagedImageStorageId: v.optional(v.id('_storage')),
    description: v.optional(v.string()),
  }).index('by_tourId', ['tourId']),

  hotspots: defineTable({
    sceneId: v.id('scenes'),
    targetSceneId: v.optional(v.id('scenes')),
    type: v.union(v.literal('navigation'), v.literal('info'), v.literal('media'), v.literal('link')),
    position: v.object({
      x: v.number(),
      y: v.number(),
      z: v.number(),
    }),
    tooltip: v.optional(v.string()),
    icon: v.optional(v.string()),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    visible: v.optional(v.boolean()),
    // Phase 6 additions — all optional for backward compatibility
    iconName: v.optional(v.string()),
    panelLayout: v.optional(v.union(v.literal('compact'), v.literal('rich'), v.literal('video'))),
    videoUrl: v.optional(v.string()),
    ctaLabel: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  }).index('by_sceneId', ['sceneId']),

  floorPlans: defineTable({
    tourId: v.id('tours'),
    imageStorageId: v.id('_storage'),
    rooms: v.optional(
      v.array(
        v.object({
          name: v.string(),
          sceneId: v.optional(v.id('scenes')),
          polygon: v.array(v.object({ x: v.number(), y: v.number() })),
        })
      )
    ),
    scale: v.optional(v.number()),
  }).index('by_tourId', ['tourId']),

  leads: defineTable({
    tourId: v.id('tours'),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    // New fields
    status: v.optional(
      v.union(
        v.literal('new'),
        v.literal('contacted'),
        v.literal('qualified'),
        v.literal('archived')
      )
    ),
    notes: v.optional(
      v.array(
        v.object({
          text: v.string(),
          createdAt: v.number(),
        })
      )
    ),
    viewedScenes: v.optional(v.array(v.id('scenes'))),
    timeSpent: v.optional(v.number()),
    deviceInfo: v.optional(
      v.object({
        type: v.optional(v.string()),
        browser: v.optional(v.string()),
        os: v.optional(v.string()),
      })
    ),
    locationInfo: v.optional(
      v.object({
        country: v.optional(v.string()),
        city: v.optional(v.string()),
      })
    ),
  })
    .index('by_tourId', ['tourId'])
    .index('by_email', ['email']),

  analytics: defineTable({
    tourId: v.id('tours'),
    event: v.string(),
    sessionId: v.string(),
    sceneId: v.optional(v.id('scenes')),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    // New fields
    deviceType: v.optional(
      v.union(v.literal('desktop'), v.literal('mobile'), v.literal('tablet'))
    ),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    duration: v.optional(v.number()),
  })
    .index('by_tourId', ['tourId'])
    .index('by_event', ['event'])
    .index('by_timestamp', ['timestamp']),

  dailyAnalytics: defineTable({
    tourId: v.id('tours'),
    date: v.string(), // YYYY-MM-DD
    views: v.number(),
    uniqueVisitors: v.number(),
    avgDuration: v.number(),
    leadsCount: v.number(),
    sceneViews: v.optional(v.any()), // Record<sceneId, count>
    deviceBreakdown: v.optional(
      v.object({
        desktop: v.number(),
        mobile: v.number(),
        tablet: v.number(),
      })
    ),
    topCountries: v.optional(v.any()), // Record<country, count>
  }).index('by_tourId_date', ['tourId', 'date']),

  activityLog: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('tour_created'),
      v.literal('tour_published'),
      v.literal('tour_archived'),
      v.literal('tour_deleted'),
      v.literal('tour_duplicated'),
      v.literal('tour_updated'),
      v.literal('lead_captured'),
      v.literal('ai_completed'),
      v.literal('scene_uploaded'),
      v.literal('scene_removed'),
      v.literal('building_created'),
      v.literal('building_published')
    ),
    tourId: v.optional(v.id('tours')),
    message: v.string(),
    timestamp: v.number(),
  }).index('by_userId', ['userId']),

  subscriptions: defineTable({
    userId: v.id('users'),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.union(v.literal('free'), v.literal('starter'), v.literal('professional'), v.literal('business'), v.literal('enterprise')),
    status: v.union(
      v.literal('active'),
      v.literal('canceled'),
      v.literal('past_due'),
      v.literal('trialing'),
      v.literal('incomplete')
    ),
    currentPeriodEnd: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_stripeCustomerId', ['stripeCustomerId']),

  teamMembers: defineTable({
    teamId: v.string(),
    userId: v.id('users'),
    role: v.union(v.literal('owner'), v.literal('admin'), v.literal('editor'), v.literal('viewer')),
    invitedBy: v.id('users'),
  })
    .index('by_teamId', ['teamId'])
    .index('by_userId', ['userId']),

  aiJobs: defineTable({
    tourId: v.id('tours'),
    sceneId: v.optional(v.id('scenes')),
    type: v.union(
      v.literal('scene_analysis'),
      v.literal('staging'),
      v.literal('description'),
      v.literal('floor_plan'),
      v.literal('enhancement'),
      v.literal('auto_hotspots')
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    provider: v.optional(v.string()),
    error: v.optional(v.string()),
    creditsUsed: v.optional(v.number()),
    duration: v.optional(v.number()),
    userId: v.optional(v.id('users')),
  })
    .index('by_tourId', ['tourId'])
    .index('by_status', ['status'])
    .index('by_userId', ['userId']),

  // --- PRD-010: 3D Model Viewer & Exterior Views ---

  buildings: defineTable({
    userId: v.id('users'),
    name: v.string(),
    slug: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
      elevation: v.optional(v.number()),
    }),
    totalFloors: v.number(),
    totalBlocks: v.number(),
    status: v.union(v.literal('draft'), v.literal('published')),
    modelStorageId: v.optional(v.id('_storage')),
    optimizedModelStorageId: v.optional(v.id('_storage')),
    environmentType: v.optional(
      v.union(v.literal('google3d'), v.literal('hdri'), v.literal('procedural'))
    ),
    settings: v.optional(
      v.object({
        autoRotate: v.optional(v.boolean()),
        showFloorSelector: v.optional(v.boolean()),
        showPositionSelector: v.optional(v.boolean()),
        allowComparison: v.optional(v.boolean()),
        defaultFloor: v.optional(v.number()),
        cameraDistance: v.optional(v.number()),
        cameraAngle: v.optional(v.number()),
      })
    ),
    thumbnailStorageId: v.optional(v.id('_storage')),
    viewCount: v.number(),
    publishedAt: v.optional(v.number()),
    embedCode: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_slug', ['slug'])
    .index('by_status', ['status']),

  buildingBlocks: defineTable({
    buildingId: v.id('buildings'),
    blockNumber: v.number(),
    name: v.string(),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        z: v.number(),
      })
    ),
    apartmentsPerFloor: v.number(),
    modelPartId: v.optional(v.string()),
  }).index('by_buildingId', ['buildingId']),

  viewPositions: defineTable({
    buildingId: v.id('buildings'),
    blockId: v.id('buildingBlocks'),
    floor: v.number(),
    positionIndex: v.number(), // 0-5
    direction: v.union(
      v.literal('N'),
      v.literal('NE'),
      v.literal('E'),
      v.literal('SE'),
      v.literal('S'),
      v.literal('SW')
    ),
    cornerType: v.union(v.literal('corner'), v.literal('middle')),
    coordinates: v.object({
      x: v.number(),
      y: v.number(),
      z: v.number(),
    }),
    cameraDirection: v.object({
      heading: v.number(),
      pitch: v.number(),
      roll: v.number(),
    }),
  })
    .index('by_buildingId', ['buildingId'])
    .index('by_blockId_floor', ['blockId', 'floor']),

  exteriorPanoramas: defineTable({
    viewPositionId: v.id('viewPositions'),
    buildingId: v.id('buildings'),
    imageStorageId: v.id('_storage'),
    thumbnailStorageId: v.optional(v.id('_storage')),
    format: v.literal('equirectangular'),
    resolution: v.object({
      w: v.number(),
      h: v.number(),
    }),
    timeOfDay: v.union(
      v.literal('morning'),
      v.literal('afternoon'),
      v.literal('sunset'),
      v.literal('night')
    ),
    environmentUsed: v.optional(v.string()),
    generatedAt: v.number(),
  })
    .index('by_viewPositionId', ['viewPositionId'])
    .index('by_buildingId', ['buildingId']),

  buildingUnits: defineTable({
    buildingId: v.id('buildings'),
    blockId: v.id('buildingBlocks'),
    floor: v.number(),
    unitNumber: v.string(),
    type: v.union(
      v.literal('1BHK'),
      v.literal('2BHK'),
      v.literal('3BHK'),
      v.literal('4BHK'),
      v.literal('penthouse')
    ),
    area: v.optional(v.number()),
    facing: v.optional(v.string()),
    tourId: v.optional(v.id('tours')),
    balconyViewPositionIds: v.optional(v.array(v.id('viewPositions'))),
    status: v.union(
      v.literal('available'),
      v.literal('sold'),
      v.literal('reserved')
    ),
    price: v.optional(v.number()),
  })
    .index('by_buildingId', ['buildingId'])
    .index('by_floor', ['floor'])
    .index('by_tourId', ['tourId']),

  conversionJobs: defineTable({
    buildingId: v.id('buildings'),
    inputStorageId: v.id('_storage'),
    inputFormat: v.string(),
    outputStorageId: v.optional(v.id('_storage')),
    outputFormat: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    progress: v.number(),
    polyCount: v.optional(v.number()),
    textureCount: v.optional(v.number()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_buildingId', ['buildingId'])
    .index('by_status', ['status']),

  buildingAnalytics: defineTable({
    buildingId: v.id('buildings'),
    event: v.string(),
    sessionId: v.string(),
    floor: v.optional(v.number()),
    unitNumber: v.optional(v.string()),
    viewPositionId: v.optional(v.id('viewPositions')),
    device: v.optional(v.string()),
    duration: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index('by_buildingId', ['buildingId'])
    .index('by_event', ['event']),

  blogPosts: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.string(),
    author: v.string(),
    category: v.union(
      v.literal('product_updates'),
      v.literal('tutorials'),
      v.literal('industry'),
      v.literal('case_studies'),
      v.literal('ai_technology'),
      v.literal('company_news')
    ),
    tags: v.array(v.string()),
    publishedAt: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    featuredImageStorageId: v.optional(v.id('_storage')),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    status: v.union(v.literal('draft'), v.literal('published'), v.literal('archived')),
  })
    .index('by_slug', ['slug'])
    .index('by_category', ['category'])
    .index('by_status', ['status']),

  // --- SPA-16: Consent Management & GDPR Logging ---

  consents: defineTable({
    userId: v.id('users'),
    consentType: v.union(
      v.literal('tos'),
      v.literal('privacy'),
      v.literal('marketing'),
      v.literal('cookies'),
      v.literal('dpdp')
    ),
    version: v.string(),
    granted: v.boolean(),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_consentType', ['userId', 'consentType']),

  demoTours: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    propertyType: v.union(
      v.literal('residential'),
      v.literal('commercial'),
      v.literal('luxury'),
      v.literal('restaurant'),
      v.literal('student')
    ),
    sceneCount: v.number(),
    aiFeatures: v.array(v.string()),
    thumbnailStorageId: v.optional(v.id('_storage')),
    tourId: v.optional(v.id('tours')),
    featured: v.optional(v.boolean()),
    order: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_propertyType', ['propertyType']),

  pricingPlans: defineTable({
    name: v.string(),
    slug: v.string(),
    priceUsd: v.number(),
    priceInr: v.number(),
    interval: v.union(v.literal('monthly'), v.literal('yearly')),
    features: v.array(v.string()),
    limits: v.object({
      tours: v.number(),
      scenes: v.number(),
      aiCredits: v.number(),
      storage: v.number(),
    }),
    popular: v.optional(v.boolean()),
    ctaText: v.string(),
    stripePriceId: v.optional(v.string()),
    order: v.number(),
  })
    .index('by_slug', ['slug']),

  newsletterSubscriptions: defineTable({
    email: v.string(),
    subscribedAt: v.number(),
    confirmed: v.boolean(),
    source: v.optional(v.string()),
    unsubscribedAt: v.optional(v.number()),
  })
    .index('by_email', ['email']),

  notifications: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('lead_captured'),
      v.literal('tour_milestone'),
      v.literal('ai_completed'),
      v.literal('tour_error'),
      v.literal('weekly_summary')
    ),
    title: v.string(),
    message: v.string(),
    tourId: v.optional(v.id('tours')),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_read', ['read']),

  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    message: v.string(),
    page: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_email', ['email']),
})
