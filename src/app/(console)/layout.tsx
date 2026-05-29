import ConsoleShell from "@/components/ConsoleShell";
import Topbar from "@/components/Topbar";
import ViewingAsBanner from "@/components/ViewingAsBanner";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import BrandingProvider from "@/lib/branding-context";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandingProvider>
      {/* ConsoleShell owns the layout chrome — desktop sidebar, ambient
          glow, and the mobile PUSH drawer that shifts this content to the
          right instead of overlaying it. */}
      <ConsoleShell>
        <Topbar />
        {/* Plan §5.4 / v1.18 — verify-email banner. Renders only for
            session callers whose `emailVerifiedAt` is null. Short-
            circuits to null for API-key callers (no user identity) and
            already-verified users. */}
        <VerifyEmailBanner />
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
      </ConsoleShell>
    </BrandingProvider>
  );
}
