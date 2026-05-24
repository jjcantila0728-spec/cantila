"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Sparkles,
  Database,
  Globe,
  LayoutGrid,
  CreditCard,
  Users,
  Settings2,
  Rocket,
  ChevronRight,
} from "lucide-react";
import { cx } from "./ui";
import { ACCOUNT } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: typeof Boxes };

export const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Build",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: Boxes },
      { href: "/deploy", label: "Chat Deploy", icon: Sparkles },
    ],
  },
  {
    heading: "Services",
    items: [
      { href: "/databases", label: "Databases", icon: Database },
      { href: "/domains", label: "Domains", icon: Globe },
      { href: "/templates", label: "Templates", icon: LayoutGrid },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/team", label: "Team", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-surface lg:flex">
      {/* brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border-soft px-5">
        <BrandMark />
        <div className="leading-none">
          <div className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
            Cantila
          </div>
          <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-ink-faint">
            Console
          </div>
        </div>
      </div>

      {/* deploy CTA */}
      <div className="px-3 pt-4">
        <Link
          href="/deploy"
          className="group flex items-center gap-2 rounded-lg bg-ember px-3 py-2.5 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-all hover:bg-ember-bright"
        >
          <Rocket className="h-4 w-4" strokeWidth={2.4} />
          New deploy
          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV.map((group) => (
          <div key={group.heading} className="mb-6 last:mb-0">
            <div className="px-3 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">
              {group.heading}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cx(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-surface-3 font-medium text-ink"
                          : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ember" />
                      )}
                      <Icon
                        className={cx(
                          "h-[1.05rem] w-[1.05rem] transition-colors",
                          active ? "text-ember" : "text-ink-faint group-hover:text-ink-dim",
                        )}
                        strokeWidth={2}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* account chip */}
      <div className="border-t border-border-soft p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim font-mono text-xs font-bold text-[#1a0e08]">
            {ACCOUNT.initials}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-medium text-ink">
              {ACCOUNT.org}
            </span>
            <span className="block truncate font-mono text-[0.65rem] text-ink-faint">
              {ACCOUNT.plan} plan
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim"
      style={{ width: size, height: size }}
    >
      {/* a "ship" chevron pointing up-right */}
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1a0e08"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </svg>
    </span>
  );
}
