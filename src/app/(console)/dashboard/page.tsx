import Link from "next/link";
import {
  Rocket,
  ArrowUpRight,
  Activity as ActivityIcon,
  Globe,
  Database as DatabaseIcon,
  CreditCard,
  TriangleAlert,
  UserPlus,
  Server,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Panel, cx } from "@/components/ui";
import { AreaChart, Sparkline, BarGauge } from "@/components/AreaChart";
import LiveDashboardTiles from "@/components/LiveDashboardTiles";
import WelcomeHeader from "@/components/WelcomeHeader";
import {
  projects,
  deployments,
  activity,
  fleet,
  dashboardStats,
  REGIONS,
  ACCOUNT,
} from "@/lib/mock-data";

export const metadata = { title: "Dashboard · Cantila Console" };

/* aggregate request traffic across the live fleet */
function aggregateTraffic(): number[] {
  const live = projects.filter((p) => p.status === "live");
  const len = live[0]?.metrics.requests.length ?? 24;
  return Array.from({ length: len }, (_, i) =>
    Math.round(live.reduce((sum, p) => sum + (p.metrics.requests[i] ?? 0), 0)),
  );
}

const ACTIVITY_ICON = {
  deploy: Rocket,
  domain: Globe,
  database: DatabaseIcon,
  billing: CreditCard,
  alert: TriangleAlert,
  member: UserPlus,
  mail: Mail,
  sms: MessageSquare,
} as const;

const ACTIVITY_TONE = {
  deploy: "text-ember",
  domain: "text-info",
  database: "text-violet",
  billing: "text-ink-dim",
  alert: "text-down",
  member: "text-live",
  mail: "text-info",
  sms: "text-violet",
} as const;

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

function MockTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 stagger lg:grid-cols-4">
      <Tile
        label="Live projects"
        value={`${dashboardStats.liveProjects} / ${dashboardStats.totalProjects}`}
        sub="+1 shipped this week"
        data={[3, 3, 4, 4, 4, 5, 5, 6]}
        tone="live"
      />
      <Tile
        label="Deploys · 7d"
        value={String(dashboardStats.deploysThisWeek)}
        sub="8 from Chat Deploy & MCP"
        subTone="ember"
        data={[2, 4, 3, 6, 5, 7, 4, 8]}
        tone="ember"
      />
      <Tile
        label="Requests today"
        value={dashboardStats.reqToday}
        sub="▲ 12% vs. yesterday"
        data={projects[3].metrics.requests.slice(8)}
        tone="info"
      />
      <Tile
        label="Avg uptime · 30d"
        value={`${dashboardStats.avgUptime}%`}
        sub="No incidents in 30 days"
        data={[99.9, 99.94, 99.97, 99.92, 99.99, 99.96, 99.98, 99.96]}
        tone="violet"
      />
    </div>
  );
}

export default function DashboardPage() {
  const traffic = aggregateTraffic();

  return (
    <div className="space-y-8">
      <WelcomeHeader
        eyebrow="Overview"
        fallbackName={ACCOUNT.org.split(" ")[0]}
        lead="Everything you've shipped, in one control surface — projects, deploys, traffic and the fleet beneath them."
        actions={
          <Link
            href="/deploy"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright"
          >
            <Rocket className="h-4 w-4" strokeWidth={2.4} />
            New deploy
          </Link>
        }
      />

      {/* stat tiles + recent deployments — live from the control plane,
          mock fallback when offline. */}
      <LiveDashboardTiles fallback={<MockTiles />} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* traffic */}
          <Panel pad={false}>
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">
                  Platform traffic
                </h2>
                <p className="mt-0.5 text-2xs text-ink-faint">
                  Requests / hour across all live projects · last 24h
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-info/10 px-2 py-1 text-2xs font-medium text-info ring-1 ring-info/20">
                <ActivityIcon className="h-3 w-3" />
                Live
              </span>
            </div>
            <div className="px-2 pt-4">
              <AreaChart data={traffic} id="dash-traffic" tone="info" height={150} />
            </div>
            <div className="grid grid-cols-3 divide-x divide-border-soft border-t border-border-soft">
              {[
                { k: "Requests / min", v: "1,190" },
                { k: "p95 latency", v: "94 ms" },
                { k: "Error rate", v: "0.02%" },
              ].map((s) => (
                <div key={s.k} className="px-5 py-3.5">
                  <div className="kv">{s.k}</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-ink">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recent deployments panel is rendered live by LiveDashboardTiles
              above; no second mock copy needed here. */}
        </div>

        {/* right column */}
        <div className="space-y-6">
          {/* activity */}
          <Panel pad={false}>
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink">
                Activity
              </h2>
              <Link
                href="/activity"
                className="inline-flex items-center gap-1 text-2xs font-medium text-ink-dim hover:text-ember"
              >
                All activity
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="divide-y divide-border-soft">
              {activity.slice(0, 7).map((a) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <li key={a.id} className="flex gap-3 px-5 py-3">
                    <span
                      className={cx(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2",
                        ACTIVITY_TONE[a.kind],
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-ink">{a.title}</p>
                      <p className="mt-0.5 truncate text-2xs text-ink-faint">
                        {a.detail}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-2xs text-ink-faint">
                      {a.at}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {/* fleet */}
          <Panel pad={false}>
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink">
                Data plane
              </h2>
              <span className="inline-flex items-center gap-1.5 text-2xs text-live">
                <Server className="h-3.5 w-3.5" />
                {fleet.length} nodes healthy
              </span>
            </div>
            <ul className="divide-y divide-border-soft">
              {fleet.map((n) => (
                <li key={n.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-ink">
                      {n.id}
                    </span>
                    <span className="text-2xs text-ink-faint">
                      {REGIONS[n.region].city} · {n.apps} apps
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 flex justify-between text-2xs text-ink-faint">
                        <span>CPU</span>
                        <span className="font-mono text-ink-dim">{n.cpu}%</span>
                      </div>
                      <BarGauge value={n.cpu} tone={n.cpu > 75 ? "warn" : "live"} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-2xs text-ink-faint">
                        <span>MEM</span>
                        <span className="font-mono text-ink-dim">{n.mem}%</span>
                      </div>
                      <BarGauge value={n.mem} tone={n.mem > 75 ? "warn" : "live"} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
