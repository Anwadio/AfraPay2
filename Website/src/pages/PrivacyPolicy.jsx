import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_PRIVACY } from "../components/seo/schemas";

const EFFECTIVE_DATE = "March 13, 2026";
const COMPANY_NAME = "AfraPay Africa Limited";
const SUPPORT_EMAIL = "privacy@afrapay.com";
const WEBSITE = "www.afrapay.com";

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-10">
    <h2 className="text-xl font-semibold text-neutral-900 mb-4 border-b border-neutral-200 pb-2">
      {title}
    </h2>
    <div className="space-y-3 text-neutral-700 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toc = [
    { id: "overview", label: "1. Overview" },
    { id: "data-collected", label: "2. Data We Collect" },
    { id: "how-we-use", label: "3. How We Use Your Data" },
    { id: "legal-basis", label: "4. Legal Basis for Processing" },
    { id: "sharing", label: "5. Data Sharing & Disclosure" },
    { id: "retention", label: "6. Data Retention" },
    { id: "security", label: "7. Data Security" },
    { id: "rights", label: "8. Your Rights" },
    { id: "cookies", label: "9. Cookies & Tracking" },
    { id: "marketing", label: "10. Marketing Communications" },
    { id: "children", label: "11. Children's Privacy" },
    { id: "transfers", label: "12. International Transfers" },
    { id: "changes", label: "13. Changes to This Policy" },
    { id: "contact", label: "14. Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <SEOHead
        title="Privacy Policy"
        description="AfraPay's Privacy Policy explains how we collect, use, and protect your personal data in compliance with applicable data protection laws across Africa."
        keywords="AfraPay privacy policy, data protection Africa, GDPR compliance, personal data fintech"
        structuredData={SCHEMA_PRIVACY}
      />
      {/* Hero */}
      <div className="bg-primary-700 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Privacy Policy
          </h1>
          <p className="text-primary-200 text-sm">
            Effective Date: {EFFECTIVE_DATE}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 lg:flex lg:gap-12">
        {/* Sticky sidebar TOC (desktop) */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-8 bg-white rounded-xl border border-neutral-200 p-5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Contents
            </p>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-neutral-600 hover:text-primary-600 py-0.5 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-white rounded-xl border border-neutral-200 p-8">
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Your privacy matters to us. This policy explains what data we
            collect, why we collect it, and how you can control it. For
            questions, email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline hover:text-blue-900 font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </div>

          <Section id="overview" title="1. Overview">
            <p>
              {COMPANY_NAME} ("AfraPay", "we", "us", "our") is committed to
              protecting the personal information you share with us. This
              Privacy Policy describes how we collect, use, disclose, and
              safeguard your information when you use the AfraPay platform,
              mobile application, and related services (collectively, the
              "Services").
            </p>
            <p>
              By creating an account or using our Services, you consent to the
              practices described in this policy. This policy is incorporated
              into and forms part of our{" "}
              <Link to="/terms" className="text-primary-600 hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </Section>

          <Section id="data-collected" title="2. Data We Collect">
            <p>We collect the following categories of personal data:</p>

            <h3 className="font-semibold text-neutral-800 mt-4 mb-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong>Identity data:</strong> full name, date of birth,
                nationality, government-issued ID;
              </li>
              <li>
                <strong>Contact data:</strong> email address, phone number,
                postal address;
              </li>
              <li>
                <strong>Account credentials:</strong> password (stored as a
                one-way cryptographic hash, never in plain text);
              </li>
              <li>
                <strong>Financial data:</strong> bank account details, wallet
                addresses, transaction history;
              </li>
              <li>
                <strong>Profile data:</strong> country of residence, preferred
                language, profile photo (optional); and
              </li>
              <li>
                <strong>Communications:</strong> messages and attachments sent
                to our support team.
              </li>
            </ul>

            <h3 className="font-semibold text-neutral-800 mt-4 mb-2">
              2.2 Automatically Collected Data
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong>Device & usage data:</strong> IP address, browser type,
                operating system, device identifiers, pages visited, and
                click-stream data;
              </li>
              <li>
                <strong>Transaction metadata:</strong> timestamps, amounts,
                recipient identifiers, geolocation at time of transaction; and
              </li>
              <li>
                <strong>Security data:</strong> login attempts, device
                fingerprints, MFA events.
              </li>
            </ul>

            <h3 className="font-semibold text-neutral-800 mt-4 mb-2">
              2.3 Data from Third Parties
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                Identity verification providers (e.g., sanctions screening,
                document verification services);
              </li>
              <li>
                Social sign-in providers (Google, Facebook) — limited to public
                profile data and email unless you explicitly grant broader
                permissions; and
              </li>
              <li>
                Payment processors and banking partners for transaction
                processing.
              </li>
            </ul>
          </Section>

          <Section id="how-we-use" title="3. How We Use Your Data">
            <p>We use your personal data to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Create and manage your account;</li>
              <li>
                Process payments, transfers, and other financial transactions;
              </li>
              <li>
                Perform identity verification and KYC/AML screening as required
                by law;
              </li>
              <li>
                Detect, prevent, and investigate fraud, money laundering, and
                security incidents;
              </li>
              <li>Provide customer support and resolve disputes;</li>
              <li>
                Send transactional communications (receipts, alerts, security
                notifications);
              </li>
              <li>
                Send marketing communications (only where you have opted in);
              </li>
              <li>
                Improve and personalise our Services through analytics; and
              </li>
              <li>Meet our legal, regulatory, and contractual obligations.</li>
            </ul>
          </Section>

          <Section id="legal-basis" title="4. Legal Basis for Processing">
            <p>
              We process your personal data on the following legal bases under
              applicable data protection law:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong>Contractual necessity</strong> — to provide the Services
                you have signed up for;
              </li>
              <li>
                <strong>Legal obligation</strong> — to comply with KYC, AML,
                tax, and financial regulation requirements;
              </li>
              <li>
                <strong>Legitimate interests</strong> — to prevent fraud,
                improve our platform, and protect our users; and
              </li>
              <li>
                <strong>Consent</strong> — for marketing communications and, in
                some jurisdictions, certain cookie categories.
              </li>
            </ul>
          </Section>

          <Section id="sharing" title="5. Data Sharing & Disclosure">
            <p>
              We do <strong>not</strong> sell your personal data. We may share
              your data with:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong>Service providers</strong> acting as data processors
                (cloud infrastructure, email delivery, fraud detection, identity
                verification) — bound by data processing agreements;
              </li>
              <li>
                <strong>Payment network partners</strong> as necessary to
                process your transactions;
              </li>
              <li>
                <strong>Regulatory authorities</strong> — central banks,
                financial intelligence units, and law enforcement when required
                by applicable law;
              </li>
              <li>
                <strong>Business transfers</strong> — in the event of a merger,
                acquisition, or asset sale, your data may be transferred to the
                successor entity; and
              </li>
              <li>
                <strong>With your consent</strong> — to third-party services you
                explicitly authorise from within the AfraPay platform.
              </li>
            </ul>
          </Section>

          <Section id="retention" title="6. Data Retention">
            <p>
              We retain personal data for as long as your account is active and
              as required to fulfil the purposes described in this policy. In
              particular:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                Transaction records are retained for a minimum of{" "}
                <strong>7 years</strong> to comply with financial regulations;
              </li>
              <li>
                KYC documents are retained for <strong>5 years</strong> after
                account closure; and
              </li>
              <li>
                Marketing preferences and email logs are retained until you
                withdraw consent or request deletion.
              </li>
            </ul>
            <p>
              After the applicable retention period, data is securely deleted or
              anonymised.
            </p>
          </Section>

          <Section id="security" title="7. Data Security">
            <p>
              AfraPay implements industry-standard technical and organisational
              security measures, including:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>TLS encryption for all data in transit;</li>
              <li>AES-256 encryption for sensitive data at rest;</li>
              <li>Bcrypt password hashing (never stored in plain text);</li>
              <li>Multi-factor authentication (MFA) support;</li>
              <li>
                Continuous security monitoring and intrusion detection; and
              </li>
              <li>
                Regular penetration testing and vulnerability assessments.
              </li>
            </ul>
            <p>
              Despite these measures, no system is completely secure. If you
              believe your account has been compromised, please contact us
              immediately at{" "}
              <a
                href="mailto:security@afrapay.com"
                className="text-primary-600 hover:underline"
              >
                security@afrapay.com
              </a>
              .
            </p>
          </Section>

          <Section id="rights" title="8. Your Rights">
            <p>
              Depending on your jurisdiction, you may have the following rights
              regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong>Access</strong> — request a copy of the personal data we
                hold about you;
              </li>
              <li>
                <strong>Rectification</strong> — request correction of
                inaccurate or incomplete data;
              </li>
              <li>
                <strong>Erasure</strong> — request deletion of your data
                (subject to legal retention obligations);
              </li>
              <li>
                <strong>Restriction</strong> — request that we limit processing
                in certain circumstances;
              </li>
              <li>
                <strong>Portability</strong> — receive your data in a
                machine-readable format;
              </li>
              <li>
                <strong>Objection</strong> — object to processing based on
                legitimate interests; and
              </li>
              <li>
                <strong>Withdraw consent</strong> — where processing is based on
                consent, withdraw it at any time.
              </li>
            </ul>
            <p>
              To exercise any of these rights, email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              with "Privacy Request" in the subject line. We will respond within
              30 days.
            </p>
          </Section>

          <Section id="cookies" title="9. Cookies & Tracking">
            <p>
              We use cookies and similar tracking technologies to operate and
              improve our Services. Categories include:
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="text-left p-2 border border-neutral-200 font-semibold">
                      Category
                    </th>
                    <th className="text-left p-2 border border-neutral-200 font-semibold">
                      Purpose
                    </th>
                    <th className="text-left p-2 border border-neutral-200 font-semibold">
                      Consent Required
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Strictly Necessary",
                      "Session management, security, authentication",
                      "No",
                    ],
                    ["Functional", "Language preferences, UI settings", "No"],
                    ["Analytics", "Usage statistics to improve UX", "Yes"],
                    [
                      "Marketing",
                      "Targeted advertising (if applicable)",
                      "Yes",
                    ],
                  ].map(([cat, purpose, consent]) => (
                    <tr key={cat} className="border-b border-neutral-100">
                      <td className="p-2 border border-neutral-200 font-medium">
                        {cat}
                      </td>
                      <td className="p-2 border border-neutral-200">
                        {purpose}
                      </td>
                      <td className="p-2 border border-neutral-200">
                        {consent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              You can manage your cookie preferences through your browser
              settings. Disabling strictly necessary cookies may impact core
              functionality.
            </p>
          </Section>

          <Section id="marketing" title="10. Marketing Communications">
            <p>
              If you opted in to marketing communications during registration,
              we may send you:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Product updates, new features, and improvements;</li>
              <li>Promotions, offers, and partnership announcements; and</li>
              <li>Financial education content and tips.</li>
            </ul>
            <p>
              You can unsubscribe at any time by clicking the "Unsubscribe" link
              in any marketing email, or by updating your notification
              preferences in Account Settings. We will process your opt-out
              within 10 business days.
            </p>
          </Section>

          <Section id="children" title="11. Children's Privacy">
            <p>
              Our Services are not directed at individuals under the age of 18.
              We do not knowingly collect personal data from minors. If we
              become aware that we have collected data from a minor without
              parental consent, we will delete it promptly. If you believe a
              minor has created an account, please contact us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section id="transfers" title="12. International Data Transfers">
            <p>
              AfraPay operates across multiple African countries and may
              transfer your personal data to servers located outside your
              country of residence (including to the European Economic Area via
              our cloud infrastructure providers). We ensure such transfers are
              protected by:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                Standard Contractual Clauses (SCCs) approved by the European
                Commission; or
              </li>
              <li>
                An adequacy decision by the applicable supervisory authority.
              </li>
            </ul>
          </Section>

          <Section id="changes" title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices or applicable law. We will notify you of
              significant changes via email or an in-app banner at least 14 days
              before the change takes effect.
            </p>
            <p>
              The "Effective Date" at the top of this page indicates when the
              current version was last revised.
            </p>
          </Section>

          <Section id="contact" title="14. Contact Us">
            <p>
              For any privacy-related enquiries, data subject requests, or
              complaints, please contact our Data Protection Officer:
            </p>
            <address className="not-italic mt-2 space-y-1 text-neutral-700">
              <p className="font-medium">
                {COMPANY_NAME} — Data Protection Officer
              </p>
              <p>
                Email:{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-primary-600 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>Website: {WEBSITE}</p>
            </address>
            <p className="mt-3">
              If you are not satisfied with our response, you have the right to
              lodge a complaint with your national data protection authority.
            </p>
          </Section>

          <p className="text-xs text-neutral-400 mt-10 border-t border-neutral-100 pt-6">
            Last updated: {EFFECTIVE_DATE}.
          </p>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
