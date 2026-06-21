"use client";

/* Deploy-health panel (top-tier program #13). Surfaces the account-wide
   Chat-Deploy success metrics from /v1/deploy/metrics: success rate, live vs
   failed, the failure-reason breakdown, and per-trigger totals so Chat Deploy
   (trigger="chat") can be read apart from git/api deploys. */

import { useEffect, useState } from "react";

type Metrics = Awaited<ReturnType<typeof import("@/lib/api").api.deployMetrics>>;

const REASON_LABEL: Record<string, string> = {
  build_failed: "Build failed",
  migration_failed: "DB migration failed",
  provision_failed: "Provisioning failed",
  health_check_failed: "Health check failed",
  orphaned: "Orphaned",
  unknown: "Unknown",
};

export default function DeployHealthView() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { api } = await import("@/lib/api");
        const m = await api.deployMetrics();
        if (alive) setData(m);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rate = data?.successRatePct ?? 0;
  const rateTone = rate >= 90 ? "#4ade80" : rate >= 70 ? "#fbbf24" : "#f87171";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
          Deploy health
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Chat-Deploy success across all your projects.
        </p>
      </header>

      {loading && <p className="text-sm text-ink-dim">Loading deploy metrics…</p>}
      {error && (
        <p className="rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-sm text-down">
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Success rate" value={`${rate}%`} tone={rateTone} />
            <Stat label="Live" value={String(data.live)} />
            <Stat label="Failed" value={String(data.failed)} />
            <Stat label="Total" value={String(data.total)} />
          </div>

          <section className="panel p-5">
            <h2 className="kv mb-3">Failures by reason</h2>
            {Object.keys(data.byFailureReason).length === 0 ? (
              <p className="text-sm text-ink-dim">No failed deploys. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(data.byFailureReason)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <li
                      key={reason}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-ink">
                        {REASON_LABEL[reason] ?? reason}
                      </span>
                      <span className="font-mono text-ink-dim">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="kv mb-3">By trigger</h2>
            <ul className="space-y-2">
              {Object.entries(data.byTrigger).map(([trig, t]) => {
                const pct =
                  t.total === 0 ? 0 : Math.round((t.live / t.total) * 100);
                return (
                  <li
                    key={trig}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-ink">{trig}</span>
                    <span className="font-mono text-ink-dim">
                      {t.live}/{t.total} live ({pct}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="kv">{label}</div>
      <div
        className="mt-1 font-display text-2xl font-semibold"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
