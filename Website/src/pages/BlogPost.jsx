/* eslint-disable no-console */
/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Section, Button, Badge } from "../components";
import { Icon } from "../components/common/Icons";
import SEOHead from "../components/seo/SEOHead";
import { blogAPI } from "../services/api";

const variantColors = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
};

// Simple markdown formatter component
const FormattedContent = ({ content }) => {
  const formatContent = (text) => {
    if (!text) return [];

    // Split by double newlines to create paragraphs
    const paragraphs = text.split("\n\n").filter(Boolean);

    return paragraphs.map((paragraph, index) => {
      // Check if it's a heading
      if (paragraph.startsWith("### ")) {
        return (
          <h3
            key={index}
            className="text-xl font-bold text-neutral-900 mt-8 mb-4"
          >
            {paragraph.replace("### ", "")}
          </h3>
        );
      }

      if (paragraph.startsWith("## ")) {
        return (
          <h2
            key={index}
            className="text-2xl font-bold text-neutral-900 mt-8 mb-6"
          >
            {paragraph.replace("## ", "")}
          </h2>
        );
      }

      if (paragraph.startsWith("# ")) {
        return (
          <h1
            key={index}
            className="text-3xl font-bold text-neutral-900 mt-8 mb-6"
          >
            {paragraph.replace("# ", "")}
          </h1>
        );
      }

      // Process inline formatting
      const formatInlineText = (text) => {
        // Split text and process **bold** and *italic* and `code`
        const parts = [];
        let currentText = text;
        let key = 0;

        // Replace **bold** text
        const boldRegex = /\*\*(.*?)\*\*/g;
        currentText = currentText.replace(boldRegex, (match, content) => {
          return `<strong>${content}</strong>`;
        });

        // Replace `code` text
        const codeRegex = /`(.*?)`/g;
        currentText = currentText.replace(codeRegex, (match, content) => {
          return `<code className="bg-neutral-100 px-1 py-0.5 rounded text-sm font-mono">${content}</code>`;
        });

        // Create JSX from formatted text
        return <span dangerouslySetInnerHTML={{ __html: currentText }} />;
      };

      // Check if it's a list item
      if (paragraph.startsWith("- ")) {
        const listItems = paragraph
          .split("\n")
          .filter((item) => item.startsWith("- "));
        return (
          <ul key={index} className="list-disc list-inside space-y-2 my-4">
            {listItems.map((item, itemIndex) => (
              <li key={itemIndex} className="text-neutral-700">
                {formatInlineText(item.replace("- ", ""))}
              </li>
            ))}
          </ul>
        );
      }

      // Regular paragraph
      return (
        <p key={index} className="text-neutral-700 leading-relaxed mb-6">
          {formatInlineText(paragraph)}
        </p>
      );
    });
  };

  return <div className="space-y-4">{formatContent(content)}</div>;
};

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the blog post by ID/slug
        const response = await blogAPI.getPostBySlug(id);

        if (response.success) {
          setPost(response.data.post);

          // Fetch related posts
          if (response.data.post.category) {
            const relatedResponse = await blogAPI.getPosts({
              category: response.data.post.category,
              limit: 3,
            });

            if (relatedResponse.success) {
              // Filter out the current post
              const related = relatedResponse.data.posts.filter(
                (p) => p.id !== id,
              );
              setRelatedPosts(related.slice(0, 3));
            }
          }
        } else {
          setError("Article not found");
        }
      } catch (err) {
        console.error("Error fetching blog post:", err);
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading article...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📄</div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            Article not found
          </h3>
          <p className="text-neutral-600 mb-6">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Button
            onClick={() => navigate("/blog")}
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEOHead
        title={`${post.title} - AfraPay Blog`}
        description={post.excerpt}
        keywords={`AfraPay blog, ${post.category}, fintech Africa, ${post.title}`}
      />

      {/* Back Navigation */}
      <Section
        spacing="sm"
        className="bg-neutral-50 border-b border-neutral-100"
      >
        <Container>
          <Button
            variant="ghost"
            onClick={() => navigate("/blog")}
            className="text-neutral-600 hover:text-neutral-900"
          >
            <Icon name="arrowLeft" className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Container>
      </Section>

      {/* Article Header */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="max-w-4xl mx-auto">
            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-6">
              <Badge
                className={`${variantColors[post.tag?.variant || "primary"]}`}
              >
                {post.category}
              </Badge>
              <span className="text-neutral-400 text-sm">{post.readTime}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-xl text-neutral-600 leading-relaxed mb-8">
              {post.excerpt}
            </p>

            {/* Author & Date */}
            <div className="flex items-center gap-4 pb-8 border-b border-neutral-100">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600">
                {post.avatar}
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{post.author}</p>
                <p className="text-sm text-neutral-500">
                  Published on{" "}
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Featured Image */}
      {post.imageUrl && (
        <Section spacing="none">
          <Container>
            <div className="max-w-4xl mx-auto">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-64 md:h-96 object-cover rounded-lg shadow-sm"
              />
            </div>
          </Container>
        </Section>
      )}

      {/* Article Content */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              {/* Render article content with proper markdown formatting */}
              <div className="text-neutral-700 leading-relaxed">
                {post.content ? (
                  <FormattedContent content={post.content} />
                ) : (
                  <p>{post.excerpt}</p>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <Section spacing="xl" className="bg-neutral-50">
          <Container>
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-neutral-900 mb-8">
                Related Articles
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <div
                    key={relatedPost.id}
                    className="bg-white rounded-lg border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() =>
                      navigate(`/blog/${relatedPost.slug || relatedPost.id}`)
                    }
                  >
                    <div className="h-32 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-t-lg flex items-center justify-center">
                      {relatedPost.imageUrl ? (
                        <img
                          src={relatedPost.imageUrl}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <span className="text-3xl text-white">
                          {relatedPost.category === "Product" && "🛠️"}
                          {relatedPost.category === "Finance" && "💰"}
                          {relatedPost.category === "Security" && "🔐"}
                          {relatedPost.category === "Community" && "🤝"}
                          {relatedPost.category === "Company" && "🏢"}
                          📝
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <Badge
                        className={`${variantColors[relatedPost.tag?.variant || "primary"]} mb-2`}
                      >
                        {relatedPost.category}
                      </Badge>
                      <h4 className="font-bold text-neutral-900 mb-2 text-sm leading-tight">
                        {relatedPost.title}
                      </h4>
                      <p className="text-xs text-neutral-500 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Newsletter CTA */}
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

export default BlogPost;
