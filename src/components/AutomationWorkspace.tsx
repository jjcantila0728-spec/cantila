"use client";

/* ============================================================
   AutomationWorkspace — the home for one automation instance.

   Replaces the old `/automations/[id]` redirect into the generic
   project workspace (chat + file editor), which was meaningless for
   a workflow engine. This workspace is workflow-focused: instance
   header, a New / Import action bar, and the workflow list — each
   workflow opening the existing canvas editor.
   ============================================================ */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Upload,
  Workflow,
  Loader2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { PageHeader, Pill, StatusBadge, cx } from "@/components/ui";
import { api, type ApiAutomation, type ApiWorkflowSummary } from "@/lib/api";
import ImportWorkflowModal from "@/components/ImportWorkflowModal";

interface Props {
  automationId: string;
}

export default function AutomationWorkspace({ automationId }: Props) {
  const router = useRouter();
  const [automation, setAutomation] = useState<ApiAutomation | null>(null);
  const [workflows, setWorkflows] = useState<ApiWorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ automation: a }, { workflows: wfs }] = await Promise.all([
        api.getAutomation(automationId),
        api.listWorkflows(automationId).catch(() => ({ workflows: [] })),
      ]);
      setAutomation(a);
      setWorkflows(wfs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [automationId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ----- new blank workflow → straight into the canvas ----- */

  const createWorkflow = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const { workflow } = await api.saveWorkflow(automationId, {
        id: "",
        name: "Untitled workflow",
        nodes: [],
        edges: [],
        triggers: [],
      });
      router.push(
        `/automations/${automationId}/workflows/${encodeURIComponent(workflow.id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not create workflow");
      setCreating(false);
    }
  }, [automationId, router]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-2xs text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        loading automation…
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
          <ArrowLeft className="h-3 w-3" /> Back to automations
        </Link>
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error ?? "automation not found"}
        </div>
      </div>
    );
  }

  const isN8n = automation.kind === "n8n";

  return (
    <div className="space-y-6">
      <Link
        href="/automations"
        className="inline-flex items-center gap-1.5 text-2xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" /> Back to automations
      </Link>

      <PageHeader
        eyebrow={isN8n ? "n8n automation" : "OpenClaw automation"}
        title={automation.name}
        lead="Build workflows on the Cantila canvas, import a workflow you already have, or open the underlying engine admin."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={automation.status} />
            <Pill tone="neutral">{automation.region}</Pill>
            {automation.alwaysOn && <Pill tone="live">always-on</Pill>}
            <a
              href={automation.adminUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-ink-dim hover:border-ember/40 hover:text-ember"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open {isN8n ? "n8n" : "engine"} admin
            </a>
          </div>
        }
      />

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={createWorkflow}
          disabled={creating}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.4} />
          )}
          New workflow
        </button>
        <button
          onClick={() => setImporting(true)}
          disabled={!isN8n}
          title={
            isN8n
              ? "Import an existing n8n workflow from its JSON"
              : "Import is only available for n8n automations"
          }
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium text-ink hover:border-ember/40 hover:text-ember disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          Import workflow
        </button>
      </div>

      {/* workflow list */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
          <Workflow className="h-3 w-3" />
          Workflows · {workflows.length}
        </div>

        {workflows.length === 0 ? (
          <div className="panel dot-grid flex flex-col items-center justify-center gap-3 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember/10 text-ember">
              <Workflow className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">No workflows yet</p>
              <p className="mt-1 text-2xs text-ink-faint">
                Start one on the canvas, or import a workflow you already built
                in n8n.
              </p>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workflows.map((wf) => (
              <li key={wf.id}>
                <Link
                  href={`/automations/${automationId}/workflows/${encodeURIComponent(wf.id)}`}
                  className="panel group flex flex-col gap-2 p-4 transition-all hover:-translate-y-0.5 hover:border-ember/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-display text-sm font-semibold text-ink">
                      {wf.name}
                    </span>
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
                  <div className="flex items-center gap-1.5 text-2xs text-ink-faint">
                    <Zap className="h-3 w-3" />
                    {wf.active ? "active" : "inactive"}
                    {wf.lastRunAt && (
                      <span className="font-mono">
                        · last run {wf.lastRunAt.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {importing && (
        <ImportWorkflowModal
          automationId={automationId}
          onClose={() => setImporting(false)}
          onImported={(workflowId) =>
            router.push(
              `/automations/${automationId}/workflows/${encodeURIComponent(workflowId)}`,
            )
          }
        />
      )}
    </div>
  );
}
