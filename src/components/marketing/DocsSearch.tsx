"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { FLAT_DOCS, groupOf, type DocPage } from "@/data/docs-nav";

/* ------------------------------------------------------------------
   ⌘K docs search.

   Renders a sidebar trigger that opens a command-palette modal, and
   also listens globally for ⌘K / Ctrl+K. Indexes the docs nav
   (title + description + keywords + group). Client-side and
   dependency-free; body-text search is a future enhancement.
   ------------------------------------------------------------------ */

type Indexed = DocPage & { group?: string; haystack: string };

const INDEX: Indexed[] = FLAT_DOCS.map((p) => {
  const group = groupOf(p.slug);
  return {
    ...p,
    group,
    haystack: [p.title, p.description, group, ...(p.keywords ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
});

function search(q: string): Indexed[] {
  const query = q.trim().toLowerCase();
  if (!query) return INDEX;
  const terms = query.split(/\s+/);
  return INDEX.filter((item) => terms.every((t) => item.haystack.includes(t)));
}

export default function DocsSearch() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const results = useMemo(() => search(q), [q]);

  // Clamp the active row whenever the result set changes.
  useEffect(() => setActive(0), [q]);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input + lock scroll while open.
  useEffect(() => {
    if (!open) return;
    setQ("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  const go = (slug: string) => {
    setOpen(false);
    router.push(slug);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 flex w-full items-center gap-2 rounded-lg border border-light-border bg-light-bg px-3 py-2 text-left text-sm text-light-ink-faint transition-colors hover:border-light-ink-faint"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">Search docs…</span>
        <kbd className="rounded border border-light-border bg-light-surface px-1.5 py-0.5 font-mono text-[0.6rem] text-light-ink-faint">
          ⌘K
        </kbd>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
            <div
              className="absolute inset-0 bg-light-ink/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search docs"
              onKeyDown={onKeyDown}
              className="marketing-light relative w-full max-w-lg overflow-hidden rounded-2xl border border-light-border bg-light-bg shadow-2xl"
            >
              <div className="flex items-center gap-2.5 border-b border-light-border-soft px-4">
                <Search className="h-4 w-4 text-light-ink-faint" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search the docs…"
                  className="h-12 flex-1 bg-transparent text-sm text-light-ink outline-none placeholder:text-light-ink-faint"
                />
                <kbd className="rounded border border-light-border bg-light-surface px-1.5 py-0.5 font-mono text-[0.6rem] text-light-ink-faint">
                  esc
                </kbd>
              </div>

              <ul className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
                {results.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-light-ink-faint">
                    No matches for “{q}”.
                  </li>
                )}
                {results.map((r, i) => (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.slug)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        i === active ? "bg-light-surface" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-light-ink">
                          {r.title}
                        </span>
                        {r.description && (
                          <span className="block truncate text-2xs text-light-ink-faint">
                            {r.description}
                          </span>
                        )}
                      </span>
                      {r.group && (
                        <span className="shrink-0 font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
                          {r.group}
                        </span>
                      )}
                      {i === active && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ember-on-light" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
