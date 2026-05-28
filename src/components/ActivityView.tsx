"use client";

/* ============================================================
   Cantila Console — workspace activity feed
   The full history behind the dashboard's Activity panel and the
   Topbar notifications. Filterable by kind, searchable, and every
   row deep-links to the relevant surface.
   ============================================================ */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Globe,
  Database,
  CreditCard,
  TriangleAlert,
  UserPlus,
  Mail,
  MessageSquare,
  Search,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { PageHeader, Panel, cx } from "@/components/ui";
import { activity, activityHref } from "@/lib/mock-data";
import type { Activity } from "@/lib/types";
import { api, isControlPlaneLive, type ApiActivityEvent } from "@/lib/api";

type Kind = Activity["kind"];
type Tone = "ember" | "info" | "violet" | "warn" | "down" | "live";

const KIND_META: Record<
  Kind,
  { icon: typeof Rocket; tone: Tone; label: string }
> = {
  deploy: { icon: Rocket, tone: "ember", label: "Deploy" },
  domain: { icon: Globe, tone: "info", label: "Domain" },
  database: { icon: Database, tone: "violet", label: "Database" },
  billing: { icon: CreditCard, tone: "warn", label: "Billing" },
  alert: { icon: TriangleAlert, tone: "down", label: "Alert" },
  member: { icon: UserPlus, tone: "live", label: "Team" },
  mail: { icon: Mail, tone: "info", label: "Mail" },
  sms: { icon: MessageSquare, tone: "violet", label: "SMS" },
};

const TONE: Record<Tone, { bg: string; text: string }> = {
  ember: { bg: "bg-ember/10", text: "text-ember" },
  info: { bg: "bg-info/10", text: "text-info" },
  violet: { bg: "bg-violet/10", text: "text-violet" },
  warn: { bg: "bg-warn/10", text: "text-warn" },
  down: { bg: "bg-down/10", text: "text-down" },
  live: { bg: "bg-live/10", text: "text-live" },
};

const FILTERS: { label: string; kind: Kind | "all" }[] = [
  { label: "All", kind: "all" },
  { label: "Deploys", kind: "deploy" },
  { label: "Alerts", kind: "alert" },
  { label: "Databases", kind: "database" },
  { label: "Domains", kind: "domain" },
  { label: "Mail", kind: "mail" },
  { label: "SMS", kind: "sms" },
  { label: "Team", kind: "member" },
  { label: "Billing", kind: "billing" },
];

/** Map CP-side activity kinds onto the existing Console palette so the
 *  icons/colors stay consistent with the mock data. */
function mapKind(k: ApiActivityEvent["kind"]): Kind {
  switch (k) {
    case "deploy":
    case "git":
    case "config":
    case "system":
      return "deploy";
    case "domain":
      return "domain";
    case "database":
    case "storage":
      return "database";
    case "key":
      return "member";
    case "alert":
      return "alert";
    default:
      return "deploy";
  }
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function ActivityView() {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");
  // Empty until the effect resolves live mode — keeps mock events out of a
  // logged-in user's audit log.
  const [events, setEvents] = useState<Activity[]>([]);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  // Plan §5.5 — white-label audit. Activity rows carry the actor's
  // accountId; we resolve those to human-readable display names via
  // `listMyOrgs` (which already returns every org the user can see —
  // their direct memberships plus sub-accounts they reach via
  // parenthood). Loaded once on mount and shared by every row.
  const [accountNames, setAccountNames] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;

    async function load() {
      try {
        const { events: live } = await api.listActivity();
        if (cancelled) return;
        const mapped: Activity[] = live.map((e) => ({
          id: e.id,
          kind: mapKind(e.kind),
          title: e.title,
          detail: e.detail,
          at: relative(e.at),
          project: e.projectId,
          actorAccountId: e.actorAccountId,
        }));
        setEvents(mapped);
      } catch {
        /* swallow — keep last good snapshot */
      }
    }

    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setEvents([...activity]);
        return;
      }
      // Fire activity load + orgs map fetch in parallel — the orgs
      // call is session-only (401 without one), so swallow failures.
      void load();
      try {
        const { orgs } = await api.listMyOrgs();
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const o of orgs) m.set(o.accountId, o.accountName);
        setAccountNames(m);
      } catch {
        /* unauthenticated — actor pills will fall back to raw ids */
      }
      interval = window.setInterval(load, 5_000);
    })();

    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = events.filter((a) => {
    const matchesKind = filter === "all" || a.kind === filter;
    const matchesQuery =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.detail.toLowerCase().includes(q) ||
      (a.project?.toLowerCase().includes(q) ?? false);
    return matchesKind && matchesQuery;
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Workspace · live" : "Workspace"}
        title="Activity"
        lead="Every deploy, alert and change across your workspace — newest first."
        actions={
          liveMode === true ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
              <Zap className="h-3 w-3" /> refreshing every 5s
            </span>
          ) : liveMode === false ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
              control plane offline · mock feed
            </span>
          ) : null
        }
      />

      {/* controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.kind;
            return (
              <button
                key={f.kind}
                onClick={() => setFilter(f.kind)}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                  active
                    ? "bg-surface-3 text-ink ring-1 ring-border"
                    : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 lg:w-64">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </div>

      {/* feed */}
      {filtered.length > 0 ? (
        <Panel pad={false}>
          <div className="border-b border-border-soft px-5 py-3.5">
            <h2 className="kv text-ink-dim">
              {filtered.length} event{filtered.length === 1 ? "" : "s"}
            </h2>
          </div>
          <ul className="divide-y divide-border-soft">
            {filtered.map((a) => {
              const meta = KIND_META[a.kind];
              const Icon = meta.icon;
              const tone = TONE[meta.tone];
              return (
                <li key={a.id}>
                  <Link
                    href={activityHref(a)}
                    className="group flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={cx(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        tone.bg,
                        tone.text,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">
                          {a.title}
                        </p>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="mt-0.5 text-2xs text-ink-dim">{a.detail}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-2xs text-ink-faint">
                        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono">
                          {meta.label}
                        </span>
                        {a.project && (
                          <>
                            <span className="text-border">·</span>
                            <span className="font-mono text-ink-dim">
                              {a.project}
                            </span>
                          </>
                        )}
                        {a.actorAccountId && (
                          <>
                            <span className="text-border">·</span>
                            <span
                              className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-200"
                              title={`Plan §5.5 — driven by parent account ${a.actorAccountId}`}
                            >
                              as {accountNames.get(a.actorAccountId) ?? a.actorAccountId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 pt-0.5 font-mono text-2xs text-ink-faint">
                      {a.at}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : (
        <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm font-medium text-ink">No activity matches</p>
          <p className="text-2xs text-ink-faint">
            Try a different filter or search term.
          </p>
          <button
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
            className="mt-1 text-2xs font-medium text-ember hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
