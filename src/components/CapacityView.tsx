"use client";

/* ============================================================
   Capacity — operator view onto the fleet rollup CapacityAgent
   reasons over (plan §5.2 + §15.1).

   Source: GET /v1/capacity, polled every 10 s. Renders the same
   per-node + per-region picture the brain consumes, so the user
   can sanity-check the agent's pre-warm / rebalance / shrink
   proposals against the underlying numbers.
   ============================================================ */

import { useEffect, useState } from "react";
import { Server, Gauge, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader, Pill, cx } from "@/components/ui";
import {
  api,
  isControlPlaneLive,
  type ApiCapacityRollup,
  type ApiCapacityNode,
} from "@/lib/api";

/** Match the brain's thresholds in `capacity-agent.ts` so the colours
 *  and the agent's behaviour line up — a row that's red here is the
 *  same row the brain would flag as saturated. */
const HOT_PCT = 75;
const SATURATED_PCT = 90;
const UNDER_PCT = 25;

function loadTone(pct: number): {
  pill: "live" | "info" | "warn" | "down" | "neutral";
  bar: string;
  label: string;
} {
  if (pct >= SATURATED_PCT) {
    return { pill: "down", bar: "bg-down", label: "saturated" };
  }
  if (pct >= HOT_PCT) {
    return { pill: "warn", bar: "bg-warn", label: "hot" };
  }
  if (pct < UNDER_PCT) {
    return { pill: "neutral", bar: "bg-info/60", label: "under-utilised" };
  }
  return { pill: "live", bar: "bg-live", label: "healthy" };
}

function LoadBar({ pct }: { pct: number }) {
  const tone = loadTone(pct);
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className={cx("h-full transition-all", tone.bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

export default function CapacityView() {
  const [snap, setSnap] = useState<ApiCapacityRollup | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(spin = false) {
    if (spin) setRefreshing(true);
    try {
      const next = await api.getCapacity();
      setSnap(next);
      setFetchedAt(new Date().toISOString());
    } catch {
      /* swallow — keep last good snapshot */
    } finally {
      if (spin) setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      void load(false);
      interval = window.setInterval(() => load(false), 10_000);
    })();
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const totalsTone = snap ? loadTone(snap.totals.loadPct) : null;
  const hottestRegion = snap?.regions.reduce(
    (a, b) => (a && a.loadPct >= b.loadPct ? a : b),
    snap.regions[0],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Build · fleet"
        title="Capacity"
        lead="Per-node and per-region load across the fleet. The same picture CapacityAgent consumes — when a row turns red here, the brain is proposing a pre-warm on the corresponding node."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && snap && fetchedAt && (
              <span className="inline-flex items-center gap-1 rounded-md bg-live/5 px-2 py-1 text-2xs font-medium text-live ring-1 ring-live/30">
                <Gauge className="h-3 w-3" />
                live · {relative(fetchedAt)}
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink-faint">
                control plane offline
              </span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing || !liveMode}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        }
      />

      {!snap ? (
        <div className="panel py-10 text-center text-2xs text-ink-faint">
          {liveMode === false
            ? "Control plane unreachable — capacity data unavailable."
            : "Loading fleet capacity…"}
        </div>
      ) : (
        <>
          {/* totals hero */}
          <div className="panel relative overflow-hidden p-5">
            <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-16" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-info/40 bg-info/10 text-info">
                <Server className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-semibold text-ink">
                  Fleet at {snap.totals.loadPct}%
                  {totalsTone && (
                    <Pill tone={totalsTone.pill}>{totalsTone.label}</Pill>
                  )}
                </h2>
                <p className="mt-1 text-2xs text-ink-dim">
                  {snap.totals.instances} instances across{" "}
                  {snap.totals.nodes} node{snap.totals.nodes === 1 ? "" : "s"}
                  {" · "}
                  {snap.totals.capacity} slots at {snap.nodeCapacity} per node.
                  {hottestRegion && snap.regions.length > 1 && (
                    <>
                      {" "}
                      Hottest region:{" "}
                      <span className="text-ink">{hottestRegion.region}</span>{" "}
                      at {hottestRegion.loadPct}%.
                    </>
                  )}
                </p>
                <div className="mt-3 max-w-xl">
                  <LoadBar pct={snap.totals.loadPct} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-surface-2 px-3 py-2.5 ring-1 ring-border-soft">
                  <div className="font-display text-lg font-semibold text-ink">
                    {snap.totals.nodes}
                  </div>
                  <div className="text-2xs text-ink-faint">nodes</div>
                </div>
                <div className="rounded-lg bg-surface-2 px-3 py-2.5 ring-1 ring-border-soft">
                  <div className="font-display text-lg font-semibold text-ink">
                    {snap.totals.instances}
                  </div>
                  <div className="text-2xs text-ink-faint">instances</div>
                </div>
                <div className="rounded-lg bg-surface-2 px-3 py-2.5 ring-1 ring-border-soft">
                  <div className="font-display text-lg font-semibold text-ink">
                    {snap.totals.capacity - snap.totals.instances}
                  </div>
                  <div className="text-2xs text-ink-faint">free slots</div>
                </div>
              </div>
            </div>
          </div>

          {/* per region */}
          <section>
            <h2 className="kv mb-3 flex items-center gap-2 text-ink-dim">
              <MapPin className="h-3 w-3 text-ember" />
              Regions ·{" "}
              <span className="text-ink">{snap.regions.length}</span>
            </h2>
            {snap.regions.length === 0 ? (
              <div className="panel py-6 text-center text-2xs text-ink-faint">
                No instances are scheduled anywhere yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {snap.regions.map((r) => {
                  const tone = loadTone(r.loadPct);
                  return (
                    <div
                      key={r.region}
                      className="panel flex flex-col gap-3 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-2xs uppercase tracking-wider text-ink-dim">
                          {r.region}
                        </span>
                        <Pill tone={tone.pill}>{tone.label}</Pill>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-semibold text-ink">
                          {r.loadPct}%
                        </span>
                        <span className="text-2xs text-ink-faint">
                          {r.instances}/{r.capacity} ·{" "}
                          {r.nodes} node{r.nodes === 1 ? "" : "s"}
                        </span>
                      </div>
                      <LoadBar pct={r.loadPct} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* per node */}
          <section>
            <h2 className="kv mb-3 flex items-center gap-2 text-ink-dim">
              <Server className="h-3 w-3 text-info" />
              Nodes ·{" "}
              <span className="text-ink">{snap.nodes.length}</span>
            </h2>
            {snap.nodes.length === 0 ? (
              <div className="panel py-6 text-center text-2xs text-ink-faint">
                No nodes currently carry instances. They appear here as soon
                as a project is scheduled onto them.
              </div>
            ) : (
              <div className="panel overflow-hidden p-0">
                <table className="w-full text-2xs">
                  <thead className="bg-surface-2 text-ink-dim">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Node</th>
                      <th className="px-4 py-2 text-left font-medium">
                        Region
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Instances
                      </th>
                      <th className="px-4 py-2 text-right font-medium">Load</th>
                      <th className="px-4 py-2 text-left font-medium">Bar</th>
                      <th className="px-4 py-2 text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {snap.nodes.map((n: ApiCapacityNode) => {
                      const tone = loadTone(n.loadPct);
                      return (
                        <tr key={n.nodeId}>
                          <td className="px-4 py-2 font-mono text-ink">
                            {n.nodeId}
                          </td>
                          <td className="px-4 py-2 text-ink-dim">
                            {n.region}
                          </td>
                          <td className="px-4 py-2 text-right text-ink">
                            {n.instances}/{n.capacity}
                          </td>
                          <td
                            className={cx(
                              "px-4 py-2 text-right font-medium",
                              n.loadPct >= SATURATED_PCT
                                ? "text-down"
                                : n.loadPct >= HOT_PCT
                                  ? "text-warn"
                                  : n.loadPct < UNDER_PCT
                                    ? "text-ink-dim"
                                    : "text-live",
                            )}
                          >
                            {n.loadPct}%
                          </td>
                          <td className="px-4 py-2">
                            <div className="w-32">
                              <LoadBar pct={n.loadPct} />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <Pill tone={tone.pill}>{tone.label}</Pill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-border-soft bg-surface-2/60 px-4 py-2 text-2xs text-ink-faint">
                  Thresholds match CapacityAgent: hot ≥ {HOT_PCT}%, saturated
                  ≥ {SATURATED_PCT}%, under-utilised {"<"} {UNDER_PCT}%. Empty
                  nodes in a region don&apos;t appear until something is
                  scheduled onto them.
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
