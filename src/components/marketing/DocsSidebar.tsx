"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "@/data/docs-nav";

export default function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs navigation" className="space-y-6">
      {DOCS_NAV.map((group) => (
        <div key={group.heading}>
          <p className="mb-2 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
            {group.heading}
          </p>
          <ul className="space-y-0.5">
            {group.pages.map((page) => {
              const active = pathname === page.slug;
              return (
                <li key={page.slug}>
                  <Link
                    href={page.slug}
                    className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-ember-on-light/10 font-semibold text-ember-on-light"
                        : "text-light-ink-dim hover:bg-light-surface hover:text-light-ink"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
