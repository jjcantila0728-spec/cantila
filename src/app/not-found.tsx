import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative">
        <BrandMark size={44} />
        <div className="mt-6 font-mono text-5xl font-semibold text-ember">
          404
        </div>
        <h1 className="mt-2 font-display text-xl font-semibold text-ink">
          Nothing deployed here
        </h1>
        <p className="mt-1.5 text-sm text-ink-dim">
          This route isn&apos;t wired to a running app.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Console
        </Link>
      </div>
    </div>
  );
}
