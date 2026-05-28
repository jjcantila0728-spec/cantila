/* ============================================================
   /products — index page that lists the eight Cantila X products.
   Lives on the marketing apex (cantila.app/products). Each card
   links to the corresponding /products/[slug] detail page.
   ============================================================ */

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Rocket } from "lucide-react";
import { PRODUCTS } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: "Products · Cantila",
  description:
    "Eight Cantila products in one platform: hosting, chat deploy, databases, domains, agents, automations, mail, and SMS.",
};

const PHASE_LABEL: Record<string, string> = {
  live: "Live",
  "phase-2": "Phase 2",
  "phase-3": "Phase 3",
};

const PHASE_TONE: Record<string, string> = {
  live: "border-live/30 bg-live/10 text-live",
  "phase-2": "border-warn/30 bg-warn/10 text-warn",
  "phase-3": "border-warn/30 bg-warn/10 text-warn",
};

export default function ProductsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
      <header className="mb-12 max-w-2xl">
        <p className="font-mono text-2xs uppercase tracking-cantila-kv text-ember">
          Product family
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-cantila-tighter text-ink sm:text-5xl">
          Eight products. One platform. One bill.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-dim">
          Cantila replaces the six-vendor stack most builders end up with —
          hosting, chat deploy, databases, domains, agents, automations,
          mail, and SMS — and ships them as one product surface with one
          login, one console, and one invoice.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="panel group flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-lift"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-base font-semibold text-ink">
                    {p.name}
                  </h2>
                  <span
                    className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-cantila-kv ${PHASE_TONE[p.phase]}`}
                  >
                    {PHASE_LABEL[p.phase]}
                  </span>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-sm leading-snug text-ink-dim">{p.short}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-14 panel dot-grid flex flex-col items-center justify-center gap-3 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember/10 text-ember">
          <Rocket className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <p className="font-display text-lg font-semibold text-ink">
          Ready to ship?
        </p>
        <p className="max-w-md text-sm text-ink-dim">
          Cantila Deploy detects your stack, builds it, and hands back a
          live URL. Free hobby tier — start without a card.
        </p>
        <Link
          href="/signup"
          className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
        >
          <Rocket className="h-4 w-4" strokeWidth={2.4} />
          Create your account
        </Link>
      </div>
    </div>
  );
}
