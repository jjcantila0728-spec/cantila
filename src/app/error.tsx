/* ============================================================
   Global error boundary for the Next.js App Router.

   Without this file, every runtime error in a route segment makes the
   dev server log "missing required error components, refreshing..." and
   triggers a hard refresh — which masks the actual cause. With this
   boundary in place, the cause is shown inline and `Try again` lets the
   user retry without losing the navigation context.
   ============================================================ */

"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/Sidebar";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the dev console so it's grep-able alongside Next.js logs.
    console.error("[Console error boundary]", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative max-w-lg">
        <BrandMark size={44} />
        <div className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-down/40 bg-down/10 text-down">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-xl font-semibold text-ink">
          Something went wrong rendering this page
        </h1>
        <p className="mt-2 text-sm text-ink-dim">{error.message}</p>
        {error.digest && (
          <p className="mt-1 font-mono text-2xs text-ink-faint">
            digest: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright"
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-4 text-sm text-ink-dim hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Console
          </Link>
        </div>
      </div>
    </div>
  );
}
