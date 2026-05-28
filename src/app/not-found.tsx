/* ============================================================
   404 — host-aware.

   The marketing host (cantila.app) and the console host
   (console.cantila.app) share one Next.js app. A 404 on the
   public face shouldn't look like a dashboard error; a 404
   inside the dashboard shouldn't dump a visitor on the
   marketing chrome. `headers()` resolves the actual host at
   request time and we render the matching surface.
   ============================================================ */

import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ArrowRight, BookOpen, Tag, Plug } from "lucide-react";
import { BrandMark } from "@/components/Sidebar";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import "./(marketing)/marketing.css";

const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
const CONSOLE_HOST =
  process.env.CANTILA_CONSOLE_HOST ?? `console.${PUBLIC_HOST}`;

export const metadata = {
  title: "Not found · Cantila",
  description: "The page you asked for doesn't exist on cantila.app.",
  robots: { index: false, follow: true },
};

const POPULAR_LINKS = [
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/mcp", label: "Cantila MCP", icon: Plug },
];

export default function NotFound() {
  const host = (headers().get("host") ?? PUBLIC_HOST).toLowerCase();
  const isConsole = host === CONSOLE_HOST || host.startsWith("console.");

  if (isConsole) {
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
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-lg bg-ember px-5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Console
          </Link>
        </div>
      </div>
    );
  }

  // Apex / public face — marketing chrome, light surface.
  return (
    <div className="marketing-light min-h-screen bg-light-bg text-light-ink">
      <MarketingHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 py-24 text-center sm:px-6">
        <BrandMark size={48} />
        <p className="mt-8 font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
          404 · route not found
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-cantila-tighter text-light-ink sm:text-4xl">
          Nothing deployed at this URL.
        </h1>
        <p className="mt-3 max-w-md text-base text-light-ink-dim">
          The page you asked for doesn&apos;t exist on cantila.app. If you
          followed a link from somewhere,{" "}
          <Link
            href="/contact"
            className="text-ember-on-light hover:underline"
          >
            tell JJ
          </Link>{" "}
          so we can fix the source.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-ember-on-light px-5 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(212,78,33,0.6)] transition-colors hover:bg-[#e85f2a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-light-border bg-light-bg px-5 text-sm font-medium text-light-ink transition-colors hover:border-light-ink-faint"
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-14 w-full max-w-md">
          <p className="font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
            Popular destinations
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {POPULAR_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-light-border bg-light-bg text-sm font-medium text-light-ink transition-colors hover:border-light-ink-faint"
              >
                <Icon className="h-4 w-4 text-ember-on-light" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
