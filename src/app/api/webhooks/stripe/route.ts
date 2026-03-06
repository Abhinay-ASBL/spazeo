import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      // Handle successful checkout — update subscription in Convex
      break
    }
    case 'customer.subscription.updated': {
      // Handle subscription update
      break
    }
    case 'customer.subscription.deleted': {
      // Handle subscription cancellation
      break
    }
    case 'invoice.payment_failed': {
      // Handle failed payment
      break
    }
  }

  return NextResponse.json({ received: true })
}
