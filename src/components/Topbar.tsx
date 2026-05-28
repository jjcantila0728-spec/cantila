"use client";

import { useEffect, useState } from "react";
import { Menu, X, Search, Plug, BookOpen } from "lucide-react";
import { SidebarContent } from "./Sidebar";
import CommandPalette from "./CommandPalette";
import NotificationsMenu from "./NotificationsMenu";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* global ⌘K / Ctrl+K toggles the command palette */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while the mobile nav drawer is open. The drawer
  // is `fixed inset-0` so background scroll-through is otherwise easy
  // to trigger on touch devices.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      {/* mobile menu */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-ink-dim hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* command search */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="group flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-left text-sm text-ink-faint transition-colors hover:border-ink-faint sm:max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate">Search projects, deploys, logs…</span>
        <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-faint sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* MCP status — the Claude bridge */}
        <span className="hidden items-center gap-1.5 rounded-lg border border-live/25 bg-live/10 px-2.5 py-1.5 text-2xs font-medium text-live md:inline-flex">
          <Plug className="h-3.5 w-3.5" />
          MCP server connected
        </span>

        <a
          href="https://docs.cantila.app"
          className="hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-dim hover:bg-surface-3 hover:text-ink sm:inline-flex"
        >
          <BookOpen className="h-4 w-4" />
          Docs
        </a>

        <NotificationsMenu />
      </div>

      {/* mobile drawer — renders the same <SidebarContent /> the desktop
          Sidebar uses, so parity is automatic: deploy CTA, nav, account
          chip, and sign-out all live in the drawer on small screens. */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[88vw] flex-col border-r border-border bg-surface animate-fade-in">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-2 hover:text-ink"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </header>
  );
}
