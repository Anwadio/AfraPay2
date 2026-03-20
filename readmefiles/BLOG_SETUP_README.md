# Blog Collection Setup and Usage Guide

This guide explains how to set up the AfraPay blog collection in Appwrite and use the blog API endpoints.

## Setup Process

### 1. Setup Blog Collection Attributes

First, run the setup script to create the necessary attributes in your Appwrite blog collection:

```bash
# Navigate to the backend directory
cd backend

# Run the collection setup script
node diagnostics/setup-blog-collection.js
```

This script will:
- Create all necessary attributes (category, title, slug, excerpt, content, etc.)
- Set up indexes for better performance
- Create the blog collection structure

### 2. Seed Sample Data

After the attributes are created successfully, run the seeding script to populate the collection with sample blog posts:

```bash
# Run the seeding script
node diagnostics/seed-blog-posts.js
```

This script will:
- Add 5 sample blog posts with full content
- Include proper metadata (categories, tags, authors, etc.)
- Set up featured posts and proper publication dates

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Get All Blog Posts
```
GET /api/v1/blog
```
Query parameters:
- `category` - Filter by category (All, Product, Finance, Security, Community, Company)
- `search` - Search in title, excerpt, content, and author
- `featured` - Filter featured posts (true/false)
- `limit` - Number of posts per page (default: 20)
- `offset` - Offset for pagination (default: 0)

Example:
```
GET /api/v1/blog?category=Product&limit=10&offset=0
```

#### Get Blog Categories
```
GET /api/v1/blog/categories
```
Returns available blog categories.

#### Get Featured Post
```
GET /api/v1/blog/featured
```
Returns the current featured blog post.

#### Get Blog Post by Slug
```
GET /api/v1/blog/:slug
```
Returns a specific blog post using its slug.

Example:
```
GET /api/v1/blog/introducing-afrapay-20-faster-smarter-more-secure
```

### Admin Endpoints (For Future Admin Dashboard)

#### Create New Blog Post
```
POST /api/v1/blog
```
Body:
```json
{
  "category": "Product",
  "title": "New Blog Post Title",
  "excerpt": "Short description of the post...",
  "content": "Full content of the blog post...",
  "author": "Author Name",
  "authorRole": "Author Title",
  "avatar": "AN",
  "readTime": "5 min read",
  "featured": false,
  "tagText": "New Feature",
  "tagVariant": "primary",
  "imageUrl": "https://example.com/image.jpg",
  "status": "published"
}
```

#### Update Blog Post
```
PUT /api/v1/blog/:id
```
Body: Same as create, but all fields are optional.

#### Delete Blog Post
```
DELETE /api/v1/blog/:id
```

## Data Structure

Each blog post contains:

- **category** - Post category (Product, Finance, Security, etc.)
- **title** - Post title
- **slug** - URL-friendly version of title (auto-generated)
- **excerpt** - Short description
- **content** - Full post content (supports markdown)
- **author** - Author name
- **authorRole** - Author's role/title
- **avatar** - Author initials
- **readTime** - Estimated read time
- **featured** - Whether post is featured
- **tagText** - Tag label
- **tagVariant** - Tag color variant
- **imageUrl** - Featured image URL
- **publishedAt** - Publication date
- **status** - Post status (draft, published)

## Frontend Integration

To integrate with your React frontend:

1. Create an API service in `Website/src/services/api.js`:
```javascript
// Blog API endpoints
export const blogAPI = {
  getPosts: (params) => api.get('/blog', { params }),
  getPostBySlug: (slug) => api.get(`/blog/${slug}`),
  getFeaturedPost: () => api.get('/blog/featured'),
  getCategories: () => api.get('/blog/categories')
};
```

2. Update the Blog.jsx component to use the API instead of hardcoded data:
```javascript
// Replace hardcoded POSTS and CATEGORIES with API calls
const [posts, setPosts] = useState([]);
const [categories, setCategories] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const [postsRes, categoriesRes] = await Promise.all([
        blogAPI.getPosts({ category: activeCategory, search: searchQuery }),
        blogAPI.getCategories()
      ]);
      setPosts(postsRes.data.posts);
      setCategories(categoriesRes.data.categories);
    } catch (error) {
      console.error('Error fetching blog data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, [activeCategory, searchQuery]);
```

## Environment Variables

Make sure these environment variables are set in your `.env` file:

```
APPWRITE_BLOG_COLLECTION_ID=69bade9f003e0a174a88
APPWRITE_DATABASE_ID=69720e41002429abc875
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6972090b003512312836
APPWRITE_API_KEY=your_api_key_here
```

## Running the Backend

Make sure your backend server is running to use the API endpoints:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The blog API will be available at `http://localhost:5000/api/v1/blog`

## Notes

- The blog routes are already integrated into the backend routing system
- All endpoints return properly formatted JSON responses
- Error handling is implemented for all endpoints
- The setup scripts include proper error handling and skip existing attributes/data
- Images should be hosted externally (e.g., Unsplash, Cloudinary) and referenced by URL