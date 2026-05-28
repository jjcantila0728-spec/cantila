/* ============================================================
   Legal route-group layout. Shares the marketing chrome and
   uses the same light surface, but narrower max-width so the
   prose reads at a comfortable line length.

   Injects per-page BreadcrumbList JSON-LD (rooted Cantila →
   Legal → <doc>) and renders the visible Breadcrumbs trail.
   The current pathname is read from the `x-pathname` header
   set by src/middleware.ts.
   ============================================================ */

import { headers } from "next/headers";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Breadcrumbs, {
  type BreadcrumbItem,
} from "@/components/marketing/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import "../(marketing)/marketing.css";

const LEGAL_TITLES: Record<string, string> = {
  "/legal/privacy": "Privacy policy",
  "/legal/terms": "Terms of service",
  "/legal/aup": "Acceptable use policy",
  "/legal/dpa": "Data processing agreement",
  "/legal/subprocessors": "Subprocessors",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "/legal";
  const title = LEGAL_TITLES[pathname];

  const trail: BreadcrumbItem[] = [
    { name: "Cantila", path: "/" },
    { name: "Legal", path: "/legal/privacy" },
  ];
  if (title) trail.push({ name: title, path: pathname });

  return (
    <div className="marketing-light min-h-screen bg-light-bg text-light-ink">
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-light-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-light-bg"
      >
        Skip to content
      </a>
      <JsonLd payload={breadcrumbJsonLd(trail)} />
      <MarketingHeader />
      <main
        id="legal-content"
        className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6"
      >
        <Breadcrumbs trail={trail} />
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
