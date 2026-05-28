/* ============================================================
   /legal — index page that lists every legal document Cantila
   publishes. Lives under the (legal) route group so it inherits
   the same light-mode chrome as the individual policy pages.
   ============================================================ */

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Legal · Cantila",
  description:
    "Cantila's terms of service, privacy policy, acceptable use policy, DPA, and subprocessor list.",
};

const DOCS: Array<{
  href: string;
  title: string;
  summary: string;
}> = [
  {
    href: "/legal/terms",
    title: "Terms of service",
    summary:
      "The agreement between you and Cantila. Covers accounts, plans, content, IP, termination, and dispute resolution.",
  },
  {
    href: "/legal/privacy",
    title: "Privacy policy",
    summary:
      "What data Cantila collects, why, how long we keep it, and your rights as a data subject under GDPR and CCPA.",
  },
  {
    href: "/legal/aup",
    title: "Acceptable use policy",
    summary:
      "What you can't run on Cantila — spam, abuse, illegal content, and the categories that get an account suspended.",
  },
  {
    href: "/legal/dpa",
    title: "Data processing agreement",
    summary:
      "The DPA for customers processing personal data through Cantila. Cantila is the processor; you're the controller.",
  },
  {
    href: "/legal/subprocessors",
    title: "Subprocessors",
    summary:
      "The third parties Cantila uses to deliver the service — Hetzner, Stripe, the registrar backend, and any future carriers.",
  },
];

export default function LegalIndexPage() {
  return (
    <article className="prose-legal">
      <p className="font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
        Legal
      </p>
      <h1 className="mb-2 mt-3 font-display text-4xl font-semibold tracking-cantila-tighter text-light-ink">
        Legal documents
      </h1>
      <p className="font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
        Effective 2026-05-28
      </p>
      <p className="mt-6 text-[15px] leading-relaxed text-light-ink-dim">
        Every Cantila legal document on one page. The terms apply to all
        accounts; the DPA only applies if you're processing personal data
        through Cantila on behalf of others. Last reviewed 2026-05-28.
      </p>

      <ul className="mt-8 space-y-3 not-prose">
        {DOCS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="group flex items-start gap-4 rounded-xl border border-light-border bg-light-surface px-5 py-4 transition-colors hover:border-light-ink-faint hover:bg-light-surface-2"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold text-light-ink">
                  {d.title}
                </h2>
                <p className="mt-1 text-sm leading-snug text-light-ink-dim">
                  {d.summary}
                </p>
              </div>
              <ArrowUpRight
                className="h-5 w-5 shrink-0 text-light-ink-faint transition-colors group-hover:text-ember-on-light"
                strokeWidth={2}
              />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm text-light-ink-faint">
        Questions about any of these documents? Email{" "}
        <a href="mailto:legal@cantila.app">legal@cantila.app</a>. Security
        issues:{" "}
        <a href="mailto:security@cantila.app">security@cantila.app</a>.
      </p>
    </article>
  );
}
