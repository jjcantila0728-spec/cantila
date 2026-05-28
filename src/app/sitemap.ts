/* ============================================================
   sitemap.xml — host-aware.

   The public face (cantila.app) gets a full sitemap covering
   every marketing/docs/legal/auth page. The console host
   returns an empty sitemap (matched by robots.ts disallow).

   Pulls page lists from the same data files the navigation
   uses (`PRODUCTS`, `DOCS_NAV`, `LEGAL_PAGES`) so adding a
   product/doc/legal page doesn't require touching this file —
   the sitemap regenerates from the source of truth on build.
   ============================================================ */

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { PRODUCTS } from "@/lib/site-meta";
import { FLAT_DOCS } from "@/data/docs-nav";

const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
const CONSOLE_HOST =
  process.env.CANTILA_CONSOLE_HOST ?? `console.${PUBLIC_HOST}`;

/** Pages whose meaningful content rarely changes — date-stamped against the
 *  v1.14 plan ship to give Google a real `lastModified` instead of "right
 *  now" on every crawl. The SeoAgent (cantila-control-plane) bumps this
 *  when it detects route changes. */
const SITEMAP_LASTMOD = "2026-05-28";

type SitemapEntry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
  lastModified: string = SITEMAP_LASTMOD,
): SitemapEntry {
  return {
    url: `https://${PUBLIC_HOST}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

const LEGAL_SLUGS = [
  "privacy",
  "terms",
  "aup",
  "dpa",
  "subprocessors",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const host = (headers().get("host") ?? PUBLIC_HOST).toLowerCase();
  const isConsole = host === CONSOLE_HOST || host.startsWith("console.");
  if (isConsole) return [];

  const out: SitemapEntry[] = [
    // top-of-funnel — highest priority
    entry("/", "weekly", 1.0),
    entry("/pricing", "weekly", 0.95),
    entry("/mcp", "weekly", 0.9),

    // company
    entry("/about", "monthly", 0.6),
    entry("/contact", "monthly", 0.5),
    entry("/changelog", "weekly", 0.7),

    // auth (signup is indexed — login/forgot stay out of sitemap but
    // remain crawlable; robots doesn't disallow them)
    entry("/signup", "monthly", 0.7),

    // status (low-volume, public)
    entry("/status", "weekly", 0.4),
  ];

  // Product family — eight pages from PRODUCTS
  for (const product of PRODUCTS) {
    out.push(entry(`/products/${product.slug}`, "monthly", 0.85));
  }

  // Docs — eight pages from FLAT_DOCS. /docs already in the list once.
  for (const doc of FLAT_DOCS) {
    out.push(entry(doc.slug, "monthly", doc.slug === "/docs" ? 0.8 : 0.7));
  }

  // Legal — five pages
  for (const slug of LEGAL_SLUGS) {
    out.push(entry(`/legal/${slug}`, "yearly", 0.3));
  }

  return out;
}
