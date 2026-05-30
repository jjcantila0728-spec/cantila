"use client";

import { useState } from "react";
import { RotateCw, Undo2, GitCommitHorizontal } from "lucide-react";
import { api, type ApiProjectDetail, type ApiDeployment } from "../lib/api";
import { StatusBadge, cx } from "./ui";

export default function ProjectDeploysPanel({
  detail,
  onRefresh,
}: {
  detail: ApiProjectDetail;
  onRefresh: () => Promise<void>;
}) {
  const { project, deployments } = detail;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(label);
    setErr(null);
    try {
      await fn();
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">
          Deployments
        </h3>
        <button
          onClick={() => run("deploy", () => api.deploy(project.id))}
          disabled={busy !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
        >
          <RotateCw className={cx("h-3.5 w-3.5", busy === "deploy" && "animate-spin")} />
          Redeploy
        </button>
      </div>
      {err && <div className="text-2xs text-down">{err}</div>}

      {deployments.length === 0 ? (
        <p className="text-sm text-ink-faint">No deployments yet.</p>
      ) : (
        <ul className="divide-y divide-border-soft rounded-xl border border-border">
          {deployments.map((d: ApiDeployment) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <GitCommitHorizontal className="h-4 w-4 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-ink">
                  {d.commitMessage ?? d.id}
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-2xs text-ink-faint">
                  {d.commitHash && <span>{d.commitHash.slice(0, 7)}</span>}
                  <span>· {d.trigger}</span>
                  {d.branch && <span>· {d.branch}</span>}
                </div>
              </div>
              <StatusBadge status={d.status} />
              {d.status !== "live" && (
                <button
                  onClick={() => run(d.id, () => api.rollback(project.id, d.id))}
                  disabled={busy !== null}
                  title="Roll back to this deployment"
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-60"
                >
                  <Undo2 className={cx("h-3 w-3", busy === d.id && "animate-spin")} />
                  Rollback
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
