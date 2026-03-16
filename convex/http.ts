import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal, api } from './_generated/api'
import Stripe from 'stripe'

const http = httpRouter()

// --- CORS helpers ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// --- CORS preflight for all /api/* routes ---

http.route({
  path: '/api/tour',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
})

http.route({
  path: '/api/analytics',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
})

http.route({
  path: '/api/leads',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
})

// --- Stripe Webhook ---

http.route({
  path: '/stripe-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    let event: Stripe.Event
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-02-25.clover',
      })
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    try {
      // FIX-03 verified: all four Stripe webhook event types are fully handled.
      // checkout.session.completed -> upsertFromStripe + syncPlanToUser
      // customer.subscription.updated -> upsertFromStripe + syncPlanToUser
      // customer.subscription.deleted -> downgrade to free via upsertFromStripe + syncPlanToUser
      // invoice.payment_failed -> mark past_due via upsertFromStripe
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const clerkId = session.metadata?.clerkId
          const convexUserId = session.metadata?.convexUserId
          const plan = session.metadata?.plan as 'starter' | 'professional' | 'business' | 'enterprise' | undefined

          if (!convexUserId || !plan) {
            console.error('Missing metadata in checkout session')
            break
          }

          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id

          const customerId =
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id

          if (!customerId) break

          // Create/update subscription record
          await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
            userId: convexUserId as any,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
            plan,
            status: 'active',
          })

          // Update user plan
          await ctx.runMutation(internal.subscriptions.syncPlanToUser, {
            userId: convexUserId as any,
            plan,
          })

          break
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          const customerId =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id

          // Look up user by Stripe customer ID
          const user = await ctx.runQuery(
            internal.subscriptions.getUserByStripeCustomerId,
            { stripeCustomerId: customerId }
          )
          if (!user) {
            console.error('User not found for Stripe customer:', customerId)
            break
          }

          // Determine plan from price
          const priceId = subscription.items.data[0]?.price?.id
          let plan: 'free' | 'starter' | 'professional' | 'business' | 'enterprise' = 'free'
          if (priceId) {
            // Match against known price IDs
            const starterPrices = [
              process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
              process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
            ]
            const professionalPrices = [
              process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
              process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
            ]
            const businessPrices = [
              process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
              process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID,
            ]

            if (starterPrices.includes(priceId)) plan = 'starter'
            else if (professionalPrices.includes(priceId)) plan = 'professional'
            else if (businessPrices.includes(priceId)) plan = 'business'
          }

          const status = mapStripeStatus(subscription.status)

          await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
            userId: user._id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            plan,
            status,
            currentPeriodEnd: subscription.items.data[0]?.current_period_end
              ? subscription.items.data[0].current_period_end * 1000
              : undefined,
          })

          await ctx.runMutation(internal.subscriptions.syncPlanToUser, {
            userId: user._id,
            plan,
          })

          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          const customerId =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id

          const user = await ctx.runQuery(
            internal.subscriptions.getUserByStripeCustomerId,
            { stripeCustomerId: customerId }
          )
          if (!user) break

          // Mark as canceled and downgrade to free
          await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
            userId: user._id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            plan: 'free',
            status: 'canceled',
          })

          await ctx.runMutation(internal.subscriptions.syncPlanToUser, {
            userId: user._id,
            plan: 'free',
          })

          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const customerId =
            typeof invoice.customer === 'string'
              ? invoice.customer
              : invoice.customer?.id

          if (!customerId) break

          const user = await ctx.runQuery(
            internal.subscriptions.getUserByStripeCustomerId,
            { stripeCustomerId: customerId }
          )
          if (!user) break

          // Get existing subscription to preserve plan
          const existingSub = await ctx.runQuery(internal.subscriptions.getByUserId, {
            userId: user._id,
          })

          if (existingSub) {
            await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
              userId: user._id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: existingSub.stripeSubscriptionId,
              plan: existingSub.plan,
              status: 'past_due',
              currentPeriodEnd: existingSub.currentPeriodEnd,
            })
          }

          break
        }
      }

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Webhook processing error:', error)
      return new Response('Webhook processing failed', { status: 500 })
    }
  }),
})

function mapStripeStatus(
  status: Stripe.Subscription.Status
): 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' {
  switch (status) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete'
    default:
      return 'active'
  }
}

// --- Clerk Webhook ---

http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()

    // Clerk sends the event type in the body
    const eventType = body.type

    try {
      switch (eventType) {
        case 'user.created': {
          const userData = body.data
          const email = userData.email_addresses?.[0]?.email_address ?? ''
          const name =
            `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim() ||
            (email ?? 'User')

          await ctx.runMutation(internal.users.upsertFromClerk, {
            clerkId: userData.id,
            email,
            name,
            avatarUrl: userData.image_url ?? undefined,
          })

          // Send welcome email to new users
          if (email) {
            await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
              email,
              name,
            })
          }
          break
        }
        case 'user.updated': {
          const userData = body.data
          await ctx.runMutation(internal.users.upsertFromClerk, {
            clerkId: userData.id,
            email:
              userData.email_addresses?.[0]?.email_address ?? '',
            name:
              `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim() ||
              ((userData.email_addresses?.[0]?.email_address) ??
              'User'),
            avatarUrl: userData.image_url ?? undefined,
          })
          break
        }

        case 'user.deleted': {
          const userData = body.data
          if (userData.id) {
            await ctx.runMutation(internal.users.deleteByClerkId, {
              clerkId: userData.id,
            })
          }
          break
        }

        case 'session.created': {
          const sessionData = body.data
          const userId = sessionData.user_id
          if (userId) {
            await ctx.runMutation(internal.users.recordLogin, {
              clerkId: userId,
            })
          }
          break
        }
      }

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Clerk webhook error:', error)
      return new Response('Webhook processing failed', { status: 500 })
    }
  }),
})

// --- Public Tour API ---

http.route({
  path: '/api/tour',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return jsonResponse({ error: 'Missing slug parameter' }, 400)
    }

    const tour = await ctx.runQuery(api.tours.getBySlug, { slug })

    return jsonResponse(tour, tour ? 200 : 404)
  }),
})

// --- Public Analytics Tracking ---

http.route({
  path: '/api/analytics',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json()

      if (!body.tourId || !body.event || !body.sessionId) {
        return jsonResponse({ error: 'Missing required fields: tourId, event, sessionId' }, 400)
      }

      await ctx.runMutation(api.analytics.track, {
        tourId: body.tourId,
        event: body.event,
        sessionId: body.sessionId,
        sceneId: body.sceneId ?? undefined,
        metadata: body.metadata ?? undefined,
        deviceType: body.deviceType ?? undefined,
        country: body.country ?? undefined,
        city: body.city ?? undefined,
        duration: body.duration ?? undefined,
      })

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Analytics tracking error:', error)
      return jsonResponse({ error: 'Failed to track event' }, 500)
    }
  }),
})

// --- Public Lead Capture ---

http.route({
  path: '/api/leads',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json()

      if (!body.tourId || !body.name || !body.email) {
        return jsonResponse(
          { error: 'Missing required fields: tourId, name, email' },
          400
        )
      }

      const leadId = await ctx.runMutation(api.leads.capture, {
        tourId: body.tourId,
        name: body.name,
        email: body.email,
        phone: body.phone ?? undefined,
        message: body.message ?? undefined,
        source: body.source ?? 'embed',
        viewedScenes: body.viewedScenes ?? undefined,
        timeSpent: body.timeSpent ?? undefined,
        deviceInfo: body.deviceInfo ?? undefined,
        locationInfo: body.locationInfo ?? undefined,
      })

      return jsonResponse({ success: true, leadId })
    } catch (error) {
      console.error('Lead capture error:', error)
      return jsonResponse({ error: 'Failed to capture lead' }, 500)
    }
  }),
})

// --- Public Building API ---

http.route({
  path: '/api/building',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
})

http.route({
  path: '/api/building',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return jsonResponse({ error: 'Missing slug parameter' }, 400)
    }

    const building = await ctx.runQuery(api.buildings.getBySlug, { slug })

    return jsonResponse(building, building ? 200 : 404)
  }),
})

http.route({
  path: '/api/building-analytics',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
})

http.route({
  path: '/api/building-analytics',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json()

      if (!body.buildingId || !body.event || !body.sessionId) {
        return jsonResponse({ error: 'Missing required fields: buildingId, event, sessionId' }, 400)
      }

      await ctx.runMutation(api.buildingAnalytics.track, {
        buildingId: body.buildingId,
        event: body.event,
        sessionId: body.sessionId,
        floor: body.floor ?? undefined,
        unitNumber: body.unitNumber ?? undefined,
        viewPositionId: body.viewPositionId ?? undefined,
        device: body.device ?? undefined,
        duration: body.duration ?? undefined,
      })

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Building analytics tracking error:', error)
      return jsonResponse({ error: 'Failed to track event' }, 500)
    }
  }),
})

// --- RunPod GPU Callback (Reconstruction Webhook) ---

http.route({
  path: '/gpu-callback',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
})

http.route({
  path: '/gpu-callback',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // 1. Verify shared secret
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    const expectedSecret = process.env.RUNPOD_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      console.error('GPU callback: invalid webhook secret')
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. Parse body
    let body: {
      id: string
      status: string
      output?: {
        splatUrl?: string
        error?: string
        stage?: string
        metadata?: {
          fileSizeBytes: number
          gaussianCount: number
          processingTimeMs: number
        }
      }
      executionTime?: number
      delayTime?: number
    }

    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    if (!body.id || !body.status) {
      return new Response('Missing id or status', { status: 400 })
    }

    try {
      // 3. Handle status cases
      if (body.status === 'COMPLETED' && body.output?.splatUrl) {
        // Download SPZ file from temporary RunPod URL and store in Convex
        const splatResponse = await fetch(body.output.splatUrl)
        if (!splatResponse.ok) {
          console.error(
            `Failed to download SPZ from ${body.output.splatUrl}: ${splatResponse.status}`
          )
          return new Response('Failed to download SPZ', { status: 500 })
        }

        const splatBlob = await splatResponse.blob()
        const storageId = await ctx.storage.store(splatBlob)

        await ctx.runMutation(internal.reconstructionJobs.complete, {
          runpodJobId: body.id,
          outputStorageId: storageId,
          outputMetadata: body.output.metadata ?? {
            fileSizeBytes: splatBlob.size,
            gaussianCount: 0,
            processingTimeMs: body.executionTime ?? 0,
          },
        })

        console.log(`GPU callback: job ${body.id} completed, stored SPZ`)
      } else if (body.status === 'FAILED') {
        await ctx.runMutation(internal.reconstructionJobs.fail, {
          runpodJobId: body.id,
          error:
            body.output?.error ?? 'Reconstruction failed on GPU worker',
        })

        console.log(`GPU callback: job ${body.id} failed`)
      } else if (body.status === 'IN_PROGRESS') {
        // Intermediate progress update — map RunPod stage to our status
        const stage = body.output?.stage
        let mappedStatus: string = 'reconstructing'
        let progress = 50

        if (stage === 'extracting_frames') {
          mappedStatus = 'extracting_frames'
          progress = 30
        } else if (stage === 'reconstructing') {
          mappedStatus = 'reconstructing'
          progress = 60
        } else if (stage === 'compressing') {
          mappedStatus = 'compressing'
          progress = 85
        } else if (body.executionTime) {
          // Estimate progress from execution time (typical job ~15 min)
          const estimatedTotalMs = 15 * 60 * 1000
          progress = Math.min(
            90,
            Math.round((body.executionTime / estimatedTotalMs) * 90)
          )
        }

        // Find job by runpodJobId to get the Convex jobId
        const allJobs = await ctx.runQuery(
          internal.reconstructionJobs.findByRunpodJobId,
          { runpodJobId: body.id }
        )

        if (allJobs) {
          await ctx.runMutation(internal.reconstructionJobs.updateStatus, {
            jobId: allJobs._id,
            status: mappedStatus as 'extracting_frames' | 'reconstructing' | 'compressing' | 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled',
            progress,
          })
        }

        console.log(
          `GPU callback: job ${body.id} in progress (stage: ${stage ?? 'unknown'}, progress: ${progress}%)`
        )
      }

      return new Response('OK', { status: 200, headers: corsHeaders })
    } catch (error) {
      console.error('GPU callback processing error:', error)
      return new Response('Processing failed', { status: 500 })
    }
  }),
})

export default http
