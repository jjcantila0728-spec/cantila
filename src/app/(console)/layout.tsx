import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ViewingAsBanner from "@/components/ViewingAsBanner";
import BrandingProvider from "@/lib/branding-context";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandingProvider>
      <div className="relative min-h-screen">
        {/* ambient ember glow anchored top-left of the canvas */}
        <div className="glow-ember pointer-events-none fixed inset-x-0 top-0 z-0 h-72" />

        <Sidebar />

        <div className="relative z-10 lg:pl-[240px]">
          <Topbar />
          {/* Plan §5.5 — white-label. Renders only when the session is
              currently scoped to a sub-account reached via parenthood. */}
          <ViewingAsBanner />
          <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 lg:px-9">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-[1320px] px-4 pb-10 pt-4 sm:px-6 lg:px-9">
            <div className="flex flex-col gap-2 border-t border-border-soft pt-5 text-2xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono">
                Cantila Console · MVP prototype · v0.2
              </span>
              <span>
                Data plane: Hetzner — fsn1 · hel1 · ash · All systems operational
              </span>
            </div>
          </footer>
        </div>
      </div>
    </BrandingProvider>
  );
}
