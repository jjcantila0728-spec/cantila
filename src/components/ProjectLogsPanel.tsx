"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { cx } from "./ui";

export default function ProjectLogsPanel({ projectId }: { projectId: string }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.getLogs(projectId);
      const newest = res.deployments[0];
      if (reqIdRef.current === reqId) {
        setLines(newest ? newest.logs : []);
      }
    } catch (e) {
      if (reqIdRef.current === reqId) {
        setErr(e instanceof Error ? e.message : "could not load logs");
        setLines([]);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Logs</h3>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
        >
          <RefreshCw className={cx("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}
      <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-bg p-3 font-mono text-2xs leading-relaxed text-ink-dim">
        {lines === null
          ? "Loading…"
          : lines.length === 0
            ? "No logs for the latest deployment yet."
            : lines.join("\n")}
      </pre>
    </div>
  );
}
