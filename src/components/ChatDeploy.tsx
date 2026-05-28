"use client";

/* ============================================================
   Chat Deploy — Cantila's front door (`/deploy`).

   The user describes anything they want built. The flow:
     1. Call the LLM-backed planner (`/v1/deploy/plan`) and show
        the agent's one-line response immediately.
     2. Create the project (`/v1/projects`) with the planned
        runtime / type / region.
     3. Resolve the current user's handle via `api.getAccountMe()`.
     4. Stash the prompt under `cantila:build-prompt:<handle>:<name>`
        in sessionStorage so the workspace can read it.
     5. Redirect to `/@handle/<name>?build=1` — the workspace
        opens the SSE build stream and renders op cards as the
        agent team scaffolds, generates media, and deploys.

   This file used to host the entire build simulation; that
   logic now lives in the per-project ProjectChat. We keep the
   empty-state / suggestion grid and the composer here because
   they're the deploy-page-specific bits.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Paperclip,
  X,
  Plug,
  CornerDownLeft,
  Loader2,
  Zap,
  ArrowRight,
  Package,
  AlertCircle,
} from "lucide-react";
import { BrandMark } from "./Sidebar";
import {
  api,
  builderApi,
  isControlPlaneLive,
  ApiError,
  type ApiDeployPlan,
  type ApiRuntime,
} from "../lib/api";

const SUGGESTIONS = [
  "Build me a Next.js SaaS landing page for an AI invoicing tool, with a logo and hero animation",
  "Deploy n8n with a Postgres database",
  "Host a Python FastAPI service + database",
  "Build a portfolio website with auto-generated illustrations",
];

interface Status {
  kind: "idle" | "planning" | "creating" | "redirecting" | "error";
  message?: string;
}

function planKindToProjectType(kind: ApiDeployPlan["kind"]): "web_app" | "static_site" | "api" | "ai_agent" | "worker" | "cron" {
  switch (kind) {
    case "static_site": return "static_site";
    case "api":         return "api";
    case "ai_agent":    return "ai_agent";
    case "worker":      return "worker";
    case "cron":        return "cron";
    case "automation":
    case "live_app":
    default:            return "web_app";
  }
}

export default function ChatDeploy() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [plan, setPlan] = useState<ApiDeployPlan | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const live = await isControlPlaneLive();
      if (mounted.current) setLiveMode(live);
      if (live) {
        try {
          const acct = await api.getAccountMe();
          if (mounted.current) setHandle(acct.handle);
        } catch {
          // Account lookup is best-effort; we fall back to a default
          // handle if it fails.
        }
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  async function runDeploy(prompt: string) {
    setStatus({ kind: "planning" });
    setPlan(null);

    let resolvedPlan: ApiDeployPlan;
    try {
      const { plan: p } = await builderApi.planDeploy({ prompt, files });
      resolvedPlan = p;
      if (!mounted.current) return;
      setPlan(p);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "planner unavailable",
      });
      return;
    }

    if (!liveMode) {
      // Without the control plane, we have nothing to redirect to. Show
      // the plan and stop — the user can still see what would have been
      // built.
      setStatus({
        kind: "error",
        message: "Start the control plane to create a real project from this plan.",
      });
      return;
    }

    setStatus({ kind: "creating" });
    let projectName: string;
    try {
      const created = await api.createProject({
        name: resolvedPlan.name,
        runtime: resolvedPlan.runtime as ApiRuntime,
        region: resolvedPlan.region,
      });
      projectName = created.name;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "project creation failed";
      setStatus({ kind: "error", message });
      return;
    }

    setStatus({ kind: "redirecting" });
    const resolvedHandle = handle ?? "me";
    const key = `cantila:build-prompt:${resolvedHandle}:${projectName}`;
    try {
      window.sessionStorage.setItem(key, prompt);
    } catch {
      // sessionStorage can be unavailable in privacy modes; the workspace
      // will simply skip the auto-build and the user can re-trigger via
      // the project chat.
    }
    router.push(`/@${resolvedHandle}/${encodeURIComponent(projectName)}?build=1`);
  }

  function submit(text: string) {
    const t = text.trim();
    if (!t || status.kind === "planning" || status.kind === "creating" || status.kind === "redirecting") return;
    setInput("");
    void runDeploy(t);
  }

  const running = status.kind === "planning" || status.kind === "creating" || status.kind === "redirecting";

  return (
    <div className="panel flex h-[calc(100vh-13rem)] min-h-[560px] flex-col overflow-hidden p-0">
      <div className="flex-1 overflow-y-auto">
        {status.kind === "idle" && !plan ? (
          <EmptyState onPick={(s) => submit(s)} liveMode={liveMode} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
            {plan && (
              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim">
                  <Sparkles className="h-3.5 w-3.5 text-[#1a0e08]" />
                </span>
                <div className="space-y-1.5 pt-1">
                  <p className="text-sm leading-relaxed text-ink-dim">
                    {plan.summary}
                  </p>
                  <p className="text-2xs text-ink-faint">
                    Stack: {plan.stack} · runtime <span className="font-mono">{plan.runtime}</span> · region {plan.region}
                  </p>
                  {plan.buildPlan.length > 0 && (
                    <ul className="ml-4 list-disc space-y-0.5 text-2xs text-ink-faint">
                      {plan.buildPlan.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  )}
                  {mediaSummary(plan)}
                </div>
              </div>
            )}
            <StatusLine status={status} />
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-border bg-surface px-4 py-3.5">
        <div className="mx-auto max-w-3xl">
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-2xs text-ink-dim"
                >
                  <Package className="h-3 w-3 text-ember" />
                  {f}
                  <button
                    onClick={() => setFiles((p) => p.filter((x) => x !== f))}
                    className="text-ink-faint hover:text-ink"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-border bg-bg p-2 focus-within:border-ink-faint">
            <button
              onClick={() =>
                setFiles((p) =>
                  p.includes("project.zip") ? p : [...p, "project.zip"],
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
              title="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Describe anything to build — site, automation, API, AI agent…"
              className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={() => submit(input)}
              disabled={running || !input.trim()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" strokeWidth={2.4} />
              )}
              Ship
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-2xs text-ink-faint">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded border border-live/30 bg-live/5 px-1.5 py-0.5 font-medium text-live">
                <Zap className="h-2.5 w-2.5" /> Live mode — calling control plane
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-medium text-ink-dim">
                Simulation — control plane offline
              </span>
            )}
            <span>
              The chat creates a real project. You&apos;ll land in its workspace
              while the agents build.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  if (status.kind === "error") {
    return (
      <div className="ml-11 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
        <AlertCircle className="h-4 w-4" />
        {status.message ?? "Something went wrong."}
      </div>
    );
  }
  const label =
    status.kind === "planning"
      ? "Planning your project…"
      : status.kind === "creating"
        ? "Creating the project…"
        : "Opening the workspace…";
  return (
    <div className="ml-11 flex items-center gap-2 text-2xs text-ink-faint">
      <Loader2 className="h-3 w-3 animate-spin text-ember" />
      {label}
    </div>
  );
}

function mediaSummary(plan: ApiDeployPlan): React.ReactNode {
  const items: string[] = [];
  if (plan.media.logo) items.push("logo");
  if (plan.media.hero) items.push("hero image");
  if (plan.media.favicon) items.push("favicon");
  if (plan.media.iconSet) items.push("icon set");
  if (plan.media.heroAnimation) items.push("hero animation");
  if (plan.media.socialOgImage) items.push("social card");
  if (items.length === 0) return null;
  return (
    <p className="text-2xs text-ink-faint">
      The media agents will generate: <span className="text-ink">{items.join(", ")}</span>.
    </p>
  );
}

/* ---------- empty state ---------- */

function EmptyState({
  onPick,
  liveMode,
}: {
  onPick: (s: string) => void;
  liveMode: boolean | null;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-12 text-center">
      <div className="dot-grid absolute inset-x-0 top-0 -z-10 h-64 opacity-40" />
      <BrandMark size={48} />
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink text-balance">
        Describe it. Cantila builds it.
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink-dim">
        One chat creates a complete project — code, images, animations,
        database, domain, the works. You&apos;ll land in the project&apos;s workspace
        while the agent team builds.
      </p>
      {liveMode === true && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
          <Zap className="h-3 w-3" />
          Live mode — connected to the Cantila control plane
        </div>
      )}
      {liveMode === false && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-dim">
          Simulation mode — start the control plane to run real builds
        </div>
      )}

      <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-left text-sm text-ink-dim transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:text-ink"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
            <span className="flex-1">{s}</span>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-live/25 bg-live/5 px-3.5 py-2.5 text-2xs text-ink-dim">
        <Plug className="h-3.5 w-3.5 shrink-0 text-live" />
        Already building in Claude? Add the{" "}
        <span className="font-medium text-ink">Cantila MCP server</span> and say
        &ldquo;deploy to Cantila.&rdquo;
      </div>
    </div>
  );
}
