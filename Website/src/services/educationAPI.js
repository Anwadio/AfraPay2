/* eslint-disable no-unused-vars */
/**
 * Education API Service
 * Handles all education-related API calls
 */

import api from "./api";

export const educationAPI = {
  // ========== CATEGORIES ==========

  /**
   * Get all education categories
   */
  async getCategories() {
    try {
      const response = await api.get("/education/categories");
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      throw error;
    }
  },

  // ========== CONTENT ==========

  /**
   * Get educational content with filters and pagination
   * @param {Object} params - Query parameters
   * @param {string} params.category - Filter by category slug
   * @param {string} params.type - Filter by content type
   * @param {string} params.level - Filter by difficulty level
   * @param {boolean} params.featured - Filter featured content
   * @param {string} params.search - Search term
   * @param {string} params.tags - Comma-separated tags
   * @param {string} params.sortBy - Sort field
   * @param {string} params.order - Sort order (asc|desc)
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  async getContent(params = {}) {
    try {
      const response = await api.get("/education/content", { params });
      return {
        items: response.data?.items || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error("Failed to fetch content:", error);
      throw error;
    }
  },

  /**
   * Get featured content items
   */
  async getFeaturedContent() {
    try {
      const response = await api.get("/education/content/featured");
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch featured content:", error);
      throw error;
    }
  },

  /**
   * Get a single content item by ID
   * @param {string} contentId - Content item ID
   */
  async getContentById(contentId) {
    try {
      const response = await api.get(`/education/content/${contentId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch content item:", error);
      throw error;
    }
  },

  /**
   * Like a content item
   * @param {string} contentId - Content item ID
   */
  async likeContent(contentId) {
    try {
      const response = await api.post(`/education/content/${contentId}/like`);
      return response.data;
    } catch (error) {
      console.error("Failed to like content:", error);
      throw error;
    }
  },

  // ========== CONTENT ENROLLMENT ==========

  /**
   * Enroll in a content item
   * @param {string} contentId - Content item ID
   */
  async enrollInContent(contentId) {
    try {
      const response = await api.post(`/education/content/${contentId}/enroll`);
      return response.data;
    } catch (error) {
      console.error("Failed to enroll in content:", error);
      throw error;
    }
  },

  /**
   * Unenroll from a content item
   * @param {string} contentId - Content item ID
   */
  async unenrollFromContent(contentId) {
    try {
      await api.delete(`/education/content/${contentId}/enroll`);
      return { success: true };
    } catch (error) {
      console.error("Failed to unenroll from content:", error);
      throw error;
    }
  },

  /**
   * Mark content as complete
   * @param {string} contentId - Content item ID
   */
  async markContentComplete(contentId) {
    try {
      const response = await api.post(
        `/education/content/${contentId}/complete`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to mark content complete:", error);
      throw error;
    }
  },

  /**
   * Get user's content enrollments
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by enrollment status
   */
  async getMyContentEnrollments(params = {}) {
    try {
      const response = await api.get("/education/my-content", { params });
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch content enrollments:", error);
      throw error;
    }
  },

  // ========== LEARNING PATHS ==========

  /**
   * Get learning paths with filters and pagination
   * @param {Object} params - Query parameters
   */
  async getLearningPaths(params = {}) {
    try {
      const response = await api.get("/education/paths", { params });
      return {
        items: response.data?.items || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error("Failed to fetch learning paths:", error);
      throw error;
    }
  },

  /**
   * Get a single learning path by ID
   * @param {string} pathId - Learning path ID
   */
  async getLearningPath(pathId) {
    try {
      const response = await api.get(`/education/paths/${pathId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch learning path:", error);
      throw error;
    }
  },

  /**
   * Enroll in a learning path
   * @param {string} pathId - Learning path ID
   */
  async enrollInPath(pathId) {
    try {
      const response = await api.post(`/education/paths/${pathId}/enroll`);
      return response.data;
    } catch (error) {
      console.error("Failed to enroll in path:", error);
      throw error;
    }
  },

  /**
   * Unenroll from a learning path
   * @param {string} pathId - Learning path ID
   */
  async unenrollFromPath(pathId) {
    try {
      await api.delete(`/education/paths/${pathId}/enroll`);
      return { success: true };
    } catch (error) {
      console.error("Failed to unenroll from path:", error);
      throw error;
    }
  },

  /**
   * Get user's learning path enrollments
   * @param {Object} params - Query parameters
   */
  async getMyPathEnrollments(params = {}) {
    try {
      const response = await api.get("/education/my-paths", { params });
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch path enrollments:", error);
      throw error;
    }
  },

  // ========== USER STATS ==========

  /**
   * Get the current user's aggregated learning stats
   * Returns: enrolledPaths, completedLessons, totalHours, streak
   */
  async getUserStats() {
    try {
      const response = await api.get("/education/my-stats");
      return (
        response.data || {
          enrolledPaths: 0,
          completedLessons: 0,
          totalHours: 0,
          streak: 0,
        }
      );
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
      return {
        enrolledPaths: 0,
        completedLessons: 0,
        totalHours: 0,
        streak: 0,
      };
    }
  },

  // ========== PROGRESS ==========

  /**
   * Record progress for a learning path content item
   * @param {Object} progressData - Progress data
   * @param {string} progressData.pathId - Learning path ID
   * @param {string} progressData.contentId - Content item ID
   * @param {boolean} progressData.completed - Whether content is completed
   * @param {number} progressData.timeSpentSeconds - Time spent in seconds
   * @param {number} progressData.quizScore - Quiz score (optional)
   */
  async recordProgress(progressData) {
    try {
      const response = await api.post("/education/progress", progressData);
      return response.data;
    } catch (error) {
      console.error("Failed to record progress:", error);
      throw error;
    }
  },

  /**
   * Get progress for a learning path
   * @param {string} pathId - Learning path ID
   */
  async getProgress(pathId) {
    try {
      const response = await api.get(`/education/progress/${pathId}`);
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      throw error;
    }
  },

  // ========== BOOKMARKS ==========

  /**
   * Get user's bookmarks
   * @param {Object} params - Query parameters
   */
  async getBookmarks(params = {}) {
    try {
      const response = await api.get("/education/bookmarks", { params });
      return {
        items: response.data?.items || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      throw error;
    }
  },

  /**
   * Add a bookmark
   * @param {string} contentId - Content item ID
   */
  async addBookmark(contentId) {
    try {
      const response = await api.post("/education/bookmarks", { contentId });
      return response.data;
    } catch (error) {
      console.error("Failed to add bookmark:", error);
      throw error;
    }
  },

  /**
   * Remove a bookmark
   * @param {string} bookmarkId - Bookmark ID
   */
  async removeBookmark(bookmarkId) {
    try {
      await api.delete(`/education/bookmarks/${bookmarkId}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
      throw error;
    }
  },
};

export default educationAPI;
