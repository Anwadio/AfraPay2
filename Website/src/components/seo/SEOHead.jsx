/**
 * SEOHead — zero-dependency per-page SEO manager.
 *
 * Uses React useEffect to imperatively update <head> so every page
 * gets its own unique title, description, canonical URL, Open Graph,
 * Twitter Card, and JSON-LD structured data without any extra library.
 *
 * Usage:
 *   <SEOHead
 *     title="Pricing Plans"
 *     description="Find the AfraPay plan that fits your needs..."
 *     keywords="payments, Africa, fintech, pricing"
 *     structuredData={myJsonLdObject}
 *   />
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// ── Constants ──────────────────────────────────────────────────────────────
export const SITE_BASE_URL = "https://www.afrapayafrica.com";
export const SITE_NAME = "AfraPay";
export const DEFAULT_TITLE = "AfraPay – Secure Payments Across Africa";
export const DEFAULT_DESCRIPTION =
  "AfraPay enables secure global payments, business tills, and fast mobile transfers across Africa. Send, receive, and manage money with confidence.";
export const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/og-image.png`;
export const TWITTER_HANDLE = "@AfraPay";

// ── Helper: upsert a <meta> element ───────────────────────────────────────
function setMeta(attrName, attrValue, content) {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// ── Helper: upsert a <link> element ───────────────────────────────────────
function setLink(rel, href, extra = {}) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
}

// ── Helper: upsert a <script type="application/ld+json"> by id ────────────
function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (data) {
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data, null, 0);
  } else if (el) {
    el.remove();
  }
}

// ── Component ──────────────────────────────────────────────────────────────
const SEOHead = ({
  /** Page title (without site suffix — suffix is appended automatically) */
  title,
  /** Meta description — 150-160 characters recommended */
  description = DEFAULT_DESCRIPTION,
  /** Comma-separated keyword string */
  keywords,
  /** Override the canonical URL (defaults to current path) */
  canonicalPath,
  /** og:type — "website" for most pages, "article" for blog posts */
  ogType = "website",
  /** Absolute URL for the social sharing image (1200×630 recommended) */
  ogImage = DEFAULT_OG_IMAGE,
  /** Twitter card style */
  twitterCard = "summary_large_image",
  /** Set true for auth/dashboard pages that must not be indexed */
  noIndex = false,
  /** JSON-LD structured data object or array of objects */
  structuredData = null,
}) => {
  const { pathname } = useLocation();

  const resolvedCanonical = canonicalPath
    ? `${SITE_BASE_URL}${canonicalPath}`
    : `${SITE_BASE_URL}${pathname}`;

  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;

  useEffect(() => {
    // ── <title> ─────────────────────────────────────────────────────
    document.title = fullTitle;

    // ── Core meta ───────────────────────────────────────────────────
    setMeta("name", "description", description);
    setMeta(
      "name",
      "robots",
      noIndex
        ? "noindex, nofollow"
        : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    );
    if (keywords) setMeta("name", "keywords", keywords);

    // ── Canonical ───────────────────────────────────────────────────
    setLink("canonical", resolvedCanonical);

    // ── Open Graph ──────────────────────────────────────────────────
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", resolvedCanonical);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "en_US");

    // ── Twitter Card ────────────────────────────────────────────────
    setMeta("name", "twitter:card", twitterCard);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
    setMeta("name", "twitter:site", TWITTER_HANDLE);
    setMeta("name", "twitter:creator", TWITTER_HANDLE);

    // ── JSON-LD structured data ──────────────────────────────────────
    setJsonLd("seo-page-schema", structuredData);
  }, [
    fullTitle,
    description,
    keywords,
    noIndex,
    resolvedCanonical,
    ogType,
    ogImage,
    twitterCard,
    structuredData,
  ]);

  return null;
};

export default SEOHead;
