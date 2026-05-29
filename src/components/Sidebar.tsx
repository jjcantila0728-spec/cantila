"use client";

import { useEffect, useState } from "react";
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
  Wallet,
  Users,
  Settings2,
  Rocket,
  ChevronRight,
  Mail,
  MessageSquare,
  Gauge,
  History,
  Brain,
  Server,
  HardDrive,
  Building2,
  ShieldCheck,
  Workflow,
  Plug,
  LogOut,
} from "lucide-react";
import { cx } from "./ui";
import { ACCOUNT } from "@/lib/mock-data";
import { api, type ApiAccount } from "@/lib/api";
import { useActiveAccount } from "@/lib/branding-context";

/** Two-letter initials derived from an account name. Falls back to the
 *  first two chars of the handle if the name is single-word. */
function initialsFor(name: string, handle: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return handle.slice(0, 2).toUpperCase();
}

type NavItem = { href: string; label: string; icon: typeof Boxes };

export const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Build",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: Boxes },
      { href: "/chat", label: "Chat", icon: Sparkles },
      { href: "/monitoring", label: "Monitoring", icon: Gauge },
      { href: "/capacity", label: "Capacity", icon: Server },
      { href: "/nodes", label: "Nodes", icon: HardDrive },
      { href: "/agents", label: "Agents", icon: Brain },
      { href: "/activity", label: "Activity", icon: History },
    ],
  },
  {
    heading: "Automations",
    items: [
      { href: "/automations", label: "Workflows", icon: Workflow },
      { href: "/connections", label: "Connections", icon: Plug },
    ],
  },
  {
    heading: "Services",
    items: [
      { href: "/databases", label: "Data", icon: Database },
      { href: "/domains", label: "Domains", icon: Globe },
      { href: "/mail", label: "Mail", icon: Mail },
      { href: "/sms", label: "SMS", icon: MessageSquare },
      { href: "/a2p", label: "A2P / 10DLC", icon: ShieldCheck },
      { href: "/cantilapay", label: "Cantilapay", icon: Wallet },
      { href: "/templates", label: "Templates", icon: LayoutGrid },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/team", label: "Team", icon: Users },
      { href: "/orgs", label: "Orgs", icon: Building2 },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-surface lg:flex">
      <SidebarContent />
    </aside>
  );
}

/** The inner Sidebar chrome — brand header, deploy CTA, nav, account
 *  chip, sign-out. Extracted so the Topbar's mobile drawer renders the
 *  identical content on small screens. Pass `onNavigate` to close any
 *  enclosing drawer when a nav item is tapped. */
export function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Live account chip — populated from /v1/me on mount. Falls back to the
  // mock constant when the proxy is unauthenticated or the control plane
  // is unreachable, so demo/offline mode still renders sensibly.
  const [liveAccount, setLiveAccount] = useState<ApiAccount | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.whoami();
        if (cancelled) return;
        if (me.authenticated && me.account) setLiveAccount(me.account);
      } catch {
        /* swallow — fall through to ACCOUNT mock */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Plan §5.5 — white-label per-account branding. The branding
  // context (one fetch at layout level, shared across consumers)
  // provides the active account; prefer its display-name override
  // (`brandDisplayName`) over the legal `name` in the chip + brand
  // mark. Logo URL replaces the diamond mark when set.
  const branded = useActiveAccount();
  const effectiveName =
    branded?.brandDisplayName ??
    branded?.name ??
    liveAccount?.name ??
    ACCOUNT.org;
  const effectiveHandle = branded?.handle ?? liveAccount?.handle ?? ACCOUNT.handle;
  const effectivePlan = branded?.plan ?? liveAccount?.plan ?? ACCOUNT.plan;
  const effectiveLogoUrl = branded?.brandLogoUrl;
  const chipName = effectiveName;
  const chipHandle = effectiveHandle;
  const chipPlan = effectivePlan;
  const chipInitials = branded
    ? initialsFor(effectiveName, effectiveHandle)
    : liveAccount
      ? initialsFor(liveAccount.name, liveAccount.handle)
      : ACCOUNT.initials;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border-soft px-5">
        {effectiveLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveLogoUrl}
            alt={`${effectiveName} logo`}
            className="h-7 w-7 rounded-md object-contain"
          />
        ) : (
          <BrandMark />
        )}
        <div className="leading-none">
          <div className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
            {branded?.brandDisplayName ?? "Cantila"}
          </div>
          <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-ink-faint">
            Console
          </div>
        </div>
      </div>

      {/* deploy CTA */}
      <div className="px-3 pt-4">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="group flex items-center gap-2 rounded-lg bg-ember px-3 py-2.5 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-all hover:bg-ember-bright"
        >
          <Rocket className="h-4 w-4" strokeWidth={2.4} />
          New chat
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
                      onClick={onNavigate}
                      className={cx(
                        "group relative flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
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

      {/* account chip + sign-out */}
      <div className="border-t border-border-soft p-3">
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim font-mono text-xs font-bold text-[#1a0e08]">
              {chipInitials}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-ink">
                {chipName}
              </span>
              <span className="block truncate font-mono text-[0.65rem] text-ink-faint">
                {liveAccount ? `@${chipHandle} · ${chipPlan}` : `${chipPlan} plan`}
              </span>
            </span>
          </Link>
          <a
            href="/logout"
            aria-label="Sign out"
            title="Sign out"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </a>
        </div>
      </div>
    </>
  );
}

/**
 * BrandMark — the Cantila Ember Crystal.
 *
 * A three-band faceted gem on a warm-charcoal backplate.
 * Canonical source: /brand/logo/mark.svg.
 * Construction spec: /brand/identity.md §4.
 */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-lg bg-surface-2"
      style={{ width: size, height: size }}
      aria-label="Cantila"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path d="M16 2.5 L24 11 L8 11 Z" fill="#ff8159" />
        <path d="M8 11 L24 11 L24 21 L8 21 Z" fill="#ff6a3d" />
        <path d="M8 21 L24 21 L16 29.5 Z" fill="#bd4d2b" />
        <path
          d="M16 2.5 L24 11 L24 21 L16 29.5 L8 21 L8 11 Z"
          fill="none"
          stroke="#1a0e08"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <line
          x1="16"
          y1="2.5"
          x2="16"
          y2="29.5"
          stroke="#1a0e08"
          strokeWidth="0.35"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}
