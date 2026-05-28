"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Workflow as WorkflowIcon,
  Loader2,
  AlertCircle,
  Play,
  Zap,
} from "lucide-react";
import { PageHeader, Pill, StatusBadge, cx } from "@/components/ui";
import {
  api,
  isControlPlaneLive,
  type ApiAutomation,
  type ApiWorkflowSummary,
} from "@/lib/api";

interface Props {
  automationId: string;
}

export default function AutomationDetailView({ automationId }: Props) {
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [automation, setAutomation] = useState<ApiAutomation | null>(null);
  const [workflows, setWorkflows] = useState<ApiWorkflowSummary[]>([]);
  const [engineLabel, setEngineLabel] = useState<string | null>(null);
  const [engineLive, setEngineLive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      try {
        const [{ automation: a }, { workflows: w }, info] = await Promise.all([
          api.getAutomation(automationId),
          api.listWorkflows(automationId),
          api.getAutomationsInfo().catch(() => null),
        ]);
        if (cancelled) return;
        setAutomation(a);
        setWorkflows(w);
        if (info) {
          const row = info.kinds.find((k) => k.kind === a.kind);
          if (row) {
            setEngineLabel(row.label);
            setEngineLive(row.live);
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [automationId]);

  async function createWorkflow(e: React.FormEvent) {
    e.preventDefault();
    if (!automation || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { workflow } = await api.saveWorkflow(automation.id, {
        id: "",
        name: newName.trim(),
        nodes: [],
        edges: [],
        triggers: [],
      });
      setNewName("");
      setWorkflows((prev) => [
        { id: workflow.id, name: workflow.name, active: false },
        ...prev,
      ]);
      // Navigate straight into the editor.
      window.location.href = `/automations/${automation.id}/workflows/${workflow.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-2xs text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        loading automation…
      </div>
    );
  }

  if (liveMode === false) {
    return (
      <div className="space-y-4">
        <Link
          href="/automations"
          className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> All automations
        </Link>
        <div className="panel p-6">
          <p className="text-sm text-ink-dim">
            Automation detail needs a live control plane. Start the control
            plane and reload.
          </p>
        </div>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="space-y-4">
        <Link
          href="/automations"
          className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" /> All automations
        </Link>
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error ?? "automation not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Link
        href="/automations"
        className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" /> All automations
      </Link>

      <PageHeader
        eyebrow={`${automation.kind === "n8n" ? "n8n" : "OpenClaw"} instance · live`}
        title={automation.name}
        lead="Manage workflows on this instance. Each workflow is a graph of nodes the engine runs end-to-end."
        actions={
          <div className="flex items-center gap-2">
            {engineLabel && (
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-medium",
                  engineLive
                    ? "border-live/30 bg-live/5 text-live"
                    : "border-border bg-surface-2 text-ink-dim",
                )}
              >
                <Zap className="h-3 w-3" /> {engineLabel}
              </span>
            )}
            <StatusBadge status={automation.status} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Meta label="Slug" value={automation.slug} />
        <Meta label="Region" value={automation.region} />
        <Meta
          label="Always on"
          value={automation.alwaysOn ? "yes" : "no"}
        />
      </div>

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            Workflows
          </h2>
          <span className="font-mono text-2xs text-ink-faint">
            {workflows.length} total
          </span>
        </div>

        <form
          onSubmit={createWorkflow}
          className="panel flex items-center gap-2 p-3"
        >
          <Plus className="h-4 w-4 shrink-0 text-ember" strokeWidth={2.4} />
          <input
            type="text"
            placeholder="New workflow name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors focus:border-ember placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-ember px-3 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            Create + open
          </button>
        </form>

        {workflows.length === 0 ? (
          <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-12 text-center">
            <WorkflowIcon className="h-5 w-5 text-ember" />
            <p className="text-sm font-semibold text-ink">No workflows yet</p>
            <p className="text-2xs text-ink-faint">
              Create one above to open the canvas.
            </p>
          </div>
        ) : (
          <ul className="panel divide-y divide-border-soft">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/automations/${automation.id}/workflows/${wf.id}`}
                    className="block truncate font-medium text-ink hover:text-ember"
                  >
                    {wf.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-ink-faint">
                    <span className="font-mono">{wf.id}</span>
                    {wf.lastRunAt && (
                      <>
                        <span>·</span>
                        <span>last run {wf.lastRunAt}</span>
                      </>
                    )}
                    {wf.lastRunStatus && (
                      <Pill
                        tone={
                          wf.lastRunStatus === "success"
                            ? "live"
                            : wf.lastRunStatus === "failed"
                              ? "down"
                              : "info"
                        }
                      >
                        {wf.lastRunStatus}
                      </Pill>
                    )}
                  </div>
                </div>
                <Link
                  href={`/automations/${automation.id}/workflows/${wf.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ember/40 hover:text-ember"
                >
                  <Play className="h-3 w-3" />
                  Open editor
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-ink">{value}</div>
    </div>
  );
}
