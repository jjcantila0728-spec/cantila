/* ============================================================
   Marketing route-group layout.

   Wraps every public marketing page (landing, /products/*,
   /pricing, /mcp, /about, /contact, /changelog) in the light
   surface defined in brand/identity.md §2.5 and a persistent
   header + footer.

   The (legal) and (docs) groups have their own layouts but
   reuse the same MarketingHeader + MarketingFooter so the
   nav stays identical across the public surface.
   ============================================================ */

import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import "./marketing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-light min-h-screen bg-light-bg text-light-ink">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
