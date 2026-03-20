/* eslint-disable no-console */
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
import { supportAPI } from "../services/api";
import toast from "react-hot-toast";
import LiveChat from "../components/chat/LiveChat";

const CONTACT_CHANNELS = [
  {
    icon: "mail",
    title: "Email Us",
    description: "Our team typically responds within 2 hours.",
    value: "support@afrapayafrica.com",
    action: "mailto:support@afrapayafrica.com",
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
    action: "chat",
    actionLabel: "Open Chat",
    color: "bg-secondary-50 text-secondary-600",
  },
  {
    icon: "mapPin",
    title: "Visit Us",
    description: "Head office in the heart of Juba.",
    value: "Juba City Centre, South Sudan",
    action: "directions",
    actionLabel: "Get Directions",
    color: "bg-warning-50 text-warning-600",
    coordinates: {
      lat: 4.8594,
      lng: 31.5713,
      address: "Juba City Centre, Ministries Road, Juba, South Sudan",
    },
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
    coordinates: { lat: 4.8594, lng: 31.5713 },
  },
  {
    city: "Wau",
    country: "South Sudan",
    address: "Wau Town, Commercial Street",
    phone: "+211 92 000 0001",
    isHQ: false,
    coordinates: { lat: 7.7028, lng: 28.0098 },
  },
  {
    city: "Malakal",
    country: "South Sudan",
    address: "Malakal Centre, Main Avenue",
    phone: "+211 92 000 0002",
    isHQ: false,
    coordinates: { lat: 9.5334, lng: 31.6605 },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [openFaq, setOpenFaq] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleGetDirections = async (destination) => {
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        // Fallback: Open Google Maps without current location
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.address)}`;
        window.open(googleMapsUrl, "_blank");
        toast.info("Opening directions in Google Maps");
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading(
        "Getting your location for directions...",
      );

      // Get user's current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.dismiss(loadingToast);
          const { latitude, longitude } = position.coords;

          // Detect platform and open appropriate map service
          const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
          const isAndroid = /Android/.test(navigator.userAgent);

          let mapUrl;
          let serviceName;

          if (isIOS || isMac) {
            // Apple Maps for iOS/Mac
            mapUrl = `https://maps.apple.com/?saddr=${latitude},${longitude}&daddr=${destination.lat},${destination.lng}&dirflg=d`;
            serviceName = "Apple Maps";
          } else if (isAndroid) {
            // Google Maps for Android
            mapUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${destination.lat},${destination.lng}`;
            serviceName = "Google Maps";
          } else {
            // Google Maps for other platforms
            mapUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${destination.lat},${destination.lng}`;
            serviceName = "Google Maps";
          }

          window.open(mapUrl, "_blank");
          toast.success(`🗺️ Opening directions in ${serviceName}`);
        },
        (error) => {
          toast.dismiss(loadingToast);
          console.warn("Geolocation error:", error);

          // Fallback: Open map service without current location
          const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.address)}`;
          window.open(fallbackUrl, "_blank");

          if (error.code === error.PERMISSION_DENIED) {
            toast.info(
              "📍 Location access denied. Opening directions without your current location.",
            );
          } else {
            toast.info(
              "🗺️ Unable to get your location. Opening directions in Google Maps.",
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    } catch (error) {
      console.error("Error getting directions:", error);
      // Ultimate fallback
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.address)}`;
      window.open(fallbackUrl, "_blank");
      toast.info("🗺️ Opening directions in Google Maps");
    }
  };

  const handleOfficeDirections = (office) => {
    handleGetDirections({
      lat: office.coordinates.lat,
      lng: office.coordinates.lng,
      address: `${office.address}, ${office.city}, ${office.country}`,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = "Email address is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Subject validation
    if (!form.subject) {
      newErrors.subject = "Please select a subject";
    }

    // Message validation
    if (!form.message.trim()) {
      newErrors.message = "Message is required";
    } else if (form.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    // Phone validation (optional but if provided, should be valid)
    if (form.phone.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(form.phone.replace(/\s/g, ""))) {
        newErrors.phone = "Please enter a valid phone number";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await supportAPI.createTicket({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        subject: form.subject,
        message: form.message.trim(),
        source: "contact_page",
        priority: "medium",
      });

      if (response.success) {
        toast.success(
          "✨ Message sent successfully! We'll get back to you soon.",
        );
        setSubmitted(true);
      } else {
        toast.error(
          response.message || "Failed to send message. Please try again.",
        );
      }
    } catch (error) {
      console.error("Contact form submission error:", error);
      if (error.response?.status === 429) {
        toast.error(
          "Too many requests. Please wait a moment before trying again.",
        );
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(
          "Something went wrong. Please try again or contact us directly.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
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
      <section
        className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800 text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Contactimage.png')",
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
                  {channel.action === "chat" ? (
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      {channel.actionLabel}{" "}
                      <Icon name="arrowRight" className="w-4 h-4" />
                    </button>
                  ) : channel.action === "directions" ? (
                    <button
                      onClick={() => handleGetDirections(channel.coordinates)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      {channel.actionLabel}{" "}
                      <Icon name="arrowRight" className="w-4 h-4" />
                    </button>
                  ) : channel.action ? (
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
                      setErrors({});
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
                        disabled={isSubmitting}
                        placeholder="Amina Hassan"
                        className={`w-full px-4 py-3 border rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.name
                            ? "border-error-300 focus:ring-error-500"
                            : "border-neutral-200"
                        }`}
                      />
                      {errors.name && (
                        <p className="text-error-600 text-xs mt-1">
                          {errors.name}
                        </p>
                      )}
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
                        disabled={isSubmitting}
                        placeholder="amina@example.com"
                        className={`w-full px-4 py-3 border rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.email
                            ? "border-error-300 focus:ring-error-500"
                            : "border-neutral-200"
                        }`}
                      />
                      {errors.email && (
                        <p className="text-error-600 text-xs mt-1">
                          {errors.email}
                        </p>
                      )}
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
                        disabled={isSubmitting}
                        placeholder="+211 92 000 0000"
                        className={`w-full px-4 py-3 border rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.phone
                            ? "border-error-300 focus:ring-error-500"
                            : "border-neutral-200"
                        }`}
                      />
                      {errors.phone && (
                        <p className="text-error-600 text-xs mt-1">
                          {errors.phone}
                        </p>
                      )}
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
                        disabled={isSubmitting}
                        className={`w-full px-4 py-3 border rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.subject
                            ? "border-error-300 focus:ring-error-500"
                            : "border-neutral-200"
                        }`}
                      >
                        <option value="">Select a topic…</option>
                        <option value="account">Account Support</option>
                        <option value="transaction">Transaction Issue</option>
                        <option value="business">Business Inquiry</option>
                        <option value="partnership">Partnership</option>
                        <option value="technical">Technical Support</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.subject && (
                        <p className="text-error-600 text-xs mt-1">
                          {errors.subject}
                        </p>
                      )}
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
                      disabled={isSubmitting}
                      placeholder="Tell us how we can help you…"
                      className={`w-full px-4 py-3 border rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.message
                          ? "border-error-300 focus:ring-error-500"
                          : "border-neutral-200"
                      }`}
                    />
                    {errors.message && (
                      <p className="text-error-600 text-xs mt-1">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Icon name="send" className="w-5 h-5 inline mr-2" />
                        Send Message
                      </>
                    )}
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
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-1 inline-block mr-4"
                          >
                            {office.phone}
                          </a>
                          <button
                            onClick={() => handleOfficeDirections(office)}
                            className="text-sm text-secondary-600 hover:text-secondary-700 font-medium mt-1 inline-flex items-center gap-1"
                          >
                            <Icon name="mapPin" className="w-3 h-3" />
                            Directions
                          </button>
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
        className="relative text-white overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Contactimage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/85 via-primary-800/80 to-secondary-900/85" />
        <Container className="relative z-10">
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

      {/* Live Chat Component */}
      <LiveChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default Contact;
