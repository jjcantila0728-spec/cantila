"use client";

/* ============================================================
   Cantila Console — Topbar notifications
   A bell dropdown fed by recent workspace activity and any
   firing alerts. Tracks read / unread state in-session and
   dismisses on outside-click or Escape.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Rocket,
  Globe,
  Database,
  CreditCard,
  AlertTriangle,
  Users,
  Mail,
  MessageSquare,
  CheckCheck,
  ArrowRight,
} from "lucide-react";
import { cx } from "./ui";
import { activity, alerts, activityHref } from "@/lib/mock-data";
import type { Activity, Alert } from "@/lib/types";

type Tone = "ember" | "live" | "info" | "violet" | "warn" | "down";

interface Notif {
  id: string;
  icon: typeof Bell;
  tone: Tone;
  title: string;
  detail: string;
  at: string;
  /** Minutes-ago, for chronological sorting. */
  rank: number;
  /** Where the row navigates to. */
  href: string;
  /** Optional project label. */
  tag?: string;
}

const TONE: Record<Tone, { bg: string; text: string }> = {
  ember: { bg: "bg-ember/10", text: "text-ember" },
  live: { bg: "bg-live/10", text: "text-live" },
  info: { bg: "bg-info/10", text: "text-info" },
  violet: { bg: "bg-violet/10", text: "text-violet" },
  warn: { bg: "bg-warn/10", text: "text-warn" },
  down: { bg: "bg-down/10", text: "text-down" },
};

const ACTIVITY_STYLE: Record<
  Activity["kind"],
  { icon: typeof Bell; tone: Tone }
> = {
  deploy: { icon: Rocket, tone: "ember" },
  domain: { icon: Globe, tone: "info" },
  database: { icon: Database, tone: "violet" },
  billing: { icon: CreditCard, tone: "warn" },
  alert: { icon: AlertTriangle, tone: "down" },
  member: { icon: Users, tone: "info" },
  mail: { icon: Mail, tone: "info" },
  sms: { icon: MessageSquare, tone: "live" },
};

const SEVERITY_TONE: Record<Alert["severity"], Tone> = {
  critical: "down",
  warning: "warn",
  info: "info",
};

/** Turn a relative label ("3m ago", "1h ago", "just now") into minutes. */
function atRank(at: string): number {
  if (/just now/i.test(at)) return 0;
  const m = at.match(/(\d+)\s*([mhd])/i);
  if (!m) return 1_000_000;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  return unit === "m" ? n : unit === "h" ? n * 60 : n * 1440;
}

/* Firing alerts + recent activity, merged and sorted newest-first. */
const NOTIFS: Notif[] = (() => {
  const fromAlerts: Notif[] = alerts
    .filter((a) => a.state === "firing")
    .map((a) => ({
      id: `n-${a.id}`,
      icon: AlertTriangle,
      tone: SEVERITY_TONE[a.severity],
      title: a.title,
      detail: a.condition,
      at: a.at,
      rank: atRank(a.at),
      href: "/monitoring",
    }));

  const fromActivity: Notif[] = activity.map((ac) => {
    const style = ACTIVITY_STYLE[ac.kind];
    return {
      id: `n-${ac.id}`,
      icon: style.icon,
      tone: style.tone,
      title: ac.title,
      detail: ac.detail,
      at: ac.at,
      rank: atRank(ac.at),
      href: activityHref(ac),
      tag: ac.project,
    };
  });

  return [...fromAlerts, ...fromActivity].sort((x, y) => x.rank - y.rank);
})();

/** How many of the newest items start out unread. */
const INITIAL_UNREAD = 5;

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(
    () => new Set(NOTIFS.slice(INITIAL_UNREAD).map((n) => n.id)),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = useMemo(
    () => NOTIFS.filter((n) => !read.has(n.id)).length,
    [read],
  );

  /* dismiss on outside-click or Escape */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = () => setRead(new Set(NOTIFS.map((n) => n.id)));
  const markOne = (id: string) =>
    setRead((prev) => new Set(prev).add(id));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className={cx(
          "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
          open
            ? "border-ink-faint bg-surface-3 text-ink"
            : "border-border text-ink-dim hover:text-ink",
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-ember px-1 font-mono text-[0.58rem] font-bold text-[#1a0e08] ring-2 ring-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="panel absolute right-0 top-[calc(100%_+_0.5rem)] z-40 w-[min(360px,calc(100vw_-_1.5rem))] overflow-hidden p-0 shadow-lift animate-fade-up">
          {/* header */}
          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold text-ink">
                Notifications
              </h2>
              {unread > 0 && (
                <span className="rounded-full bg-ember/15 px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold text-ember">
                  {unread} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-2xs text-ink-dim transition-colors hover:text-ink disabled:cursor-default disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          {/* list */}
          <div className="max-h-[min(60vh,440px)] overflow-y-auto">
            {NOTIFS.map((n) => {
              const Icon = n.icon;
              const isUnread = !read.has(n.id);
              const tone = TONE[n.tone];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => {
                    markOne(n.id);
                    setOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-start gap-3 border-b border-border-soft px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2",
                    isUnread && "bg-ember/5",
                  )}
                >
                  <span
                    className={cx(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      tone.bg,
                      tone.text,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cx(
                          "min-w-0 flex-1 truncate text-sm",
                          isUnread
                            ? "font-medium text-ink"
                            : "text-ink-dim",
                        )}
                      >
                        {n.title}
                      </span>
                      {isUnread && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-ink-faint">
                      {n.detail}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-2xs text-ink-faint">
                      {n.tag && (
                        <>
                          <span className="font-mono text-ink-dim">
                            {n.tag}
                          </span>
                          <span className="text-border">·</span>
                        </>
                      )}
                      <span className="font-mono">{n.at}</span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          {/* footer */}
          <Link
            href="/activity"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-border-soft bg-surface px-4 py-2.5 text-2xs font-medium text-ink-dim transition-colors hover:text-ink"
          >
            View all activity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
