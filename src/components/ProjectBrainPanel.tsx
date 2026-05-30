"use client";

/* ============================================================
   BrainPanel — the per-project brain readout. Shows the rolling
   summary (token-preserving prompt prefix), the message and
   asset counts, the last-change timestamp, and a refresh
   button. This is the user-facing "preserves a token" indicator.
   ============================================================ */

import { useEffect, useState } from "react";
import { Brain, RefreshCw, MessageSquare, Image as ImageIcon, Clock, Cpu } from "lucide-react";
import { builderApi, type ApiProjectBrain } from "../lib/api";
import ProjectLogsPanel from "./ProjectLogsPanel";

export default function ProjectBrainPanel({ projectId }: { projectId: string }) {
  const [brain, setBrain] = useState<ApiProjectBrain | null>(null);
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<{ id: string; status: string }[] | null>(null);
  const [load, setLoad] = useState<number | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    void builderApi
      .getProjectInstances(projectId)
      .then((r) => alive && setInstances(r.instances))
      .catch(() => {});
    void builderApi
      .getProjectMetrics(projectId)
      .then((r) => {
        if (!alive || !r.samples.length) return;
        const last = r.samples[r.samples.length - 1];
        if (typeof last?.cpuPct === "number") setLoad(last.cpuPct);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [projectId]);

  async function refresh() {
    setLoading(true);
    try {
      setBrain(await builderApi.getProjectBrain(projectId));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-ember" />
          <h2 className="font-display text-base font-semibold text-ink">Project brain</h2>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-50"
        >
          <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={MessageSquare}
          label="Messages"
          value={brain?.messageCount ?? 0}
        />
        <Stat
          icon={ImageIcon}
          label="Assets"
          value={brain?.assetCount ?? 0}
        />
        <Stat
          icon={Brain}
          label="Summary tokens"
          value={brain?.memory.tokenCount ?? 0}
          hint="Cached as the prompt prefix"
        />
      </div>

      <div>
        <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
          Rolling summary
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm leading-relaxed text-ink-dim">
          {brain?.memory.summary ? (
            <p className="whitespace-pre-wrap">{brain.memory.summary}</p>
          ) : (
            <p className="text-ink-faint">
              No summary yet — the brain writes one once the build has produced
              a few messages.
            </p>
          )}
        </div>
      </div>

      {brain?.lastChangeAt && (
        <div className="flex items-center gap-1.5 text-2xs text-ink-faint">
          <Clock className="h-3 w-3" />
          Last change {new Date(brain.lastChangeAt).toLocaleString()}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
        <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-ink-dim">
          <Cpu className="h-3.5 w-3.5 text-ember" /> Compute · autoscale
        </div>
        <div className="flex items-center gap-4 text-sm text-ink">
          <span>{instances ? `${instances.length} instance${instances.length === 1 ? "" : "s"}` : "—"}</span>
          <span className="text-ink-dim">·</span>
          <span>{load != null ? `${Math.round(load)}% load` : "load —"}</span>
          <span className="ml-auto rounded bg-bg px-1.5 py-0.5 text-2xs text-ink-dim">auto</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-dim">Logs</div>
        <ProjectLogsPanel projectId={projectId} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Brain;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-ink-faint">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-2xs text-ink-faint">{hint}</div>}
    </div>
  );
}
