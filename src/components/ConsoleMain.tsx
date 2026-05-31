"use client";

import { usePathname } from "next/navigation";

/* ============================================================
   Route-aware page container.

   Most console pages render inside a centered 1320px column with
   generous padding + the footer. The workspace route
   (/@handle/<project>) is a VS Code-style 4-column layout that must
   fill the screen, so it breaks out to full-bleed: full width (minus
   the sidebar column the shell already reserves), a thin gutter, and
   no footer. Everything else is unchanged.
   ============================================================ */
export default function ConsoleMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  // Exactly /@handle/<project> — the workspace. (@-prefixed, two segments.)
  const isWorkspace = /^\/@[^/]+\/[^/]+\/?$/.test(pathname);

  if (isWorkspace) {
    return <main className="w-full px-2 pb-2 pt-1.5 sm:px-3">{children}</main>;
  }

  return (
    <>
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
    </>
  );
}
