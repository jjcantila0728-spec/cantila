import Link from "next/link";
import { BrandMark } from "@/components/Sidebar";
import { FOOTER_COLUMNS, SITE_TAGLINE } from "@/lib/site-meta";

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-light-border bg-light-surface/50">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 lg:px-9">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5"
              aria-label="Cantila home"
            >
              <BrandMark size={28} />
              <span className="font-display text-lg font-semibold tracking-cantila-display text-light-ink">
                cantila
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-light-ink-dim">
              {SITE_TAGLINE}
            </p>
            <p className="mt-6 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
              Hetzner — fsn1 · All systems operational
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
                {col.heading}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        rel="noreferrer noopener"
                        className="text-sm text-light-ink-dim hover:text-light-ink"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-light-ink-dim hover:text-light-ink"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-light-border-soft pt-6 text-2xs text-light-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono">
            © {year} Cantila. Built on Hetzner, Coolify, and Stripe.
          </span>
          <span>
            <Link href="/legal/privacy" className="hover:text-light-ink">
              Privacy
            </Link>
            {" · "}
            <Link href="/legal/terms" className="hover:text-light-ink">
              Terms
            </Link>
            {" · "}
            <Link href="/legal/dpa" className="hover:text-light-ink">
              DPA
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
