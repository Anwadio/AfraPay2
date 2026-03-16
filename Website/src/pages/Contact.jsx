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
import { SCHEMA_CONTACT } from "../components/seo/schemas";

const CONTACT_CHANNELS = [
  {
    icon: "mail",
    title: "Email Us",
    description: "Our team typically responds within 2 hours.",
    value: "support@afrapay.com",
    action: "mailto:support@afrapay.com",
    actionLabel: "Send Email",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "phone",
    title: "Call Us",
    description: "Available Monday – Friday, 8am – 8pm EAT.",
    value: "+211 92 000 0000",
    action: "tel:+211920000000",
    actionLabel: "Call Now",
    color: "bg-success-50 text-success-600",
  },
  {
    icon: "messageCircle",
    title: "Live Chat",
    description: "Chat with us in real time — no wait queue.",
    value: "Always online for registered users",
    action: null,
    actionLabel: "Open Chat",
    color: "bg-secondary-50 text-secondary-600",
  },
  {
    icon: "mapPin",
    title: "Visit Us",
    description: "Head office in the heart of Juba.",
    value: "Juba City Centre, South Sudan",
    action: null,
    actionLabel: "Get Directions",
    color: "bg-warning-50 text-warning-600",
  },
];

const FAQS = [
  {
    q: "How long does it take to open an account?",
    a: "Creating an AfraPay account takes less than 5 minutes. Simply provide your details, verify your identity, and you're ready to go.",
  },
  {
    q: "What currencies does AfraPay support?",
    a: "AfraPay supports SSP (South Sudanese Pound) as the primary currency, with conversion support for USD, KES, UGX, ETB, and other East African currencies.",
  },
  {
    q: "Is my money safe with AfraPay?",
    a: "Absolutely. We use 256-bit encryption, two-factor authentication, and AI-powered fraud detection. We are licensed by the Bank of South Sudan.",
  },
  {
    q: "What are the transfer fees?",
    a: "We offer the lowest fees in South Sudan — starting from 0.5% per transfer. Check our Pricing page for a full breakdown.",
  },
  {
    q: "How do I reset my password?",
    a: "Click 'Forgot Password' on the login page and we'll send a secure reset link to your registered email address within seconds.",
  },
  {
    q: "Can I use AfraPay for my business?",
    a: "Yes! We offer dedicated business accounts with multi-user access, payroll management, invoicing, and corporate card controls.",
  },
];

const OFFICES = [
  {
    city: "Juba",
    country: "South Sudan",
    address: "Juba City Centre, Ministries Road",
    phone: "+211 92 000 0000",
    isHQ: true,
  },
  {
    city: "Wau",
    country: "South Sudan",
    address: "Wau Town, Commercial Street",
    phone: "+211 92 000 0001",
    isHQ: false,
  },
  {
    city: "Malakal",
    country: "South Sudan",
    address: "Malakal Centre, Main Avenue",
    phone: "+211 92 000 0002",
    isHQ: false,
  },
];

const Contact = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production this would POST to the backend
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Contact Us – Get in Touch with AfraPay"
        description="Contact AfraPay by email, phone, or live chat. Our team is available Monday–Friday 8am–8pm EAT. We're here to help with payments, accounts, and more."
        keywords="AfraPay contact, support email, customer service Africa, fintech support Juba"
        structuredData={SCHEMA_CONTACT}
      />
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800 text-white py-24 overflow-hidden">
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
              💬 We're Here to Help
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Get in <span className="text-primary-300">Touch</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-200 max-w-xl leading-relaxed">
              Have a question, need support, or want to explore a partnership?
              Our team is available 24/7 and ready to help.
            </p>
          </div>
        </Container>
      </section>

      {/* Contact channels */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <Grid cols={{ base: 1, md: 2, lg: 4 }} gap={6}>
            {CONTACT_CHANNELS.map((channel) => (
              <Card
                key={channel.title}
                className="p-6 hover:shadow-lg transition-shadow border-neutral-100 hover:border-primary-200 text-center"
              >
                <CardContent>
                  <div
                    className={`w-14 h-14 ${channel.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon name={channel.icon} className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1">
                    {channel.title}
                  </h3>
                  <p className="text-sm text-neutral-500 mb-2">
                    {channel.description}
                  </p>
                  <p className="text-sm font-semibold text-neutral-700 mb-4">
                    {channel.value}
                  </p>
                  {channel.action ? (
                    <a
                      href={channel.action}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      {channel.actionLabel}{" "}
                      <Icon name="arrowRight" className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 cursor-pointer hover:text-primary-700 transition-colors">
                      {channel.actionLabel}{" "}
                      <Icon name="arrowRight" className="w-4 h-4" />
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* Contact form + office info */}
      <Section spacing="xl" className="bg-primary-50">
        <Container>
          <Grid cols={{ base: 1, lg: 2 }} gap={12}>
            {/* Form */}
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-primary-200 text-primary-600"
              >
                ✉️ Send a Message
              </Badge>
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                We'll Get Back to You
              </h2>
              <p className="text-neutral-600 mb-8">
                Fill out the form and our team will respond within 2 business
                hours.
              </p>

              {submitted ? (
                <div className="bg-success-50 border border-success-200 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon
                      name="checkCircle"
                      className="w-8 h-8 text-success-600"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-neutral-600 mb-6">
                    Thanks for reaching out. We'll be in touch very soon.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        name: "",
                        email: "",
                        phone: "",
                        subject: "",
                        message: "",
                      });
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <Grid cols={{ base: 1, md: 2 }} gap={4}>
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-semibold text-neutral-700 mb-1.5"
                      >
                        Full Name <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Amina Hassan"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-neutral-700 mb-1.5"
                      >
                        Email Address <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="amina@example.com"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                      />
                    </div>
                  </Grid>

                  <Grid cols={{ base: 1, md: 2 }} gap={4}>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-semibold text-neutral-700 mb-1.5"
                      >
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+211 92 000 0000"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-semibold text-neutral-700 mb-1.5"
                      >
                        Subject <span className="text-error-500">*</span>
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={form.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                      >
                        <option value="">Select a topic…</option>
                        <option value="account">Account Support</option>
                        <option value="transaction">Transaction Issue</option>
                        <option value="business">Business Inquiry</option>
                        <option value="partnership">Partnership</option>
                        <option value="technical">Technical Support</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </Grid>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-semibold text-neutral-700 mb-1.5"
                    >
                      Message <span className="text-error-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help you…"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4"
                  >
                    <Icon name="send" className="w-5 h-5 inline mr-2" />
                    Send Message
                  </Button>

                  <p className="text-xs text-neutral-400 text-center">
                    🔒 Your information is encrypted and never shared with third
                    parties.
                  </p>
                </form>
              )}
            </div>

            {/* Office locations */}
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-secondary-200 text-secondary-600"
              >
                🏢 Our Offices
              </Badge>
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                Find Us Across South Sudan
              </h2>
              <p className="text-neutral-600 mb-8">
                Walk in during business hours — our teams are always happy to
                meet in person.
              </p>

              <div className="space-y-4 mb-10">
                {OFFICES.map((office) => (
                  <Card
                    key={office.city}
                    className={`p-5 border ${
                      office.isHQ
                        ? "border-primary-200 bg-primary-50"
                        : "border-neutral-100 bg-white"
                    }`}
                  >
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            office.isHQ
                              ? "bg-primary-100 text-primary-600"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          <Icon name="mapPin" className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-neutral-900">
                              {office.city}
                            </h4>
                            {office.isHQ && (
                              <Badge variant="primary" size="sm">
                                HQ
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500">
                            {office.address}
                          </p>
                          <a
                            href={`tel:${office.phone.replace(/\s/g, "")}`}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-1 inline-block"
                          >
                            {office.phone}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Business hours */}
              <Card className="p-6 border-neutral-100 bg-white">
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-warning-50 text-warning-600 rounded-xl flex items-center justify-center">
                      <Icon name="clock" className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-neutral-900">
                      Business Hours
                    </h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      {
                        days: "Monday – Friday",
                        hours: "8:00 AM – 8:00 PM EAT",
                      },
                      { days: "Saturday", hours: "9:00 AM – 5:00 PM EAT" },
                      {
                        days: "Sunday",
                        hours: "Closed (Online support available)",
                      },
                    ].map(({ days, hours }) => (
                      <div
                        key={days}
                        className="flex justify-between py-1.5 border-b border-neutral-50 last:border-0"
                      >
                        <span className="text-neutral-600 font-medium">
                          {days}
                        </span>
                        <span className="text-neutral-800 font-semibold">
                          {hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Grid>
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
              ❓ FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Can't find what you're looking for? Use the form above to reach
              our support team.
            </p>
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
        className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white"
      >
        <Container>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-xl mx-auto">
              Join 2M+ users already transforming their financial lives with
              AfraPay.
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
                className="border-2 border-white/50 !text-white !bg-transparent hover:!bg-white/10 font-bold px-10"
              >
                <Icon name="phone" className="w-5 h-5 inline mr-2" />
                Call Us Now
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default Contact;
