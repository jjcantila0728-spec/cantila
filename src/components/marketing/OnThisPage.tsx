"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Heading = { id: string; text: string; level: 2 | 3 };

/* ------------------------------------------------------------------
   Right-rail "On this page" table of contents.

   Reads the h2/h3 headings inside #docs-content (ids are added at
   build time by rehype-slug). Highlights the section currently in
   view via IntersectionObserver. Re-scans on route change.
   ------------------------------------------------------------------ */
export default function OnThisPage() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = document.getElementById("docs-content");
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]"),
    );
    const found: Heading[] = nodes.map((el) => ({
      id: el.id,
      // rehype-autolink-headings wraps the text in an <a>; innerText is clean.
      text: el.innerText.replace(/#$/, "").trim(),
      level: el.tagName === "H3" ? 3 : 2,
    }));
    setHeadings(found);

    if (found.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-light-border-soft">
        {headings.map((h) => {
          const active = h.id === activeId;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(h.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", `#${h.id}`);
                }}
                className={`-ml-px block border-l-2 leading-snug transition-colors ${
                  h.level === 3 ? "pl-5" : "pl-3"
                } ${
                  active
                    ? "border-ember-on-light font-medium text-ember-on-light"
                    : "border-transparent text-light-ink-dim hover:text-light-ink"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
