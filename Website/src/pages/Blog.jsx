/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import {
  Container,
  Section,
  Grid,
  Button,
  Badge,
  Card,
  CardContent,
} from "../components";
import { Icon } from "../components/common/Icons";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_BLOG } from "../components/seo/schemas";
import { blogAPI, newsletterAPI } from "../services/api";
import toast from "react-hot-toast";

const variantColors = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
};

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // API state
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [featuredPost, setFeaturedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isNewsletterLoading, setIsNewsletterLoading] = useState(false);

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
            blogAPI.getFeaturedPost().catch(() => null), // Featured post might not exist
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
          category: activeCategory,
          search: searchQuery,
          limit: pagination.limit,
          offset: pagination.offset,
        });

        if (postsRes.success) {
          if (pagination.offset === 0) {
            // New search/filter - replace posts
            setPosts(postsRes.data.posts);
          } else {
            // Load more - append posts
            setPosts((prev) => [...prev, ...postsRes.data.posts]);
          }

          setPagination(postsRes.data.pagination);
        } else {
          setError("Failed to fetch blog posts");
        }
      } catch (err) {
        console.error("Error fetching blog data:", err);
        setError("Failed to load blog content");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeCategory, searchQuery, pagination.offset]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [activeCategory, searchQuery]);

  // Filter featured post from regular posts list if it exists
  const filtered = posts.filter((post) => !post.featured);

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();

    if (!newsletterEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsNewsletterLoading(true);

    try {
      const response = await newsletterAPI.subscribe({
        email: newsletterEmail,
        source: "blog_page",
        interests: ["blog", "product_updates", "financial_tips"],
      });

      if (response.success) {
        toast.success(
          "🎉 Successfully subscribed! Welcome to the AfraPay community.",
        );
        setNewsletterEmail(""); // Clear the input
      } else {
        toast.error(
          response.message || "Failed to subscribe. Please try again.",
        );
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      if (
        error.response?.data?.message?.includes("already subscribed") ||
        error.response?.data?.message?.includes("duplicate")
      ) {
        toast.error("You're already subscribed! Thank you for your interest.");
      } else {
        toast.error("Oops! Something went wrong. Please try again later.");
      }
    } finally {
      setIsNewsletterLoading(false);
    }
  };

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
  if (error && posts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-neutral-600 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const featured = featuredPost;

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Blog – Fintech Insights & News from Africa"
        description="Read the latest articles on mobile money, personal finance, security, and fintech innovation across Africa from the AfraPay team."
        keywords="AfraPay blog, fintech Africa, mobile money news, Africa payments, financial inclusion articles"
        structuredData={SCHEMA_BLOG}
      />
      {/* Hero */}
      <section
        className="relative text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Blogimage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/75 to-secondary-800/80" />
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 bg-secondary-500/10 rounded-full blur-2xl"
          aria-hidden="true"
        />
        <Container className="relative">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-6 border-white/30 text-white bg-white/10"
            >
              📝 AfraPay Blog
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Insights & <span className="text-primary-300">Stories</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-200 max-w-xl leading-relaxed">
              Product updates, financial tips, security guides, and stories from
              communities across South Sudan.
            </p>
          </div>
        </Container>
      </section>

      {/* Featured post */}
      {featured && activeCategory === "All" && searchQuery === "" && (
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
                  <div
                    className={`min-h-[280px] lg:min-h-full flex items-center justify-center ${featured.imageUrl ? "" : "bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 p-12"}`}
                  >
                    {featured.imageUrl ? (
                      <img
                        src={featured.imageUrl}
                        alt={featured.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-center text-white">
                        <div className="text-7xl mb-4">🚀</div>
                        <p className="text-primary-200 text-sm font-medium uppercase tracking-wider">
                          {featured.category}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start ${
                        variantColors[featured.tag?.variant || "primary"]
                      }`}
                    >
                      {featured.tag?.text || "Featured"}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4 leading-tight">
                      {featured.title || "Featured Article"}
                    </h2>
                    <p className="text-neutral-600 leading-relaxed mb-6">
                      {featured.excerpt || "No excerpt available."}
                    </p>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 text-sm">
                        {featured.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">
                          {featured.author}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {featured.date} · {featured.readTime}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="md"
                      className="self-start bg-primary-600 hover:bg-primary-700 text-white font-bold"
                      onClick={() =>
                        window.open(
                          `/blog/${featured.slug || featured.id}`,
                          "_blank",
                        )
                      }
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  activeCategory === cat
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Post grid */}
          {filtered.length > 0 ? (
            <>
              <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
                {filtered.map((post) => (
                  <Card
                    key={post.id}
                    className="bg-white border-neutral-100 hover:shadow-lg hover:border-primary-200 transition-all flex flex-col cursor-pointer"
                    onClick={() =>
                      window.open(`/blog/${post.slug || post.id}`, "_blank")
                    }
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
                              {![
                                "Product",
                                "Finance",
                                "Security",
                                "Community",
                                "Company",
                              ].includes(post.category) && "📝"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              variantColors[post.tag?.variant || "primary"]
                            }`}
                          >
                            {post.tag?.text || "Article"}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {post.readTime}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-neutral-900 mb-2 leading-snug flex-1">
                          {post.title || "Untitled Post"}
                        </h3>
                        <p className="text-sm text-neutral-500 leading-relaxed mb-5 line-clamp-3">
                          {post.excerpt || "No excerpt available."}
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
                          <button
                            className="text-primary-600 hover:text-primary-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `/blog/${post.slug || post.id}`,
                                "_blank",
                              );
                            }}
                          >
                            <Icon name="arrowRight" className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </Grid>

              {/* Load More Button */}
              {pagination.hasMore && (
                <div className="text-center mt-10">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        offset: prev.offset + prev.limit,
                      }))
                    }
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
                  setSearchQuery("");
                  setActiveCategory("All");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Container>
      </Section>

      {/* Newsletter */}
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
              onSubmit={handleNewsletterSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={isNewsletterLoading}
                className="flex-1 px-4 py-3 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                type="submit"
                size="md"
                disabled={isNewsletterLoading || !newsletterEmail.trim()}
                className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-6 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNewsletterLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-700 mr-2" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe"
                )}
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
