/* ============================================================
   Cantila public status page (plan §5.3).

   A branded, server-rendered status view at /status — separate from
   the Console's `/monitoring` view, which is operator-facing and
   tenant-scoped. This page sources the same `/v1/monitoring`
   snapshot but renders it without auth chrome for public visitors.

   The Next.js server fetches the control plane directly using the
   server-side CANTILA_API_KEY (the same env var the proxy uses) so
   visitors never need a key of their own. Rendered with ISR-style
   revalidation every 30s.
   ============================================================ */

import { BrandMark } from "@/components/Sidebar";
import { Pill, cx } from "@/components/ui";
import type {
  ApiMonitoringSnapshot,
  ApiStatusComponent,
  ApiIncident,
} from "@/lib/api";
import { CheckCircle2, AlertTriangle, CircleAlert } from "lucide-react";

export const revalidate = 30;
export const dynamic = "force-dynamic";

const TARGET =
  process.env.CANTILA_CONTROL_PLANE_URL ?? "http://localhost:8080";
const SERVER_API_KEY = process.env.CANTILA_API_KEY;

async function fetchMonitoring(): Promise<ApiMonitoringSnapshot | null> {
  try {
    const res = await fetch(`${TARGET}/v1/monitoring`, {
      headers: SERVER_API_KEY
        ? { authorization: `Bearer ${SERVER_API_KEY}` }
        : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiMonitoringSnapshot;
  } catch {
    // Control plane unreachable — render the "no signal" fallback. We
    // intentionally don't throw: a status page that 500s when its data
    // source is down is the opposite of useful.
    return null;
  }
}

/* ---------- rollup helpers ---------- */

function overallStatus(
  components: ApiStatusComponent[],
): { label: string; tone: "live" | "warn" | "down"; dot: string } {
  if (components.length === 0) {
    return {
      label: "No signal",
      tone: "warn",
      dot: "bg-warn",
    };
  }
  if (components.some((c) => c.status === "down")) {
    return {
      label: "Service disruption",
      tone: "down",
      dot: "bg-down",
    };
  }
  if (components.some((c) => c.status === "degraded")) {
    return {
      label: "Partial degradation",
      tone: "warn",
      dot: "bg-warn",
    };
  }
  return {
    label: "All systems operational",
    tone: "live",
    dot: "bg-live",
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function StatusPage() {
  const snapshot = await fetchMonitoring();
  const components = snapshot?.statusComponents ?? [];
  const incidents = snapshot?.incidents ?? [];
  const overall = overallStatus(components);

  return (
    <div className="space-y-8">
      {/* header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <div>
            <h1 className="font-display text-lg font-semibold text-ink">
              Cantila Status
            </h1>
            <p className="text-2xs text-ink-faint">
              Real-time platform health
            </p>
          </div>
        </div>
        {snapshot && (
          <span className="font-mono text-2xs text-ink-faint">
            updated {formatTime(snapshot.at)}
          </span>
        )}
      </header>

      {/* overall banner */}
      <section
        className={cx(
          "panel flex items-center gap-4 p-6",
          overall.tone === "live" && "border-live/30 bg-live/5",
          overall.tone === "warn" && "border-warn/30 bg-warn/5",
          overall.tone === "down" && "border-down/30 bg-down/5",
        )}
      >
        <span
          className={cx(
            "flex h-12 w-12 items-center justify-center rounded-full border",
            overall.tone === "live" && "border-live/30 bg-live/10 text-live",
            overall.tone === "warn" && "border-warn/30 bg-warn/10 text-warn",
            overall.tone === "down" && "border-down/30 bg-down/10 text-down",
          )}
        >
          {overall.tone === "live" ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : overall.tone === "down" ? (
            <CircleAlert className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold text-ink">
            {overall.label}
          </h2>
          {snapshot && (
            <p className="mt-0.5 text-2xs text-ink-dim">
              {snapshot.summary.monitorsUp} of {snapshot.monitors.length}{" "}
              monitors up · avg uptime {snapshot.summary.avgUptimePct}%
              {snapshot.summary.activeAlerts > 0 &&
                ` · ${snapshot.summary.activeAlerts} active alert${snapshot.summary.activeAlerts === 1 ? "" : "s"}`}
              {snapshot.summary.openIncidents > 0 &&
                ` · ${snapshot.summary.openIncidents} open incident${snapshot.summary.openIncidents === 1 ? "" : "s"}`}
            </p>
          )}
          {!snapshot && (
            <p className="mt-0.5 text-2xs text-ink-dim">
              Could not reach the control plane.{" "}
              <span className="font-mono">{TARGET}</span> is unreachable.
            </p>
          )}
        </div>
      </section>

      {/* components grid */}
      {components.length > 0 && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Components</h2>
          <div className="panel divide-y divide-border-soft p-0">
            {components.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <span
                  className={cx(
                    "h-2 w-2 shrink-0 rounded-full",
                    c.status === "up" && "bg-live",
                    c.status === "degraded" && "bg-warn",
                    c.status === "down" && "bg-down",
                  )}
                />
                <span className="flex-1 text-sm text-ink">{c.name}</span>
                {c.reason && (
                  <span className="hidden text-2xs text-ink-faint sm:block">
                    {c.reason}
                  </span>
                )}
                <Pill
                  tone={
                    c.status === "up"
                      ? "live"
                      : c.status === "down"
                        ? "down"
                        : "warn"
                  }
                >
                  {c.status === "up"
                    ? "Operational"
                    : c.status === "down"
                      ? "Down"
                      : "Degraded"}
                </Pill>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* incidents */}
      <section>
        <h2 className="kv mb-3 text-ink-dim">
          Incidents{" "}
          {incidents.length > 0 && (
            <span className="text-ink-faint">· {incidents.length}</span>
          )}
        </h2>
        {incidents.length === 0 ? (
          <div className="panel flex items-center gap-3 px-5 py-8 text-sm text-ink-faint">
            <CheckCircle2 className="h-4 w-4 text-live" />
            No incidents reported in the current window.
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function IncidentCard({ incident }: { incident: ApiIncident }) {
  return (
    <article className="panel p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">
            {incident.title}
          </h3>
          <p className="mt-1 text-2xs text-ink-faint">
            Started {formatTime(incident.startedAt)} · {incident.duration}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill
            tone={
              incident.severity === "critical"
                ? "down"
                : incident.severity === "warning"
                  ? "warn"
                  : "info"
            }
          >
            {incident.severity}
          </Pill>
          <Pill
            tone={
              incident.state === "resolved"
                ? "live"
                : incident.state === "monitoring"
                  ? "info"
                  : "warn"
            }
          >
            {incident.state}
          </Pill>
        </div>
      </header>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
        {incident.summary}
      </p>
      {incident.updates.length > 0 && (
        <ol className="mt-4 space-y-2 border-l-2 border-border-soft pl-4">
          {incident.updates.map((u, idx) => (
            <li key={idx} className="relative text-2xs text-ink-dim">
              <span className="absolute -left-[1.4rem] mt-[0.35rem] h-2 w-2 rounded-full bg-border" />
              <span className="font-mono text-ink-faint">{formatTime(u.at)}</span>
              <span className="ml-2 uppercase tracking-wide text-ink-faint">
                {u.state}
              </span>
              <div className="mt-0.5 text-ink-dim">{u.note}</div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
