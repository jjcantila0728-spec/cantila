/* ============================================================
   robots.txt — the Cantila Console is a private operator surface
   and should never be indexed. The only public route is the
   status page, so search crawlers are allowed there and nowhere
   else. Next.js serves this at /robots.txt.
   ============================================================ */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/status",
        disallow: "/",
      },
    ],
  };
}
