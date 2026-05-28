"use client";

/* ============================================================
   BrainPanel — the per-project brain readout. Shows the rolling
   summary (token-preserving prompt prefix), the message and
   asset counts, the last-change timestamp, and a refresh
   button. This is the user-facing "preserves a token" indicator.
   ============================================================ */

import { useEffect, useState } from "react";
import { Brain, RefreshCw, MessageSquare, Image as ImageIcon, Clock } from "lucide-react";
import { builderApi, type ApiProjectBrain } from "../lib/api";

export default function ProjectBrainPanel({ projectId }: { projectId: string }) {
  const [brain, setBrain] = useState<ApiProjectBrain | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
