/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Container, Section, Badge, Card, CardContent } from "../components";
import { Icon } from "../components/common/Icons";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_HOME } from "../components/seo/schemas";
import {
  ShieldCheck,
  Rocket,
  Play,
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Zap,
  Lock,
  Award,
  Bot,
  Building2,
  Clock,
  CheckCircle2,
  Sparkles,
  Phone,
  Users,
} from "lucide-react";
import {
  TRUST_BADGES,
  TESTIMONIALS,
  PARTNERS,
  FEATURES,
  STATS,
  TRUST_METRICS,
} from "../constants/landingData";

/* ─── Animation variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const DEMO_SLIDES = [
  {
    id: 5,
    label: "Mobile Pay",
    background: (
      <div className="absolute inset-0">
        <img
          src={`${process.env.PUBLIC_URL}/Carouselimages/Gemini_Generated_Image_660hv2660hv2660h.png`}
          alt="Mobile payments"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#003580]/80 via-[#0055cc]/50 to-transparent" />
        <div
          className="absolute opacity-30"
          style={{ top: "8%", right: "4%", width: 250 }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-2xl">
            <p className="font-bold text-neutral-800 mb-3">Mobile Payments</p>
            <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  Tap &amp; Pay
                </p>
                <p className="text-xs text-neutral-400">NFC enabled</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500">Last payment</p>
              <p className="text-xl font-bold text-green-600">SSP 450</p>
              <p className="text-xs text-neutral-400">Juba Central Market</p>
            </div>
          </div>
        </div>
        <div
          className="absolute opacity-35"
          style={{ bottom: "12%", right: "6%", width: 220 }}
        >
          <div className="bg-white rounded-xl p-3 shadow-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                Instant QR Pay
              </p>
              <p className="text-xs text-neutral-400">Works offline too</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    label: "Savings",
    background: (
      <div className="absolute inset-0">
        <img
          src={`${process.env.PUBLIC_URL}/Carouselimages/Gemini_Generated_Image_8za3mi8za3mi8za3.png`}
          alt="Savings goals"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#065f46]/80 via-[#047857]/55 to-transparent" />
        <div
          className="absolute opacity-30"
          style={{ top: "8%", right: "4%", width: 255 }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-2xl">
            <p className="font-bold text-neutral-800 mb-3">Savings Goals</p>
            {[
              { goal: "Emergency Fund", saved: 72, target: "SSP 10,000" },
              { goal: "New Business", saved: 45, target: "SSP 25,000" },
              { goal: "Education", saved: 88, target: "SSP 8,500" },
            ].map((g) => (
              <div key={g.goal} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-600 font-medium">{g.goal}</span>
                  <span className="text-green-600 font-semibold">
                    {g.saved}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${g.saved}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Target: {g.target}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div
          className="absolute opacity-35"
          style={{ bottom: "12%", right: "5%", width: 215 }}
        >
          <div className="bg-white rounded-xl p-3 shadow-lg">
            <p className="text-xs text-neutral-400">Auto-save active</p>
            <p className="text-sm font-semibold text-neutral-800 flex items-center gap-1">
              SSP 200 saved today{" "}
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    label: "Business",
    background: (
      <div className="absolute inset-0">
        <img
          src={`${process.env.PUBLIC_URL}/Carouselimages/Gemini_Generated_Image_h8v2avh8v2avh8v2.png`}
          alt="Business banking"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/80 via-[#312e81]/55 to-transparent" />
        <div
          className="absolute opacity-30"
          style={{ top: "8%", right: "4%", width: 260 }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-2xl">
            <p className="font-bold text-neutral-800 mb-3">Business Account</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "Revenue", value: "SSP 142K", up: true },
                { label: "Expenses", value: "SSP 38K", up: false },
                { label: "Invoices", value: "12 Sent", up: true },
                { label: "Payroll", value: "8 Staff", up: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-neutral-50 rounded-lg p-2 text-center"
                >
                  <p className="text-xs text-neutral-400">{item.label}</p>
                  <p className="text-sm font-bold text-neutral-800">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-purple-500 rounded-xl p-2 text-white text-center text-xs font-semibold flex items-center justify-center gap-2">
              <Users className="w-3.5 h-3.5" /> Multi-user access
            </div>
          </div>
        </div>
        <div
          className="absolute opacity-35"
          style={{ bottom: "12%", right: "5%", width: 220 }}
        >
          <div className="bg-white rounded-xl p-3 shadow-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                Corporate Cards
              </p>
              <p className="text-xs text-neutral-400">
                Spend controls &amp; limits
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    label: "Network",
    background: (
      <div className="absolute inset-0">
        <img
          src={`${process.env.PUBLIC_URL}/Carouselimages/Gemini_Generated_Image_sw52j6sw52j6sw52.png`}
          alt="Transfer network"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#450a0a]/80 via-[#7f1d1d]/55 to-transparent" />
        <div
          className="absolute opacity-30"
          style={{ top: "8%", right: "4%", width: 255 }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-2xl">
            <p className="font-bold text-neutral-800 mb-3">Transfer Network</p>
            <div className="space-y-2 mb-3">
              {[
                { state: "Juba", status: "Live", ping: "12ms" },
                { state: "Wau", status: "Live", ping: "18ms" },
                { state: "Malakal", status: "Live", ping: "24ms" },
                { state: "Yei", status: "Live", ping: "15ms" },
              ].map((node) => (
                <div
                  key={node.state}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-neutral-700">
                      {node.state}
                    </span>
                  </div>
                  <span className="text-xs text-green-600 font-semibold">
                    {node.ping}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-neutral-400">
              10+ States Connected
            </p>
          </div>
        </div>
        <div
          className="absolute opacity-35"
          style={{ bottom: "12%", right: "5%", width: 215 }}
        >
          <div className="bg-white rounded-xl p-3 shadow-lg text-center">
            <p className="text-sm font-bold text-neutral-800">99.98% Uptime</p>
            <p className="text-xs text-neutral-400">
              Reliable across all states
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % DEMO_SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = () => {
    navigate("/auth/register");
  };

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Secure Payments Across Africa"
        description="AfraPay enables secure global payments, business tills, and fast mobile transfers across Africa. Send, receive, and manage money with confidence."
        keywords="AfraPay, Africa payments, mobile money, fintech, digital wallet, send money Africa, South Sudan"
        structuredData={SCHEMA_HOME}
      />
      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background carousel slides */}
        <div className="absolute inset-0">
          {DEMO_SLIDES.map((slide, i) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === activeSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              {slide.background}
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/92 via-neutral-900/65 to-primary-900/10" />
          {/* Subtle hero grid */}
          <div className="absolute inset-0 hero-grid opacity-10" />
        </div>

        <Container className="relative z-10 py-20">
          <motion.div
            className="max-w-2xl"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="outline"
                className="mb-6 border-white/30 text-white bg-white/10 flex items-center gap-2 w-fit"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                Revolutionizing South Sudanese Finance
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Your Money,
              <span className="gradient-text"> Everywhere</span> in South Sudan
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-neutral-200 mb-8 max-w-xl font-medium leading-relaxed"
            >
              Send, receive, and manage money across 10+ South Sudanese states
              with
              <span className="text-white font-semibold"> the lowest fees</span>
              ,
              <span className="text-white font-semibold">
                {" "}
                instant transfers
              </span>
              , and
              <span className="text-white font-semibold">
                {" "}
                bank-level security
              </span>
              .
            </motion.p>

            {/* Trust signals */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-wrap items-center gap-6 mb-8 text-sm"
            >
              {[
                { label: "FDIC Insured" },
                { label: "PCI Certified" },
                { label: "24/7 support" },
              ].map(({ label }) => (
                <div key={label} className="flex items-center gap-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGetStarted}
                className="inline-flex flex-col items-center justify-center bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-lg px-10 py-5 rounded-xl shadow-xl shadow-blue-900/30 transition-colors btn-glow"
              >
                <span className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Start Free Account
                </span>
                <span className="text-sm opacity-85 font-normal mt-0.5">
                  No fees for 30 days
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex flex-col items-center justify-center border-2 border-white/50 text-white bg-transparent hover:bg-white/10 font-bold text-lg px-10 py-5 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  See How It Works
                </span>
                <span className="text-sm opacity-70 font-normal mt-0.5">
                  2-minute demo
                </span>
              </motion.button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={fadeUp}
              custom={5}
              className="flex flex-wrap items-center gap-6 text-sm text-neutral-300"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 bg-primary-700 border-2 border-white/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-200"
                    >
                      U{i}
                    </div>
                  ))}
                </div>
                <span>Join 2M+ happy users</span>
              </div>
              <div className="h-5 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                </div>
                <span>4.9/5 rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Slide controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12 flex items-center gap-6"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                setActiveSlide(
                  (prev) =>
                    (prev - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length,
                )
              }
              aria-label="Previous slide"
              className="w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-2">
              {DEMO_SLIDES.map((slide, i) => (
                <motion.button
                  key={slide.id}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveSlide(i)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    i === activeSlide
                      ? "bg-white text-neutral-900 shadow-md"
                      : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                  }`}
                >
                  {slide.label}
                </motion.button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                setActiveSlide((prev) => (prev + 1) % DEMO_SLIDES.length)
              }
              aria-label="Next slide"
              className="w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-1.5 ml-2">
              {DEMO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === activeSlide ? "true" : undefined}
                  className="p-2 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full"
                >
                  <motion.span
                    animate={{ width: i === activeSlide ? 20 : 8 }}
                    transition={{ duration: 0.3 }}
                    className={`block h-2 rounded-full ${
                      i === activeSlide
                        ? "bg-white"
                        : "bg-white/30 hover:bg-white/60"
                    }`}
                    style={{ width: i === activeSlide ? 20 : 8 }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── Trust badges ─────────────────────────────────── */}
      <Section
        spacing="md"
        className="bg-gradient-to-r from-primary-50 to-secondary-50 border-y border-primary-100"
      >
        <Container>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-wrap items-center justify-center gap-8 opacity-60"
          >
            {TRUST_BADGES.map((badge, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                custom={index}
                className="text-center"
              >
                <div className="text-sm font-semibold text-neutral-700">
                  {badge.name}
                </div>
                <div className="text-xs text-neutral-500">
                  {badge.description}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* ── Features ─────────────────────────────────────── */}
      <Section spacing="xl" className="bg-primary-50">
        <Container>
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge
              variant="outline"
              className="mb-4 border-primary-200 text-primary-600 flex items-center gap-1.5 w-fit mx-auto"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Core Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-4">
              Everything You Need for
              <span className="text-primary-600"> Modern Banking</span>
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Built specifically for South Sudanese businesses and individuals
              who demand more from their financial services.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                custom={index}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="text-center p-8 hover:shadow-xl transition-shadow border-neutral-100 hover:border-primary-200 h-full">
                  <CardContent>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/20">
                      <Icon
                        name={feature.icon}
                        className="w-7 h-7 text-white"
                      />
                    </div>

                    <div className="mb-3 flex items-center justify-center gap-3">
                      <h3 className="text-xl font-bold text-neutral-900">
                        {feature.title}
                      </h3>
                      <Badge variant={feature.badge.variant} size="sm">
                        {feature.badge.text}
                      </Badge>
                    </div>

                    <p className="text-neutral-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* ── Merchant CTA ─────────────────────────────────── */}
      <Section
        spacing="xl"
        className="bg-gradient-to-br from-slate-900 via-blue-950 to-teal-950 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 hero-grid opacity-10 pointer-events-none" />
        <div className="glow-spot top-0 left-1/4 w-96 h-96 bg-blue-600/20" />
        <div className="glow-spot bottom-0 right-1/4 w-80 h-80 bg-teal-600/20" />

        <Container className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-blue-400/40 text-blue-300 bg-blue-500/10 flex items-center gap-1.5 w-fit"
              >
                <Building2 className="w-3.5 h-3.5" />
                For Businesses
              </Badge>

              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                Start Accepting Payments.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                  Get Your Business Till.
                </span>
              </h2>

              <p className="text-lg text-neutral-300 mb-8 leading-relaxed">
                Register your business on AfraPay and receive a dedicated till
                number, merchant wallet, and real-time analytics — all free to
                set up.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  {
                    icon: "Hash",
                    text: "Unique till number for your business",
                  },
                  {
                    icon: "Wallet",
                    text: "Dedicated merchant wallet with instant settlement",
                  },
                  {
                    icon: "TrendingUp",
                    text: "Real-time sales analytics and reporting",
                  },
                  {
                    icon: "Zap",
                    text: "Withdraw funds to M-Pesa or bank instantly",
                  },
                ].map(({ icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 text-neutral-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <Icon name={icon} className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                    <span className="text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/auth/register")}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-blue-900/40 transition-colors btn-glow"
                >
                  <Building2 className="w-5 h-5" />
                  Register Your Business
                </motion.button>
                <p className="flex items-center gap-2 text-sm text-neutral-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  Free setup · No monthly fee
                </p>
              </div>
            </motion.div>

            {/* Right: stat tiles */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.65,
                delay: 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                {
                  label: "Setup Time",
                  value: "< 2 min",
                  sub: "Instant activation",
                  color: "from-blue-500/20 to-blue-600/10 border-blue-400/20",
                },
                {
                  label: "Sales Tracking",
                  value: "Real-time",
                  sub: "Live transaction data",
                  color: "from-teal-500/20 to-teal-600/10 border-teal-400/20",
                },
                {
                  label: "Settlement",
                  value: "Instant",
                  sub: "Same-day payout",
                  color:
                    "from-violet-500/20 to-violet-600/10 border-violet-400/20",
                },
                {
                  label: "Commission",
                  value: "0.5%",
                  sub: "Per transaction",
                  color:
                    "from-amber-500/20 to-amber-600/10 border-amber-400/20",
                },
              ].map(({ label, value, sub, color }) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`bg-gradient-to-br ${color} rounded-2xl border p-5 text-center`}
                >
                  <p className="text-2xl font-bold text-white mb-1">{value}</p>
                  <p className="text-sm font-semibold text-neutral-200">
                    {label}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Container>
      </Section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <Section spacing="xl" className="bg-secondary-50">
        <Container>
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge
              variant="outline"
              className="mb-4 border-success-200 text-success-600 w-fit mx-auto"
            >
              Customer Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Trusted by Leaders Across South Sudan
            </h2>
            <p className="text-lg text-neutral-600">
              See how AfraPay is transforming businesses and lives across South
              Sudan.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                custom={index}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="p-8 bg-white border border-secondary-100 hover:border-secondary-300 hover:shadow-lg transition-all h-full">
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex text-yellow-400 mb-4">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                      </div>
                      <blockquote className="text-neutral-700 text-lg leading-relaxed italic">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center font-bold text-white">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {testimonial.author}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* ── Stats section ────────────────────────────────── */}
      {/* <Section
        spacing="lg"
        className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 hero-grid opacity-10" />

        <Container className="relative">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-white/30 text-white bg-white/10 flex items-center gap-2 w-fit mx-auto"
              >
                <Award className="w-3.5 h-3.5" /> Africa&apos;s #1 Payment
                Platform
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                The Numbers Speak for Themselves
              </h2>
              <p className="text-xl text-primary-100 mb-12 max-w-2xl mx-auto">
                Join millions of Africans who&apos;ve made the smart choice for
                their financial future.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {STATS.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={fadeUp}
                  custom={index}
                  className="text-center"
                >
                  <div className="text-4xl md:text-6xl font-bold mb-2 gradient-text-green">
                    {stat.value}
                  </div>
                  <div className="text-primary-100 font-medium">
                    {stat.label}
                  </div>
                  <div className="text-primary-200 text-sm">
                    {stat.subtitle}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-12 pt-8 border-t border-white/20"
            >
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                {TRUST_METRICS.map((metric, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Icon
                      name={metric.icon}
                      className="w-5 h-5 text-emerald-300"
                    />
                    <span className="text-primary-100">{metric.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </Container>
      </Section> */}

      {/* ── Final CTA ────────────────────────────────────── */}
      <Section
        spacing="xl"
        className="text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/FinalCTAimage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-800/75 to-secondary-900/85" />
        <div className="glow-spot top-0 left-1/4 w-96 h-96 bg-blue-600/20" />
        <div className="glow-spot bottom-0 right-1/4 w-80 h-80 bg-teal-600/20" />

        <Container className="relative">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="outline"
                className="mb-6 border-primary-400 text-primary-300 bg-primary-400/10 flex items-center gap-2 w-fit mx-auto"
              >
                <Zap className="w-3.5 h-3.5" /> Limited Time: No Setup Fees
              </Badge>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl md:text-5xl font-bold mb-6"
            >
              Start Your Financial Freedom
              <span className="text-primary-400"> Today</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-xl md:text-2xl text-neutral-300 mb-10 font-medium"
            >
              Join 2M+ Africans who&apos;ve already transformed their financial
              lives.{" "}
              <span className="text-white">
                Setup takes less than 5 minutes.
              </span>
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm"
            >
              <div className="flex items-center gap-2 bg-success-900/30 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-200">
                  847 users signed up today
                </span>
              </div>
              <div className="flex items-center gap-2 bg-warning-900/30 rounded-full px-4 py-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-200">
                  No setup fees — limited time
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
            >
              <motion.button
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGetStarted}
                className="inline-flex flex-col items-center justify-center bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xl px-10 py-5 rounded-xl shadow-2xl shadow-blue-900/40 transition-colors btn-glow relative overflow-hidden"
              >
                <span className="flex items-center gap-2 relative z-10">
                  <Rocket className="w-5 h-5" />
                  Get Started Free
                </span>
                <span className="text-sm opacity-90 font-normal mt-0.5 relative z-10">
                  No credit card required
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex flex-col items-center justify-center border-2 border-primary-400 text-white hover:border-white hover:bg-primary-800/60 font-bold text-xl px-10 py-5 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Schedule Demo
                </span>
                <span className="text-sm opacity-70 font-normal mt-0.5">
                  Talk to our experts
                </span>
              </motion.button>
            </motion.div>

            <motion.div variants={fadeUp} custom={5} className="mb-8">
              <p className="text-sm text-neutral-400 mb-4 flex items-center justify-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> 256-bit encryption
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Central bank licensed
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> FDIC insured up to
                  $250K
                </span>
              </p>

              <div className="inline-flex items-center gap-3 bg-success-900/20 border border-success-500/30 rounded-full px-6 py-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-emerald-200 font-medium">
                  30-day money-back guarantee — No questions asked
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={6}
              className="border-t border-neutral-800 pt-8"
            >
              <p className="text-sm text-neutral-400 mb-6 font-medium">
                Join these leading African companies already using AfraPay
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
                {PARTNERS.slice(0, 6).map((partner, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ opacity: 1, scale: 1.05 }}
                    className="text-sm text-neutral-500 font-medium px-3 py-1 border border-neutral-800 rounded"
                  >
                    {partner}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </Section>
    </div>
  );
};

export default Landing;
