/* ============================================================
   robots.txt — host-aware.

   `cantila-console` serves two hosts behind one Next.js app:
   - `cantila.app` (apex) is the public marketing/docs/legal/auth
     surface. Crawlers SHOULD index it.
   - `console.cantila.app` is the authenticated operator surface.
     Crawlers should NEVER see it.

   robots.ts runs at request time, so `headers()` resolves the
   actual host the request landed on. Each branch points the
   crawler at the sitemap appropriate for that host.
   ============================================================ */

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
const CONSOLE_HOST =
  process.env.CANTILA_CONSOLE_HOST ?? `console.${PUBLIC_HOST}`;

/** Console-only path prefixes (mirrors src/middleware.ts). Even though the
 *  middleware bounces these from the apex host, listing them here gives
 *  crawlers an explicit signal. */
const CONSOLE_ONLY_PREFIXES = [
  "/dashboard",
  "/projects",
  "/deploy",
  "/templates",
  "/domains",
  "/team",
  "/settings",
  "/billing",
  "/mail",
  "/sms",
  "/monitoring",
  "/databases",
  "/activity",
  "/agents",
  "/capacity",
  "/mailboxes",
  "/nodes",
  "/orgs",
  "/a2p",
  "/automations",
  "/connections",
];

export default function robots(): MetadataRoute.Robots {
  const host = (headers().get("host") ?? PUBLIC_HOST).toLowerCase();
  const isConsole = host === CONSOLE_HOST || host.startsWith("console.");

  if (isConsole) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      // Console host serves no public sitemap.
    };
  }

  // Apex / www / local dev — public face. Index everything except
  // console-only prefixes (middleware would 302 them away anyway, but
  // explicit beats implicit) and the catch-all API proxy.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/logout",
          ...CONSOLE_ONLY_PREFIXES.map((p) => `${p}/`),
          ...CONSOLE_ONLY_PREFIXES,
        ],
      },
    ],
    sitemap: `https://${PUBLIC_HOST}/sitemap.xml`,
    host: `https://${PUBLIC_HOST}`,
  };
}
