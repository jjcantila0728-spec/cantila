"use client";

import { useEffect, useState } from "react";
import { PanelLeft, PanelLeftClose, Search, Plug, BookOpen } from "lucide-react";
import CommandPalette from "./CommandPalette";
import NotificationsMenu from "./NotificationsMenu";
import { useNavDrawer } from "./ConsoleShell";

export default function Topbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { open, toggle } = useNavDrawer();

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

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      {/* mobile nav toggle — sidebar/panel affordance, not a burger. Opens
          the push drawer managed by ConsoleShell. */}
      <button
        onClick={toggle}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-ink-dim transition-colors hover:border-ink-faint hover:text-ink lg:hidden"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        {open ? (
          <PanelLeftClose className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
        ) : (
          <PanelLeft className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
        )}
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
          href="/docs"
          className="hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-dim hover:bg-surface-3 hover:text-ink sm:inline-flex"
        >
          <BookOpen className="h-4 w-4" />
          Docs
        </a>

        <NotificationsMenu />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </header>
  );
}
