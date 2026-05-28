/* ============================================================
   Docs route-group layout. Shares the marketing header/footer
   so the public nav is identical, but its body is a two-column
   shell: a sticky left sidebar (DocsSidebar) and a wider
   content well that MDX prose renders into.

   Also injects per-page JSON-LD (Article + BreadcrumbList).
   The current pathname is read from the `x-pathname` request
   header set by src/middleware.ts; the page's title and
   description come from FLAT_DOCS so the structured data
   stays in sync with the navigation.
   ============================================================ */

import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Home } from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import DocsSidebar from "@/components/marketing/DocsSidebar";
import JsonLd from "@/components/JsonLd";
import { FLAT_DOCS } from "@/data/docs-nav";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import "../(marketing)/marketing.css";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "/docs";
  const doc = FLAT_DOCS.find((p) => p.slug === pathname);

  // Only inject Article schema on a known doc page. For /docs/* paths we
  // don't recognise (e.g. the docs landing has its own page.tsx and
  // appears here too), we still emit a BreadcrumbList rooted at Docs.
  const payloads: Record<string, unknown>[] = [];
  if (doc) {
    payloads.push(
      articleJsonLd({
        title: `${doc.title} · Cantila docs`,
        description: doc.description ?? doc.title,
        path: doc.slug,
      }),
    );
  }
  const breadcrumb: { name: string; path: string }[] = [
    { name: "Cantila", path: "/" },
    { name: "Docs", path: "/docs" },
  ];
  if (doc && doc.slug !== "/docs") {
    breadcrumb.push({ name: doc.title, path: doc.slug });
  }
  payloads.push(breadcrumbJsonLd(breadcrumb));

  return (
    <div className="marketing-light min-h-screen bg-light-bg text-light-ink">
      <JsonLd payload={payloads} />
      <MarketingHeader />
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 lg:px-9">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Link
                href="/"
                className="mb-4 inline-flex items-center gap-1 text-2xs text-light-ink-faint hover:text-light-ink"
              >
                <Home className="h-3 w-3" />
                Back to cantila.app
                <ChevronRight className="h-3 w-3" />
              </Link>
              <DocsSidebar />
            </div>
          </aside>

          <article className="max-w-[760px]">{children}</article>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
