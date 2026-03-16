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

// Mock user data
const mockUser = {
  name: "John Smith",
  email: "john.smith@example.com",
  avatar: null,
  role: "Premium Member",
};

// Mock learning paths data
const mockLearningPaths = [
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
    image: "/images/personal-finance.jpg",
    tags: ["budgeting", "saving", "basics"],
    enrolled: true,
  },
  {
    id: "path_2",
    title: "Investment Strategies",
    description:
      "Learn different investment approaches and build a diversified portfolio",
    level: "Intermediate",
    duration: "4 weeks",
    lessons: 18,
    progress: 30,
    category: "investing",
    image: "/images/investments.jpg",
    tags: ["stocks", "bonds", "portfolio"],
    enrolled: true,
  },
  {
    id: "path_3",
    title: "Cryptocurrency Basics",
    description:
      "Understand digital currencies, blockchain, and crypto trading fundamentals",
    level: "Beginner",
    duration: "3 weeks",
    lessons: 15,
    progress: 0,
    category: "cryptocurrency",
    image: "/images/crypto.jpg",
    tags: ["bitcoin", "blockchain", "trading"],
    enrolled: false,
  },
];

// Mock educational content
const mockContent = [
  {
    id: "content_1",
    title: "How to Create Your First Budget",
    description:
      "A step-by-step guide to creating a budget that works for your lifestyle and financial goals.",
    type: "article",
    category: "personal-finance",
    level: "Beginner",
    duration: "8 min read",
    thumbnail: "/images/budgeting-guide.jpg",
    author: "Sarah Johnson",
    publishedAt: "2024-12-20",
    views: 1250,
    likes: 89,
    bookmarked: true,
    tags: ["budgeting", "planning", "beginner"],
    featured: true,
  },
  {
    id: "content_2",
    title: "Understanding Stock Market Basics",
    description:
      "Learn the fundamentals of stock trading and how to make informed investment decisions.",
    type: "video",
    category: "investing",
    level: "Beginner",
    duration: "15 min",
    thumbnail: "/images/stock-basics.jpg",
    author: "Michael Chen",
    publishedAt: "2024-12-18",
    views: 2100,
    likes: 156,
    bookmarked: false,
    tags: ["stocks", "trading", "market"],
    featured: false,
  },
  {
    id: "content_3",
    title: "Emergency Fund Calculator",
    description:
      "Interactive tool to calculate how much you should save for emergencies based on your expenses.",
    type: "tool",
    category: "personal-finance",
    level: "All Levels",
    duration: "5 min",
    thumbnail: "/images/calculator-tool.jpg",
    author: "AfraPay Team",
    publishedAt: "2024-12-15",
    views: 890,
    likes: 67,
    bookmarked: true,
    tags: ["emergency", "calculator", "saving"],
    featured: true,
  },
  {
    id: "content_4",
    title: "Crypto Security Best Practices",
    description:
      "Essential security measures to protect your cryptocurrency investments from threats.",
    type: "guide",
    category: "cryptocurrency",
    level: "Intermediate",
    duration: "12 min read",
    thumbnail: "/images/crypto-security.jpg",
    author: "Alex Rivera",
    publishedAt: "2024-12-12",
    views: 1680,
    likes: 124,
    bookmarked: false,
    tags: ["security", "crypto", "protection"],
    featured: false,
  },
  {
    id: "content_5",
    title: "Building Credit Score 101",
    description:
      "Everything you need to know about building and maintaining a good credit score.",
    type: "course",
    category: "credit",
    level: "Beginner",
    duration: "45 min",
    thumbnail: "/images/credit-score.jpg",
    author: "Lisa Wong",
    publishedAt: "2024-12-10",
    views: 3200,
    likes: 245,
    bookmarked: true,
    tags: ["credit", "score", "financial-health"],
    featured: true,
  },
  {
    id: "content_6",
    title: "Tax Planning Strategies",
    description:
      "Smart tax planning strategies to minimize your tax burden and maximize savings.",
    type: "webinar",
    category: "taxes",
    level: "Intermediate",
    duration: "60 min",
    thumbnail: "/images/tax-planning.jpg",
    author: "David Park",
    publishedAt: "2024-12-08",
    views: 1450,
    likes: 98,
    bookmarked: false,
    tags: ["taxes", "planning", "strategies"],
    featured: false,
  },
];

// Categories configuration
const categories = [
  { id: "all", name: "All Topics", icon: "grid", count: mockContent.length },
  {
    id: "personal-finance",
    name: "Personal Finance",
    icon: "wallet",
    count: 2,
  },
  { id: "investing", name: "Investing", icon: "trending-up", count: 1 },
  { id: "cryptocurrency", name: "Cryptocurrency", icon: "cpu", count: 1 },
  { id: "credit", name: "Credit", icon: "credit-card", count: 1 },
  { id: "taxes", name: "Taxes", icon: "calculator", count: 1 },
];

const EducationHub = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [filteredContent, setFilteredContent] = useState(mockContent);
  const [selectedContent, setSelectedContent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter content based on selected criteria
  useEffect(() => {
    let filtered = mockContent;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (content) => content.category === selectedCategory
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (content) =>
          content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          content.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          content.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Filter by level
    if (selectedLevel !== "all") {
      filtered = filtered.filter(
        (content) => content.level.toLowerCase() === selectedLevel.toLowerCase()
      );
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((content) => content.type === selectedType);
    }

    setFilteredContent(filtered);
  }, [selectedCategory, searchTerm, selectedLevel, selectedType]);

  const handleContentClick = (content) => {
    setSelectedContent(content);
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

  const getFeaturedContent = () => {
    return mockContent.filter((content) => content.featured);
  };

  const getRecommendedPaths = () => {
    return mockLearningPaths.filter((path) => !path.enrolled).slice(0, 3);
  };

  return (
    <DashboardLayout user={mockUser} className="h-screen">
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0">
          <EducationHubHeader />
        </div>

        {/* Learning Stats */}
        <div className="flex-shrink-0">
          <LearningStats
            enrolledPaths={mockLearningPaths.filter((p) => p.enrolled).length}
            completedLessons={25}
            totalHours={45}
            streak={7}
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

        {/* Learning Paths */}
        <div className="flex-shrink-0">
          <DashboardSection
            title="Continue Learning"
            description="Pick up where you left off"
          >
            <LearningPathCards
              paths={mockLearningPaths.filter((p) => p.enrolled)}
              variant="progress"
            />
          </DashboardSection>
        </div>

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
            title={`${selectedCategory === "all" ? "All Content" : categories.find((c) => c.id === selectedCategory)?.name} (${filteredContent.length})`}
            className="h-full flex flex-col"
          >
            <div className="flex-1 overflow-auto">
              <ContentGrid
                content={filteredContent}
                onContentClick={handleContentClick}
                loading={loading}
              />
            </div>
          </DashboardSection>
        </div>

        {/* Recommended Learning Paths */}
        <div className="flex-shrink-0">
          <DashboardSection
            title="Recommended for You"
            description="Explore new topics to expand your knowledge"
          >
            <LearningPathCards
              paths={getRecommendedPaths()}
              variant="recommendation"
            />
          </DashboardSection>
        </div>

        {/* Content Preview Modal */}
        <ContentPreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          content={selectedContent}
        />
      </div>
    </DashboardLayout>
  );
};

export default EducationHub;
