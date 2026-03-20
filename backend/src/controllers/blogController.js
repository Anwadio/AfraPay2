const { databases, Query } = require('../config/appwrite');

const COLLECTION_ID = process.env.APPWRITE_BLOG_COLLECTION_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

// Available categories for filtering
const CATEGORIES = [
  "All",
  "Product", 
  "Finance",
  "Security",
  "Community",
  "Company"
];

/**
 * Get all blog posts with optional filtering
 * GET /api/v1/blog
 * Query params: category, search, featured, limit, offset
 */
const getBlogPosts = async (req, res) => {
  try {
    const { 
      category = 'All', 
      search = '', 
      featured, 
      limit = 20, 
      offset = 0,
      status = 'published'
    } = req.query;

    // Build queries array
    const queries = [
      Query.equal('status', status),
      Query.orderDesc('publishedAt'),
      Query.limit(parseInt(limit)),
      Query.offset(parseInt(offset))
    ];

    // Add category filter if not "All"
    if (category !== 'All') {
      queries.push(Query.equal('category', category));
    }

    // Add featured filter
    if (featured !== undefined) {
      queries.push(Query.equal('featured', featured === 'true'));
    }

    // Fetch documents
    let response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      queries
    );

    let posts = response.documents;

    // Apply search filter (client-side since Appwrite search is limited)
    if (search) {
      const searchTerm = search.toLowerCase();
      posts = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm) ||
        post.excerpt.toLowerCase().includes(searchTerm) ||
        post.content.toLowerCase().includes(searchTerm) ||
        post.author.toLowerCase().includes(searchTerm)
      );
    }

    // Get total count for pagination
    const totalQueries = [Query.equal('status', status)];
    if (category !== 'All') {
      totalQueries.push(Query.equal('category', category));
    }
    if (featured !== undefined) {
      totalQueries.push(Query.equal('featured', featured === 'true'));
    }

    const totalResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      totalQueries
    );

    let totalCount = totalResponse.total;

    // Apply search to total count
    if (search) {
      const searchTerm = search.toLowerCase();
      const filteredTotal = totalResponse.documents.filter(post => 
        post.title.toLowerCase().includes(searchTerm) ||
        post.excerpt.toLowerCase().includes(searchTerm) ||
        post.content.toLowerCase().includes(searchTerm) ||
        post.author.toLowerCase().includes(searchTerm)
      );
      totalCount = filteredTotal.length;
    }

    // Transform posts for frontend
    const transformedPosts = posts.map(post => ({
      id: post.$id,
      category: post.category,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      authorRole: post.authorRole,
      avatar: post.avatar,
      date: new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      }),
      readTime: post.readTime,
      featured: post.featured,
      tag: {
        text: post.tagText,
        variant: post.tagVariant
      },
      imageUrl: post.imageUrl,
      publishedAt: post.publishedAt,
      status: post.status,
      createdAt: post.$createdAt,
      updatedAt: post.$updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        posts: transformedPosts,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        },
        categories: CATEGORIES
      }
    });

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single blog post by slug
 * GET /api/v1/blog/:slug
 */
const getBlogPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('slug', slug),
        Query.equal('status', 'published')
      ]
    );

    if (response.documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const post = response.documents[0];

    // Transform post for frontend
    const transformedPost = {
      id: post.$id,
      category: post.category,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      authorRole: post.authorRole,
      avatar: post.avatar,
      date: new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      readTime: post.readTime,
      featured: post.featured,
      tag: {
        text: post.tagText,
        variant: post.tagVariant
      },
      imageUrl: post.imageUrl,
      publishedAt: post.publishedAt,
      status: post.status,
      createdAt: post.$createdAt,
      updatedAt: post.$updatedAt
    };

    res.status(200).json({
      success: true,
      data: { post: transformedPost }
    });

  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get featured blog post
 * GET /api/v1/blog/featured
 */
const getFeaturedPost = async (req, res) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('featured', true),
        Query.equal('status', 'published'),
        Query.orderDesc('publishedAt'),
        Query.limit(1)
      ]
    );

    if (response.documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No featured post found'
      });
    }

    const post = response.documents[0];

    // Transform post for frontend
    const transformedPost = {
      id: post.$id,
      category: post.category,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      authorRole: post.authorRole,
      avatar: post.avatar,
      date: new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      readTime: post.readTime,
      featured: post.featured,
      tag: {
        text: post.tagText,
        variant: post.tagVariant
      },
      imageUrl: post.imageUrl,
      publishedAt: post.publishedAt,
      status: post.status,
      createdAt: post.$createdAt,
      updatedAt: post.$updatedAt
    };

    res.status(200).json({
      success: true,
      data: { post: transformedPost }
    });

  } catch (error) {
    console.error('Error fetching featured post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new blog post (Admin only)
 * POST /api/v1/blog
 */
const createBlogPost = async (req, res) => {
  try {
    const {
      category,
      title,
      excerpt,
      content,
      author,
      authorRole,
      avatar,
      readTime,
      featured = false,
      tagText,
      tagVariant = 'primary',
      imageUrl,
      status = 'draft'
    } = req.body;

    // Validation
    if (!category || !title || !excerpt || !content || !author || !authorRole || !avatar || !tagText) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, title, excerpt, content, author, authorRole, avatar, tagText'
      });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    // Check if slug already exists
    const existingPost = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.equal('slug', slug)]
    );

    if (existingPost.documents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A post with this title already exists'
      });
    }

    const publishedAt = status === 'published' ? new Date().toISOString() : new Date().toISOString();

    const documentData = {
      category,
      title,
      slug,
      excerpt,
      content,
      author,
      authorRole,
      avatar,
      readTime: readTime || 'N/A',
      featured,
      tagText,
      tagVariant,
      imageUrl: imageUrl || '',
      publishedAt,
      status
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      'unique()',
      documentData
    );

    // Transform response for frontend
    const transformedPost = {
      id: response.$id,
      category: response.category,
      title: response.title,
      slug: response.slug,
      excerpt: response.excerpt,
      content: response.content,
      author: response.author,
      authorRole: response.authorRole,
      avatar: response.avatar,
      date: new Date(response.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      readTime: response.readTime,
      featured: response.featured,
      tag: {
        text: response.tagText,
        variant: response.tagVariant
      },
      imageUrl: response.imageUrl,
      publishedAt: response.publishedAt,
      status: response.status,
      createdAt: response.$createdAt,
      updatedAt: response.$updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: { post: transformedPost }
    });

  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a blog post (Admin only)
 * PUT /api/v1/blog/:id
 */
const updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.slug; // Slug should be generated from title
    delete updateData.$id;
    delete updateData.$createdAt;
    delete updateData.$updatedAt;

    // If title is being updated, regenerate slug
    if (updateData.title) {
      const newSlug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

      // Check if new slug conflicts with existing posts (excluding current post)
      const existingPost = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal('slug', newSlug),
          Query.notEqual('$id', id)
        ]
      );

      if (existingPost.documents.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A post with this title already exists'
        });
      }

      updateData.slug = newSlug;
    }

    // If status is changing to published, update publishedAt
    if (updateData.status === 'published') {
      updateData.publishedAt = new Date().toISOString();
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      id,
      updateData
    );

    // Transform response for frontend
    const transformedPost = {
      id: response.$id,
      category: response.category,
      title: response.title,
      slug: response.slug,
      excerpt: response.excerpt,
      content: response.content,
      author: response.author,
      authorRole: response.authorRole,
      avatar: response.avatar,
      date: new Date(response.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      readTime: response.readTime,
      featured: response.featured,
      tag: {
        text: response.tagText,
        variant: response.tagVariant
      },
      imageUrl: response.imageUrl,
      publishedAt: response.publishedAt,
      status: response.status,
      createdAt: response.$createdAt,
      updatedAt: response.$updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: { post: transformedPost }
    });

  } catch (error) {
    console.error('Error updating blog post:', error);
    
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a blog post (Admin only)
 * DELETE /api/v1/blog/:id
 */
const deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;

    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_ID,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blog post:', error);
    
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get blog categories
 * GET /api/v1/blog/categories
 */
const getBlogCategories = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: { categories: CATEGORIES }
    });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getBlogPosts,
  getBlogPostBySlug,
  getFeaturedPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogCategories
};