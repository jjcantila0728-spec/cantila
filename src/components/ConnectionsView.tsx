"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plug, Plus, Loader2, AlertCircle, Zap } from "lucide-react";
import { PageHeader, Pill, StatusBadge, cx } from "@/components/ui";
import { connections as mockConnections } from "@/lib/mock-data";
import type { Connection } from "@/lib/types";
import { api, isControlPlaneLive, type ApiConnection } from "@/lib/api";

function fromApi(c: ApiConnection): Connection {
  return {
    id: c.id,
    provider: c.provider,
    name: c.name,
    authKind: c.authKind,
    status: c.status,
    metadata: c.metadata,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
    expiresAt: c.expiresAt,
  };
}

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  stripe: "Stripe",
  http_basic: "HTTP Basic",
  generic_api_key: "Generic API key",
  gmail: "Gmail",
  slack: "Slack",
  notion: "Notion",
};

const PROVIDER_GLYPH: Record<string, string> = {
  openai: "AI",
  anthropic: "Λ",
  stripe: "S",
  http_basic: "🔑",
  generic_api_key: "·",
  gmail: "G",
  slack: "#",
  notion: "N",
};

export default function ConnectionsView() {
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [items, setItems] = useState<Connection[]>(mockConnections);
  const [filter, setFilter] = useState<string>("All");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isControlPlaneLive().then(async (ok) => {
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      setLoading(true);
      try {
        const { connections } = await api.listConnections();
        if (!cancelled) {
          setItems(connections.length ? connections.map(fromApi) : []);
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

  const providers = Array.from(new Set(items.map((c) => c.provider))).sort();
  const filtered = items.filter((c) => filter === "All" || c.provider === filter);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Connections · live" : "Connections"}
        title="Integrations & credentials"
        lead="Connect Gmail, Slack, OpenAI, Stripe — once per account. Workflow nodes pick a connection by id; the secret stays in Cantila's secrets manager and gets injected just-in-time on every run."
        actions={
          <div className="flex items-center gap-2">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                <Zap className="h-3 w-3" /> control plane connected
              </span>
            )}
            <Link
              href="/connections/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New connection
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

      {/* provider filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(["All", ...providers] as string[]).map((p) => {
          const active = filter === p;
          const count =
            p === "All" ? items.length : items.filter((c) => c.provider === p).length;
          return (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cx(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                active
                  ? "bg-surface-3 text-ink ring-1 ring-border"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink",
              )}
            >
              {p === "All" ? "All" : (PROVIDER_LABEL[p] ?? p)}
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
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ConnectionCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({ c }: { c: Connection }) {
  const label = PROVIDER_LABEL[c.provider] ?? c.provider;
  const glyph = PROVIDER_GLYPH[c.provider] ?? "·";
  return (
    <div className="panel flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface-3 to-surface-2 font-display text-base font-bold text-ember">
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold text-ink">
              {c.name}
            </h3>
            <StatusBadge status={c.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone="ember">{label}</Pill>
            <Pill tone="neutral">{c.authKind === "oauth" ? "OAuth" : c.authKind === "basic" ? "Basic" : "API key"}</Pill>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border-soft pt-3 text-2xs text-ink-dim">
        <div>
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Created
          </div>
          <div className="mt-0.5">{c.createdAt}</div>
        </div>
        <div>
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
            Last used
          </div>
          <div className="mt-0.5">{c.lastUsedAt ?? "never"}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel dot-grid flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ember/10 text-ember">
        <Plug className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">No connections yet</p>
        <p className="mt-1 text-2xs text-ink-faint">
          Connect a provider — its credentials stay in Cantila and every automation can reuse them.
        </p>
      </div>
      <Link
        href="/connections/new"
        className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg bg-ember px-3 text-sm font-semibold text-[#1a0e08] hover:bg-ember-bright"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        New connection
      </Link>
    </div>
  );
}
