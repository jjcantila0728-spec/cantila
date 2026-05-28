"use client";

/* ============================================================
   Shared chat message renderer.

   The deploy chat (`/deploy`) and the per-project chat
   (`/@handle/<name>`) both render the same message shapes —
   user turns, agent turns, op cards (with optional log lines
   and asset previews), and result cards. This module is the
   single renderer; both surfaces import it.
   ============================================================ */

import { useEffect, useRef } from "react";
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
  ExternalLink,
  Image as ImageIcon,
  Film,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cx } from "./ui";
import type { ApiProjectAsset } from "../lib/api";

export type OpStatus = "running" | "done" | "failed";
export type OpKey = string;

export interface ChatOp {
  key: OpKey;
  title: string;
  detail?: string;
  status: OpStatus;
  agent?: string;
  log?: string[];
  /** When the op produced an asset (image/lottie/css), the renderer can
   *  inline a preview so the user sees the result without leaving chat. */
  asset?: {
    path: string;
    mimeType: string;
    dataUrl?: string;
    provider?: string;
  };
}

export type ChatMsg =
  | { id: string; kind: "user"; text: string; files?: string[] }
  | { id: string; kind: "agent"; text: string; agent?: string }
  | { id: string; kind: "op"; op: ChatOp }
  | { id: string; kind: "result"; name: string; url: string; stack: string };

const OP_ICON: Record<string, typeof Search> = {
  detect: Search,
  plan: Cpu,
  provision: Database,
  build: Package,
  schedule: Server,
  route: Globe,
  verify: HeartPulse,
  scaffold: Package,
  deploy: Server,
  scale: Cpu,
};

function pickIcon(op: ChatOp): typeof Search {
  if (op.key.startsWith("image:") || op.asset?.mimeType.startsWith("image/")) return ImageIcon;
  if (op.key.startsWith("anim:") || op.asset?.mimeType.includes("json")) return Film;
  return OP_ICON[op.key] ?? Cpu;
}

export function ChatThread({
  messages,
  running,
  emptyState,
  consoleHref = "/projects",
}: {
  messages: ChatMsg[];
  running?: boolean;
  emptyState?: React.ReactNode;
  consoleHref?: string;
}) {
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && emptyState) {
    return (
      <div ref={threadRef} className="flex-1 overflow-y-auto">
        {emptyState}
      </div>
    );
  }
  return (
    <div ref={threadRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
        {messages.map((m) => (
          <MessageRow key={m.id} m={m} consoleHref={consoleHref} />
        ))}
        {running && (
          <div className="flex items-center gap-2 pl-11 text-2xs text-ink-faint">
            <Loader2 className="h-3 w-3 animate-spin text-ember" />
            Cantila is working…
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({ m, consoleHref }: { m: ChatMsg; consoleHref: string }) {
  if (m.kind === "user") {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[80%] rounded-xl rounded-tr-sm border border-border bg-surface-2 px-3.5 py-2.5">
          <p className="text-sm text-ink whitespace-pre-wrap">{m.text}</p>
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
        <div className="max-w-[80%] pt-1">
          {m.agent && (
            <div className="mb-0.5 font-mono text-2xs uppercase tracking-wider text-ink-faint">
              {m.agent} agent
            </div>
          )}
          <p className="text-sm leading-relaxed text-ink-dim">{m.text}</p>
        </div>
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
            <div className="font-display text-base font-semibold text-ink">{m.name}</div>
            <a href={`https://${m.url}`} className="font-mono text-xs text-live hover:underline">
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
              href={consoleHref}
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
  const Icon = pickIcon(op);
  const done = op.status === "done";
  const failed = op.status === "failed";
  return (
    <div className="ml-11 flex gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
      <span
        className={cx(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          failed
            ? "border-red-500/30 bg-red-500/10 text-red-400"
            : done
              ? "border-live/30 bg-live/10 text-live"
              : "border-ember/30 bg-ember/10 text-ember",
        )}
      >
        {failed ? (
          <AlertCircle className="h-4 w-4" />
        ) : done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{op.title}</span>
          {op.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-ember" />}
          {op.agent && (
            <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-2xs text-ink-faint">
              {op.agent}
            </span>
          )}
        </div>
        {op.detail && <p className="mt-0.5 font-mono text-2xs text-ink-dim">{op.detail}</p>}
        {op.log && op.log.length > 0 && (
          <div className="mt-2 space-y-0.5 rounded-lg border border-border-soft bg-[#0a0b0d] px-3 py-2 font-mono text-2xs text-ink-faint">
            {op.log.map((l, i) => (
              <div key={i} className="animate-fade-in">
                {l}
              </div>
            ))}
          </div>
        )}
        {op.asset?.dataUrl && (
          <div className="mt-2.5 inline-block overflow-hidden rounded-lg border border-border bg-bg">
            <AssetThumbnail dataUrl={op.asset.dataUrl} mimeType={op.asset.mimeType} />
            <div className="border-t border-border px-2.5 py-1.5 font-mono text-2xs text-ink-faint">
              {op.asset.path}
              {op.asset.provider && (
                <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-2xs">
                  {op.asset.provider}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Render an inline preview for an asset by mime type — SVG / PNG / JPG
 *  show as <img>; Lottie JSON shows as a code preview (rendering Lottie
 *  inline would pull in another dep); CSS shows as a code block. */
export function AssetThumbnail({
  dataUrl,
  mimeType,
}: {
  dataUrl: string;
  mimeType: string;
}) {
  if (mimeType.startsWith("image/")) {
    return (
      <img
        src={dataUrl}
        alt="generated asset"
        className="block h-32 w-auto max-w-[18rem] object-contain bg-[#0a0b0d]"
      />
    );
  }
  if (mimeType === "application/json") {
    // Lottie JSON — show the first line so it's recognisable.
    return (
      <div className="flex h-32 w-72 items-center gap-2 bg-[#0a0b0d] px-3 font-mono text-2xs text-ink-faint">
        <Film className="h-4 w-4 text-ember" />
        Lottie animation
      </div>
    );
  }
  if (mimeType === "text/css") {
    return (
      <div className="flex h-32 w-72 items-center gap-2 bg-[#0a0b0d] px-3 font-mono text-2xs text-ink-faint">
        <FileText className="h-4 w-4 text-ember" />
        CSS keyframe animation
      </div>
    );
  }
  return (
    <div className="flex h-32 w-72 items-center gap-2 bg-[#0a0b0d] px-3 font-mono text-2xs text-ink-faint">
      <FileText className="h-4 w-4 text-ember" />
      {mimeType}
    </div>
  );
}

/** Build a ChatMsg list from an ApiProjectMessage list — preserves the
 *  order and rolls op_card rows up into a single op message per opKey
 *  (running → done/failed). */
export function projectMessagesToChat(rows: {
  id: string;
  role: string;
  agent?: string;
  kind: string;
  content: string;
  metadata?: Record<string, unknown> | null;
}[]): ChatMsg[] {
  const out: ChatMsg[] = [];
  const opIndex = new Map<string, number>();

  for (const m of rows) {
    if (m.role === "user" && m.kind === "message") {
      out.push({ id: m.id, kind: "user", text: m.content });
      continue;
    }
    if (m.kind === "message" || m.kind === "result" || m.kind === "asset") {
      if (m.kind === "result" && m.metadata) {
        const meta = m.metadata as Record<string, unknown>;
        out.push({
          id: m.id,
          kind: "result",
          name: String(meta.name ?? "project"),
          url: String(meta.url ?? ""),
          stack: String(meta.stack ?? ""),
        });
        continue;
      }
      if (m.kind === "asset" && m.metadata) {
        const meta = m.metadata as Record<string, unknown>;
        const opKey = String(meta.opKey ?? `asset:${m.id}`);
        out.push({
          id: m.id,
          kind: "op",
          op: {
            key: opKey,
            title: m.content,
            agent: m.agent,
            status: meta.status === "failed" ? "failed" : meta.status === "done" ? "done" : "running",
            detail: typeof meta.detail === "string" ? meta.detail : undefined,
            asset: {
              path: String(meta.path ?? ""),
              mimeType: typeof meta.mimeType === "string" ? meta.mimeType : "image/svg+xml",
              dataUrl: typeof meta.dataUrl === "string" ? meta.dataUrl : undefined,
              provider: typeof meta.provider === "string" ? meta.provider : undefined,
            },
          },
        });
        continue;
      }
      out.push({ id: m.id, kind: "agent", text: m.content, agent: m.agent });
      continue;
    }
    if (m.kind === "op_card") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const opKey = String(meta.opKey ?? m.id);
      const next: ChatOp = {
        key: opKey,
        title: m.content,
        agent: m.agent,
        status: meta.status === "failed" ? "failed" : meta.status === "done" ? "done" : "running",
        detail: typeof meta.detail === "string" ? meta.detail : undefined,
      };
      const existing = opIndex.get(opKey);
      if (existing !== undefined) {
        out[existing] = { id: m.id, kind: "op", op: next };
      } else {
        opIndex.set(opKey, out.length);
        out.push({ id: m.id, kind: "op", op: next });
      }
    }
  }
  return out;
}
