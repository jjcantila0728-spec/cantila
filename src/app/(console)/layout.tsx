import ConsoleShell from "@/components/ConsoleShell";
import ConsoleMain from "@/components/ConsoleMain";
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
        <ConsoleMain>{children}</ConsoleMain>
      </ConsoleShell>
    </BrandingProvider>
  );
}
