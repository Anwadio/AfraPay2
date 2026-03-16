import React from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const About = () => {
  const team = [
    {
      name: "Kwame Asante",
      role: "CEO & Co-founder",
      image: "https://via.placeholder.com/150x150",
      bio: "Former Goldman Sachs VP with 12+ years in fintech. Passionate about financial inclusion across Africa.",
      linkedin: "#",
    },
    {
      name: "Amina Hassan",
      role: "CTO & Co-founder",
      image: "https://via.placeholder.com/150x150",
      bio: "Ex-Google engineer specializing in secure payment systems. Led engineering teams at Stripe and Square.",
      linkedin: "#",
    },
    {
      name: "Joseph Mbeki",
      role: "Head of Product",
      image: "https://via.placeholder.com/150x150",
      bio: "Product leader with deep expertise in African markets. Previously built payment solutions at Paystack.",
      linkedin: "#",
    },
    {
      name: "Fatima Al-Rashid",
      role: "Head of Operations",
      image: "https://via.placeholder.com/150x150",
      bio: "Operations expert focused on regulatory compliance and partnerships across 15+ African countries.",
      linkedin: "#",
    },
  ];

  const values = [
    {
      icon: "🚀",
      title: "Innovation",
      description:
        "We leverage cutting-edge technology to create seamless financial experiences that work for everyone.",
    },
    {
      icon: "🤝",
      title: "Trust",
      description:
        "Security and transparency are at the core of everything we do. Your financial data is always protected.",
    },
    {
      icon: "🌍",
      title: "Inclusion",
      description:
        "We believe everyone deserves access to modern financial services, regardless of their location or background.",
    },
    {
      icon: "⚡",
      title: "Speed",
      description:
        "Fast, reliable transactions that help you move money when and where you need it most.",
    },
  ];

  const milestones = [
    {
      year: "2021",
      title: "Company Founded",
      description:
        "AfraPay was born from a vision to democratize financial services across Africa.",
    },
    {
      year: "2022",
      title: "Seed Funding",
      description:
        "Raised $5M in seed funding to build our core platform and expand our team.",
    },
    {
      year: "2023",
      title: "Launch in 5 Countries",
      description:
        "Officially launched in Nigeria, Kenya, Ghana, South Africa, and Uganda.",
    },
    {
      year: "2024",
      title: "1M+ Transactions",
      description:
        "Processed over 1 million transactions worth $100M+ for businesses and individuals.",
    },
    {
      year: "2025",
      title: "Series A & Expansion",
      description:
        "Secured $25M Series A funding and expanded to 10 additional African markets.",
    },
    {
      year: "2026",
      title: "The Future",
      description:
        "Building the next generation of financial infrastructure for Africa's digital economy.",
    },
  ];

  const stats = [
    { number: "15+", label: "Countries Served" },
    { number: "500K+", label: "Active Users" },
    { number: "$250M+", label: "Processed Volume" },
    { number: "99.9%", label: "Uptime" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              About <Text style={styles.brandText}>AfraPay</Text>
            </Text>
            <Text style={styles.heroDescription}>
              We're on a mission to democratize financial services across
              Africa, connecting communities and empowering economic growth
              through innovative technology.
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statNumber}>{stat.number}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Mission Section */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.sectionDescription}>
              To build the financial infrastructure that powers Africa's digital
              economy. We're creating a world where anyone, anywhere on the
              continent can access the financial services they need to thrive.
            </Text>
          </View>
        </View>

        {/* Values Section */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Our Values</Text>
            <View style={styles.valuesGrid}>
              {values.map((value, index) => (
                <View key={index} style={styles.valueCard}>
                  <Text style={styles.valueIcon}>{value.icon}</Text>
                  <Text style={styles.valueTitle}>{value.title}</Text>
                  <Text style={styles.valueDescription}>
                    {value.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Team Section */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Meet Our Team</Text>
            <Text style={styles.sectionDescription}>
              A diverse group of passionate professionals dedicated to
              transforming financial services across Africa.
            </Text>
            <View style={styles.teamGrid}>
              {team.map((member, index) => (
                <View key={index} style={styles.teamCard}>
                  <Image
                    source={{ uri: member.image }}
                    style={styles.teamImage}
                  />
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={styles.teamRole}>{member.role}</Text>
                  <Text style={styles.teamBio}>{member.bio}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Our Journey</Text>
            <View style={styles.timeline}>
              {milestones.map((milestone, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineYear}>{milestone.year}</Text>
                    <Text style={styles.timelineTitle}>{milestone.title}</Text>
                    <Text style={styles.timelineDescription}>
                      {milestone.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
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
  },
  heroContent: {
    alignItems: "center",
    maxWidth: width - 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a202c",
    textAlign: "center",
    marginBottom: 16,
  },
  brandText: {
    color: "#3b82f6",
  },
  heroDescription: {
    fontSize: 18,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 28,
  },
  statsSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
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
  section: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionContent: {
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionDescription: {
    fontSize: 16,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  valuesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  valueCard: {
    width: "48%",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    marginBottom: 16,
  },
  valueIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 8,
    textAlign: "center",
  },
  valueDescription: {
    fontSize: 14,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 20,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  teamCard: {
    width: "48%",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    marginBottom: 16,
  },
  teamImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 4,
    textAlign: "center",
  },
  teamRole: {
    fontSize: 14,
    color: "#3b82f6",
    marginBottom: 8,
    textAlign: "center",
  },
  teamBio: {
    fontSize: 12,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 18,
  },
  timeline: {
    alignSelf: "stretch",
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
    marginTop: 6,
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineYear: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: "#4a5568",
    lineHeight: 20,
  },
});

export default About;
