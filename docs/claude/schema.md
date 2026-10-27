# Spazeo — Database Schema (Convex)

> Moved verbatim from `AGENTS.md`/`CLAUDE.md` to keep startup context small.

## Database Schema (Convex)

| Table | Key Fields | Indexes |
|---|---|---|
| users | clerkId, email, name, plan, role, onboardingComplete | by_clerkId, by_email |
| tours | userId, title, slug, status, settings, leadCaptureConfig, brandingConfig, seoConfig | by_userId, by_slug, by_status; searchIndex on title |
| scenes | tourId, title, imageStorageId, order, panoramaType, aiAnalysis | by_tourId |
| hotspots | sceneId, targetSceneId, type, position, tooltip | by_sceneId |
| floorPlans | tourId, imageStorageId, rooms, scale | by_tourId |
| leads | tourId, name, email, status, notes, deviceInfo, locationInfo | by_tourId, by_email |
| analytics | tourId, event, sessionId, sceneId, timestamp, deviceType | by_tourId, by_event, by_timestamp |
| dailyAnalytics | tourId, date, views, uniqueVisitors, avgDuration, leadsCount | by_tourId_date |
| activityLog | userId, type, tourId, message, timestamp | by_userId |
| subscriptions | userId, stripeCustomerId, plan, status, currentPeriodEnd | by_userId, by_stripeCustomerId |
| teamMembers | teamId, userId, role, invitedBy | by_teamId, by_userId |
| aiJobs | tourId, sceneId, type, status, input, output, provider, userId | by_tourId, by_status, by_userId |
| buildings | userId, name, slug, location, totalFloors, totalBlocks, status | by_userId, by_slug, by_status |
| buildingBlocks | buildingId, blockNumber, name, apartmentsPerFloor | by_buildingId |
| viewPositions | buildingId, blockId, floor, positionIndex, direction, coordinates | by_buildingId, by_blockId_floor |
| exteriorPanoramas | viewPositionId, buildingId, imageStorageId, timeOfDay | by_viewPositionId, by_buildingId |
| buildingUnits | buildingId, blockId, floor, unitNumber, type, tourId, status | by_buildingId, by_floor, by_tourId |
| conversionJobs | buildingId, inputStorageId, status, progress | by_buildingId, by_status |
| buildingAnalytics | buildingId, event, sessionId, floor, unitNumber | by_buildingId, by_event |
| blogPosts | title, slug, content, category, status | by_slug, by_category, by_status |
| consents | userId, consentType, version, granted | by_userId, by_userId_consentType |
| demoTours | title, slug, propertyType, tourId | by_slug, by_propertyType |
| pricingPlans | name, slug, priceUsd, priceInr, limits, stripePriceId | by_slug |
| newsletterSubscriptions | email, subscribedAt, confirmed | by_email |
| notifications | userId, type, title, message, read | by_userId, by_read |
| contactSubmissions | name, email, message, page | by_email |
