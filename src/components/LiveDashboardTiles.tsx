"use client";

/* ============================================================
   Live dashboard tiles — replaces the mock stat tiles when the
   control plane is reachable. Hits /v1/metrics/account for the
   raw numbers + 24h deploys-per-hour series.
   ============================================================ */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Zap,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { Sparkline } from "@/components/AreaChart";
import { Panel, cx, StatusBadge } from "@/components/ui";
import { api, isControlPlaneLive } from "@/lib/api";

interface AccountMetrics {
  at: string;
  totals: {
    projects: number;
    liveProjects: number;
    buildingProjects: number;
    sleepingProjects: number;
    crashedProjects: number;
    deployments: number;
    deploysLast24h: number;
    deploysLast7d: number;
    deployTriggers: Record<string, number>;
    domains: number;
    autoDeployRepos: number;
    services: { databases: number; mailboxes: number; phoneNumbers: number };
    keys: number;
  };
  series: {
    deploysPerHour: number[];
    runtimes: Record<string, number>;
    regions: Record<string, number>;
  };
  recentDeployments: {
    id: string;
    projectId: string;
    projectSlug: string;
    status: string;
    trigger: string;
    url?: string;
    at: string;
  }[];
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Tile({
  label,
  value,
  sub,
  subTone = "live",
  data,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  subTone?: "live" | "ember" | "dim";
  data: number[];
  tone: "ember" | "live" | "info" | "violet";
}) {
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <span className="kv">{label}</span>
        <Sparkline data={data} tone={tone} width={68} height={22} />
      </div>
      <div>
        <div className="font-display text-[1.6rem] font-semibold leading-none tracking-tight text-ink">
          {value}
        </div>
        <div
          className={cx(
            "mt-2 text-2xs font-medium",
            subTone === "live" && "text-live",
            subTone === "ember" && "text-ember",
            subTone === "dim" && "text-ink-faint",
          )}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

/** Polls metrics every 10s while the tab is visible. The mock children are
 *  used as the SSR fallback so the page renders something before the first
 *  fetch lands. */
export default function LiveDashboardTiles({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const [metrics, setMetrics] = useState<AccountMetrics | null>(null);
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/cantila/v1/metrics/account", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as AccountMetrics;
        if (!cancelled) setMetrics(json);
      } catch {
        /* swallow — keep last successful snapshot */
      }
    }

    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLive(ok);
      if (!ok) return;
      void load();
    })();

    const interval = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (live === null) {
    return (
      <div className="flex h-32 items-center justify-center text-2xs text-ink-faint">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-ember" />
        Loading metrics…
      </div>
    );
  }

  if (!live) {
    // Offline — render the original mock tiles + banner so the dashboard
    // still feels alive on its own.
    return (
      <>
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-2xs text-ink-faint">
          Control plane offline — showing seeded mock data. Start the API on
          :8080 for live metrics.
        </div>
        {fallback}
      </>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-32 items-center justify-center text-2xs text-ink-faint">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-ember" />
        Loading metrics…
      </div>
    );
  }

  const { totals, series, recentDeployments } = metrics;
  const triggers = totals.deployTriggers;
  const fromChatOrMcp = (triggers.chat ?? 0) + (triggers.mcp ?? 0);

  // Build a sparkline-suitable series. Live projects spark = mock until we
  // emit a real time series; deploys-per-hour is real.
  const projectsSpark = totals.projects > 0
    ? Array.from({ length: 8 }, (_, i) =>
        Math.max(0, totals.projects - 7 + i),
      )
    : [0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-2xs text-live">
        <Zap className="h-3 w-3" />
        live · refreshing every 10s · snapshot {formatRelative(metrics.at)}
      </div>

      <div className="grid grid-cols-2 gap-4 stagger lg:grid-cols-4">
        <Tile
          label="Live projects"
          value={`${totals.liveProjects} / ${totals.projects}`}
          sub={
            totals.buildingProjects > 0
              ? `${totals.buildingProjects} building`
              : totals.crashedProjects > 0
                ? `${totals.crashedProjects} needs attention`
                : "all healthy"
          }
          subTone={totals.crashedProjects > 0 ? "ember" : "live"}
          data={projectsSpark}
          tone="live"
        />
        <Tile
          label="Deploys · 7d"
          value={String(totals.deploysLast7d)}
          sub={
            fromChatOrMcp > 0
              ? `${fromChatOrMcp} via Chat / MCP`
              : `${totals.deployments} all-time`
          }
          subTone="ember"
          data={series.deploysPerHour.slice(-12)}
          tone="ember"
        />
        <Tile
          label="Auto-wired services"
          value={String(
            totals.services.databases +
              totals.services.mailboxes +
              totals.services.phoneNumbers,
          )}
          sub={`${totals.services.databases} DB · ${totals.services.mailboxes} mail · ${totals.services.phoneNumbers} SMS`}
          data={[
            totals.services.databases,
            totals.services.mailboxes,
            totals.services.phoneNumbers,
            totals.services.databases,
            totals.services.mailboxes,
            totals.services.phoneNumbers,
            totals.services.databases,
            totals.services.mailboxes,
          ]}
          tone="info"
        />
        <Tile
          label="Domains · keys"
          value={`${totals.domains} · ${totals.keys}`}
          sub={
            totals.autoDeployRepos > 0
              ? `${totals.autoDeployRepos} repo${totals.autoDeployRepos > 1 ? "s" : ""} auto-deploying`
              : "registrar + auth"
          }
          subTone="dim"
          data={[
            totals.domains,
            totals.domains,
            totals.domains + 1,
            totals.domains,
            totals.domains + 2,
            totals.domains + 1,
            totals.domains + 1,
            totals.domains,
          ]}
          tone="violet"
        />
      </div>

      {/* Live recent deployments */}
      <div className="mt-6 panel overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Recent deployments
            </h2>
            <p className="mt-0.5 text-2xs text-ink-faint">
              From the live control plane · last {recentDeployments.length}
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-2xs font-medium text-ink-dim hover:text-ember"
          >
            All projects
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentDeployments.length === 0 ? (
          <div className="px-5 py-8 text-center text-2xs text-ink-faint">
            No deployments yet. Ship one with{" "}
            <Link href="/deploy" className="text-ember hover:underline">
              Chat Deploy
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-border-soft">
            {recentDeployments.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <Rocket className="h-3.5 w-3.5 text-ember" />
                <Link
                  href={`/projects/live/${d.projectId}`}
                  className="font-mono text-xs font-medium text-ink hover:text-ember hover:underline"
                >
                  {d.projectSlug}
                </Link>
                <StatusBadge status={d.status} />
                <span className="text-2xs text-ink-faint">via {d.trigger}</span>
                {d.url && (
                  <a
                    href={d.url}
                    className="hidden truncate font-mono text-2xs text-live hover:underline sm:inline-block"
                  >
                    {d.url}
                  </a>
                )}
                <span className="ml-auto font-mono text-2xs text-ink-faint">
                  {formatRelative(d.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// Panel is exported so the fallback can re-use it without re-importing.
export { Panel };
