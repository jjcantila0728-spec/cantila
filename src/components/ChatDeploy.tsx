"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Cpu,
  Database,
  Package,
  Server,
  Globe,
  HeartPulse,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Paperclip,
  X,
  ExternalLink,
  Plug,
  CornerDownLeft,
} from "lucide-react";
import { cx } from "./ui";
import { BrandMark } from "./Sidebar";

/* ------------------------------------------------------------------
   Chat Deploy — Cantila's signature front door.
   A scripted simulation of the deploy agent loop:
   detect → plan → provision → build → schedule → route → verify.
   ------------------------------------------------------------------ */

type OpStatus = "running" | "done";
type OpKey =
  | "detect"
  | "plan"
  | "provision"
  | "build"
  | "schedule"
  | "route"
  | "verify";

interface Op {
  key: OpKey;
  title: string;
  detail?: string;
  status: OpStatus;
  log?: string[];
}

type Msg =
  | { id: string; kind: "user"; text: string; files?: string[] }
  | { id: string; kind: "agent"; text: string }
  | { id: string; kind: "op"; op: Op }
  | { id: string; kind: "result"; name: string; url: string; stack: string };

const OP_ICON: Record<OpKey, typeof Search> = {
  detect: Search,
  plan: Cpu,
  provision: Database,
  build: Package,
  schedule: Server,
  route: Globe,
  verify: HeartPulse,
};

const SUGGESTIONS = [
  "Deploy n8n with a Postgres database",
  "Ship a Next.js storefront with a custom domain",
  "Host a Python FastAPI service + database",
  "Run a LibreChat agent, always-on",
];

interface Blueprint {
  name: string;
  stack: string;
  buildSec: number;
  db?: { engine: string; version: string };
  buildLog: string[];
}

function blueprint(prompt: string): Blueprint {
  const p = prompt.toLowerCase();
  const wantsDb = /postgres|database|\bdb\b|sql|mongo|redis/.test(p);

  if (/n8n/.test(p)) {
    return {
      name: "n8n-flow",
      stack: "n8n · Docker template",
      buildSec: 41,
      db: { engine: "PostgreSQL", version: "16.3" },
      buildLog: [
        "▸ template resolved: n8n (one-click)",
        "▸ pulling n8nio/n8n:latest",
        "▸ image cached · layers verified",
      ],
    };
  }
  if (/librechat|chat ui|chatbot/.test(p)) {
    return {
      name: "librechat-app",
      stack: "LibreChat · Docker template",
      buildSec: 58,
      db: { engine: "MongoDB", version: "7.0" },
      buildLog: [
        "▸ template resolved: LibreChat (one-click)",
        "▸ pulling librechat:0.7.6",
        "▸ image cached · layers verified",
      ],
    };
  }
  if (/python|fastapi|flask|django/.test(p)) {
    return {
      name: "api-service",
      stack: "Python 3.12 · FastAPI · Nixpacks",
      buildSec: 52,
      db: wantsDb ? { engine: "PostgreSQL", version: "16.3" } : undefined,
      buildLog: [
        "▸ nixpacks detected: Python 3.12",
        "▸ pip install -r requirements.txt",
        "▸ uvicorn entrypoint discovered",
        "▸ image layers pushed → registry",
      ],
    };
  }
  if (/next|react|storefront|store|shop|landing|website|site/.test(p)) {
    return {
      name: "web-app",
      stack: "Next.js 14 · Nixpacks",
      buildSec: 68,
      db: wantsDb ? { engine: "PostgreSQL", version: "16.3" } : undefined,
      buildLog: [
        "▸ nixpacks detected: Next.js 14",
        "▸ npm ci — 412 packages",
        "▸ next build — compiled 24 routes",
        "▸ image layers pushed → registry",
      ],
    };
  }
  return {
    name: "new-app",
    stack: "Node.js 20 · Nixpacks",
    buildSec: 47,
    db: wantsDb ? { engine: "PostgreSQL", version: "16.3" } : undefined,
    buildLog: [
      "▸ nixpacks detected: Node.js 20",
      "▸ npm ci — installing dependencies",
      "▸ build script complete",
      "▸ image layers pushed → registry",
    ],
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const uid = () => `m${++seq}`;

export default function ChatDeploy() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const mounted = useRef(true);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const started = messages.length > 0;

  /* mutate a single op message in place */
  const updateOp = (key: OpKey, patch: Partial<Op>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === "op" && m.op.key === key
          ? { ...m, op: { ...m.op, ...patch } }
          : m,
      ),
    );
  };

  const add = (m: Msg) => setMessages((prev) => [...prev, m]);

  async function runDeploy(prompt: string, attached: string[]) {
    setRunning(true);
    add({ id: uid(), kind: "user", text: prompt, files: attached });
    const bp = blueprint(prompt);

    await sleep(550);
    if (!mounted.current) return;
    add({
      id: uid(),
      kind: "agent",
      text: attached.length
        ? `Got your ${attached.length} file${attached.length > 1 ? "s" : ""}. I'll detect the stack, provision what it needs, and ship it live — every step shown below.`
        : "On it. I'll detect the stack, provision what it needs, build, and return a live URL — every step shown below as a reversible operation.",
    });

    /* detect */
    await step("detect", "Detecting stack", 900, `${bp.stack}`);

    /* plan */
    await step(
      "plan",
      "Planning resources",
      850,
      `1 vCPU · 1 GB RAM · auto-sleep on · region fsn1`,
    );

    /* provision db */
    if (bp.db) {
      await step(
        "provision",
        `Provisioning ${bp.db.engine}`,
        1300,
        `${bp.name}-db · ${bp.db.engine} ${bp.db.version} · private network`,
      );
    }

    /* build (with streaming log) */
    add({
      id: uid(),
      kind: "op",
      op: { key: "build", title: "Building image", status: "running", log: [] },
    });
    await sleep(500);
    for (const line of bp.buildLog) {
      if (!mounted.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.kind === "op" && m.op.key === "build"
            ? { ...m, op: { ...m.op, log: [...(m.op.log ?? []), line] } }
            : m,
        ),
      );
      await sleep(620);
    }
    updateOp("build", {
      status: "done",
      detail: `image pushed · built in ${bp.buildSec}s`,
    });

    /* schedule */
    await step(
      "schedule",
      "Scheduling deployment",
      950,
      "node-fsn-01 selected · container started",
    );

    /* route + ssl */
    await step(
      "route",
      "Routing & SSL",
      1100,
      `${bp.name}.cantila.app · DNS wired · Let's Encrypt issued`,
    );

    /* verify */
    await step("verify", "Health check", 850, "200 OK in 11 ms · app is live");

    await sleep(450);
    if (!mounted.current) return;
    add({
      id: uid(),
      kind: "agent",
      text: "Shipped. Your app is live and operating. Ask a follow-up below — switch the database, attach a custom domain, give it more memory — and I'll update the deploy in place.",
    });
    add({
      id: uid(),
      kind: "result",
      name: bp.name,
      url: `${bp.name}.cantila.app`,
      stack: bp.stack,
    });

    setRunning(false);
  }

  /* run one op: append as running, wait, mark done */
  async function step(
    key: OpKey,
    title: string,
    ms: number,
    detail: string,
  ) {
    if (!mounted.current) return;
    add({ id: uid(), kind: "op", op: { key, title, status: "running" } });
    await sleep(ms);
    if (!mounted.current) return;
    updateOp(key, { status: "done", detail });
  }

  function submit(text: string) {
    const t = text.trim();
    if (!t || running) return;
    setInput("");
    const attached = files;
    setFiles([]);
    void runDeploy(t, attached);
  }

  return (
    <div className="panel flex h-[calc(100vh-13rem)] min-h-[560px] flex-col overflow-hidden p-0">
      {/* thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto">
        {!started ? (
          <EmptyState onPick={(s) => submit(s)} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
            {messages.map((m) => (
              <MessageRow key={m.id} m={m} />
            ))}
            {running && (
              <div className="flex items-center gap-2 pl-11 text-2xs text-ink-faint">
                <Loader2 className="h-3 w-3 animate-spin text-ember" />
                Cantila is working…
              </div>
            )}
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
              placeholder={
                started
                  ? "Ask a follow-up — add a domain, switch the database…"
                  : "Describe what to deploy, or drop files…"
              }
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
          <p className="mt-2 text-center text-2xs text-ink-faint">
            Cantila detects the stack, provisions dependencies and returns a
            live URL. Every action is a reversible operation.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- empty state ---------- */

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-12 text-center">
      <div className="dot-grid absolute inset-x-0 top-0 -z-10 h-64 opacity-40" />
      <BrandMark size={48} />
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink text-balance">
        Describe it, drop it, or ship it from Claude.
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink-dim">
        Chat Deploy turns intent or files into a running deployment — stack
        detected, database provisioned, domain wired, SSL issued.
      </p>

      <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-left text-sm text-ink-dim transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:text-ink"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-ember" />
            <span className="flex-1">{s}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-live/25 bg-live/5 px-3.5 py-2.5 text-2xs text-ink-dim">
        <Plug className="h-3.5 w-3.5 shrink-0 text-live" />
        Already building in Claude? Add the{" "}
        <span className="font-medium text-ink">Cantila MCP server</span> and say
        “deploy to Cantila.”
      </div>
    </div>
  );
}

/* ---------- message rows ---------- */

function MessageRow({ m }: { m: Msg }) {
  if (m.kind === "user") {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[80%] rounded-xl rounded-tr-sm border border-border bg-surface-2 px-3.5 py-2.5">
          <p className="text-sm text-ink">{m.text}</p>
          {m.files && m.files.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.files.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded bg-bg px-1.5 py-0.5 font-mono text-2xs text-ink-faint"
                >
                  <Package className="h-2.5 w-2.5" />
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 font-mono text-2xs font-bold text-ink-dim">
          JC
        </span>
      </div>
    );
  }

  if (m.kind === "agent") {
    return (
      <div className="flex gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-ember-dim">
          <Sparkles className="h-3.5 w-3.5 text-[#1a0e08]" />
        </span>
        <p className="max-w-[80%] pt-1 text-sm leading-relaxed text-ink-dim">
          {m.text}
        </p>
      </div>
    );
  }

  if (m.kind === "result") {
    return (
      <div className="ml-11 overflow-hidden rounded-xl border border-live/30 bg-live/5">
        <div className="flex items-center gap-2 border-b border-live/15 px-4 py-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-live" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
          </span>
          <span className="text-2xs font-semibold uppercase tracking-wider text-live">
            Deployment live
          </span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-semibold text-ink">
              {m.name}
            </div>
            <a
              href={`https://${m.url}`}
              className="font-mono text-xs text-live hover:underline"
            >
              https://{m.url}
            </a>
            <div className="mt-0.5 text-2xs text-ink-faint">{m.stack}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href={`https://${m.url}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
            <Link
              href="/projects"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-2xs font-medium text-ink hover:border-ink-faint"
            >
              Console
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* op card */
  const op = m.op;
  const Icon = OP_ICON[op.key];
  const done = op.status === "done";
  return (
    <div className="ml-11 flex gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
      <span
        className={cx(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          done
            ? "border-live/30 bg-live/10 text-live"
            : "border-ember/30 bg-ember/10 text-ember",
        )}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{op.title}</span>
          {!done && (
            <Loader2 className="h-3 w-3 animate-spin text-ember" />
          )}
        </div>
        {op.detail && (
          <p className="mt-0.5 font-mono text-2xs text-ink-dim">{op.detail}</p>
        )}
        {op.log && op.log.length > 0 && (
          <div className="mt-2 space-y-0.5 rounded-lg border border-border-soft bg-[#0a0b0d] px-3 py-2 font-mono text-2xs text-ink-faint">
            {op.log.map((l, i) => (
              <div key={i} className="animate-fade-in">
                {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
