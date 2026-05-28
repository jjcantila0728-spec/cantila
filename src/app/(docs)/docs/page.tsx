import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOCS_NAV } from "@/data/docs-nav";

export const metadata = {
  title: "Docs · Cantila",
  description:
    "Cantila docs — getting started, Chat Deploy, the CLI, the MCP server, auto-wired services, and billing.",
};

export default function DocsHome() {
  return (
    <>
      <p className="font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
        Cantila docs
      </p>
      <h1 className="mb-4 mt-3 font-display text-4xl font-semibold tracking-cantila-tighter text-light-ink">
        How to ship on Cantila.
      </h1>
      <p className="max-w-prose text-[15px] leading-relaxed text-light-ink-dim">
        Instructive. Verb-led. Examples before explanation. Skim the groups
        in the sidebar; deep-link any heading you want to share. If
        something is missing,{" "}
        <Link href="/contact" className="text-ember-on-light hover:underline">
          tell JJ
        </Link>
        .
      </p>

      <div className="mt-12 space-y-10">
        {DOCS_NAV.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-4 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
              {group.heading}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.pages
                .filter((p) => p.slug !== "/docs")
                .map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={p.slug}
                      className="group block rounded-2xl border border-light-border bg-light-bg p-5 transition-colors hover:border-light-ink-faint"
                    >
                      <p className="font-display text-base font-semibold text-light-ink">
                        {p.title}
                      </p>
                      {p.description && (
                        <p className="mt-1 text-sm text-light-ink-dim">
                          {p.description}
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-cantila-kv text-ember-on-light">
                        Read
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
