import React, { useState } from "react";
import { cn } from "../../utils";
import { Button, Badge } from "../ui";
import { DashboardCard, DashboardGrid } from "../layout/DashboardUtils";

/**
 * Education Hub Header
 */
const EducationHubHeader = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Education Hub</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Expand your financial knowledge with expert-curated content
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          My Bookmarks
        </Button>
        <Button size="sm">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Browse Courses
        </Button>
      </div>
    </div>
  );
};

/**
 * Learning Statistics Cards
 */
const LearningStats = ({
  enrolledPaths,
  completedLessons,
  totalHours,
  streak,
}) => {
  const stats = [
    {
      label: "Enrolled Paths",
      value: enrolledPaths,
      icon: "academic-cap",
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Lessons Completed",
      value: completedLessons,
      icon: "check-circle",
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Learning Hours",
      value: totalHours,
      icon: "clock",
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Day Streak",
      value: streak,
      icon: "fire",
      color: "text-orange-600 bg-orange-50",
    },
  ];

  const getIcon = (iconType) => {
    const icons = {
      "academic-cap": (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 14l9-5-9-5-9 5 9 5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
          />
        </svg>
      ),
      "check-circle": (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      clock: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      fire: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
            clipRule="evenodd"
          />
        </svg>
      ),
    };
    return icons[iconType] || icons.clock;
  };

  return (
    <DashboardGrid columns={4} gap="md">
      {stats.map((stat, index) => (
        <DashboardCard key={index} className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", stat.color)}>
              {getIcon(stat.icon)}
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {stat.value}
              </p>
              <p className="text-sm text-neutral-600">{stat.label}</p>
            </div>
          </div>
        </DashboardCard>
      ))}
    </DashboardGrid>
  );
};

/**
 * Featured Content Carousel
 */
const FeaturedContent = ({ content, onContentClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % content.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + content.length) % content.length);
  };

  if (!content || content.length === 0) {
    return (
      <div className="bg-neutral-100 rounded-xl p-8 text-center">
        <p className="text-neutral-600">No featured content available</p>
      </div>
    );
  }

  const currentContent = content[currentIndex];

  return (
    <div className="relative bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl overflow-hidden">
      <div className="flex items-center p-8 text-white">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30"
            >
              Featured
            </Badge>
            <Badge variant="outline" className="text-white border-white/30">
              {currentContent.type}
            </Badge>
          </div>
          <h3 className="text-2xl font-bold">{currentContent.title}</h3>
          <p className="text-primary-100 max-w-md">
            {currentContent.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-primary-100">
            <span>{currentContent.duration}</span>
            <span>•</span>
            <span>{currentContent.level}</span>
            <span>•</span>
            <span>By {currentContent.author}</span>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => onContentClick(currentContent)}
              className="bg-white text-primary-600 hover:bg-neutral-100"
            >
              Start Learning
            </Button>
            <Button
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10"
            >
              Preview
            </Button>
          </div>
        </div>
        <div className="hidden lg:block flex-shrink-0 ml-8">
          <div className="w-64 h-40 bg-white/10 rounded-lg flex items-center justify-center">
            <svg
              className="w-16 h-16 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {content.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {content.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Learning Path Cards
 */
const LearningPathCards = ({ paths, variant = "default" }) => {
  if (!paths || paths.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-600">No learning paths available</p>
      </div>
    );
  }

  return (
    <DashboardGrid
      columns={paths.length === 1 ? 1 : paths.length === 2 ? 2 : 3}
      gap="md"
    >
      {paths.map((path) => (
        <LearningPathCard key={path.id} path={path} variant={variant} />
      ))}
    </DashboardGrid>
  );
};

/**
 * Individual Learning Path Card
 */
const LearningPathCard = ({ path, variant = "default" }) => {
  const getLevelColor = (level) => {
    const colors = {
      Beginner: "text-green-600 bg-green-50",
      Intermediate: "text-blue-600 bg-blue-50",
      Advanced: "text-purple-600 bg-purple-50",
    };
    return colors[level] || colors.Beginner;
  };

  return (
    <DashboardCard className="group hover:shadow-lg transition-all duration-200">
      <div className="relative">
        {/* Image placeholder */}
        <div className="h-32 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-t-lg flex items-center justify-center">
          <svg
            className="w-12 h-12 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        {/* Progress badge for enrolled paths */}
        {variant === "progress" && path.progress > 0 && (
          <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium shadow-sm">
            {path.progress}% complete
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getLevelColor(path.level)}>
              {path.level}
            </Badge>
            {path.enrolled && (
              <Badge variant="primary" size="sm">
                Enrolled
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
            {path.title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2">
            {path.description}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>{path.lessons} lessons</span>
          <span>{path.duration}</span>
        </div>

        {/* Progress bar for enrolled paths */}
        {variant === "progress" && path.progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Progress</span>
              <span className="font-medium text-neutral-900">
                {path.progress}%
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${path.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action button */}
        <Button
          className="w-full"
          variant={path.enrolled ? "primary" : "outline"}
        >
          {path.enrolled
            ? path.progress > 0
              ? "Continue Learning"
              : "Start Path"
            : "Enroll Now"}
        </Button>
      </div>
    </DashboardCard>
  );
};

/**
 * Category Tabs
 */
const CategoryTabs = ({ categories, selectedCategory, onCategoryChange }) => {
  const getIcon = (iconType) => {
    const icons = {
      grid: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
      wallet: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
      "trending-up": (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      cpu: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
      ),
      "credit-card": (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
      calculator: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    };
    return icons[iconType] || icons.grid;
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-1">
      <div className="flex flex-wrap gap-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              selectedCategory === category.id
                ? "bg-primary-500 text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            )}
          >
            {getIcon(category.icon)}
            <span>{category.name}</span>
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                selectedCategory === category.id
                  ? "bg-primary-400 text-primary-50"
                  : "bg-neutral-200 text-neutral-600"
              )}
            >
              {category.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Search and Filters
 */
const SearchFilters = ({
  searchTerm,
  onSearch,
  selectedLevel,
  selectedType,
  onFilterChange,
}) => {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search courses, articles, guides..."
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={selectedLevel}
            onChange={(e) => onFilterChange("level", e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => onFilterChange("type", e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="article">Articles</option>
            <option value="video">Videos</option>
            <option value="course">Courses</option>
            <option value="guide">Guides</option>
            <option value="tool">Tools</option>
            <option value="webinar">Webinars</option>
          </select>
        </div>
      </div>
    </div>
  );
};

/**
 * Content Grid
 */
const ContentGrid = ({ content, onContentClick, loading = false }) => {
  if (loading) {
    return (
      <DashboardGrid columns={3} gap="md">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <ContentCardSkeleton key={index} />
        ))}
      </DashboardGrid>
    );
  }

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          No content found
        </h3>
        <p className="text-neutral-600">
          Try adjusting your search terms or filters.
        </p>
      </div>
    );
  }

  return (
    <DashboardGrid columns={3} gap="md">
      {content.map((item) => (
        <ContentCard
          key={item.id}
          content={item}
          onClick={() => onContentClick(item)}
        />
      ))}
    </DashboardGrid>
  );
};

/**
 * Individual Content Card
 */
const ContentCard = ({ content, onClick }) => {
  const getTypeIcon = (type) => {
    const icons = {
      article: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      video: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      course: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      guide: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      tool: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      webinar: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
    };
    return icons[type] || icons.article;
  };

  const getLevelColor = (level) => {
    const colors = {
      Beginner: "text-green-600 bg-green-50",
      Intermediate: "text-blue-600 bg-blue-50",
      Advanced: "text-purple-600 bg-purple-50",
      "All Levels": "text-neutral-600 bg-neutral-50",
    };
    return colors[level] || colors.Beginner;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <DashboardCard
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-t-lg flex items-center justify-center">
        <div className="text-neutral-400">{getTypeIcon(content.type)}</div>

        {/* Bookmark icon */}
        {content.bookmarked && (
          <div className="absolute top-2 right-2 text-yellow-500">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            size="sm"
            className="bg-white/90 text-neutral-700"
          >
            {content.type}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              size="sm"
              className={getLevelColor(content.level)}
            >
              {content.level}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2">
            {content.title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2">
            {content.description}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{content.duration}</span>
          <span>By {content.author}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {content.views}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {content.likes}
            </span>
          </div>
          <span>{formatDate(content.publishedAt)}</span>
        </div>
      </div>
    </DashboardCard>
  );
};

/**
 * Content Card Skeleton
 */
const ContentCardSkeleton = () => {
  return (
    <DashboardCard className="animate-pulse">
      <div className="h-32 bg-neutral-200 rounded-t-lg"></div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 bg-neutral-200 rounded w-16"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-neutral-200 rounded w-16"></div>
          <div className="h-3 bg-neutral-200 rounded w-20"></div>
        </div>
        <div className="flex justify-between pt-2 border-t border-neutral-200">
          <div className="h-3 bg-neutral-200 rounded w-20"></div>
          <div className="h-3 bg-neutral-200 rounded w-16"></div>
        </div>
      </div>
    </DashboardCard>
  );
};

/**
 * Content Preview Modal
 */
const ContentPreviewModal = ({ isOpen, onClose, content }) => {
  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary-50 text-primary-600">
              {content.type}
            </Badge>
            <Badge variant="outline">{content.level}</Badge>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              {content.title}
            </h2>
            <p className="text-neutral-600">{content.description}</p>
          </div>

          {/* Preview image */}
          <div className="h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg flex items-center justify-center">
            <svg
              className="w-16 h-16 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Meta information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-600">Author:</span>
              <p className="font-medium text-neutral-900">{content.author}</p>
            </div>
            <div>
              <span className="text-neutral-600">Duration:</span>
              <p className="font-medium text-neutral-900">{content.duration}</p>
            </div>
            <div>
              <span className="text-neutral-600">Views:</span>
              <p className="font-medium text-neutral-900">
                {content.views.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-neutral-600">Published:</span>
              <p className="font-medium text-neutral-900">
                {new Date(content.publishedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <span className="text-sm text-neutral-600 mb-2 block">Tags:</span>
            <div className="flex flex-wrap gap-2">
              {content.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-200 bg-neutral-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-3">
            <Button variant="outline">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              Bookmark
            </Button>
            <Button>Start Learning</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export {
  EducationHubHeader,
  LearningStats,
  FeaturedContent,
  LearningPathCards,
  LearningPathCard,
  CategoryTabs,
  SearchFilters,
  ContentGrid,
  ContentCard,
  ContentCardSkeleton,
  ContentPreviewModal,
};
