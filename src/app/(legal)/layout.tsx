/* ============================================================
   Legal route-group layout. Shares the marketing chrome and
   uses the same light surface, but narrower max-width so the
   prose reads at a comfortable line length.
   ============================================================ */

import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import "../(marketing)/marketing.css";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-light min-h-screen bg-light-bg text-light-ink">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
