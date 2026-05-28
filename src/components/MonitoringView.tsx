"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  TriangleAlert,
  Info,
  Activity as ActivityIcon,
  ArrowUpRight,
  CheckCircle2,
  Bell,
  Server,
  ExternalLink,
  Check,
  Zap,
} from "lucide-react";
import { PageHeader, Pill, Button, cx } from "@/components/ui";
import {
  uptimeMonitors as mockUptimeMonitors,
  alerts as mockAlerts,
  incidents as mockIncidents,
  statusComponents as mockStatusComponents,
  getProject,
  REGIONS,
} from "@/lib/mock-data";
import type {
  Alert,
  AlertSeverity,
  AlertState,
  CheckStatus,
  Incident,
  IncidentState,
  IncidentUpdate,
  Region,
  StatusComponent,
  UptimeMonitor,
} from "@/lib/types";
import { api, isControlPlaneLive } from "@/lib/api";

/* ---------- vocabulary ---------- */

const CHECK: Record<
  CheckStatus,
  { label: string; pill: "live" | "warn" | "down"; dot: string }
> = {
  up: { label: "Operational", pill: "live", dot: "bg-live" },
  degraded: { label: "Degraded", pill: "warn", dot: "bg-warn" },
  down: { label: "Down", pill: "down", dot: "bg-down" },
};

const SEVERITY: Record<
  AlertSeverity,
  { Icon: typeof Info; color: string; pill: "down" | "warn" | "info" }
> = {
  critical: { Icon: CircleAlert, color: "text-down", pill: "down" },
  warning: { Icon: TriangleAlert, color: "text-warn", pill: "warn" },
  info: { Icon: Info, color: "text-info", pill: "info" },
};

const ALERT_STATE: Record<
  AlertState,
  { pill: "down" | "warn" | "live"; label: string }
> = {
  firing: { pill: "down", label: "Firing" },
  acknowledged: { pill: "warn", label: "Acknowledged" },
  resolved: { pill: "live", label: "Resolved" },
};

const INCIDENT_STATE: Record<
  IncidentState,
  { pill: "down" | "warn" | "info" | "live"; label: string }
> = {
  investigating: { pill: "down", label: "Investigating" },
  identified: { pill: "warn", label: "Identified" },
  monitoring: { pill: "info", label: "Monitoring" },
  resolved: { pill: "live", label: "Resolved" },
};

/* ---------- uptime bar ---------- */

function UptimeBar({ history }: { history: CheckStatus[] }) {
  return (
    <div className="flex h-7 w-full items-stretch gap-[2px]">
      {history.map((s, i) => (
        <span
          key={i}
          title={CHECK[s].label}
          className={cx("flex-1 rounded-[1px]", CHECK[s].dot)}
        />
      ))}
    </div>
  );
}

/* ---------- view ---------- */

export default function MonitoringView() {
  // Empty until the effect resolves live mode — keeps mock alerts/incidents
  // off a logged-in user's monitoring dashboard.
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [monitors, setMonitors] = useState<UptimeMonitor[]>([]);
  const [statusList, setStatusList] = useState<StatusComponent[]>([]);
  const [incidentList, setIncidentList] = useState<Incident[]>([]);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  /* Pull from the control plane when reachable. The CP runs its own 30-second
   * sweep; we poll every 10s to surface fresh history without forcing a
   * synchronous re-check on every load. */
  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;
    let first = true;

    async function load() {
      try {
        const snap = await api.getMonitoring("acc_demo", first);
        first = false;
        if (cancelled) return;
        setSnapshotAt(snap.at);
        setMonitors(
          snap.monitors.map((m) => ({
            id: m.projectId,
            name: m.projectName,
            url: m.url,
            projectId: m.projectId,
            status: m.status,
            uptimePct: m.uptimePct,
            responseMs: m.responseMs,
            region: m.region as Region,
            history: m.history,
          })),
        );
        setAlertList(
          snap.alerts.map((a) => ({
            id: a.id,
            title: a.title,
            severity: a.severity,
            state: "firing",
            condition: a.detail,
            projectId: a.projectId,
            channels: ["Email"],
            at: a.at,
          })),
        );
        setStatusList(
          snap.statusComponents.map((c) => ({
            name: c.name,
            status: c.status,
          })),
        );
        setIncidentList(
          snap.incidents.map((i) => ({
            id: i.id,
            title: i.title,
            severity: i.severity as AlertSeverity,
            state: i.state as IncidentState,
            projectId: i.projectId,
            startedAt: i.startedAt,
            duration: i.duration,
            summary: i.summary,
            updates: i.updates.map(
              (u): IncidentUpdate => ({
                at: u.at,
                state: u.state as IncidentState,
                note: u.note,
              }),
            ),
          })),
        );
      } catch {
        /* swallow — keep last good snapshot */
      }
    }

    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setAlertList([...mockAlerts]);
        setMonitors([...mockUptimeMonitors]);
        setStatusList([...mockStatusComponents]);
        setIncidentList([...mockIncidents]);
        return;
      }
      void load();
      interval = window.setInterval(load, 10_000);
    })();

    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  function acknowledge(id: string) {
    setAlertList((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, state: "acknowledged" } : a,
      ),
    );
  }

  const uptimeMonitors = monitors;
  const monitorsUp = uptimeMonitors.filter((m) => m.status === "up").length;
  const avgUptime =
    uptimeMonitors.length === 0
      ? 100
      : uptimeMonitors.reduce((s, m) => s + m.uptimePct, 0) /
        uptimeMonitors.length;
  const firing = alertList.filter((a) => a.state === "firing").length;
  const incidents = incidentList;
  const statusComponents = statusList;
  const openIncidents = incidents.filter((i) => i.state !== "resolved").length;

  const anyDown = statusComponents.some((c) => c.status === "down");
  const anyDegraded = statusComponents.some((c) => c.status === "degraded");
  const overall: CheckStatus = anyDown
    ? "down"
    : anyDegraded
      ? "degraded"
      : "up";
  const overallLabel = anyDown
    ? "Partial outage"
    : anyDegraded
      ? "Degraded performance"
      : "All systems operational";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Observability · live" : "Observability"}
        title="Monitoring"
        lead="Uptime, alerts, incidents and a public status page — every signal from your projects and the Cantila data plane, on first-party observability infrastructure."
        actions={
          <>
            {liveMode === true && (
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2.5 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" />
                {snapshotAt
                  ? `monitors @ ${new Date(snapshotAt).toLocaleTimeString()}`
                  : "live"}
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink-faint">
                control plane offline · mock signals
              </span>
            )}
          <a
            href="https://status.cantila.app"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            <ExternalLink className="h-4 w-4" />
            Status page
          </a>
          </>
        }
      />

      {/* rollup */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Avg uptime · 30d", v: `${avgUptime.toFixed(2)}%` },
          {
            k: "Monitors up",
            v: `${monitorsUp} / ${uptimeMonitors.length}`,
          },
          { k: "Active alerts", v: String(firing) },
          { k: "Open incidents", v: String(openIncidents) },
        ].map((s) => (
          <div key={s.k} className="panel p-4">
            <div className="kv">{s.k}</div>
            <div className="mt-1.5 font-mono text-lg font-semibold text-ink">
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* first-party infrastructure */}
      <div className="panel relative overflow-hidden p-5">
        <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-16" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-start gap-3 lg:w-64 lg:shrink-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ember/30 bg-ember/10 text-ember">
              <Server className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                First-party observability
              </h3>
              <p className="mt-0.5 text-2xs text-ink-faint">
                Built from scratch and operated by Cantila — no third-party
                monitoring vendor.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Metrics pipeline",
              "Uptime probes",
              "Log aggregation",
              "Alert router",
              "Status pages",
              "Error tracking",
            ].map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-soft bg-surface-2 px-2 py-1 text-2xs text-ink-dim"
              >
                <Check className="h-3 w-3 text-live" strokeWidth={3} />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* status page */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Public status page</h2>
        <div className="panel p-0">
          <div className="flex flex-col gap-3 border-b border-border-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cx(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  overall === "up"
                    ? "bg-live/10 text-live"
                    : overall === "degraded"
                      ? "bg-warn/10 text-warn"
                      : "bg-down/10 text-down",
                )}
              >
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">
                  {overallLabel}
                </h3>
                <p className="text-2xs text-ink-faint">
                  status.cantila.app · refreshed just now
                </p>
              </div>
            </div>
            <Pill tone={CHECK[overall].pill}>
              {monitorsUp}/{uptimeMonitors.length} services healthy
            </Pill>
          </div>
          <div className="grid gap-x-6 gap-y-1 p-5 sm:grid-cols-2">
            {statusComponents.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-0 sm:[&:nth-last-child(2)]:border-0"
              >
                <span className="text-sm text-ink-dim">{c.name}</span>
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 text-2xs font-medium",
                    c.status === "up"
                      ? "text-live"
                      : c.status === "degraded"
                        ? "text-warn"
                        : "text-down",
                  )}
                >
                  <span
                    className={cx(
                      "h-1.5 w-1.5 rounded-full",
                      CHECK[c.status].dot,
                    )}
                  />
                  {CHECK[c.status].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* uptime monitors */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Uptime monitors · {uptimeMonitors.length}
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {uptimeMonitors.map((m) => {
              const proj = getProject(m.projectId ?? "");
              return (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cx(
                        "h-2 w-2 shrink-0 rounded-full",
                        CHECK[m.status].dot,
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {proj ? (
                        <Link
                          href={`/projects/${proj.id}`}
                          className="text-sm font-medium text-ink hover:text-ember"
                        >
                          {m.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-ink">
                          {m.name}
                        </span>
                      )}
                      <p className="truncate font-mono text-2xs text-ink-faint">
                        {m.url}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="font-mono text-sm text-ink">
                        {m.uptimePct}%
                      </div>
                      <div className="text-2xs text-ink-faint">uptime 30d</div>
                    </div>
                    <div className="hidden text-right md:block">
                      <div className="font-mono text-sm text-ink">
                        {m.responseMs > 0 ? `${m.responseMs} ms` : "—"}
                      </div>
                      <div className="text-2xs text-ink-faint">
                        {REGIONS[m.region].city}
                      </div>
                    </div>
                    <Pill tone={CHECK[m.status].pill}>
                      {CHECK[m.status].label}
                    </Pill>
                  </div>
                  <div className="mt-3">
                    <UptimeBar history={m.history} />
                    <div className="mt-1 flex justify-between text-[0.6rem] text-ink-faint">
                      <span>44 checks ago</span>
                      <span>now</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* alerts */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Alerts · {firing} firing
        </h2>
        <div className="panel overflow-hidden p-0">
          <div className="divide-y divide-border-soft">
            {alertList.map((a) => {
              const sev = SEVERITY[a.severity];
              const st = ALERT_STATE[a.state];
              const proj = getProject(a.projectId ?? "");
              const SevIcon = sev.Icon;
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <span
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2",
                      sev.color,
                    )}
                  >
                    <SevIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {a.title}
                      </span>
                      <Pill tone={st.pill}>{st.label}</Pill>
                    </div>
                    <p className="mt-0.5 text-2xs text-ink-faint">
                      <span className="font-mono">{a.condition}</span>
                      {proj && (
                        <>
                          {" · "}
                          <Link
                            href={`/projects/${proj.id}`}
                            className="hover:text-ember"
                          >
                            {proj.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden items-center gap-1 md:flex">
                      {a.channels.map((ch) => (
                        <span
                          key={ch}
                          className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-dim"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-2xs text-ink-faint">
                      {a.at}
                    </span>
                    {a.state === "firing" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledge(a.id)}
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* incidents */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">Incident history</h2>
        <div className="space-y-4">
          {incidents.map((inc) => {
            const sev = SEVERITY[inc.severity];
            const st = INCIDENT_STATE[inc.state];
            const proj = getProject(inc.projectId ?? "");
            const SevIcon = sev.Icon;
            return (
              <div key={inc.id} className="panel p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <SevIcon className={cx("h-4 w-4 shrink-0", sev.color)} />
                  <h3 className="font-display text-base font-semibold text-ink">
                    {inc.title}
                  </h3>
                  <Pill tone={st.pill}>{st.label}</Pill>
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-2xs text-ink-faint">
                    <ActivityIcon className="h-3 w-3" />
                    {inc.duration}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-dim">{inc.summary}</p>
                {proj && (
                  <Link
                    href={`/projects/${proj.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-2xs text-ink-faint hover:text-ember"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    {proj.name}
                  </Link>
                )}

                <div className="mt-4 space-y-3 border-t border-border-soft pt-4">
                  {inc.updates.map((u, i) => {
                    const us = INCIDENT_STATE[u.state];
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cx(
                              "mt-1 h-2 w-2 shrink-0 rounded-full",
                              u.state === "resolved"
                                ? "bg-live"
                                : u.state === "monitoring"
                                  ? "bg-info"
                                  : u.state === "identified"
                                    ? "bg-warn"
                                    : "bg-down",
                            )}
                          />
                          {i < inc.updates.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-border" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex items-center gap-2">
                            <Pill tone={us.pill}>{us.label}</Pill>
                            <span className="font-mono text-2xs text-ink-faint">
                              {u.at}
                            </span>
                          </div>
                          <p className="mt-1 text-2xs text-ink-dim">
                            {u.note}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
