"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Workflow,
  Loader2,
  AlertCircle,
  Plus,
  Zap,
} from "lucide-react";
import { PageHeader, Pill, StatusBadge, cx } from "@/components/ui";
import { automations as mockAutomations, workflowsByAutomation } from "@/lib/mock-data";
import type { Automation, AutomationKind, WorkflowSummary } from "@/lib/types";
import { api, isControlPlaneLive, type ApiAutomation } from "@/lib/api";

type KindFilter = "All" | AutomationKind;
const KIND_LABELS: Record<KindFilter, string> = {
  All: "All",
  n8n: "n8n",
  openclaw: "OpenClaw",
};

function kindGlyph(kind: AutomationKind): string {
  return kind === "n8n" ? "n" : "◎";
}

function fromApi(a: ApiAutomation): Automation {
  return {
    id: a.id,
    kind: a.kind,
    name: a.name,
    slug: a.slug,
    status: a.status === "provisioning" || a.status === "building"
      ? "building"
      : a.status,
    region: a.region,
    alwaysOn: a.alwaysOn,
    createdAt: a.createdAt,
    adminUrl: a.adminUrl,
  };
}

export default function AutomationsView() {
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  // Start empty + loading so we never flash mock data on the live site.
  // Mock data is the offline fallback only (see the `!ok` branch below).
  const [items, setItems] = useState<Automation[]>([]);
  const [filter, setFilter] = useState<KindFilter>("All");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void isControlPlaneLive().then(async (ok) => {
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        // Control plane unreachable — show the demo data so the page
        // isn't empty in a local/offline preview.
        setItems(mockAutomations);
        setLoading(false);
        return;
      }
      try {
        const { automations } = await api.listAutomations();
        if (!cancelled) {
          setItems(automations.length ? automations.map(fromApi) : []);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = items.filter(
    (a) => filter === "All" || a.kind === filter,
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Automations · live" : "Automations"}
        title="Workflow automations"
        lead="n8n and OpenClaw instances with a Cantila-native builder. Pick an instance to open the canvas, drag in nodes, attach a Cantila Connection, and run."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> control plane connected
              </span>
            )}
            <Link
              href="/automations/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New automation
            </Link>
          </div>
        }
      />

      {error && (
        <div className="panel flex items-center gap-2 border-down/30 bg-down/5 px-4 py-3 text-2xs font-medium text-down">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* kind tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(["All", "n8n", "openclaw"] as KindFilter[]).map((k) => {
          const active = filter === k;
          const count =
            k === "All"
              ? items.length
              : items.filter((a) => a.kind === k).length;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cx(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                active
                  ? "bg-surface-3 text-ink ring-1 ring-border"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink",
              )}
            >
              {KIND_LABELS[k]}
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.65rem] text-ink-faint">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-2xs text-ink-faint">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          loading from control plane…
        </div>
      )}

      {filtered.length === 0 ? (
        loading ? null : <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AutomationCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationCard({ a }: { a: Automation }) {
  const workflows: WorkflowSummary[] =
    workflowsByAutomation[a.id] ?? [];
  // Automations open their own workflow-focused workspace rather than the
  // generic project workspace (chat + file editor) the handle URL resolves to.
  const href = `/automations/${a.id}`;
  return (
    <Link
      href={href}
      className="panel group flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-ember/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface-3 to-surface-2 font-display text-lg font-bold text-ember">
          {kindGlyph(a.kind)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold text-ink">
              {a.name}
            </h3>
            <StatusBadge status={a.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone={a.kind === "n8n" ? "ember" : "violet"}>
              {a.kind === "n8n" ? "n8n" : "OpenClaw"}
            </Pill>
            <Pill tone="neutral">{a.region}</Pill>
            {a.alwaysOn && <Pill tone="live">always-on</Pill>}
          </div>
        </div>
      </div>

      <div className="border-t border-border-soft pt-3 text-2xs text-ink-dim">
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
          <Workflow className="h-3 w-3" />
          Workflows · {workflows.length}
        </div>
        {workflows.length === 0 ? (
          <p className="text-ink-faint">No workflows yet.</p>
        ) : (
          <ul className="space-y-1">
            {workflows.slice(0, 3).map((wf) => (
              <li key={wf.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{wf.name}</span>
                <span className="shrink-0 font-mono text-[0.65rem] text-ink-faint">
                  {wf.lastRunAt ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="panel dot-grid flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember/10 text-ember">
        <Rocket className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">No automations yet</p>
        <p className="mt-1 text-2xs text-ink-faint">
          Spin up an n8n or OpenClaw instance to start building workflows.
        </p>
      </div>
      <Link
        href="/automations/new"
        className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        New automation
      </Link>
    </div>
  );
}
