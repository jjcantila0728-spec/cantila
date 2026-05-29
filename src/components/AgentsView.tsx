"use client";

/* ============================================================
   Cantila Agents — the brain's diary (plan §4.9).
   Snapshots the brain every 5 s. Shows agent stats, pending
   proposals (with human-readable hint commands), and recent
   actions the brain took on its own.
   ============================================================ */

import { useEffect, useState } from "react";
import {
  Sparkles,
  Pause,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
  Activity as ActivityIcon,
} from "lucide-react";
import { PageHeader, Pill, cx } from "@/components/ui";
import {
  api,
  isControlPlaneLive,
  type ApiAgentsSnapshot,
} from "@/lib/api";
import AgentsCanvas from "@/components/agents/AgentsCanvas";
import CantilaBrainChat from "@/components/agents/CantilaBrainChat";
import SuggestionRail from "@/components/agents/SuggestionRail";
import {
  AGENT_TONE,
  type ProposedAgentRow,
} from "@/components/agents/agent-meta";
import { useIsOwner } from "@/lib/owner";

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function AgentsView() {
  const [snap, setSnap] = useState<ApiAgentsSnapshot | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<"pause" | "resume" | "tick" | null>(null);
  const [proposed, setProposed] = useState<ProposedAgentRow[]>([]);
  const isOwner = useIsOwner();

  async function load(fresh = false) {
    try {
      const next = await api.agentsStatus(fresh);
      setSnap(next);
      if (next.proposedAgents) setProposed(next.proposedAgents);
    } catch {
      /* swallow */
    }
  }

  async function loadProposals() {
    try {
      const { proposals } = await api.listAgentProposals();
      setProposed(proposals);
    } catch {
      /* endpoint not deployed yet — fall back to whatever the snapshot brought */
    }
  }

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      void load(true);
      void loadProposals();
      interval = window.setInterval(() => load(false), 5_000);
    })();
    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  function handleProposed(row: ProposedAgentRow): void {
    setProposed((prev) =>
      prev.some((p) => p.id === row.id) ? prev : [...prev, row],
    );
  }

  const promotedSuggestionIds = new Set(
    proposed
      .map((p) => p.scope)
      .filter((s): s is string => typeof s === "string" && s.startsWith("suggested:"))
      .map((s) => s.slice("suggested:".length)),
  );

  async function togglePause() {
    if (!snap) return;
    setBusy(snap.paused ? "resume" : "pause");
    try {
      if (snap.paused) await api.agentsResume();
      else await api.agentsPause();
      await load(false);
    } finally {
      setBusy(null);
    }
  }

  async function forceTick() {
    setBusy("tick");
    try {
      await api.agentsTick();
      await load(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Build · autonomous"
        title="Cantila Agents"
        lead="A swarm of specialised agents sharing one brain — they watch the fleet, take corrective action and learn from outcomes. Every action lands in /activity for full audit."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && snap && (
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium ring-1",
                  snap.paused
                    ? "bg-down/10 text-down ring-down/20"
                    : "bg-live/5 text-live ring-live/30",
                )}
              >
                <Zap className="h-3 w-3" />
                {snap.paused ? "paused" : "running"} · {relative(snap.at)}
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink-faint">
                control plane offline
              </span>
            )}
            <button
              onClick={forceTick}
              disabled={busy !== null || !snap}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint disabled:opacity-50"
            >
              {busy === "tick" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Tick now
            </button>
            <button
              onClick={togglePause}
              disabled={busy !== null || !snap}
              className={cx(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50",
                snap?.paused
                  ? "bg-ember text-[#1a0e08] hover:bg-ember-bright"
                  : "border border-border bg-surface-2 text-ink hover:border-down/40 hover:text-down",
              )}
            >
              {busy === "pause" || busy === "resume" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : snap?.paused ? (
                <Play className="h-4 w-4" strokeWidth={2.4} />
              ) : (
                <Pause className="h-4 w-4" strokeWidth={2.4} />
              )}
              {snap?.paused ? "Resume" : "Pause"}
            </button>
          </div>
        }
      />

      {/* hub-and-spoke canvas — brain in the middle, agents radiating out.
          Owner gets the chat + suggestion rail alongside; everyone else sees
          just the canvas full-width. */}
      {isOwner ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <AgentsCanvas snapshot={snap} proposed={proposed} draggable />
            <CantilaBrainChat
              onProposed={handleProposed}
              onStateChanged={() => void load(true)}
            />
          </div>
          <SuggestionRail
            onPromote={async (s) => {
              const row = await api.createAgentProposal({
                name: s.name,
                blurb: s.blurb,
                scope: `suggested:${s.id}`,
              });
              handleProposed(row);
            }}
            promotedIds={promotedSuggestionIds}
          />
        </div>
      ) : (
        <AgentsCanvas snapshot={snap} proposed={proposed} />
      )}
      <p className="-mt-1 text-center text-2xs text-ink-faint">
        One brain · 9 agents{proposed.length > 0 && ` + ${proposed.length} proposed`} ·
        60s tick · safe + high-confidence actions auto-apply, destructive queue for review.
      </p>

      {/* what the brain has learned */}
      <section>
        <h2 className="kv mb-3 flex items-center gap-2 text-ink-dim">
          <ActivityIcon className="h-3 w-3 text-info" />
          What the brain has learned ·{" "}
          <span className="text-ink">{snap?.learnings.length ?? 0}</span>
        </h2>
        {(!snap || snap.learnings.length === 0) ? (
          <div className="panel py-6 text-center text-2xs text-ink-faint">
            {snap
              ? "No action history yet. The brain learns as it auto-applies high-confidence safe proposals — every outcome (ok or failed) becomes a per-(agent, kind) learning record."
              : "Loading…"}
          </div>
        ) : (
          <div className="panel overflow-hidden p-0">
            <table className="w-full text-2xs">
              <thead className="bg-surface-2 text-ink-dim">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Agent · kind</th>
                  <th className="px-4 py-2 text-right font-medium">Attempts</th>
                  <th className="px-4 py-2 text-right font-medium">Success</th>
                  <th className="px-4 py-2 text-right font-medium">Last</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {snap.learnings.map((l) => (
                  <tr key={`${l.agent}:${l.kind}`}>
                    <td className="px-4 py-2 font-mono text-ink">
                      <span
                        className={cx(
                          "mr-2 inline-flex rounded px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wider ring-1",
                          AGENT_TONE[l.agent],
                        )}
                      >
                        {l.agent}
                      </span>
                      {l.kind}
                    </td>
                    <td className="px-4 py-2 text-right text-ink">{l.attempts}</td>
                    <td
                      className={cx(
                        "px-4 py-2 text-right font-medium",
                        l.successRatePct >= 90
                          ? "text-live"
                          : l.successRatePct >= 50
                            ? "text-warn"
                            : "text-down",
                      )}
                    >
                      {l.successRatePct}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Pill tone={l.lastOutcome === "ok" ? "live" : "down"}>
                        {l.lastOutcome === "ok" ? "ok" : "failed"}
                      </Pill>
                    </td>
                    <td className="px-4 py-2">
                      {l.downgrading ? (
                        <Pill tone="warn">auto-apply paused</Pill>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border-soft bg-surface-2/60 px-4 py-2 text-2xs text-ink-faint">
              Policy: a kind with ≥ 3 attempts and {"<"} 50% success rate gets
              one notch off its effective confidence — high → medium, etc. —
              so the brain stops re-firing a broken auto-action and lets a
              human decide. Promotion is opt-in only; destructive kinds never
              auto-apply, regardless of track record.
            </div>
          </div>
        )}
      </section>

      {/* pending proposals */}
      <section>
        <h2 className="kv mb-3 flex items-center gap-2 text-ink-dim">
          <Sparkles className="h-3 w-3 text-ember" />
          Pending proposals ·{" "}
          <span className="text-ink">{snap?.pendingProposals.length ?? 0}</span>
        </h2>
        {(!snap || snap.pendingProposals.length === 0) ? (
          <div className="panel py-6 text-center text-2xs text-ink-faint">
            {snap
              ? "The brain has nothing pending — everything looks good."
              : "Loading…"}
          </div>
        ) : (
          <div className="panel divide-y divide-border-soft p-0">
            {snap.pendingProposals.map((p) => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                          AGENT_TONE[p.agent],
                        )}
                      >
                        {p.agent}
                      </span>
                      <span
                        className={cx(
                          "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                          p.confidence === "high"
                            ? "bg-ember/15 text-ember"
                            : p.confidence === "medium"
                              ? "bg-warn/15 text-warn"
                              : "bg-surface-3 text-ink-faint",
                        )}
                      >
                        {p.confidence}
                      </span>
                      <Pill tone={p.actionClass === "safe" ? "live" : "warn"}>
                        {p.actionClass}
                      </Pill>
                      <span className="text-sm font-medium text-ink">
                        {p.title}
                      </span>
                    </div>
                    <p className="mt-1 text-2xs leading-relaxed text-ink-dim">
                      {p.body}
                    </p>
                    {p.hints && p.hints.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.hints.map((h, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded border border-border-soft bg-surface-2 px-2 py-1.5"
                          >
                            <span className="rounded bg-ember/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-ember">
                              {h.label}
                            </span>
                            <code className="break-all font-mono text-2xs text-ink-dim">
                              {h.hint}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-2xs text-ink-faint">
                    {relative(p.at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* recent actions */}
      <section>
        <h2 className="kv mb-3 flex items-center gap-2 text-ink-dim">
          <CheckCircle2 className="h-3 w-3 text-live" />
          Recent actions taken by the brain ·{" "}
          <span className="text-ink">{snap?.recentActions.length ?? 0}</span>
        </h2>
        {(!snap || snap.recentActions.length === 0) ? (
          <div className="panel py-6 text-center text-2xs text-ink-faint">
            {snap ? "No actions taken yet." : "Loading…"}
          </div>
        ) : (
          <div className="panel divide-y divide-border-soft p-0">
            {snap.recentActions.map((a) => (
              <div key={a.at + a.proposalId} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cx(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    a.outcome === "ok"
                      ? "bg-live/10 text-live"
                      : "bg-down/10 text-down",
                  )}
                >
                  {a.outcome === "ok" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                        AGENT_TONE[a.agent],
                      )}
                    >
                      {a.agent}
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {a.title}
                    </span>
                    {a.verified === "pending" && (
                      <Pill tone="info">verifying…</Pill>
                    )}
                    {a.verified === "ok" && <Pill tone="live">verified</Pill>}
                    {a.verified === "failed" && (
                      <Pill tone="down">verify failed</Pill>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-2xs text-ink-dim">
                    {a.detail}
                  </p>
                  {a.verifyDetail && (
                    <p className="mt-0.5 truncate text-2xs text-ink-faint">
                      Post-check: {a.verifyDetail}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-2xs text-ink-faint">
                  {relative(a.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* latest observations */}
      {snap && snap.observations.length > 0 && (
        <section>
          <h2 className="kv mb-3 flex items-center gap-2 text-ink-dim">
            <ActivityIcon className="h-3 w-3 text-info" />
            Latest observations ·{" "}
            <span className="text-ink">{snap.observations.length}</span>
          </h2>
          <div className="panel divide-y divide-border-soft p-0">
            {snap.observations.slice(0, 12).map((o, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <span
                  className={cx(
                    "rounded px-1.5 py-0.5 font-mono text-[0.6rem]",
                    AGENT_TONE[o.agent],
                  )}
                >
                  {o.agent}
                </span>
                <code className="font-mono text-2xs text-ink-faint">
                  {o.kind}
                </code>
                <span className="text-2xs text-ink-dim">{o.detail}</span>
                <span className="ml-auto font-mono text-2xs text-ink-faint">
                  {relative(o.at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
