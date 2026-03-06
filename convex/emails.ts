import { v } from 'convex/values'
import { internalAction } from './_generated/server'

/* ─── Brand Constants ────────────────────────────────────────── */

const FROM_ADDRESS = 'Spazeo <noreply@spazeo.io>'
const BRAND_GOLD = '#D4A017'
const BRAND_DARK = '#0A0908'
const BRAND_SURFACE = '#12100E'
const BRAND_ELEVATED = '#1B1916'
const BRAND_TEXT = '#F5F3EF'
const BRAND_MUTED = '#A8A29E'
const BRAND_DIM = '#6B6560'

/* ─── Shared Layout Helpers ──────────────────────────────────── */

function emailHeader(): string {
  return `
    <div style="background-color: ${BRAND_DARK}; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(212,160,23,0.15);">
      <span style="font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: 3px; color: ${BRAND_TEXT};">SPAZEO</span>
      <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: ${BRAND_GOLD}; margin-left: 2px; vertical-align: super;"></span>
    </div>
  `
}

function emailFooter(): string {
  return `
    <div style="background-color: ${BRAND_DARK}; padding: 24px; text-align: center; border-top: 1px solid rgba(212,160,23,0.08);">
      <p style="font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: ${BRAND_DIM}; margin: 0 0 8px;">
        Spazeo — Step Inside Any Space
      </p>
      <p style="font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: ${BRAND_DIM}; margin: 0;">
        <a href="https://spazeo.io/settings" style="color: ${BRAND_GOLD}; text-decoration: none;">Manage preferences</a>
        &nbsp;&middot;&nbsp;
        <a href="https://spazeo.io/settings?tab=notifications" style="color: ${BRAND_GOLD}; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>
  `
}

function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: ${BRAND_DARK}; font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_DARK};">
        <tr>
          <td align="center" style="padding: 20px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND_SURFACE}; border-radius: 16px; overflow: hidden; border: 1px solid rgba(212,160,23,0.12);">
              <tr><td>
                ${emailHeader()}
                <div style="padding: 32px 24px;">
                  ${content}
                </div>
                ${emailFooter()}
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

function primaryButton(text: string, href: string): string {
  return `
    <a href="${href}" style="display: inline-block; background-color: ${BRAND_GOLD}; color: ${BRAND_DARK}; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;">
      ${text}
    </a>
  `
}

/* ─── Email Templates ────────────────────────────────────────── */

function welcomeEmailHtml(name: string): string {
  const firstName = name.split(' ')[0] || 'there'
  return emailWrapper(`
    <h2 style="font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${BRAND_TEXT}; margin: 0 0 8px;">
      Welcome to Spazeo, ${firstName}!
    </h2>
    <p style="font-size: 15px; color: ${BRAND_MUTED}; line-height: 1.6; margin: 0 0 24px;">
      Your account is all set. You can now create immersive 360 virtual tours
      that let buyers walk through properties from anywhere.
    </p>

    <div style="background-color: ${BRAND_ELEVATED}; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(212,160,23,0.08);">
      <p style="font-size: 14px; font-weight: 600; color: ${BRAND_TEXT}; margin: 0 0 12px;">
        Get started in 3 simple steps:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding: 6px 0; font-size: 14px; color: ${BRAND_MUTED};">
          <span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: rgba(212,160,23,0.15); color: ${BRAND_GOLD}; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">1</span>
          Upload your 360 panorama photos
        </td></tr>
        <tr><td style="padding: 6px 0; font-size: 14px; color: ${BRAND_MUTED};">
          <span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: rgba(212,160,23,0.15); color: ${BRAND_GOLD}; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">2</span>
          Let AI enhance and stage your scenes
        </td></tr>
        <tr><td style="padding: 6px 0; font-size: 14px; color: ${BRAND_MUTED};">
          <span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: rgba(212,160,23,0.15); color: ${BRAND_GOLD}; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">3</span>
          Publish and share with one click
        </td></tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 8px;">
      ${primaryButton('Go to Dashboard', 'https://spazeo.io/dashboard')}
    </div>
  `)
}

function leadNotificationHtml(
  ownerName: string,
  leadName: string,
  leadEmail: string,
  tourTitle: string,
  leadPhone?: string,
  leadMessage?: string,
): string {
  const firstName = ownerName.split(' ')[0] || 'there'
  return emailWrapper(`
    <h2 style="font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 22px; font-weight: 700; color: ${BRAND_TEXT}; margin: 0 0 8px;">
      New Lead Captured
    </h2>
    <p style="font-size: 15px; color: ${BRAND_MUTED}; line-height: 1.6; margin: 0 0 20px;">
      Hi ${firstName}, someone expressed interest in your tour <strong style="color: ${BRAND_TEXT};">"${tourTitle}"</strong>.
    </p>

    <div style="background-color: ${BRAND_ELEVATED}; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(212,160,23,0.08);">
      <p style="margin: 4px 0; font-size: 14px; color: ${BRAND_MUTED};">
        <strong style="color: ${BRAND_TEXT};">Name:</strong> ${leadName}
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: ${BRAND_MUTED};">
        <strong style="color: ${BRAND_TEXT};">Email:</strong> ${leadEmail}
      </p>
      ${leadPhone ? `<p style="margin: 4px 0; font-size: 14px; color: ${BRAND_MUTED};"><strong style="color: ${BRAND_TEXT};">Phone:</strong> ${leadPhone}</p>` : ''}
      ${leadMessage ? `<p style="margin: 8px 0 0; font-size: 14px; color: ${BRAND_MUTED};"><strong style="color: ${BRAND_TEXT};">Message:</strong> ${leadMessage}</p>` : ''}
    </div>

    <div style="text-align: center; margin-bottom: 8px;">
      ${primaryButton('View in Dashboard', 'https://spazeo.io/dashboard/leads')}
    </div>
  `)
}

function weeklySummaryHtml(
  name: string,
  stats: {
    totalViews: number
    newLeads: number
    activeTours: number
    topTour?: string
  },
): string {
  const firstName = name.split(' ')[0] || 'there'
  return emailWrapper(`
    <h2 style="font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 22px; font-weight: 700; color: ${BRAND_TEXT}; margin: 0 0 8px;">
      Your Weekly Summary
    </h2>
    <p style="font-size: 15px; color: ${BRAND_MUTED}; line-height: 1.6; margin: 0 0 24px;">
      Hi ${firstName}, here is how your tours performed this week.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td width="33%" style="text-align: center; padding: 16px 8px; background-color: ${BRAND_ELEVATED}; border-radius: 12px 0 0 12px; border: 1px solid rgba(212,160,23,0.08);">
          <div style="font-size: 28px; font-weight: 800; color: ${BRAND_GOLD}; font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif;">${stats.totalViews}</div>
          <div style="font-size: 12px; color: ${BRAND_DIM}; margin-top: 4px;">Tour Views</div>
        </td>
        <td width="33%" style="text-align: center; padding: 16px 8px; background-color: ${BRAND_ELEVATED}; border: 1px solid rgba(212,160,23,0.08); border-left: none; border-right: none;">
          <div style="font-size: 28px; font-weight: 800; color: #2DD4BF; font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif;">${stats.newLeads}</div>
          <div style="font-size: 12px; color: ${BRAND_DIM}; margin-top: 4px;">New Leads</div>
        </td>
        <td width="33%" style="text-align: center; padding: 16px 8px; background-color: ${BRAND_ELEVATED}; border-radius: 0 12px 12px 0; border: 1px solid rgba(212,160,23,0.08);">
          <div style="font-size: 28px; font-weight: 800; color: #FB7A54; font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif;">${stats.activeTours}</div>
          <div style="font-size: 12px; color: ${BRAND_DIM}; margin-top: 4px;">Active Tours</div>
        </td>
      </tr>
    </table>

    ${stats.topTour ? `
      <p style="font-size: 14px; color: ${BRAND_MUTED}; margin: 0 0 24px;">
        Your top-performing tour: <strong style="color: ${BRAND_TEXT};">"${stats.topTour}"</strong>
      </p>
    ` : ''}

    <div style="text-align: center; margin-bottom: 8px;">
      ${primaryButton('View Full Analytics', 'https://spazeo.io/dashboard/analytics')}
    </div>
  `)
}

/* ─── Resend API Helper ──────────────────────────────────────── */

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Resend API error (${response.status}):`, errorBody)
    }
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

/* ─── Convex Actions ─────────────────────────────────────────── */

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (_ctx, args) => {
    const html = welcomeEmailHtml(args.name)
    const text = `Welcome to Spazeo, ${args.name}! Your account is ready. Get started at https://spazeo.io/dashboard`

    await sendEmail(args.email, 'Welcome to Spazeo — Step Inside Any Space', html, text)
  },
})

export const sendLeadNotification = internalAction({
  args: {
    ownerEmail: v.string(),
    ownerName: v.string(),
    leadName: v.string(),
    leadEmail: v.string(),
    tourTitle: v.string(),
    leadPhone: v.optional(v.string()),
    leadMessage: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const html = leadNotificationHtml(
      args.ownerName,
      args.leadName,
      args.leadEmail,
      args.tourTitle,
      args.leadPhone,
      args.leadMessage,
    )
    const text = `New lead on "${args.tourTitle}": ${args.leadName} (${args.leadEmail}). View in dashboard: https://spazeo.io/dashboard/leads`

    await sendEmail(args.ownerEmail, `New lead on "${args.tourTitle}"`, html, text)
  },
})

export const sendWeeklySummary = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    stats: v.object({
      totalViews: v.number(),
      newLeads: v.number(),
      activeTours: v.number(),
      topTour: v.optional(v.string()),
    }),
  },
  handler: async (_ctx, args) => {
    const html = weeklySummaryHtml(args.name, args.stats)
    const text = `Your weekly Spazeo summary: ${args.stats.totalViews} views, ${args.stats.newLeads} leads, ${args.stats.activeTours} active tours. View analytics: https://spazeo.io/dashboard/analytics`

    await sendEmail(args.email, 'Your Weekly Spazeo Summary', html, text)
  },
})
