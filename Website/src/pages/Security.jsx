import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Section,
  Grid,
  Button,
  Badge,
  Card,
  CardContent,
} from "../components";
import { Icon } from "../components/common/Icons";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_SECURITY } from "../components/seo/schemas";

const SECURITY_PILLARS = [
  {
    icon: "shield",
    title: "256-bit Encryption",
    description:
      "All data in transit and at rest is protected with AES-256 encryption — the same standard used by global banks and government agencies.",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "lock",
    title: "Two-Factor Authentication",
    description:
      "Every login is backed by 2FA via SMS or authenticator app, ensuring only you can access your account even if your password is compromised.",
    color: "bg-success-50 text-success-600",
  },
  {
    icon: "zap",
    title: "AI Fraud Detection",
    description:
      "Our machine-learning engine monitors every transaction in real time, flagging unusual patterns and blocking suspicious activity before it affects you.",
    color: "bg-warning-50 text-warning-600",
  },
  {
    icon: "eye",
    title: "24/7 Monitoring",
    description:
      "Our dedicated security operations team and automated systems watch your account around the clock, 365 days a year.",
    color: "bg-secondary-50 text-secondary-600",
  },
  {
    icon: "server",
    title: "Secure Infrastructure",
    description:
      "AfraPay runs on ISO 27001-certified cloud infrastructure with multi-region redundancy, regular penetration testing, and zero-downtime deployments.",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "users",
    title: "Strict Access Controls",
    description:
      "Internally, we enforce least-privilege access. No employee can view your full account data without multi-party approval and audit logging.",
    color: "bg-success-50 text-success-600",
  },
];

const CERTIFICATIONS = [
  {
    badge: "🏅",
    name: "PCI DSS Level 1",
    body: "Payment Card Industry",
    description:
      "The highest level of certification for payment processors worldwide.",
    image: "/certificationimages/PCIimage.png",
  },
  {
    badge: "🔒",
    name: "ISO 27001",
    body: "International Organization for Standardization",
    description:
      "Internationally recognised information security management standard.",
    image: "/certificationimages/ISOimage.png",
  },
  {
    badge: "🏦",
    name: "Bank of South Sudan",
    body: "Central Bank License",
    description:
      "Fully licensed and regulated by the central bank of South Sudan.",
    image: "/certificationimages/Bankimage.png",
  },
  {
    badge: "✅",
    name: "SOC 2 Type II",
    body: "AICPA",
    description:
      "Annual audit of our security, availability, and confidentiality controls.",
    image: "/certificationimages/SOC2image.png",
  },
  {
    badge: "🌍",
    name: "GDPR Compliant",
    body: "EU Data Protection",
    description:
      "Your personal data is handled in full compliance with GDPR principles.",
    image: "/certificationimages/GDPRimage.png",
  },
  {
    badge: "🛡️",
    name: "FDIC Insured",
    body: "Up to $250,000",
    description: "User funds are held in FDIC-insured partner bank accounts.",
    image: "/certificationimages/FDCIimage.png",
  },
];

const HOW_WE_PROTECT = [
  {
    step: "01",
    title: "You Log In",
    body: "Your credentials are hashed with bcrypt and never stored in plain text. 2FA adds a second layer before access is granted.",
  },
  {
    step: "02",
    title: "Every Action Is Verified",
    body: "High-value actions (large transfers, new payees) require re-authentication and are reviewed by our fraud engine before execution.",
  },
  {
    step: "03",
    title: "Transactions Are Screened",
    body: "Our AI compares each transaction against your spending patterns. Anomalies are flagged and you are notified instantly.",
  },
  {
    step: "04",
    title: "Your Data Is Encrypted",
    body: "All communication uses TLS 1.3. Data at rest is AES-256 encrypted. Encryption keys are rotated regularly and stored in hardware security modules.",
  },
  {
    step: "05",
    title: "Audit Trails Are Kept",
    body: "Every account action is logged with timestamps and IP data. If anything goes wrong, we have a full forensic trail to act on.",
  },
];

const FAQS = [
  {
    q: "What happens if I notice an unauthorised transaction?",
    a: "Contact us immediately via in-app chat, email (support@afrapayafrica.com), or call +211 92 000 0000. We will freeze your account, investigate within 24 hours, and reverse any fraudulent charges.",
  },
  {
    q: "Can AfraPay employees see my PIN or password?",
    a: "No. Passwords are one-way hashed and PINs are encrypted. Not even our engineers can read them. Support teams only see masked account identifiers.",
  },
  {
    q: "How do I enable Two-Factor Authentication?",
    a: "Go to Settings → Security → Two-Factor Authentication and follow the setup wizard. The entire process takes under 60 seconds.",
  },
  {
    q: "Is my money protected if AfraPay shuts down?",
    a: "Yes. Customer funds are held in segregated, FDIC-insured accounts at our partner banks — completely separate from AfraPay's operating capital.",
  },
  {
    q: "How often do you run security audits?",
    a: "We conduct quarterly internal penetration tests and annual third-party audits. Bug bounty programmes run continuously to surface vulnerabilities before bad actors do.",
  },
];

const Security = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Security – How AfraPay Protects Your Money"
        description="AfraPay uses 256-bit encryption, 2FA, AI fraud detection, and 24/7 monitoring to keep your money safe. Learn about our ISO 27001-certified infrastructure."
        keywords="AfraPay security, payment security Africa, 256-bit encryption, fraud detection, two-factor authentication fintech"
        structuredData={SCHEMA_SECURITY}
      />
      {/* Hero */}
      <section
        className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800 text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/SecurityImage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 bg-secondary-500/10 rounded-full blur-2xl"
          aria-hidden="true"
        />
        <Container className="relative">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-6 border-white/30 text-white bg-white/10"
            >
              🛡️ Security First
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Your Money is{" "}
              <span className="text-primary-300">Safe with Us</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-200 max-w-xl leading-relaxed">
              AfraPay is built on a foundation of bank-grade security. Every
              feature, every transaction, every byte of your data is protected
              by multiple overlapping layers of defence.
            </p>
            <div className="flex flex-wrap items-center gap-6 mt-8 text-sm">
              {["PCI DSS Level 1", "ISO 27001", "256-bit AES", "24/7 SOC"].map(
                (badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2"
                  >
                    <div className="w-2 h-2 bg-success-400 rounded-full" />
                    <span className="font-medium">{badge}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Security pillars */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-primary-200 text-primary-600"
            >
              🔐 Core Security Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Multiple Layers of Protection
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Security is not a single feature — it is a layered system built
              into every aspect of our platform.
            </p>
          </div>

          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {SECURITY_PILLARS.map((pillar) => (
              <Card
                key={pillar.title}
                className="p-8 border-neutral-100 hover:shadow-lg hover:border-primary-200 transition-all"
              >
                <CardContent>
                  <div
                    className={`w-14 h-14 ${pillar.color} rounded-2xl flex items-center justify-center mb-5`}
                  >
                    <Icon name={pillar.icon} className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed">
                    {pillar.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* How we protect your money — step-by-step */}
      <Section spacing="xl" className="bg-primary-50">
        <Container>
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-primary-200 text-primary-600"
            >
              ⚙️ How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Security at Every Step
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              From the moment you log in to the moment your money arrives,
              here's what happens behind the scenes.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {HOW_WE_PROTECT.map((item, i) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-md">
                  {item.step}
                </div>
                <Card className="flex-1 p-6 border-neutral-100 bg-white">
                  <CardContent>
                    <h4 className="font-bold text-neutral-900 mb-2 text-lg">
                      {item.title}
                    </h4>
                    <p className="text-neutral-600 leading-relaxed">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Certifications */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-4 border-success-200 text-success-600"
            >
              🏅 Certifications & Compliance
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Independently Verified
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              We don't just say we're secure — we prove it through rigorous
              third-party audits and regulatory compliance.
            </p>
          </div>

          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {CERTIFICATIONS.map((cert) => (
              <Card
                key={cert.name}
                className="group p-6 border-neutral-100 hover:shadow-xl hover:border-success-200 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden relative"
              >
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-16 h-16 flex-shrink-0 rounded-xl bg-center bg-cover bg-no-repeat shadow-md group-hover:shadow-lg transition-all duration-300"
                      style={{ backgroundImage: `url('${cert.image}')` }}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-neutral-900 mb-0.5 group-hover:text-success-700 transition-colors duration-300">
                        {cert.name}
                      </h4>
                      <p className="text-xs text-primary-600 font-semibold mb-2 group-hover:text-primary-700 transition-colors duration-300">
                        {cert.body}
                      </p>
                      <p className="text-sm text-neutral-500 leading-relaxed group-hover:text-neutral-600 transition-colors duration-300">
                        {cert.description}
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-success-50/0 to-success-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* Responsible disclosure */}
      <Section
        spacing="lg"
        className="relative overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/SecurityImage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-primary-900/75" />
        <Container className="relative z-10">
          <Card className="p-8 md:p-12 border-white/20 bg-white/95 backdrop-blur-sm max-w-3xl mx-auto text-center shadow-xl">
            <CardContent>
              <div className="w-16 h-16 bg-warning-100 text-warning-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">
                Found a Security Vulnerability?
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-8 max-w-xl mx-auto">
                We operate a responsible disclosure programme. If you discover a
                security issue, please report it privately to our security team.
                We respond to all reports within 24 hours and reward valid
                findings.
              </p>
              <a href="mailto:security@afrapayafrica.com">
                <Button
                  size="lg"
                  className="bg-warning-500 hover:bg-warning-600 text-white font-bold"
                >
                  <Icon name="mail" className="w-5 h-5 inline mr-2" />
                  security@afrapayafrica.com
                </Button>
              </a>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* FAQ */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="text-center mb-12">
            <Badge
              variant="outline"
              className="mb-4 border-primary-200 text-primary-600"
            >
              ❓ Security FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Common Security Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-neutral-100 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-primary-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="font-semibold text-neutral-900">
                    {faq.q}
                  </span>
                  <Icon
                    name={openFaq === i ? "chevronUp" : "chevronDown"}
                    className="w-5 h-5 text-neutral-400 flex-shrink-0 ml-4"
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 bg-primary-50">
                    <p className="text-neutral-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section
        spacing="lg"
        className="relative text-white overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/SecurityImage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/85 via-primary-800/80 to-secondary-900/85" />
        <Container className="relative z-10">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bank with Confidence
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-xl mx-auto">
              Join 2M+ users who trust AfraPay with their finances every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="xl"
                onClick={() => navigate("/auth/register")}
                className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-10"
              >
                🚀 Open Free Account
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => navigate("/contact")}
                className="border-2 border-white/50 !text-white !bg-transparent hover:!bg-white/10 font-bold px-10"
              >
                <Icon name="messageCircle" className="w-5 h-5 inline mr-2" />
                Talk to Security Team
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default Security;
