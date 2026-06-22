"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Workflow,
  Loader2,
  AlertCircle,
  Plus,
  Zap,
  ExternalLink,
} from "lucide-react";
import { PageHeader, Pill, StatusBadge, cx } from "@/components/ui";
import type { Automation, AutomationKind } from "@/lib/types";
import { api, isControlPlaneLive, type ApiAutomation } from "@/lib/api";
import { liveAutomationsForKind } from "@/data/live-automations";

/** A real workflow from a live n8n/OpenClaw instance. */
type LiveWorkflow = { id: string; name: string; active: boolean; updatedAt?: string };
type LiveWorkflows = {
  configured: boolean;
  workflows: LiveWorkflow[];
  error?: string;
  loading: boolean;
};

type KindFilter = "All" | AutomationKind;
const KIND_LABELS: Record<KindFilter, string> = {
  All: "All",
  n8n: "n8n",
  openclaw: "OpenClaw",
};

function kindGlyph(kind: AutomationKind): string {
  return kind === "n8n" ? "n" : "◎";
}

/* n8n and OpenClaw are different products — they get different vocabulary on
   their cards and buttons so the two surfaces never read the same. */
const WORK_VOCAB: Record<
  AutomationKind,
  {
    plural: string;
    active: string;
    idle: string;
    emptyHint: string;
    newLabel: string;
    chip: string;
  }
> = {
  n8n: {
    plural: "Workflows",
    active: "active",
    idle: "idle",
    emptyHint: "No workflows yet — create one in the native UI.",
    newLabel: "New workspace",
    chip: "text-ember",
  },
  openclaw: {
    plural: "Agent runs",
    active: "running",
    idle: "done",
    emptyHint: "No agent runs yet — start one in the native UI.",
    newLabel: "New agent",
    chip: "text-violet",
  },
};

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

export default function AutomationsView({ kind }: { kind?: AutomationKind }) {
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  // The live production instances (n8n + OpenClaw) the platform runs out of
  // the box. They are always shown — even when the control plane has no
  // automations registered — so the dedicated workspaces are reachable.
  const liveItems = useMemo<Automation[]>(
    () => liveAutomationsForKind(kind).map(fromApi),
    [kind],
  );
  const [items, setItems] = useState<Automation[]>(liveItems);
  const [filter, setFilter] = useState<KindFilter>(kind ?? "All");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Real workflows per kind, fetched from the live n8n/OpenClaw instances.
  const [liveWf, setLiveWf] = useState<Record<string, LiveWorkflows>>({});

  useEffect(() => {
    const kinds: AutomationKind[] = kind ? [kind] : ["n8n", "openclaw"];
    let cancelled = false;
    setLiveWf((prev) => {
      const next = { ...prev };
      for (const k of kinds) next[k] = { configured: false, workflows: [], loading: true };
      return next;
    });
    kinds.forEach((k) => {
      api
        .liveWorkflows(k)
        .then((r) => {
          if (!cancelled)
            setLiveWf((prev) => ({ ...prev, [k]: { ...r, loading: false } }));
        })
        .catch((e) => {
          if (!cancelled)
            setLiveWf((prev) => ({
              ...prev,
              [k]: {
                configured: false,
                workflows: [],
                loading: false,
                error: e instanceof Error ? e.message : "unavailable",
              },
            }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    // Seed with the live instances so they render immediately.
    setItems(liveItems);
    void isControlPlaneLive().then(async (ok) => {
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) {
        // Control plane unreachable — the live instances above still render.
        setLoading(false);
        return;
      }
      try {
        const { automations } = await api.listAutomations();
        if (!cancelled) {
          // Live instances first, then any additional control-plane
          // automations that aren't already represented (matched by slug).
          const liveSlugs = new Set(liveItems.map((a) => a.slug));
          const extra = automations
            .map(fromApi)
            .filter((a) => !liveSlugs.has(a.slug));
          setItems([...liveItems, ...extra]);
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
  }, [liveItems]);

  const filtered = items.filter(
    (a) => filter === "All" || a.kind === filter,
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? `${kind ? KIND_LABELS[kind] : "Automations"} · live` : (kind ? KIND_LABELS[kind] : "Automations")}
        title={kind === "n8n" ? "n8n workspaces" : kind === "openclaw" ? "OpenClaw workspaces" : "Workflow automations"}
        lead={
          kind === "n8n"
            ? "Each workspace is a dedicated n8n instance. Click through to open the native n8n UI."
            : kind === "openclaw"
              ? "Each workspace is a dedicated OpenClaw instance. Click through to open the native OpenClaw UI."
              : "n8n and OpenClaw instances — each with its own dedicated workspace. Click through to open the native UI."
        }
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> control plane connected
              </span>
            )}
            <Link
              href={kind ? `/automations/new?kind=${kind}` : "/automations/new"}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {kind ? WORK_VOCAB[kind].newLabel : "New automation"}
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

      {/* kind tabs — hidden when the page already locks to one kind */}
      <div className={cx("flex flex-wrap items-center gap-2", kind ? "hidden" : "")}>
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
            <AutomationCard key={a.id} a={a} live={liveWf[a.kind]} />
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationCard({ a, live }: { a: Automation; live?: LiveWorkflows }) {
  const workflows: LiveWorkflow[] = live?.workflows ?? [];
  const vocab = WORK_VOCAB[a.kind];
  // Automations open their own workflow-focused workspace rather than the
  // generic project workspace (chat + file editor) the handle URL resolves to.
  const href = `/automations/${a.id}`;
  return (
    <div className="panel group flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-ember/40">
      <Link href={href} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className={cx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface-3 to-surface-2 font-display text-lg font-bold",
          vocab.chip,
        )}>
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
          {vocab.plural} · {live?.loading ? "…" : workflows.length}
        </div>
        {live?.loading ? (
          <p className="text-ink-faint">Loading workflows…</p>
        ) : live && !live.configured ? (
          <p className="text-ink-faint">
            Not connected yet — open the native UI to set up and add workflows.
          </p>
        ) : live?.error ? (
          <p className="text-down">Instance unreachable ({live.error}).</p>
        ) : workflows.length === 0 ? (
          <p className="text-ink-faint">{vocab.emptyHint}</p>
        ) : (
          <ul className="space-y-1">
            {workflows.slice(0, 4).map((wf) => (
              <li key={wf.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{wf.name}</span>
                <span className="shrink-0 font-mono text-[0.65rem]">
                  {wf.active ? (
                    <span className="text-live">{vocab.active}</span>
                  ) : (
                    <span className="text-ink-faint">{vocab.idle}</span>
                  )}
                </span>
              </li>
            ))}
            {workflows.length > 4 && (
              <li className="text-ink-faint">+{workflows.length - 4} more</li>
            )}
          </ul>
        )}
      </div>
      </Link>
      {a.adminUrl && (
        <a
          href={a.adminUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-surface-2 px-2.5 py-1 text-2xs font-medium text-ink-dim transition-colors hover:border-ember/40 hover:text-ember"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open native UI
        </a>
      )}
    </div>
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
