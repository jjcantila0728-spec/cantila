"use client";

/* ============================================================
   ChatMessage — one message bubble.

   - user:   right-aligned ink bubble, with a hover toolbar
             (copy / edit-resend).
   - agent:  left bubble with a fleet agent badge (shown once
             per consecutive same-agent group), relative
             timestamp, Markdown body, and a hover toolbar
             (copy / regenerate).
   - result: the deployment "live" card (unchanged behavior).
   ============================================================ */

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  RefreshCw,
  Pencil,
  ExternalLink,
  ArrowRight,
  X,
  CornerDownLeft,
} from "lucide-react";
import { cx } from "../ui";
import type { ChatMsg } from "../ProjectChatMessages";
import { Markdown } from "./Markdown";
import { AgentAvatar } from "./AgentBadge";
import { useAgentMeta } from "./agentMeta";
import { relativeTime } from "./time";

export interface MessageActions {
  onCopy?: (text: string) => void;
  onRegenerate?: (msg: ChatMsg) => void;
  onEditResend?: (msg: ChatMsg, nextText: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-surface-3 hover:text-ink"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-live" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-surface-3 hover:text-ink"
    >
      {children}
    </button>
  );
}

export function ChatMessage({
  m,
  showAgentBadge = true,
  actions,
  consoleHref = "/projects",
}: {
  m: ChatMsg;
  /** False when grouped under the previous same-agent message. */
  showAgentBadge?: boolean;
  actions?: MessageActions;
  consoleHref?: string;
}) {
  const agentMetaResolved = useAgentMeta(m.kind === "agent" ? m.agent : undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  /* ---- user ---- */
  if (m.kind === "user") {
    if (editing) {
      return (
        <div className="flex justify-end">
          <div className="w-full max-w-[80%] rounded-xl border border-ember/40 bg-surface-2 p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.min(8, Math.max(2, draft.split("\n").length))}
              autoFocus
              className="w-full resize-none bg-transparent px-1.5 py-1 text-sm text-ink outline-none"
            />
            <div className="mt-1.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-2xs text-ink-dim hover:text-ink"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = draft.trim();
                  if (!t) return;
                  setEditing(false);
                  actions?.onEditResend?.(m, t);
                }}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-ember px-2 text-2xs font-semibold text-[#1a0e08] hover:bg-ember-bright"
              >
                <CornerDownLeft className="h-3 w-3" /> Resend
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="group flex justify-end gap-2.5">
        <div className="flex max-w-[80%] flex-col items-end">
          <div className="rounded-xl rounded-tr-sm border border-border bg-surface-2 px-3.5 py-2.5">
            <p className="whitespace-pre-wrap text-sm text-ink">{m.text}</p>
            {m.files && m.files.length > 0 && (
              <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                {m.files.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 rounded bg-bg px-1.5 py-0.5 font-mono text-2xs text-ink-faint"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <CopyButton text={m.text} />
            {actions?.onEditResend && (
              <ToolbarButton
                title="Edit & resend"
                onClick={() => {
                  setDraft(m.text);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </ToolbarButton>
            )}
          </div>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 font-mono text-2xs font-bold text-ink-dim">
          JC
        </span>
      </div>
    );
  }

  /* ---- agent ---- */
  if (m.kind === "agent") {
    return (
      <div className="group flex gap-2.5">
        <div className="w-7 shrink-0">
          {showAgentBadge ? (
            <AgentAvatar agentKey={m.agent} />
          ) : (
            <span className="block h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 max-w-[82%] flex-1">
          {showAgentBadge && (
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-2xs font-semibold text-ink">{agentMetaResolved.label}</span>
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-faint">
                {agentMetaResolved.role}
              </span>
            </div>
          )}
          <div className="text-ink-dim">
            <Markdown>{m.text}</Markdown>
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <CopyButton text={m.text} />
            {actions?.onRegenerate && (
              <ToolbarButton title="Regenerate" onClick={() => actions.onRegenerate?.(m)}>
                <RefreshCw className="h-3.5 w-3.5" />
              </ToolbarButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---- result (deployment live card) ---- */
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

  return null;
}

/** Relative timestamp pill — exported in case the orchestrator wants to
 *  render it next to a group. (Messages currently carry no createdAt in
 *  the streamed model; the orchestrator passes one when available.) */
export function MessageTime({ at }: { at?: string }) {
  const rel = relativeTime(at);
  if (!rel) return null;
  return <span className="font-mono text-[0.6rem] text-ink-faint">{rel}</span>;
}
