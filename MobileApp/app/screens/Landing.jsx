import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const Landing = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/auth/register");
  };

  const handleSignIn = () => {
    router.push("/auth/login");
  };

  const features = [
    {
      icon: "💸",
      title: "Instant Transfers",
      description: "Send money anywhere in Africa within seconds",
    },
    {
      icon: "🔒",
      title: "Bank-Level Security",
      description:
        "Your money and data are protected with enterprise-grade encryption",
    },
    {
      icon: "📱",
      title: "Mobile First",
      description:
        "Designed for mobile-first African users with offline capabilities",
    },
    {
      icon: "🌍",
      title: "Pan-African",
      description: "Available in 15+ countries across the continent",
    },
  ];

  const testimonials = [
    {
      name: "Amina Hassan",
      role: "Small Business Owner",
      country: "Nigeria",
      text: "AfraPay has transformed how I manage my business finances. Lightning fast and reliable!",
    },
    {
      name: "Kwame Osei",
      role: "Freelancer",
      country: "Ghana",
      text: "Finally, a financial app that understands Africa. Simple, secure, and affordable.",
    },
  ];

  const stats = [
    { number: "500K+", label: "Active Users" },
    { number: "15+", label: "Countries" },
    { number: "$250M+", label: "Processed" },
    { number: "99.9%", label: "Uptime" },
  ];

  const trustSignals = ["FDIC Insured", "PCI Certified", "24/7 Support"];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              🎆 Revolutionizing African Finance
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Your Money,
            <Text style={styles.brandText}> Everywhere</Text> in Africa
          </Text>

          <Text style={styles.heroDescription}>
            Send, receive, and manage money across 25+ African countries with{" "}
            <Text style={styles.highlightText}>the lowest fees</Text>,{" "}
            <Text style={styles.highlightText}>instant transfers</Text>, and{" "}
            <Text style={styles.highlightText}>bank-level security</Text>.
          </Text>

          {/* Trust Signals */}
          <View style={styles.trustSignals}>
            {trustSignals.map((signal, index) => (
              <View key={index} style={styles.trustSignal}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.trustText}>{signal}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSignIn}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>
            Trusted by thousands across Africa
          </Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statNumber}>{stat.number}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Choose AfraPay?</Text>
          <Text style={styles.sectionDescription}>
            Built specifically for Africa's unique financial landscape
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials Section */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>Trusted by Thousands</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {testimonials.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                <View style={styles.testimonialAuthor}>
                  <Text style={styles.authorName}>{testimonial.name}</Text>
                  <Text style={styles.authorRole}>{testimonial.role}</Text>
                  <Text style={styles.authorCountry}>
                    {testimonial.country}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to get started?</Text>
          <Text style={styles.ctaDescription}>
            Join thousands of Africans already using AfraPay to manage their
            finances
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={handleGetStarted}>
            <Text style={styles.ctaButtonText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 AfraPay. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  heroSection: {
    backgroundColor: "#f8fafc",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#e0f2fe",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  badgeText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1a202c",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 44,
  },
  brandText: {
    color: "#3b82f6",
  },
  heroDescription: {
    fontSize: 18,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  highlightText: {
    color: "#1a202c",
    fontWeight: "600",
  },
  trustSignals: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 32,
  },
  trustSignal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkIcon: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "bold",
  },
  trustText: {
    fontSize: 14,
    color: "#1a202c",
    fontWeight: "500",
  },
  heroButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    paddingHorizontal: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  secondaryButtonText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "600",
  },
  statsSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 24,
    textAlign: "center",
  },
  sectionDescription: {
    fontSize: 16,
    color: "#4a5568",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    alignItems: "center",
    marginBottom: 20,
    padding: 20,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#4a5568",
    textAlign: "center",
  },
  featuresSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 14,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 20,
  },
  testimonialsSection: {
    paddingVertical: 40,
    backgroundColor: "#ffffff",
  },
  testimonialCard: {
    width: width * 0.85,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 10,
    marginLeft: 20,
  },
  testimonialText: {
    fontSize: 16,
    color: "#1a202c",
    fontStyle: "italic",
    lineHeight: 24,
    marginBottom: 16,
  },
  testimonialAuthor: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 4,
  },
  authorRole: {
    fontSize: 14,
    color: "#4a5568",
    marginBottom: 2,
  },
  authorCountry: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  ctaSection: {
    backgroundColor: "#3b82f6",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
  },
  ctaDescription: {
    fontSize: 16,
    color: "#e0f2fe",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  ctaButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: "center",
  },
  ctaButtonText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    backgroundColor: "#f8fafc",
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
  },
});

export default Landing;
