/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

const { width, height: screenHeight } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(screenHeight * 0.55);

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Payments",
    desc: "Send money in seconds to anyone, anywhere in the world.",
    bg: "#eff6ff",
    accent: "#2563eb",
  },
  {
    icon: "🌍",
    title: "Multi-Currency",
    desc: "USD, KES, NGN, GHS and 10+ currencies — seamlessly handled.",
    bg: "#f0fdf4",
    accent: "#059669",
  },
  {
    icon: "📚",
    title: "Financial Education",
    desc: "Learn, grow, and master your money with our education hub.",
    bg: "#fffbeb",
    accent: "#d97706",
  },
  {
    icon: "📊",
    title: "Smart Analytics",
    desc: "Track spending, savings, and trends in real time.",
    bg: "#faf5ff",
    accent: "#7c3aed",
  },
];

const STATS = [
  { value: "500K+", label: "Users" },
  { value: "50+", label: "Countries" },
  { value: "< 3s", label: "Transfers" },
  { value: "0%", label: "Hidden Fees" },
];

const PROBLEMS = [
  "Slow transfers (days)",
  "Hidden fees stack up",
  "Complex, confusing apps",
  "Cash-only limitations",
];

const SOLUTIONS = [
  "Under 3-second transfers",
  "Zero hidden fees, ever",
  "Clean, intuitive design",
  "Full mobile-first experience",
];

const CAROUSEL_IMAGES = [
  require("../assets/Carouselimages/Gemini_Generated_Image_660hv2660hv2660h.png"),
  require("../assets/Carouselimages/Gemini_Generated_Image_8za3mi8za3mi8za3.png"),
  require("../assets/Carouselimages/Gemini_Generated_Image_h8v2avh8v2avh8v2.png"),
  require("../assets/Carouselimages/Gemini_Generated_Image_sw52j6sw52j6sw52.png"),
];

// ─── Animation wrapper ───────────────────────────────────────────────────────

function FadeUp({ delay = 0, children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 550,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 550,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroSection({ onGetStarted, onLogin }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ width, height: HERO_HEIGHT }}>
      {/* Current image */}
      <Image
        source={CAROUSEL_IMAGES[currentIndex]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height: HERO_HEIGHT,
        }}
        resizeMode="cover"
      />

      {/* Dark overlay */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height: HERO_HEIGHT,
          backgroundColor: "rgba(10,15,30,0.65)",
        }}
      />

      <SafeAreaView edges={["top"]}>
        <View
          style={{ paddingHorizontal: 26, paddingTop: 40, paddingBottom: 52 }}
        >
          {/* Brand bar */}
          <FadeUp delay={0}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 36,
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  backgroundColor: "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Image
                  source={require("../assets/images/mainlogo.png")}
                  style={{ width: 58, height: 58, resizeMode: "contain" }}
                />
              </View>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 0.4,
                }}
              >
                AfraPay
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  backgroundColor: "rgba(37,99,235,0.4)",
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: "#93c5fd", fontSize: 10, fontWeight: "700" }}
                >
                  BETA
                </Text>
              </View>
            </View>
          </FadeUp>

          {/* Tagline */}
          <FadeUp delay={80}>
            <Text
              style={{
                fontSize: width < 380 ? 32 : 38,
                fontWeight: "800",
                color: "#fff",
                lineHeight: width < 380 ? 40 : 48,
                letterSpacing: -0.5,
                marginBottom: 14,
              }}
            >
              Secure payments.{"\n"}
              <Text style={{ color: "#34d399" }}>Global</Text> connections.
            </Text>
          </FadeUp>

          <FadeUp delay={170}>
            <Text
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.8)",
                lineHeight: 23,
                marginBottom: 36,
              }}
            >
              Fast transfers · Low fees · Built for Africa and beyond
            </Text>
          </FadeUp>

          {/* CTA buttons */}
          <FadeUp delay={260}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={onGetStarted}
                activeOpacity={0.82}
                style={{
                  flex: 1,
                  backgroundColor: "#2563eb",
                  paddingVertical: 15,
                  borderRadius: 14,
                  alignItems: "center",
                  shadowColor: "#2563eb",
                  shadowOpacity: 0.45,
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                >
                  Get Started
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onLogin}
                activeOpacity={0.82}
                style={{
                  flex: 1,
                  paddingVertical: 15,
                  borderRadius: 14,
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.28)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                >
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </FadeUp>

          {/* Social proof chip */}
          <FadeUp delay={350}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 22,
                gap: 6,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  marginRight: 4,
                }}
              >
                {["#34d399", "#2563eb", "#7c3aed", "#f59e0b"].map((c, i) => (
                  <View
                    key={i}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: c,
                      marginLeft: i > 0 ? -7 : 0,
                      borderWidth: 1.5,
                      borderColor: "#0f172a",
                    }}
                  />
                ))}
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                500K+ people already onboard
              </Text>
            </View>
          </FadeUp>

          {/* Slide dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 28,
              gap: 6,
            }}
          >
            {CAROUSEL_IMAGES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    i === currentIndex ? "#34d399" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Stats bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <FadeUp delay={400}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#1e293b",
          paddingVertical: 18,
          paddingHorizontal: 10,
        }}
      >
        {STATS.map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: "center",
              borderRightWidth: i < STATS.length - 1 ? 1 : 0,
              borderRightColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ color: "#34d399", fontSize: 17, fontWeight: "800" }}>
              {s.value}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 10,
                marginTop: 2,
                fontWeight: "500",
              }}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </FadeUp>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <View
      style={{
        backgroundColor: "#f8fafc",
        paddingHorizontal: 20,
        paddingTop: 44,
        paddingBottom: 12,
      }}
    >
      <FadeUp>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#0f172a",
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Everything you need
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#64748b",
            textAlign: "center",
            marginBottom: 26,
            lineHeight: 21,
          }}
        >
          Powerful fintech tools in one seamless app
        </Text>
      </FadeUp>

      {FEATURES.map((f, i) => (
        <FadeUp key={f.title} delay={i * 70}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: f.bg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                flexShrink: 0,
              }}
            >
              <Text style={{ fontSize: 22 }}>{f.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: 4,
                }}
              >
                {f.title}
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 19 }}>
                {f.desc}
              </Text>
            </View>
          </View>
        </FadeUp>
      ))}
    </View>
  );
}

// ─── Problem / Solution ──────────────────────────────────────────────────────

function ProblemSolutionSection() {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingTop: 44,
        paddingBottom: 44,
      }}
    >
      <FadeUp>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0f172a",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Payments, reimagined
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#64748b",
            textAlign: "center",
            marginBottom: 28,
            lineHeight: 20,
          }}
        >
          We built what people actually needed
        </Text>
      </FadeUp>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <FadeUp delay={100} style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#fff5f5",
              borderRadius: 18,
              padding: 18,
              borderLeftWidth: 3,
              borderLeftColor: "#ef4444",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#ef4444",
                marginBottom: 14,
              }}
            >
              Before
            </Text>
            {PROBLEMS.map((item) => (
              <View
                key={item}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: "#ef4444",
                    marginRight: 7,
                    fontSize: 12,
                    marginTop: 1,
                  }}
                >
                  ✕
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    flex: 1,
                    lineHeight: 17,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </FadeUp>

        <FadeUp delay={190} style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#f0fdf4",
              borderRadius: 18,
              padding: 18,
              borderLeftWidth: 3,
              borderLeftColor: "#059669",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#059669",
                marginBottom: 14,
              }}
            >
              With AfraPay
            </Text>
            {SOLUTIONS.map((item) => (
              <View
                key={item}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: "#059669",
                    marginRight: 7,
                    fontSize: 12,
                    marginTop: 1,
                  }}
                >
                  ✓
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#374151",
                    flex: 1,
                    lineHeight: 17,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </FadeUp>
      </View>
    </View>
  );
}

// ─── Trust ───────────────────────────────────────────────────────────────────

function TrustSection() {
  const pillars = [
    { icon: "🔐", label: "Bank-grade\nEncryption" },
    { icon: "🌐", label: "Global\nCoverage" },
    { icon: "⚡", label: "Real-time\nProcessing" },
  ];

  return (
    <View
      style={{
        backgroundColor: "#f8fafc",
        paddingHorizontal: 20,
        paddingTop: 44,
        paddingBottom: 44,
      }}
    >
      <FadeUp>
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              backgroundColor: "#eff6ff",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 26 }}>🛡️</Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#0f172a",
              textAlign: "center",
            }}
          >
            Built for real people
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              textAlign: "center",
              marginTop: 6,
              lineHeight: 22,
            }}
          >
            Trusted. Secure. Community-first.
          </Text>
        </View>
      </FadeUp>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {pillars.map((p, i) => (
          <FadeUp key={p.icon} delay={i * 80} style={{ flex: 1 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 26, marginBottom: 8 }}>{p.icon}</Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#475569",
                  textAlign: "center",
                  lineHeight: 16,
                  fontWeight: "600",
                }}
              >
                {p.label}
              </Text>
            </View>
          </FadeUp>
        ))}
      </View>

      {/* Bill & Loan highlight */}
      <FadeUp delay={280}>
        <View
          style={{
            marginTop: 16,
            backgroundColor: "#fff",
            borderRadius: 18,
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              backgroundColor: "#fef3c7",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 22 }}>🧾</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#0f172a",
                marginBottom: 3,
              }}
            >
              Bill & Loan Support
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
              Pay bills, manage loans, and track repayments — all in one place.
            </Text>
          </View>
        </View>
      </FadeUp>
    </View>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA({ onGetStarted }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        overflow: "hidden",
        paddingHorizontal: 26,
        paddingTop: 52,
        paddingBottom: 64,
      }}
    >
      {/* Carousel background */}
      <Image
        source={CAROUSEL_IMAGES[currentIndex]}
        style={{ position: "absolute", top: 0, left: 0, width, height: "100%" }}
        resizeMode="cover"
      />
      {/* Dark overlay */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          bottom: 0,
          backgroundColor: "rgba(10,15,30,0.75)",
        }}
      />

      <FadeUp>
        <Text
          style={{
            fontSize: width < 380 ? 26 : 30,
            fontWeight: "800",
            color: "#fff",
            textAlign: "center",
            lineHeight: width < 380 ? 34 : 40,
            marginBottom: 10,
          }}
        >
          Start your{"\n"}
          <Text style={{ color: "#34d399" }}>journey</Text> today
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            marginBottom: 34,
            lineHeight: 22,
          }}
        >
          Join thousands taking control of their finances.{"\n"}Free to start —
          always.
        </Text>

        <TouchableOpacity
          onPress={onGetStarted}
          activeOpacity={0.82}
          style={{
            backgroundColor: "#059669",
            paddingVertical: 18,
            borderRadius: 16,
            alignItems: "center",
            marginBottom: 14,
            shadowColor: "#059669",
            shadowOpacity: 0.45,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 18,
            elevation: 8,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 17,
              fontWeight: "800",
              letterSpacing: 0.3,
            }}
          >
            Create Account — Free
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            textAlign: "center",
          }}
        >
          No credit card required · Cancel anytime
        </Text>
      </FadeUp>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users immediately
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Don't flash landing if redirecting
  if (isAuthenticated) return null;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0f172a" }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <HeroSection
          onGetStarted={() => router.push("/(auth)/register")}
          onLogin={() => router.push("/(auth)/login")}
        />
        <StatsBar />
        <FeaturesSection />
        <ProblemSolutionSection />
        <TrustSection />
        <FinalCTA onGetStarted={() => router.push("/(auth)/register")} />
      </ScrollView>
    </>
  );
}
