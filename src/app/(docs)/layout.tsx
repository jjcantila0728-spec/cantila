/* ============================================================
   Docs route-group layout. Shares the marketing header/footer
   so the public nav is identical, but its body is a two-column
   shell: a sticky left sidebar (DocsSidebar) and a wider
   content well that MDX prose renders into.
   ============================================================ */

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import DocsSidebar from "@/components/marketing/DocsSidebar";
import "../(marketing)/marketing.css";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-light min-h-screen bg-light-bg text-light-ink">
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
