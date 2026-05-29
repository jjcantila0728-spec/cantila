"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  TrendingUp,
  Star,
  Search,
  Loader2,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader, Pill, cx } from "@/components/ui";
import { templates } from "@/lib/mock-data";
import type { Template } from "@/lib/types";
import { api, isControlPlaneLive, type ApiRuntime } from "@/lib/api";

type Category = "All" | Template["category"];

const CATEGORIES: Category[] = [
  "All",
  "AI agents",
  "CMS & sites",
  "Databases",
  "Dev tools",
  "Analytics",
];

/* Map a template id to the runtime the control plane should run it on.
 * Everything containerised lands on `docker`; native runtimes are picked
 * out explicitly so the auto-detect step uses a faster build path. */
const TEMPLATE_RUNTIME: Record<string, ApiRuntime> = {
  n8n: "docker",
  librechat: "docker",
  flowise: "docker",
  openclaw: "docker",
  ghost: "docker",
  wordpress: "php",
  supabase: "docker",
  pocketbase: "docker",
  metabase: "docker",
  umami: "docker",
  "uptime-kuma": "docker",
  gitea: "docker",
};

function TemplateCard({
  t,
  liveMode,
  deploying,
  onDeploy,
}: {
  t: Template;
  liveMode: boolean | null;
  deploying: boolean;
  onDeploy: (t: Template) => void;
}) {
  return (
    <div className="panel group flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-ink-faint">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-surface-3 to-surface-2 font-display text-lg font-bold text-ember">
          {t.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-base font-semibold text-ink">
              {t.name}
            </h3>
            {t.featured && <Star className="h-3.5 w-3.5 fill-ember text-ember" />}
          </div>
          <Pill tone="neutral">{t.category}</Pill>
        </div>
      </div>

      <p className="text-sm leading-snug text-ink-dim">{t.blurb}</p>

      <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-3">
        <span className="inline-flex items-center gap-1 text-2xs text-ink-faint">
          <TrendingUp className="h-3 w-3" />
          {t.deploys} deploys
        </span>
        {liveMode ? (
          <button
            onClick={() => onDeploy(t)}
            disabled={deploying}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ember/30 bg-ember/10 px-3 text-2xs font-semibold text-ember transition-colors hover:bg-ember/20 disabled:opacity-50"
          >
            {deploying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            Deploy live
          </button>
        ) : (
          <Link
            href="/chat"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-semibold text-ink transition-colors hover:border-ember/50 hover:bg-ember/10 hover:text-ember"
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy
          </Link>
        )}
      </div>
    </div>
  );
}

export default function TemplatesView() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        const acct = await api.getAccountMe();
        if (!cancelled) setHandle(acct.handle);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function oneClickDeploy(t: Template) {
    // n8n / OpenClaw are first-class Cantila Automations now (plan §4.10) —
    // hand the user off to the automation wizard rather than spinning up a
    // generic Docker project. Everything else keeps the regular path.
    if (t.id === "n8n" || t.id === "openclaw") {
      router.push(`/automations/new?kind=${encodeURIComponent(t.id)}`);
      return;
    }
    setBusy(t.id);
    setToast(null);
    try {
      const runtime = TEMPLATE_RUNTIME[t.id] ?? "docker";
      const project = await api.createProject({
        name: t.id,
        runtime,
        region: "fsn1",
      });
      // Auto-wires the database/email/SMS for the template.
      await api.deploy(project.id, { trigger: "chat" });
      setToast({
        kind: "ok",
        msg: `${t.name} shipped — taking you to the project…`,
      });
      window.setTimeout(() => {
        const target = handle
          ? `/@${handle}/${encodeURIComponent(project.name)}`
          : `/projects/live/${project.id}`;
        router.push(target);
      }, 700);
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "deploy failed",
      });
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = templates.filter((t) => {
    const matchesCat = category === "All" || t.category === category;
    const matchesQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.blurb.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const showFeatured = category === "All" && !q;
  const featured = templates.filter((t) => t.featured);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={liveMode ? "Marketplace · one-click live" : "Marketplace"}
        title="Templates"
        lead="One-click deploys of popular apps and AI agents. Pick one, and Cantila provisions everything it needs."
        actions={
          liveMode === true ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
              <Zap className="h-3 w-3" /> control plane connected
            </span>
          ) : liveMode === false ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
              control plane offline
            </span>
          ) : null
        }
      />

      {toast && (
        <div
          className={cx(
            "panel flex items-center gap-2 px-4 py-3 text-2xs font-medium",
            toast.kind === "ok"
              ? "border-live/30 bg-live/5 text-live"
              : "border-down/30 bg-down/5 text-down",
          )}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {toast.msg}
        </div>
      )}

      {showFeatured && (
        <section>
          <h2 className="kv mb-3 text-ink-dim">Featured</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((t) => {
              const inner = (
                <>
                  <div className="glow-ember pointer-events-none absolute inset-x-0 top-0 h-16 opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-display text-base font-bold text-ember">
                    {t.glyph}
                  </span>
                  <div className="relative min-w-0">
                    <div className="truncate font-display text-sm font-semibold text-ink">
                      {t.name}
                    </div>
                    <div className="text-2xs text-ink-faint">
                      {liveMode ? "one-click live" : `${t.deploys} deploys`}
                    </div>
                  </div>
                </>
              );
              const className =
                "panel group relative flex items-center gap-3 overflow-hidden p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ember/40 disabled:opacity-60";
              return liveMode ? (
                <button
                  key={t.id}
                  onClick={() => oneClickDeploy(t)}
                  disabled={busy !== null}
                  className={className}
                >
                  {busy === t.id && (
                    <Loader2 className="absolute right-3 top-3 h-3.5 w-3.5 animate-spin text-ember" />
                  )}
                  {inner}
                </button>
              ) : (
                <Link key={t.id} href="/chat" className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                  active
                    ? "bg-surface-3 text-ink ring-1 ring-border"
                    : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 lg:w-64">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </div>

      {/* grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              liveMode={liveMode}
              deploying={busy === t.id}
              onDeploy={oneClickDeploy}
            />
          ))}
        </div>
      ) : (
        <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm font-medium text-ink">No templates match</p>
          <p className="text-2xs text-ink-faint">
            Try a different category or search term.
          </p>
          <button
            onClick={() => {
              setCategory("All");
              setQuery("");
            }}
            className="mt-1 text-2xs font-medium text-ember hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
