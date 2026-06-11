"use client";

/* ============================================================
   Chat — Cantila's front door (`/chat`).

   The admin's general chat surface: describe anything you want
   to build, deploy, or change in Cantila. The planner shapes the
   request and presents the plan back; the user can keep typing to
   refine it. Only an explicit "Create & build" creates the project
   and redirects into the per-project workspace where the agent
   team streams the build — chatting never creates a project on
   its own.

   A plain chat textarea — empty composer in the center, the
   conversation accrues above it once the user starts typing.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CornerDownLeft,
  Loader2,
  Zap,
  AlertCircle,
} from "lucide-react";
import {
  api,
  builderApi,
  isControlPlaneLive,
  ApiError,
  type ApiDeployPlan,
  type ApiRuntime,
} from "../lib/api";

type Status =
  | { kind: "idle" }
  | { kind: "planning" }
  | { kind: "creating" }
  | { kind: "redirecting" }
  | { kind: "error"; message: string };

type Bubble =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string; plan?: ApiDeployPlan };

interface PendingPlan {
  /** Every user turn so far — the full intent the planner saw. */
  promptParts: string[];
  plan: ApiDeployPlan;
}

export default function Chat() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState<PendingPlan | null>(null);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const mounted = useRef(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
          // best-effort
        }
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bubbles, status.kind]);

  /** Plan (or re-plan) from the conversation so far. Never creates a
   *  project — that only happens in confirmBuild() on an explicit click. */
  async function runPlan(message: string): Promise<void> {
    setBubbles((prev) => [...prev, { kind: "user", text: message }]);
    setStatus({ kind: "planning" });

    const promptParts = [...(pending?.promptParts ?? []), message];
    try {
      const { plan } = await builderApi.planDeploy({
        prompt: promptParts.join("\n"),
        files: [],
      });
      if (!mounted.current) return;
      setBubbles((prev) => [
        ...prev,
        { kind: "agent", text: plan.summary, plan },
      ]);
      setPending({ promptParts, plan });
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "planner unavailable",
      });
    }
  }

  /** Create the project + redirect into the workspace build. Only ever
   *  triggered by the explicit "Create & build" button. */
  async function confirmBuild(): Promise<void> {
    if (!pending) return;

    if (!liveMode) {
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
        name: pending.plan.name,
        runtime: pending.plan.runtime as ApiRuntime,
        region: pending.plan.region,
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
      window.sessionStorage.setItem(key, pending.promptParts.join("\n"));
    } catch {
      // sessionStorage off — workspace falls back to its own prompt input
    }
    router.push(`/@${resolvedHandle}/${encodeURIComponent(projectName)}?build=1`);
  }

  function submit(): void {
    const t = input.trim();
    if (
      !t ||
      status.kind === "planning" ||
      status.kind === "creating" ||
      status.kind === "redirecting"
    )
      return;
    setInput("");
    void runPlan(t);
  }

  const busy =
    status.kind === "planning" ||
    status.kind === "creating" ||
    status.kind === "redirecting";
  const empty = bubbles.length === 0 && status.kind === "idle";

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto ${empty ? "flex items-center justify-center" : ""}`}
      >
        {empty ? (
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Chat to build, deploy, or change anything.
            </h1>
            <p className="mt-2 text-sm text-ink-dim">
              Describe what you want — Cantila plans it, builds it, and ships it.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
            {bubbles.map((b, i) => (
              <BubbleRow key={i} bubble={b} />
            ))}
            {pending && status.kind === "idle" && (
              <div className="ml-11 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void confirmBuild()}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright"
                >
                  <Zap className="h-4 w-4" strokeWidth={2.4} />
                  Create &amp; build “{pending.plan.name}”
                </button>
                <span className="text-2xs text-ink-faint">
                  or keep typing to refine the plan — nothing is created until
                  you confirm.
                </span>
              </div>
            )}
            <StatusLine status={status} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-surface px-4 py-3.5">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-bg p-2 focus-within:border-ink-faint">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Build an app, deploy a change, or tell Cantila what to do…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" strokeWidth={2.4} />
              )}
              Send
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-2xs text-ink-faint">
            {liveMode === true && (
              <span className="inline-flex items-center gap-1 rounded border border-live/30 bg-live/5 px-1.5 py-0.5 font-medium text-live">
                <Zap className="h-2.5 w-2.5" /> Live · control plane connected
              </span>
            )}
            {liveMode === false && (
              <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-medium text-ink-dim">
                Simulation — start the control plane for real builds
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function BubbleRow({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-surface-3 px-4 py-2 text-sm text-ink">
          {bubble.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim">
        <Sparkles className="h-3.5 w-3.5 text-[#1a0e08]" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 pt-1">
        <p className="text-sm leading-relaxed text-ink-dim">{bubble.text}</p>
        {bubble.plan && (
          <p className="text-2xs text-ink-faint">
            Stack: {bubble.plan.stack} · runtime{" "}
            <span className="font-mono">{bubble.plan.runtime}</span> · region{" "}
            {bubble.plan.region}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  if (status.kind === "error") {
    return (
      <div className="ml-11 flex items-center gap-2 rounded-xl border border-down/30 bg-down/10 px-3.5 py-3 text-sm text-down">
        <AlertCircle className="h-4 w-4" />
        {status.message}
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
