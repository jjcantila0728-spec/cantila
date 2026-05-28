/* ============================================================
   SEO helpers — one canonical builder for per-page metadata
   plus the JSON-LD payloads the SeoAgent will validate against.

   Every public-face page calls `buildPageMetadata({ ... })`
   instead of hand-rolling a `metadata` literal. Result: every
   page gets canonical URL, OpenGraph (title/desc/url/image),
   Twitter card, and consistent template — no per-page drift.

   The JSON-LD builders return objects to be serialised inside
   a `<JsonLd>` component (see ./components/JsonLd.tsx).
   ============================================================ */

import type { Metadata } from "next";
import { PRODUCTS } from "./site-meta";

const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
export const SITE_ORIGIN = `https://${PUBLIC_HOST}`;

export interface PageMetadataInput {
  /** Page title — will be templated as "<title> · Cantila" via root layout
   *  unless `absolute` is true. Keep within 40-60 characters for SEO. */
  title: string;
  /** Page description — 120-160 characters is the SEO sweet spot. */
  description: string;
  /** Path relative to the apex (must start with `/`). Used for the canonical
   *  URL and OG `url`. */
  path: string;
  /** Optional per-page OG image. Defaults to the site-wide
   *  /brand/social/og-default.svg from the root layout. */
  image?: string;
  /** When true, do not apply the "%s · Cantila" template. */
  absolute?: boolean;
  /** Override OG `type` (defaults to "website"; use "article" for /docs/*). */
  type?: "website" | "article";
  /** ISO 8601 publish date for article-type pages. */
  publishedTime?: string;
  /** Set when this page should not be indexed (e.g. /forgot, error pages). */
  noindex?: boolean;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const {
    title,
    description,
    path,
    image,
    absolute = false,
    type = "website",
    publishedTime,
    noindex = false,
  } = input;

  const url = `${SITE_ORIGIN}${path}`;
  const ogImage = image ?? "/brand/social/og-default.svg";

  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: "Cantila",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime && type === "article"
        ? { publishedTime }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/* ============================================================
   JSON-LD builders.

   Each returns a `Record<string, unknown>` — plain JSON-Lable
   objects. Render via `<JsonLd payload={...} />`.
   ============================================================ */

export function orgJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cantila",
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/brand/favicons/favicon.svg`,
    sameAs: [
      "https://github.com/jjcantila0728-spec",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "founder@cantila.app",
        availableLanguage: ["en"],
      },
    ],
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Cantila",
    url: SITE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/docs?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cantila",
    operatingSystem: "Web",
    applicationCategory: "DeveloperApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "The VPS-powered hosting cloud where websites, apps, and AI agents ship from a single chat — with the domain, email, SMS, and database already wired in.",
  };
}

export function productJsonLd(slug: string): Record<string, unknown> | null {
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short,
    brand: { "@type": "Brand", name: "Cantila" },
    url: `${SITE_ORIGIN}/products/${product.slug}`,
    image: `${SITE_ORIGIN}/brand/social/og-default.svg`,
  };
}

export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_ORIGIN}${t.path}`,
    })),
  };
}

export interface FaqEntry {
  q: string;
  a: string;
}

export function faqJsonLd(items: FaqEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}): Record<string, unknown> {
  const url = `${SITE_ORIGIN}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: input.title,
    description: input.description,
    url,
    author: { "@type": "Organization", name: "Cantila" },
    publisher: {
      "@type": "Organization",
      name: "Cantila",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/brand/favicons/favicon.svg`,
      },
    },
    datePublished: input.datePublished ?? "2026-05-28",
    dateModified: input.dateModified ?? "2026-05-28",
    mainEntityOfPage: url,
  };
}
