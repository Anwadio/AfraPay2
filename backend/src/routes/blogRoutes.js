const express = require('express');
const router = express.Router();
const {
  getBlogPosts,
  getBlogPostBySlug,
  getFeaturedPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogCategories
} = require('../controllers/blogController');

// Public routes - no authentication required
router.get('/', getBlogPosts);                    // GET /api/v1/blog - Get all posts with filtering
router.get('/categories', getBlogCategories);     // GET /api/v1/blog/categories - Get available categories
router.get('/featured', getFeaturedPost);         // GET /api/v1/blog/featured - Get featured post
router.get('/:slug', getBlogPostBySlug);          // GET /api/v1/blog/:slug - Get post by slug

// Admin routes - authentication required (uncomment when auth middleware is ready)
// Note: Add authentication middleware when admin dashboard is implemented
router.post('/', createBlogPost);                 // POST /api/v1/blog - Create new post
router.put('/:id', updateBlogPost);               // PUT /api/v1/blog/:id - Update post
router.delete('/:id', deleteBlogPost);            // DELETE /api/v1/blog/:id - Delete post

module.exports = router;