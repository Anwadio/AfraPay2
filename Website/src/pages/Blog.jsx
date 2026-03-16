import React, { useState } from "react";
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

const CATEGORIES = [
  "All",
  "Product",
  "Finance",
  "Security",
  "Community",
  "Company",
];

const POSTS = [
  {
    id: 1,
    category: "Product",
    title: "Introducing AfraPay 2.0: Faster, Smarter, More Secure",
    excerpt:
      "We've completely rebuilt our core payment engine from the ground up. Here's what's new and why it matters for millions of South Sudanese users.",
    author: "Amina Hassan",
    authorRole: "CTO & Co-founder",
    avatar: "AH",
    date: "March 10, 2026",
    readTime: "5 min read",
    featured: true,
    tag: { text: "New Release", variant: "primary" },
  },
  {
    id: 2,
    category: "Finance",
    title: "Understanding Mobile Money in South Sudan: A Complete Guide",
    excerpt:
      "Mobile money is reshaping how South Sudanese families manage their finances. We break down everything you need to know — from sending money to saving for the future.",
    author: "Kwame Asante",
    authorRole: "CEO & Co-founder",
    avatar: "KA",
    date: "March 6, 2026",
    readTime: "8 min read",
    featured: false,
    tag: { text: "Guide", variant: "secondary" },
  },
  {
    id: 3,
    category: "Security",
    title: "How AfraPay Protects Your Money: An Inside Look",
    excerpt:
      "From 256-bit encryption to AI-driven fraud detection, we explain the multiple layers of security that keep your funds safe 24/7.",
    author: "Joseph Mbeki",
    authorRole: "Head of Security",
    avatar: "JM",
    date: "February 28, 2026",
    readTime: "6 min read",
    featured: false,
    tag: { text: "Security", variant: "success" },
  },
  {
    id: 4,
    category: "Community",
    title: "AfraPay in Wau: Bringing Digital Finance to Western Bahr el Ghazal",
    excerpt:
      "We recently opened our second branch in Wau. Read about how local traders and farmers are using AfraPay to grow their businesses.",
    author: "Fatima Al-Rashid",
    authorRole: "Head of Operations",
    avatar: "FA",
    date: "February 20, 2026",
    readTime: "4 min read",
    featured: false,
    tag: { text: "Community", variant: "warning" },
  },
  {
    id: 5,
    category: "Finance",
    title: "5 Smart Ways to Save Money Using AfraPay Goals",
    excerpt:
      "Our built-in savings targets feature can help you build an emergency fund, save for school fees, or grow a small business — step by step.",
    author: "Amina Hassan",
    authorRole: "CTO & Co-founder",
    avatar: "AH",
    date: "February 14, 2026",
    readTime: "5 min read",
    featured: false,
    tag: { text: "Tips", variant: "primary" },
  },
  {
    id: 6,
    category: "Company",
    title: "AfraPay Raises Series A to Expand Across East Africa",
    excerpt:
      "We're thrilled to announce our $25M Series A funding round led by Africa-focused investors. Here's our plan for the next chapter.",
    author: "Kwame Asante",
    authorRole: "CEO & Co-founder",
    avatar: "KA",
    date: "February 5, 2026",
    readTime: "3 min read",
    featured: false,
    tag: { text: "Company News", variant: "secondary" },
  },
  {
    id: 7,
    category: "Product",
    title: "AfraPay for Business: Multi-User Accounts & Payroll",
    excerpt:
      "Managing staff payments just got easier. Our new business suite lets you run payroll, set spending limits, and generate invoices — all in one place.",
    author: "Joseph Mbeki",
    authorRole: "Head of Product",
    avatar: "JM",
    date: "January 28, 2026",
    readTime: "7 min read",
    featured: false,
    tag: { text: "Business", variant: "primary" },
  },
  {
    id: 8,
    category: "Security",
    title: "Two-Factor Authentication: Why You Should Enable It Today",
    excerpt:
      "2FA dramatically reduces the risk of account compromise. We walk through how to enable it on AfraPay in under 60 seconds.",
    author: "Fatima Al-Rashid",
    authorRole: "Head of Operations",
    avatar: "FA",
    date: "January 15, 2026",
    readTime: "3 min read",
    featured: false,
    tag: { text: "Security Tips", variant: "success" },
  },
];

const variantColors = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
};

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const featured = POSTS.find((p) => p.featured);
  const filtered = POSTS.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && !p.featured;
  });

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Blog – Fintech Insights & News from Africa"
        description="Read the latest articles on mobile money, personal finance, security, and fintech innovation across Africa from the AfraPay team."
        keywords="AfraPay blog, fintech Africa, mobile money news, Africa payments, financial inclusion articles"
        structuredData={SCHEMA_BLOG}
      />
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
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
                  {/* colour block stand-in for a cover image */}
                  <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 min-h-[280px] lg:min-h-full flex items-center justify-center p-12">
                    <div className="text-center text-white">
                      <div className="text-7xl mb-4">🚀</div>
                      <p className="text-primary-200 text-sm font-medium uppercase tracking-wider">
                        {featured.category}
                      </p>
                    </div>
                  </div>

                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start ${
                        variantColors[featured.tag.variant]
                      }`}
                    >
                      {featured.tag.text}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4 leading-tight">
                      {featured.title}
                    </h2>
                    <p className="text-neutral-600 leading-relaxed mb-6">
                      {featured.excerpt}
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
            {CATEGORIES.map((cat) => (
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
            <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
              {filtered.map((post) => (
                <Card
                  key={post.id}
                  className="bg-white border-neutral-100 hover:shadow-lg hover:border-primary-200 transition-all flex flex-col"
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* Colour cover */}
                    <div className="h-40 bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center rounded-t-xl">
                      <span className="text-4xl">
                        {post.category === "Product" && "🛠️"}
                        {post.category === "Finance" && "💰"}
                        {post.category === "Security" && "🔐"}
                        {post.category === "Community" && "🤝"}
                        {post.category === "Company" && "🏢"}
                      </span>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            variantColors[post.tag.variant]
                          }`}
                        >
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
