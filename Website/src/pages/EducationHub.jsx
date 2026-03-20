/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  DashboardSection,
  DashboardGrid,
} from "../components/layout/DashboardUtils";
import { Button } from "../components/ui";
import {
  EducationHubHeader,
  LearningPathCards,
  CategoryTabs,
  ContentGrid,
  ProgressTracker,
  FeaturedContent,
  LearningStats,
  ContentPreviewModal,
  SearchFilters,
} from "../components/fintech/EducationHub";
import { educationAPI } from "../services/educationAPI";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const EducationHub = () => {
  const { user } = useAuth();
  // State management
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedContent, setSelectedContent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data state
  const [categories, setCategories] = useState([]);
  const [content, setContent] = useState([]);
  const [featuredContent, setFeaturedContent] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [learningStats, setLearningStats] = useState({
    enrolledPaths: 0,
    completedLessons: 0,
    totalHours: 0,
    streak: 0,
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadCategories(),
          loadFeaturedContent(),
          loadContent(),
          loadLearningPaths(),
          loadEnrollments(),
        ]);
      } catch (error) {
        console.error("Error loading education data:", error);
        toast.error("Failed to load education content");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load categories
  const loadCategories = async () => {
    try {
      const data = await educationAPI.getCategories();
      const formattedCategories = [
        { id: "all", name: "All Topics", icon: "grid", count: 0 },
        ...data.map((cat) => ({
          id: cat.slug,
          name: cat.name,
          icon: cat.icon || "book",
          count: 0, // Will be updated when content loads
        })),
      ];
      setCategories(formattedCategories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  // Load featured content
  const loadFeaturedContent = async () => {
    try {
      const data = await educationAPI.getFeaturedContent();
      setFeaturedContent(data);
    } catch (error) {
      console.error("Failed to load featured content:", error);
    }
  };

  // Load content with current filters
  const loadContent = async (filters = {}) => {
    try {
      const params = {
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        type: selectedType !== "all" ? selectedType : undefined,
        level: selectedLevel !== "all" ? selectedLevel : undefined,
        search: searchTerm || undefined,
        featured: undefined,
        sortBy: "publishedAt",
        order: "desc",
        page: 1,
        limit: 50,
        ...filters,
      };

      const data = await educationAPI.getContent(params);
      setContent(data.items);

      // Update category counts
      updateCategoryCounts(data.items);
    } catch (error) {
      console.error("Failed to load content:", error);
    }
  };

  // Load learning paths
  const loadLearningPaths = async () => {
    try {
      const data = await educationAPI.getLearningPaths({
        page: 1,
        limit: 20,
        featured: "true",
      });
      setLearningPaths(data.items);
    } catch (error) {
      console.error("Failed to load learning paths:", error);
    }
  };

  // Load user enrollments
  const loadEnrollments = async () => {
    try {
      const stats = await educationAPI.getUserStats();
      const contentEnrollments = await educationAPI.getMyContentEnrollments();
      const pathEnrollments = await educationAPI.getMyPathEnrollments();

      setEnrollments([...contentEnrollments, ...pathEnrollments]);
      setLearningStats({
        enrolledPaths: stats.enrolledPaths ?? pathEnrollments.length,
        completedLessons: stats.completedLessons ?? 0,
        totalHours: stats.totalHours ?? 0,
        streak: stats.streak ?? 0,
      });
    } catch (error) {
      console.error("Failed to load enrollments:", error);
      // Don't show error toast for enrollments as user might not be logged in
    }
  };

  // Update category counts based on content
  const updateCategoryCounts = (contentItems) => {
    const counts = {};
    contentItems.forEach((item) => {
      const category = item.categorySlug || "uncategorized";
      counts[category] = (counts[category] || 0) + 1;
    });

    setCategories((prevCategories) =>
      prevCategories.map((cat) => ({
        ...cat,
        count: cat.id === "all" ? contentItems.length : counts[cat.id] || 0,
      })),
    );
  };

  // Filter content based on selected criteria
  useEffect(() => {
    loadContent();
  }, [selectedCategory, selectedLevel, selectedType]);

  // Search effect with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadContent();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Filter content for display
  useEffect(() => {
    let filtered = content;

    // Apply client-side filters for immediate feedback
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          (item.tags &&
            item.tags.some((tag) => tag.toLowerCase().includes(searchLower))),
      );
    }

    setFilteredContent(filtered);
  }, [content, searchTerm]);

  // Event handlers
  const handleContentClick = (contentItem) => {
    setSelectedContent(contentItem);
    setIsModalOpen(true);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === "level") {
      setSelectedLevel(value);
    } else if (filterType === "type") {
      setSelectedType(value);
    }
  };

  const handleEnroll = async (item) => {
    try {
      if (item.type === "path") {
        await educationAPI.enrollInPath(item.$id);
        toast.success("Successfully enrolled in learning path!");
      } else {
        await educationAPI.enrollInContent(item.$id);
        toast.success("Successfully enrolled in content!");
      }

      // Reload enrollments to update UI
      await loadEnrollments();
      if (item.type !== "path") {
        await loadContent(); // Reload content to update enrollment status
      }
    } catch (error) {
      console.error("Enrollment failed:", error);
      toast.error("Failed to enroll. Please try again.");
    }
  };

  // Helper functions
  const getFeaturedContent = () => featuredContent;

  const getEnrolledPaths = () => {
    const pathIds = enrollments
      .filter((e) => e.type === "path" || e.pathId)
      .map((e) => e.pathId || e.$id);

    return learningPaths.filter((path) => pathIds.includes(path.$id));
  };

  const getRecommendedPaths = () => {
    const enrolledPathIds = enrollments
      .filter((e) => e.type === "path" || e.pathId)
      .map((e) => e.pathId || e.$id);

    return learningPaths
      .filter((path) => !enrolledPathIds.includes(path.$id))
      .slice(0, 3);
  };

  // Check if user is enrolled in an item
  const isEnrolled = (item) => {
    if (item.type === "path") {
      return enrollments.some(
        (e) =>
          (e.type === "path" && e.pathId === item.$id) || e.pathId === item.$id,
      );
    } else {
      return enrollments.some(
        (e) => e.type === "content" && e.contentId === item.$id,
      );
    }
  };

  // Add enrollment status to content items
  const enrichContentWithEnrollment = (items) => {
    return items.map((item) => ({
      ...item,
      enrolled: isEnrolled(item),
    }));
  };

  if (loading && !content.length) {
    return (
      <DashboardLayout user={user} className="h-screen">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading education content...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} className="h-screen">
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0">
          <EducationHubHeader />
        </div>

        {/* Learning Stats */}
        <div className="flex-shrink-0">
          <LearningStats
            enrolledPaths={learningStats.enrolledPaths}
            completedLessons={learningStats.completedLessons}
            totalHours={learningStats.totalHours}
            streak={learningStats.streak}
          />
        </div>

        {/* Featured Content */}
        <div className="flex-shrink-0">
          <DashboardSection title="Featured Content">
            <FeaturedContent
              content={getFeaturedContent()}
              onContentClick={handleContentClick}
            />
          </DashboardSection>
        </div>

        {/* Learning Paths - Show enrolled paths if any */}
        {getEnrolledPaths().length > 0 && (
          <div className="flex-shrink-0">
            <DashboardSection
              title="Continue Learning"
              description="Pick up where you left off"
            >
              <LearningPathCards
                paths={enrichContentWithEnrollment(getEnrolledPaths())}
                variant="progress"
                onEnroll={handleEnroll}
              />
            </DashboardSection>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex-shrink-0">
          <SearchFilters
            searchTerm={searchTerm}
            onSearch={handleSearch}
            selectedLevel={selectedLevel}
            selectedType={selectedType}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex-shrink-0">
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-hidden">
          <DashboardSection
            title={`${
              selectedCategory === "all"
                ? "All Content"
                : categories.find((c) => c.id === selectedCategory)?.name ||
                  "Content"
            } (${filteredContent.length})`}
            className="h-full flex flex-col"
          >
            <div className="flex-1 overflow-auto">
              <ContentGrid
                content={enrichContentWithEnrollment(filteredContent)}
                onContentClick={handleContentClick}
                onEnroll={handleEnroll}
                loading={loading}
              />
            </div>
          </DashboardSection>
        </div>

        {/* Recommended Learning Paths */}
        {getRecommendedPaths().length > 0 && (
          <div className="flex-shrink-0">
            <DashboardSection
              title="Recommended for You"
              description="Explore new topics to expand your knowledge"
            >
              <LearningPathCards
                paths={enrichContentWithEnrollment(getRecommendedPaths())}
                variant="recommendation"
                onEnroll={handleEnroll}
              />
            </DashboardSection>
          </div>
        )}

        {/* Content Preview Modal */}
        <ContentPreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          content={selectedContent}
          onEnroll={
            selectedContent ? () => handleEnroll(selectedContent) : undefined
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default EducationHub;
