import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_TERMS } from "../components/seo/schemas";

const EFFECTIVE_DATE = "March 13, 2026";
const COMPANY_NAME = "AfraPay Africa Limited";
const SUPPORT_EMAIL = "legal@afrapay.com";
const WEBSITE = "www.afrapay.com";

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-10">
    <h2 className="text-xl font-semibold text-neutral-900 mb-4 border-b border-neutral-200 pb-2">
      {title}
    </h2>
    <div className="space-y-3 text-neutral-700 leading-relaxed">{children}</div>
  </section>
);

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toc = [
    { id: "acceptance", label: "1. Acceptance of Terms" },
    { id: "eligibility", label: "2. Eligibility" },
    { id: "account", label: "3. Account Registration" },
    { id: "services", label: "4. Our Services" },
    { id: "payments", label: "5. Payments & Transactions" },
    { id: "fees", label: "6. Fees & Charges" },
    { id: "prohibited", label: "7. Prohibited Activities" },
    { id: "kyc", label: "8. KYC / AML Compliance" },
    { id: "liability", label: "9. Limitation of Liability" },
    { id: "termination", label: "10. Termination" },
    { id: "disputes", label: "11. Dispute Resolution" },
    { id: "changes", label: "12. Changes to Terms" },
    { id: "contact", label: "13. Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <SEOHead
        title="Terms of Service"
        description="Read AfraPay's Terms of Service. These terms govern your use of the AfraPay payment platform and related financial services across Africa."
        keywords="AfraPay terms of service, user agreement, payment terms, legal AfraPay"
        structuredData={SCHEMA_TERMS}
      />
      {/* Hero */}
      <div className="bg-primary-700 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Terms of Service
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
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Please read these Terms carefully.</strong> By creating an
            account or using AfraPay's services, you confirm that you have read,
            understood, and agree to be bound by these Terms and our{" "}
            <Link
              to="/privacy"
              className="underline hover:text-amber-900 font-medium"
            >
              Privacy Policy
            </Link>
            .
          </div>

          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>
              These Terms of Service ("Terms") constitute a legally binding
              agreement between you ("User", "you") and {COMPANY_NAME}{" "}
              ("AfraPay", "we", "our") governing your access to and use of the
              AfraPay platform, mobile application, APIs, and related services
              (collectively, the "Services").
            </p>
            <p>
              By registering an account, clicking "Create Account", or otherwise
              accessing the Services, you acknowledge that you have read and
              agree to these Terms. If you do not agree, you must not use our
              Services.
            </p>
          </Section>

          <Section id="eligibility" title="2. Eligibility">
            <p>To use AfraPay, you must:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Be at least 18 years of age;</li>
              <li>
                Reside in a country where AfraPay operates (currently including
                Nigeria, Ghana, Kenya, South Africa, Uganda, Tanzania, Rwanda,
                Senegal, Ivory Coast, and Cameroon);
              </li>
              <li>
                Have the legal capacity to enter into a binding contract; and
              </li>
              <li>
                Not be prohibited from using financial services under any
                applicable law.
              </li>
            </ul>
            <p>
              Business accounts may have different eligibility requirements as
              outlined in our Business Account Terms.
            </p>
          </Section>

          <Section id="account" title="3. Account Registration">
            <p>
              You must provide accurate, current, and complete information
              during registration. You are responsible for maintaining the
              confidentiality of your login credentials and for all activity
              that occurs under your account.
            </p>
            <p>
              You agree to immediately notify AfraPay at {SUPPORT_EMAIL} if you
              suspect any unauthorized access to your account. AfraPay is not
              liable for any loss arising from your failure to safeguard your
              credentials.
            </p>
            <p>
              You may not create more than one personal account. AfraPay
              reserves the right to verify your identity and suspend or close
              duplicate accounts.
            </p>
          </Section>

          <Section id="services" title="4. Our Services">
            <p>AfraPay provides the following core services:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Digital wallet and stored-value accounts;</li>
              <li>
                Domestic and cross-border money transfers within supported
                corridors;
              </li>
              <li>Bill payments and merchant payments;</li>
              <li>Currency conversion at real-time exchange rates;</li>
              <li>Financial education resources; and</li>
              <li>
                API access for registered business partners (subject to separate
                agreement).
              </li>
            </ul>
            <p>
              Services are subject to geographic availability and may be
              modified, suspended, or discontinued at any time with prior notice
              where reasonably practicable.
            </p>
          </Section>

          <Section id="payments" title="5. Payments & Transactions">
            <p>
              All transactions initiated through AfraPay are subject to review
              for fraud and compliance purposes. AfraPay reserves the right to
              delay, hold, or reverse any transaction that it reasonably
              suspects is fraudulent, in violation of these Terms, or contrary
              to applicable law.
            </p>
            <p>
              <strong>Irreversibility:</strong> Once a transaction is marked as
              "Completed", it generally cannot be reversed. You are solely
              responsible for verifying recipient details before confirming a
              payment.
            </p>
            <p>
              <strong>Transaction limits</strong> apply based on your KYC
              verification level. Higher limits are available upon completing
              enhanced identity verification.
            </p>
          </Section>

          <Section id="fees" title="6. Fees & Charges">
            <p>
              AfraPay charges fees for certain services as described on the{" "}
              <Link to="/pricing" className="text-primary-600 hover:underline">
                Pricing page
              </Link>
              . Fees may vary by transaction type, amount, and corridor. All
              applicable fees will be disclosed to you before you confirm a
              transaction.
            </p>
            <p>
              AfraPay reserves the right to introduce new fees or modify
              existing fees with at least 30 days' notice to registered users
              via email or in-app notification.
            </p>
          </Section>

          <Section id="prohibited" title="7. Prohibited Activities">
            <p>You agree not to use AfraPay's Services to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                Conduct or facilitate money laundering or terrorist financing;
              </li>
              <li>Purchase or sell illegal goods or services;</li>
              <li>
                Engage in fraudulent chargebacks, unauthorized use of
                third-party payment methods, or account takeover;
              </li>
              <li>Transmit malware, spam, or harmful code to our systems;</li>
              <li>
                Circumvent transaction limits, security controls, or KYC
                requirements through misrepresentation;
              </li>
              <li>
                Use automated means (bots, scripts) to access the Services
                without prior written consent; or
              </li>
              <li>
                Violate any applicable law, regulation, or third-party rights.
              </li>
            </ul>
            <p>
              Violation of any of the above may result in immediate account
              suspension, transaction reversal, and reporting to relevant
              authorities.
            </p>
          </Section>

          <Section id="kyc" title="8. KYC / AML Compliance">
            <p>
              AfraPay is required by law to verify the identity of its users and
              monitor transactions for money laundering and terrorist financing
              (AML/CTF). By using our Services you agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                Provide accurate personal identification documents when
                requested;
              </li>
              <li>
                Allow AfraPay to screen your information against sanctions and
                watchlists; and
              </li>
              <li>
                Accept that transactions may be delayed or blocked pending
                compliance review.
              </li>
            </ul>
            <p>
              AfraPay may share your information with regulatory authorities,
              financial crime units, and law enforcement as required by law,
              without prior notice to you.
            </p>
          </Section>

          <Section id="liability" title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, AfraPay, its
              affiliates, directors, employees, and partners shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the Services.
            </p>
            <p>
              AfraPay's total aggregate liability for any claim arising from
              these Terms or your use of the Services shall not exceed the
              greater of (a) the total fees paid by you to AfraPay in the 12
              months preceding the event giving rise to liability, or (b) USD
              100.
            </p>
            <p>
              AfraPay does not warrant that the Services will be uninterrupted,
              error-free, or free of viruses or other harmful components.
            </p>
          </Section>

          <Section id="termination" title="10. Termination">
            <p>
              You may close your account at any time by contacting{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              . Any pending transactions or withheld funds subject to compliance
              holds will not be released until those holds are resolved.
            </p>
            <p>
              AfraPay may suspend or terminate your account at any time, without
              notice, for:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Breach of these Terms;</li>
              <li>Fraudulent or suspicious activity;</li>
              <li>Non-compliance with KYC/AML requirements; or</li>
              <li>Legal or regulatory obligations.</li>
            </ul>
          </Section>

          <Section id="disputes" title="11. Dispute Resolution">
            <p>
              If you have a dispute regarding a transaction or our Services,
              please contact our support team at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              first. We aim to resolve disputes within 10 business days.
            </p>
            <p>
              These Terms are governed by the laws of the Federal Republic of
              Nigeria. Any unresolved dispute shall be referred to binding
              arbitration under the Arbitration and Conciliation Act of Nigeria.
            </p>
          </Section>

          <Section id="changes" title="12. Changes to Terms">
            <p>
              AfraPay may update these Terms from time to time. We will notify
              you of material changes via email or a prominent in-app notice at
              least 30 days before the change takes effect (or immediately where
              required by law).
            </p>
            <p>
              Continued use of the Services after the effective date of any
              update constitutes your acceptance of the revised Terms.
            </p>
          </Section>

          <Section id="contact" title="13. Contact Us">
            <p>For any questions about these Terms, please contact us:</p>
            <address className="not-italic mt-2 space-y-1 text-neutral-700">
              <p className="font-medium">{COMPANY_NAME}</p>
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
          </Section>

          <p className="text-xs text-neutral-400 mt-10 border-t border-neutral-100 pt-6">
            Last updated: {EFFECTIVE_DATE}. These Terms supersede all prior
            versions.
          </p>
        </main>
      </div>
    </div>
  );
};

export default TermsOfService;
