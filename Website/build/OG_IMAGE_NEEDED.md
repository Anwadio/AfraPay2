## OG Image Requirements

Place your production Open Graph sharing image at:
  `public/og-image.png`

Recommended dimensions: **1200 × 630 px** (landscape)

The image should:
- Show the AfraPay logo and brandmark
- Include the tagline: "Secure Payments Across Africa"
- Use brand colours: primary #0066cc, secondary gradient
- Be under 300 KB (optimised PNG or WebP via og:image:type)

This image is referenced in:
- `public/index.html`  (property="og:image")
- `src/components/seo/SEOHead.jsx`  (DEFAULT_OG_IMAGE constant)

Until the image is created, social previews will fall back to
the site favicon.
