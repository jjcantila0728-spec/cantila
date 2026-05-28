/* ============================================================
   Status page layout.

   Renders OUTSIDE the (console) route group so the public status URL
   doesn't carry the operator's Console chrome (sidebar, topbar,
   account widget). The layout is intentionally minimal — a centred
   container with the brand ambient glow.
   ============================================================ */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cantila — Status",
  description:
    "Live operational status of Cantila's data plane, deploy pipeline, mail, SMS and registrar.",
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="glow-ember pointer-events-none fixed inset-x-0 top-0 z-0 h-72" />
      <main className="relative z-10 mx-auto w-full max-w-[1080px] px-4 py-12 sm:px-6 lg:px-9">
        {children}
      </main>
      <footer className="relative z-10 mx-auto w-full max-w-[1080px] px-4 pb-10 pt-4 sm:px-6 lg:px-9">
        <div className="border-t border-border-soft pt-5 text-2xs text-ink-faint">
          <span className="font-mono">cantila.app/status</span>
        </div>
      </footer>
    </div>
  );
}
