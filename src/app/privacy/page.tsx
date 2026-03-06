import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Spazeo Privacy Policy. How we collect, use, and protect your data under GDPR and India DPDP Act.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0A0908]">
      <Navbar />

      <section
        className="pt-32 pb-16"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,160,23,0.06) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <h1
            className="font-bold leading-tight"
            style={{
              fontSize: 'clamp(36px, 5vw, 48px)',
              fontFamily: 'var(--font-jakarta)',
              color: '#F5F3EF',
              letterSpacing: '-1.5px',
            }}
          >
            Privacy Policy
          </h1>
          <p
            className="text-sm mt-4"
            style={{
              color: '#6B6560',
              fontFamily: 'var(--font-dmsans)',
            }}
          >
            Last updated: March 1, 2026
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto prose-spazeo">
          <PolicySection title="1. Introduction">
            <p>
              Spazeo (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the spazeo.io
              website and platform. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our
              Service.
            </p>
            <p>
              We are committed to complying with the European Union General Data
              Protection Regulation (GDPR), the India Digital Personal Data
              Protection Act, 2023 (DPDP Act), and other applicable data
              protection laws.
            </p>
          </PolicySection>

          <PolicySection title="2. Data We Collect">
            <h4>2.1 Information You Provide</h4>
            <ul>
              <li>
                <strong>Account data:</strong> name, email address, password
                (managed by Clerk), profile photo, company name, phone number.
              </li>
              <li>
                <strong>Tour content:</strong> 360-degree panoramic images,
                scene titles, descriptions, hotspot data, floor plans.
              </li>
              <li>
                <strong>Lead data:</strong> information submitted by visitors
                through lead capture forms on your tours (name, email, phone,
                message).
              </li>
              <li>
                <strong>Payment data:</strong> billing address, payment method
                details (processed and stored by Stripe; we do not store full
                card numbers).
              </li>
              <li>
                <strong>Communications:</strong> messages you send us via
                support, contact forms, or email.
              </li>
            </ul>

            <h4>2.2 Information Collected Automatically</h4>
            <ul>
              <li>
                <strong>Usage data:</strong> pages visited, features used, tour
                interactions, session duration, click patterns.
              </li>
              <li>
                <strong>Device data:</strong> browser type, operating system,
                device type, screen resolution.
              </li>
              <li>
                <strong>Location data:</strong> approximate location derived
                from IP address (country and city level only).
              </li>
              <li>
                <strong>Cookies and tracking:</strong> see our Cookie section
                below.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="3. How We Use Your Data">
            <ul>
              <li>Provide, operate, and maintain the Spazeo platform.</li>
              <li>Process your subscription payments and manage billing.</li>
              <li>
                Deliver AI-powered features (scene analysis, virtual staging,
                description generation) by sending panorama data to our AI
                processing partners (OpenAI, Replicate).
              </li>
              <li>
                Provide analytics and insights about your virtual tour
                performance.
              </li>
              <li>
                Send transactional emails (lead notifications, account updates).
              </li>
              <li>
                Send marketing communications (only with your explicit consent).
              </li>
              <li>Improve our products, features, and user experience.</li>
              <li>Detect, prevent, and address fraud and security issues.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </PolicySection>

          <PolicySection title="4. Legal Basis for Processing (GDPR)">
            <ul>
              <li>
                <strong>Contract:</strong> processing necessary to provide our
                Service to you.
              </li>
              <li>
                <strong>Consent:</strong> marketing communications, optional
                analytics cookies, AI feature processing.
              </li>
              <li>
                <strong>Legitimate interest:</strong> fraud prevention, service
                improvement, security.
              </li>
              <li>
                <strong>Legal obligation:</strong> tax records, legal compliance.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="5. India DPDP Act Compliance">
            <p>
              For users located in India, we process your Digital Personal Data
              in accordance with the Digital Personal Data Protection Act, 2023:
            </p>
            <ul>
              <li>
                We obtain your consent before processing personal data, unless
                processing is for a legitimate use specified under the Act.
              </li>
              <li>
                You have the right to access, correct, and erase your personal
                data.
              </li>
              <li>
                You may nominate an individual to exercise your data rights in
                the event of death or incapacity.
              </li>
              <li>
                We maintain reasonable security safeguards to protect your
                personal data.
              </li>
              <li>
                In the event of a personal data breach, we will notify the Data
                Protection Board of India and affected users as required.
              </li>
              <li>
                You may file a complaint with the Data Protection Board of India
                if you believe your rights have been violated.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="6. Data Sharing">
            <p>
              We do not sell your personal data. We share data only with:
            </p>
            <ul>
              <li>
                <strong>Service providers:</strong> Convex (database and
                backend), Clerk (authentication), Stripe (payments), OpenAI and
                Replicate (AI processing), Resend (email), Vercel (hosting).
              </li>
              <li>
                <strong>Legal requirements:</strong> when required by law, court
                order, or government request.
              </li>
              <li>
                <strong>Business transfers:</strong> in connection with a merger,
                acquisition, or asset sale, with prior notice to you.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="7. Data Retention">
            <p>
              We retain your account data for as long as your account is active.
              Upon account deletion, we remove your personal data within 30 days,
              except where we are legally required to retain it. Tour analytics
              data is anonymized after account deletion. Backup copies may
              persist for up to 90 days.
            </p>
          </PolicySection>

          <PolicySection title="8. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access your personal data.</li>
              <li>Correct inaccurate data.</li>
              <li>Delete your data (&quot;right to be forgotten&quot;).</li>
              <li>Restrict or object to processing.</li>
              <li>Data portability (receive your data in a structured format).</li>
              <li>Withdraw consent at any time.</li>
              <li>Lodge a complaint with a supervisory authority.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <strong>privacy@spazeo.io</strong>.
            </p>
          </PolicySection>

          <PolicySection title="9. Cookies">
            <p>We use the following types of cookies:</p>
            <ul>
              <li>
                <strong>Essential cookies:</strong> required for authentication,
                security, and basic functionality. Cannot be disabled.
              </li>
              <li>
                <strong>Analytics cookies:</strong> help us understand how
                visitors use our platform (PostHog). Can be opted out.
              </li>
              <li>
                <strong>Marketing cookies:</strong> used to deliver relevant
                advertisements. Require explicit consent.
              </li>
            </ul>
            <p>
              You can manage your cookie preferences at any time through our
              cookie consent banner.
            </p>
          </PolicySection>

          <PolicySection title="10. International Transfers">
            <p>
              Your data may be transferred to and processed in countries other
              than your country of residence. We ensure appropriate safeguards
              are in place, including Standard Contractual Clauses (SCCs) for
              transfers from the EEA, and compliance with Indian cross-border
              data transfer requirements.
            </p>
          </PolicySection>

          <PolicySection title="11. Security">
            <p>
              We implement industry-standard security measures including
              encryption at rest (AES-256) and in transit (TLS 1.3), access
              controls, regular security audits, and incident response
              procedures.
            </p>
          </PolicySection>

          <PolicySection title="12. Children">
            <p>
              Spazeo is not intended for children under 18. We do not knowingly
              collect personal data from children. If you believe a child has
              provided us with personal data, please contact us and we will
              delete it.
            </p>
          </PolicySection>

          <PolicySection title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by email or by posting a notice on
              our website. Your continued use of the Service after changes
              constitutes acceptance.
            </p>
          </PolicySection>

          <PolicySection title="14. Contact Us">
            <p>
              For privacy inquiries or to exercise your data rights:
            </p>
            <ul>
              <li>Email: privacy@spazeo.io</li>
              <li>Mail: Spazeo Inc., [Address]</li>
              <li>Data Protection Officer: dpo@spazeo.io</li>
            </ul>
          </PolicySection>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function PolicySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-10">
      <h2
        className="text-xl font-bold mb-4"
        style={{
          color: '#F5F3EF',
          fontFamily: 'var(--font-jakarta)',
        }}
      >
        {title}
      </h2>
      <div
        className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_h4]:font-semibold [&_h4]:text-[#F5F3EF] [&_h4]:mt-4 [&_h4]:mb-2 [&_strong]:text-[#F5F3EF]"
        style={{
          color: '#A8A29E',
          fontFamily: 'var(--font-dmsans)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
