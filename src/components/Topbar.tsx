"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PanelLeft, X, Search, Plug, BookOpen } from "lucide-react";
import { SidebarContent } from "./Sidebar";
import CommandPalette from "./CommandPalette";
import NotificationsMenu from "./NotificationsMenu";
import { cx } from "./ui";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // SSR guard — the drawer portals to document.body, which only exists
  // after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Enter/exit state machine driving the slide ("push") motion.
  //   render → is the drawer in the DOM at all (kept true through the
  //            exit transition so the close animation can play)
  //   show   → transform target: true = slid in, false = off-canvas
  const [render, setRender] = useState(false);
  const [show, setShow] = useState(false);

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

  // Drive mount → slide-in on open, slide-out → unmount on close. The
  // requestAnimationFrame guarantees the off-canvas state paints once
  // before we flip `show`, so the transform actually transitions in.
  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
    setShow(false);
    const id = setTimeout(() => setRender(false), 320);
    return () => clearTimeout(id);
  }, [open]);

  // Lock body scroll + allow Escape to close while the drawer is mounted.
  // The drawer is full-viewport `fixed`, so background scroll-through is
  // otherwise easy to trigger on touch devices.
  useEffect(() => {
    if (!render) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [render]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      {/* mobile nav toggle — sidebar/panel affordance, not a burger */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-ink-dim transition-colors hover:border-ink-faint hover:text-ink lg:hidden"
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <PanelLeft className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
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

      {/* mobile drawer — portaled to <body> so it escapes this header's
          `backdrop-blur` containing block (a backdrop-filter makes an
          element the containing block for fixed descendants, which would
          otherwise pin the drawer to the 64px header and clip the nav).
          Renders the same <SidebarContent /> the desktop Sidebar uses, so
          parity is automatic. Slides in/out with a spring "push" motion. */}
      {mounted &&
        render &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className={cx(
                "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none",
                show ? "opacity-100" : "opacity-0",
              )}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className={cx(
                "absolute inset-y-0 left-0 flex w-72 max-w-[88vw] flex-col border-r border-border bg-surface shadow-lift",
                "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                show ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </header>
  );
}
