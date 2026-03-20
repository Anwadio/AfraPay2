// Blog.jsx API Integration Example
// Replace the hardcoded data with API calls

import React, { useState, useEffect } from "react";
import { blogAPI } from "../services/api";
// ... other imports

const Blog = () => {
  const [activeDept, setActiveDept] = useState("All");
  const [search, setSearch] = useState("");
  
  // Replace hardcoded data with API state
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredPost, setFeaturedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch categories and featured post on initial load
        if (pagination.offset === 0) {
          const [categoriesRes, featuredRes] = await Promise.all([
            blogAPI.getCategories(),
            blogAPI.getFeaturedPost().catch(() => null) // Featured post might not exist
          ]);
          
          if (categoriesRes.success) {
            setCategories(categoriesRes.data.categories);
          }
          
          if (featuredRes?.success) {
            setFeaturedPost(featuredRes.data.post);
          }
        }

        // Fetch posts with current filters
        const postsRes = await blogAPI.getPosts({
          category: activeDept,
          search: search,
          limit: pagination.limit,
          offset: pagination.offset
        });

        if (postsRes.success) {
          if (pagination.offset === 0) {
            // New search/filter - replace posts
            setPosts(postsRes.data.posts);
          } else {
            // Load more - append posts
            setPosts(prev => [...prev, ...postsRes.data.posts]);
          }
          
          setPagination(postsRes.data.pagination);
        } else {
          setError('Failed to fetch blog posts');
        }
      } catch (err) {
        console.error('Error fetching blog data:', err);
        setError('Failed to load blog content');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeDept, search, pagination.offset]); // Remove pagination.offset if not implementing infinite scroll

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, offset: 0 }));
  }, [activeDept, search]);

  // Filter featured post from regular posts list if it exists
  const filteredPosts = posts.filter(post => !post.featured);
  
  // Show loading state
  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* SEO Head remains the same */}
      <SEOHead
        title="Blog – Fintech Insights & News from Africa"
        description="Read the latest articles on mobile money, personal finance, security, and fintech innovation across Africa from the AfraPay team."
        keywords="AfraPay blog, fintech Africa, mobile money news, Africa payments, financial inclusion articles"
        structuredData={SCHEMA_BLOG}
      />
      
      {/* Hero section remains largely the same */}
      <section 
        className="relative text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Blogimage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Hero content */}
      </section>

      {/* Featured post - now from API */}
      {featuredPost && activeDept === "All" && search === "" && (
        <Section spacing="xl" className="bg-white">
          <Container>
            <Badge
              variant="outline"
              className="mb-6 border-primary-200 text-primary-600"
            >
              ⭐ Featured Post
            </Badge>
            <Card className="overflow-hidden border-primary-100 hover:shadow-xl transition-shadow">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Image or color block */}
                  <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 min-h-[280px] lg:min-h-full flex items-center justify-center p-12">
                    {featuredPost.imageUrl ? (
                      <img 
                        src={featuredPost.imageUrl} 
                        alt={featuredPost.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-center text-white">
                        <div className="text-7xl mb-4">🚀</div>
                        <p className="text-primary-200 text-sm font-medium uppercase tracking-wider">
                          {featuredPost.category}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start bg-${featuredPost.tag.variant}-100 text-${featuredPost.tag.variant}-700`}>
                      {featuredPost.tag.text}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4 leading-tight">
                      {featuredPost.title}
                    </h2>
                    <p className="text-neutral-600 leading-relaxed mb-6">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 text-sm">
                        {featuredPost.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">
                          {featuredPost.author}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {featuredPost.date} · {featuredPost.readTime}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="md"
                      className="self-start bg-primary-600 hover:bg-primary-700 text-white font-bold"
                      onClick={() => {
                        // Navigate to full post - implement routing
                        console.log('Navigate to:', featuredPost.slug);
                      }}
                    >
                      Read Article{" "}
                      <Icon name="arrowRight" className="w-4 h-4 inline ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Container>
        </Section>
      )}

      {/* Filter + search + grid */}
      <Section spacing="xl" className="bg-primary-50">
        <Container>
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search articles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Category filters - now from API */}
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveDept(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  activeDept === cat
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Post grid - now from API */}
          {filteredPosts.length > 0 ? (
            <>
              <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
                {filteredPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="bg-white border-neutral-100 hover:shadow-lg hover:border-primary-200 transition-all flex flex-col cursor-pointer"
                    onClick={() => {
                      // Navigate to full post - implement routing
                      console.log('Navigate to:', post.slug);
                    }}
                  >
                    <CardContent className="p-0 flex flex-col h-full">
                      {/* Image or colour cover */}
                      <div className="h-40 flex items-center justify-center rounded-t-xl overflow-hidden">
                        {post.imageUrl ? (
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-primary-600 to-secondary-600 w-full h-full flex items-center justify-center">
                            <span className="text-4xl">
                              {post.category === "Product" && "🛠️"}
                              {post.category === "Finance" && "💰"}
                              {post.category === "Security" && "🔐"}
                              {post.category === "Community" && "🤝"}
                              {post.category === "Company" && "🏢"}
                              {!["Product", "Finance", "Security", "Community", "Company"].includes(post.category) && "📝"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-${post.tag.variant}-100 text-${post.tag.variant}-700`}>
                            {post.tag.text}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {post.readTime}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-neutral-900 mb-2 leading-snug flex-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-neutral-500 leading-relaxed mb-5 line-clamp-3">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-50">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold">
                              {post.avatar}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-neutral-800">
                                {post.author}
                              </p>
                              <p className="text-xs text-neutral-400">
                                {post.date}
                              </p>
                            </div>
                          </div>
                          <button className="text-primary-600 hover:text-primary-700 transition-colors">
                            <Icon name="arrowRight" className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
              
              {/* Load More Button (if implementing pagination) */}
              {pagination.hasMore && (
                <div className="text-center mt-10">
                  <Button
                    variant="outline"
                    onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={loading}
                    className="px-8 py-3"
                  >
                    {loading ? "Loading..." : "Load More Posts"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                No articles found
              </h3>
              <p className="text-neutral-500 mb-6">
                Try adjusting your search or selecting a different category.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setActiveDept("All");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Container>
      </Section>

      {/* Newsletter section remains the same */}
      <Section
        spacing="lg"
        className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white"
      >
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-3">Stay in the Loop</h2>
            <p className="text-primary-100 mb-8 text-lg">
              Get the latest AfraPay articles, product updates, and financial
              tips delivered to your inbox every week.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white border-0"
              />
              <Button
                type="submit"
                size="md"
                className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-6 whitespace-nowrap"
              >
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-primary-200 mt-3">
              No spam. Unsubscribe at any time.
            </p>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default Blog;