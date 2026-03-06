import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Spazeo Terms of Service. Read the terms and conditions that govern your use of the Spazeo platform.',
}

export default function TermsPage() {
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
            Terms of Service
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
        <div className="max-w-3xl mx-auto">
          <TermsSection title="1. Acceptance of Terms">
            <p>
              By accessing or using the Spazeo platform (&quot;Service&quot;),
              you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, do not
              use the Service. These Terms apply to all visitors, users, and
              others who access or use the Service.
            </p>
          </TermsSection>

          <TermsSection title="2. Description of Service">
            <p>
              Spazeo provides an AI-powered 360-degree virtual tour platform
              that enables users to create, manage, publish, and share
              interactive virtual tours. The Service includes tour creation
              tools, AI-powered features (scene analysis, virtual staging,
              description generation), analytics, lead capture, and related
              services.
            </p>
          </TermsSection>

          <TermsSection title="3. Account Registration">
            <ul>
              <li>
                You must provide accurate, complete, and current information
                during registration.
              </li>
              <li>
                You are responsible for safeguarding your account credentials
                and for all activities under your account.
              </li>
              <li>
                You must be at least 18 years old to create an account.
              </li>
              <li>
                You may not use the Service for any illegal or unauthorized
                purpose.
              </li>
              <li>
                One person or entity may not maintain more than one free
                account.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="4. Subscriptions and Billing">
            <ul>
              <li>
                Paid features are available through subscription plans. Pricing
                is listed on our pricing page and may change with 30 days
                notice.
              </li>
              <li>
                Subscriptions renew automatically unless canceled before the
                renewal date.
              </li>
              <li>
                All payments are processed securely through Stripe. We do not
                store your full payment card information.
              </li>
              <li>
                Refunds are available within 14 days of initial purchase. No
                refunds are provided for partial billing periods after the
                14-day window.
              </li>
              <li>
                Downgrading your plan may result in loss of access to certain
                features. Existing tours will not be deleted but may be
                restricted.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="5. User Content">
            <ul>
              <li>
                You retain all ownership rights to content you upload to Spazeo,
                including panoramic images, descriptions, and tour
                configurations (&quot;User Content&quot;).
              </li>
              <li>
                By uploading User Content, you grant Spazeo a non-exclusive,
                worldwide license to host, store, process, and display your
                content solely for the purpose of operating and improving the
                Service.
              </li>
              <li>
                You represent that you own or have the necessary rights to all
                User Content you upload.
              </li>
              <li>
                You must not upload content that is illegal, infringes on
                intellectual property rights, contains malware, or is
                offensive, defamatory, or harmful.
              </li>
              <li>
                We reserve the right to remove content that violates these
                Terms.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="6. AI Features">
            <ul>
              <li>
                AI features (scene analysis, virtual staging, description
                generation) are provided as-is and may produce imperfect
                results.
              </li>
              <li>
                Your content may be sent to third-party AI providers (OpenAI,
                Replicate) for processing. These providers operate under their
                own terms and privacy policies.
              </li>
              <li>
                AI-generated content (staged images, descriptions) is owned by
                you, subject to the AI provider terms.
              </li>
              <li>
                AI credit usage is subject to your plan limits and fair use
                policies.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="7. Lead Data">
            <ul>
              <li>
                Visitor data collected through your tour lead capture forms is
                your data. You are the data controller for leads collected
                through your tours.
              </li>
              <li>
                You are responsible for complying with applicable data
                protection laws (GDPR, DPDP Act) when collecting and processing
                visitor data through your tours.
              </li>
              <li>
                We process lead data on your behalf as a data processor.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="8. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>
                Use the Service to create tours for illegal or fraudulent
                properties.
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or hack the Service.
              </li>
              <li>
                Use automated tools to scrape, crawl, or extract data from the
                Service.
              </li>
              <li>
                Interfere with or disrupt the Service or servers.
              </li>
              <li>
                Impersonate any person or entity.
              </li>
              <li>
                Upload viruses, malware, or other harmful code.
              </li>
              <li>
                Use the Service in a way that exceeds reasonable use or imposes
                an unreasonable load on our infrastructure.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="9. Intellectual Property">
            <p>
              The Service, including its design, code, features, branding, and
              documentation, is the intellectual property of Spazeo and is
              protected by copyright, trademark, and other intellectual
              property laws. You may not copy, modify, distribute, or create
              derivative works based on the Service without our prior written
              consent.
            </p>
          </TermsSection>

          <TermsSection title="10. Termination">
            <ul>
              <li>
                You may cancel your account at any time through your account
                settings.
              </li>
              <li>
                We may suspend or terminate your account if you violate these
                Terms.
              </li>
              <li>
                Upon termination, your right to use the Service ceases
                immediately. We will retain your data for 30 days to allow
                export, after which it will be permanently deleted.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="11. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Spazeo shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including loss of profits, data, or business
              opportunities, resulting from your use or inability to use the
              Service. Our total liability shall not exceed the amount you paid
              us in the 12 months preceding the claim.
            </p>
          </TermsSection>

          <TermsSection title="12. Disclaimer">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, either express or
              implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement. We do not guarantee that the Service will be
              uninterrupted, secure, or error-free.
            </p>
          </TermsSection>

          <TermsSection title="13. Indemnification">
            <p>
              You agree to indemnify and hold harmless Spazeo, its officers,
              directors, employees, and agents from any claims, damages, losses,
              or expenses (including reasonable legal fees) arising from your
              use of the Service, your User Content, or your violation of these
              Terms.
            </p>
          </TermsSection>

          <TermsSection title="14. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Delaware,
              United States, without regard to conflict of law principles. For
              users in India, disputes may also be subject to the jurisdiction
              of Indian courts as required by applicable law. Any disputes shall
              be resolved through binding arbitration, except where prohibited
              by law.
            </p>
          </TermsSection>

          <TermsSection title="15. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. Material
              changes will be communicated via email or a prominent notice on
              the Service at least 30 days before they take effect. Your
              continued use of the Service after changes constitutes acceptance
              of the modified Terms.
            </p>
          </TermsSection>

          <TermsSection title="16. Contact Us">
            <p>
              For questions about these Terms, contact us at:
            </p>
            <ul>
              <li>Email: legal@spazeo.io</li>
              <li>Mail: Spazeo Inc., [Address]</li>
            </ul>
          </TermsSection>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function TermsSection({
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
        className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-[#F5F3EF]"
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
