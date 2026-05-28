"use client";

/* ============================================================
   Cantila Nodes — Bring-Your-Own-VPS (plan §5.5).
   Lists enrolled compute nodes (managed + BYO), mints one-time
   enrollment tokens for new BYO boxes, and retires existing
   nodes. The token is shown ONCE in a reveal panel after enroll
   — mirrors the git-webhook-secret reveal on the project page.

   Live-only: a fresh control plane has no nodes; in offline /
   demo mode the view renders an explanatory empty state.
   ============================================================ */

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Zap,
  AlertCircle,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { PageHeader, Pill, Button, cx } from "@/components/ui";
import Modal, { Field, inputClass } from "@/components/Modal";
import {
  api,
  isControlPlaneLive,
  type ApiNode,
  type ApiNodeStatus,
  type ApiNodeFleetSummary,
} from "@/lib/api";

const EMPTY_FORM = {
  label: "",
  region: "byo",
  host: "",
  sshUser: "root",
  capacityInstances: 16,
};

type EnrollResult = { node: ApiNode; enrollmentToken: string };

function statusPill(status: ApiNodeStatus) {
  switch (status) {
    case "active":
      return <Pill tone="live">active</Pill>;
    case "pending":
      return <Pill tone="warn">pending agent</Pill>;
    case "degraded":
      return <Pill tone="warn">degraded</Pill>;
    case "offline":
      return <Pill tone="down">offline</Pill>;
    case "retired":
      return <Pill tone="neutral">retired</Pill>;
  }
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export default function NodesView() {
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [summary, setSummary] = useState<ApiNodeFleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One-time token reveal — populated by a successful enroll; cleared
  // when the operator dismisses the panel. The raw token is never
  // re-fetchable from the API.
  const [reveal, setReveal] = useState<EnrollResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [retiring, setRetiring] = useState<string | null>(null);

  async function load() {
    try {
      const [{ nodes: list }, sum] = await Promise.all([
        api.listNodes(),
        api.getNodeFleetSummary().catch(() => null),
      ]);
      setNodes(list);
      if (sum) setSummary(sum);
    } catch {
      /* swallow */
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (ok) await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openEnroll() {
    setError(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function submitEnroll() {
    const label = form.label.trim();
    if (!label || creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await api.enrollNode({
        label,
        region: form.region.trim() || undefined,
        host: form.host.trim() || undefined,
        sshUser: form.sshUser.trim() || undefined,
        capacityInstances: form.capacityInstances,
      });
      setReveal(result);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enroll node");
    } finally {
      setCreating(false);
    }
  }

  async function retire(node: ApiNode) {
    if (retiring) return;
    if (
      !window.confirm(
        `Retire ${node.label}? Existing instances drain; no new schedules. This is one-way.`,
      )
    ) {
      return;
    }
    setRetiring(node.id);
    try {
      await api.retireNode(node.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retire node");
    } finally {
      setRetiring(null);
    }
  }

  async function copyToken() {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.enrollmentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Build · fleet"
        title="Nodes"
        lead="Compute nodes the control plane can schedule workloads on. Bring your own VPS via Hetzner, OVH, your own datacentre — anywhere you can run the node-agent — or run on Cantila's managed fleet. (Plan §5.5.)"
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md bg-live/5 px-2 py-1 text-2xs font-medium text-live ring-1 ring-live/30">
                <Zap className="h-3 w-3" />
                live
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-2xs font-medium text-ink-faint">
                control plane offline
              </span>
            )}
            <Button onClick={openEnroll} disabled={!liveMode}>
              <Plus className="h-4 w-4" />
              Enroll a node
            </Button>
          </div>
        }
      />

      {/* per-account summary header */}
      {summary && summary.total > 0 && (
        <div className="panel flex flex-wrap items-center gap-4 p-4">
          <div className="flex flex-col">
            <span className="font-display text-xl font-semibold text-ink">
              {summary.total}
            </span>
            <span className="text-2xs text-ink-faint">node{summary.total === 1 ? "" : "s"}</span>
          </div>
          <div className="h-8 w-px bg-border-soft" />
          <SummaryChip tone="live" label="active" value={summary.byStatus.active} />
          <SummaryChip tone="warn" label="degraded" value={summary.byStatus.degraded} />
          <SummaryChip tone="warn" label="pending" value={summary.byStatus.pending} />
          <SummaryChip tone="down" label="offline" value={summary.byStatus.offline} />
          <SummaryChip tone="neutral" label="retired" value={summary.byStatus.retired} />
          <div className="h-8 w-px bg-border-soft" />
          <div className="flex flex-col">
            <span className="font-display text-base font-semibold text-ink">
              {summary.onlineReported}
              <span className="ml-1 text-2xs font-normal text-ink-faint">
                / {summary.onlineCapacity}
              </span>
            </span>
            <span className="text-2xs text-ink-faint">
              instances on online nodes
            </span>
          </div>
          {summary.byo > 0 && (
            <>
              <div className="h-8 w-px bg-border-soft" />
              <div className="flex flex-col">
                <span className="font-display text-base font-semibold text-ember">
                  {summary.byo}
                </span>
                <span className="text-2xs text-ink-faint">tenant-supplied</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* one-time enrollment-token reveal */}
      {reveal && (
        <div className="panel border-ember/30 bg-ember/[0.04] p-5 ring-1 ring-ember/40">
          <div className="flex items-center gap-2 text-ember">
            <CheckCircle2 className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold">
              Enrollment token — copy now, this is the only time it&apos;s
              shown.
            </h2>
          </div>
          <p className="mt-2 text-2xs text-ink-dim">
            Run the Cantila node-agent on{" "}
            <span className="text-ink">{reveal.node.label}</span> with this
            token as <code className="kv">CANTILA_NODE_TOKEN</code>. The agent
            posts back its SSH public-key fingerprint and the row flips from{" "}
            <Pill tone="warn">pending agent</Pill> to{" "}
            <Pill tone="live">active</Pill>.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 select-all break-all rounded-md border border-border-soft bg-surface px-3 py-2 font-mono text-xs text-ember">
              {reveal.enrollmentToken}
            </code>
            <div className="flex gap-2">
              <button
                onClick={copyToken}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => setReveal(null)}
                className="inline-flex h-9 items-center rounded-md border border-border bg-surface-2 px-3 text-2xs font-medium text-ink-dim hover:border-ink-faint"
              >
                Dismiss
              </button>
            </div>
          </div>
          <p className="mt-3 text-2xs text-ink-faint">
            For a manual smoke-test you can also call{" "}
            <code className="kv">
              cantila nodes complete {reveal.enrollmentToken.slice(0, 16)}…
              &lt;fingerprint&gt;
            </code>{" "}
            to flip the node active without a real agent.
          </p>
        </div>
      )}

      {error && (
        <div className="panel flex items-center gap-3 border-down/30 bg-down/[0.05] p-4 ring-1 ring-down/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-down" />
          <span className="text-2xs text-ink-dim">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-2xs text-ink-faint hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel py-10 text-center text-2xs text-ink-faint">
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="panel py-10 text-center text-2xs text-ink-faint">
          {liveMode === false ? (
            <>
              Control plane unreachable — node enrolment lives on the API.
              <br />
              Bring it up locally with{" "}
              <code className="kv">npm run dev</code> in{" "}
              <code className="kv">cantila-control-plane</code>.
            </>
          ) : (
            <>
              No compute nodes enrolled yet.
              <br />
              <span className="text-ink-dim">
                Hit{" "}
                <span className="text-ember">Enroll a node</span> to bring a
                BYO VPS into the fleet — Cantila mints a one-time token, you
                run the node-agent on the box, and the row flips active.
              </span>
            </>
          )}
        </div>
      ) : (
        <section className="panel overflow-hidden p-0">
          <table className="w-full text-2xs">
            <thead className="bg-surface-2 text-ink-dim">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Label</th>
                <th className="px-4 py-2 text-left font-medium">Kind</th>
                <th className="px-4 py-2 text-left font-medium">Region</th>
                <th className="px-4 py-2 text-left font-medium">Host</th>
                <th className="px-4 py-2 text-right font-medium">Capacity</th>
                <th className="px-4 py-2 text-right font-medium">Load</th>
                <th className="px-4 py-2 text-left font-medium">Last HB</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {nodes.map((n) => (
                <tr key={n.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-ink">{n.label}</div>
                    <div className="font-mono text-2xs text-ink-faint">
                      {n.id}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-ink-dim">
                    <span className="font-mono uppercase tracking-wider">
                      {n.kind}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink-dim">{n.region}</td>
                  <td className="px-4 py-2 text-ink-dim">
                    {n.host || <span className="text-ink-faint">—</span>}
                    {n.sshUser && n.host && (
                      <span className="text-ink-faint">
                        {" "}
                        ({n.sshUser})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-ink">
                    {n.capacityInstances}
                  </td>
                  <td
                    className={cx(
                      "px-4 py-2 text-right font-medium",
                      n.reportedLoadPct === undefined
                        ? "text-ink-faint"
                        : n.reportedLoadPct >= 90
                          ? "text-down"
                          : n.reportedLoadPct >= 75
                            ? "text-warn"
                            : "text-live",
                    )}
                  >
                    {n.reportedLoadPct !== undefined
                      ? `${n.reportedLoadPct}%`
                      : "—"}
                    {n.reportedInstances !== undefined && (
                      <span className="ml-1 text-2xs text-ink-faint">
                        ({n.reportedInstances})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-dim">
                    {n.lastHeartbeatAt ? (
                      relative(n.lastHeartbeatAt)
                    ) : (
                      <span className="text-ink-faint">never</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{statusPill(n.status)}</td>
                  <td className="px-4 py-2 text-right">
                    {n.status !== "retired" && (
                      <button
                        onClick={() => retire(n)}
                        disabled={retiring === n.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs text-ink-dim hover:border-down/40 hover:text-down disabled:opacity-50"
                      >
                        {retiring === n.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border-soft bg-surface-2/60 px-4 py-2 text-2xs text-ink-faint">
            Active BYO nodes are merged into the Capacity rollup alongside
            the platform fleet — CapacityAgent treats them identically and
            can propose pre-warm / shrink against either kind.
          </div>
        </section>
      )}

      {/* Enroll modal */}
      <Modal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="Enroll a BYO compute node"
        description="Cantila mints a one-time enrollment token. Drop the Cantila node-agent onto your VPS with that token in the environment; it'll register its SSH public key with the control plane and start receiving workloads."
      >
        <div className="space-y-4">
          <Field label="Label">
            <input
              className={inputClass}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="my-hetzner-cx21"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Region">
              <input
                className={inputClass}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="byo"
              />
            </Field>
            <Field label="Capacity (instances)">
              <input
                type="number"
                min={1}
                max={256}
                className={inputClass}
                value={form.capacityInstances}
                onChange={(e) =>
                  setForm({
                    ...form,
                    capacityInstances: Math.max(
                      1,
                      Math.min(256, Number(e.target.value) || 16),
                    ),
                  })
                }
              />
            </Field>
          </div>
          <Field label="Host (IPv4 / IPv6 / DNS)">
            <input
              className={inputClass}
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="1.2.3.4"
            />
          </Field>
          <Field label="SSH user">
            <input
              className={inputClass}
              value={form.sshUser}
              onChange={(e) => setForm({ ...form, sshUser: e.target.value })}
              placeholder="root"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              disabled={creating}
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface-2 px-3 text-2xs font-medium text-ink-dim hover:border-ink-faint"
            >
              Cancel
            </button>
            <Button onClick={submitEnroll} disabled={!form.label.trim() || creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Enroll
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryChip({
  tone,
  label,
  value,
}: {
  tone: "live" | "warn" | "down" | "neutral" | "info";
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="font-display text-base font-semibold text-ink">
          {value}
        </span>
        <Pill tone={tone}>{label}</Pill>
      </div>
    </div>
  );
}
