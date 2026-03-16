import React, { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EducationHub = () => {
  const [activeTab, setActiveTab] = useState("all");

  const learningPaths = [
    {
      id: "path_1",
      title: "Personal Finance Fundamentals",
      description:
        "Master the basics of personal finance, budgeting, and saving strategies",
      level: "Beginner",
      duration: "2 weeks",
      lessons: 12,
      progress: 65,
      category: "personal-finance",
    },
    {
      id: "path_2",
      title: "Investment Strategies",
      description:
        "Learn different investment approaches and build a diversified portfolio",
      level: "Intermediate",
      duration: "3 weeks",
      lessons: 18,
      progress: 30,
      category: "investing",
    },
    {
      id: "path_3",
      title: "Cryptocurrency Basics",
      description: "Understanding digital currencies and blockchain technology",
      level: "Beginner",
      duration: "1 week",
      lessons: 8,
      progress: 0,
      category: "crypto",
    },
  ];

  const categories = [
    { id: "all", title: "All Courses", count: 24 },
    { id: "personal-finance", title: "Personal Finance", count: 8 },
    { id: "investing", title: "Investing", count: 6 },
    { id: "crypto", title: "Cryptocurrency", count: 5 },
    { id: "business", title: "Business", count: 5 },
  ];

  const renderLearningPath = ({ item }) => (
    <TouchableOpacity style={styles.pathCard}>
      <View style={styles.pathHeader}>
        <Text style={styles.pathTitle}>{item.title}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{item.level}</Text>
        </View>
      </View>
      <Text style={styles.pathDescription}>{item.description}</Text>

      <View style={styles.pathMeta}>
        <Text style={styles.pathMetaText}>📚 {item.lessons} lessons</Text>
        <Text style={styles.pathMetaText}>⏱️ {item.duration}</Text>
      </View>

      {item.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${item.progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{item.progress}% complete</Text>
        </View>
      )}

      <TouchableOpacity style={styles.startButton}>
        <Text style={styles.startButtonText}>
          {item.progress > 0 ? "Continue Learning" : "Start Learning"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        activeTab === item.id && styles.categoryTabActive,
      ]}
      onPress={() => setActiveTab(item.id)}
    >
      <Text
        style={[
          styles.categoryTabText,
          activeTab === item.id && styles.categoryTabTextActive,
        ]}
      >
        {item.title}
      </Text>
      <View style={styles.categoryCount}>
        <Text style={styles.categoryCountText}>{item.count}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Education Hub</Text>
          <Text style={styles.subtitle}>
            Expand your financial knowledge with expert-led courses
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Courses Started</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Lessons Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12h</Text>
            <Text style={styles.statLabel}>Learning Time</Text>
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Learning Paths */}
        <View style={styles.pathsContainer}>
          <FlatList
            data={learningPaths}
            renderItem={renderLearningPath}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Featured Section */}
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured This Week</Text>
          <View style={styles.featuredCard}>
            <Text style={styles.featuredTitle}>
              💰 Building Your Emergency Fund
            </Text>
            <Text style={styles.featuredDescription}>
              Learn how to build a financial safety net that protects you from
              unexpected expenses.
            </Text>
            <TouchableOpacity style={styles.featuredButton}>
              <Text style={styles.featuredButtonText}>Watch Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTabActive: {
    backgroundColor: "#3b82f6",
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  categoryTabTextActive: {
    color: "#ffffff",
  },
  categoryCount: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  pathsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  pathCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pathHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  pathTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginRight: 12,
  },
  levelBadge: {
    backgroundColor: "#e0f2fe",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369a1",
  },
  pathDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  pathMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  pathMetaText: {
    fontSize: 12,
    color: "#6b7280",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
  },
  startButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  featuredCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 20,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  featuredButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 20,
  },
});

export default EducationHub;
