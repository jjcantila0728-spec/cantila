"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Bell, Plug, BookOpen } from "lucide-react";
import { cx } from "./ui";
import { NAV, BrandMark } from "./Sidebar";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      {/* mobile menu */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-dim hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* command search */}
      <button className="group flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-left text-sm text-ink-faint transition-colors hover:border-ink-faint sm:max-w-sm">
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

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-dim hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-ember ring-2 ring-bg" />
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface animate-fade-in">
            <div className="flex h-16 items-center justify-between border-b border-border-soft px-5">
              <div className="flex items-center gap-2.5">
                <BrandMark />
                <span className="font-display text-lg font-semibold text-ink">
                  Cantila
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim hover:text-ink"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {NAV.map((group) => (
                <div key={group.heading} className="mb-5">
                  <div className="px-3 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">
                    {group.heading}
                  </div>
                  {group.items.map((item) => {
                    const active =
                      item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cx(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                          active
                            ? "bg-surface-3 font-medium text-ink"
                            : "text-ink-dim hover:text-ink",
                        )}
                      >
                        <Icon className="h-4 w-4 text-ink-faint" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
