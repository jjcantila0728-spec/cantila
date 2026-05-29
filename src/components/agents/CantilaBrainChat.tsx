"use client";

/* ============================================================
   CantilaBrainChat — owner-only composer pinned beneath the
   agents canvas. Commands are rule-based (regex, no LLM in v1)
   so behaviour is predictable and we can swap in a planner
   later without changing the page contract.

   Grammar:
     pause             →  api.agentsPause()
     resume            →  api.agentsResume()
     tick              →  api.agentsTick()
     add agent <Name>: <blurb>   →  api.createAgentProposal(...)

   Anything else echoes a usage hint into the transcript.
   ============================================================ */

import { useState } from "react";
import { CornerDownLeft, Loader2, Bot, User } from "lucide-react";
import { cx } from "@/components/ui";
import { api } from "@/lib/api";
import type { ProposedAgentRow } from "./agent-meta";

type ChatRow =
  | { kind: "user"; text: string; at: string }
  | { kind: "brain"; text: string; at: string };

export interface CantilaBrainChatProps {
  onProposed: (row: ProposedAgentRow) => void;
  onStateChanged: () => void;
}

const HELP =
  "Try: `pause`, `resume`, `tick`, or `add agent <Name>: <blurb>`.";

export default function CantilaBrainChat({
  onProposed,
  onStateChanged,
}: CantilaBrainChatProps) {
  const [rows, setRows] = useState<ChatRow[]>([
    {
      kind: "brain",
      text: `Owner shell ready. ${HELP}`,
      at: nowIso(),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  function append(row: ChatRow): void {
    setRows((prev) => [...prev, row]);
  }

  async function handle(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    append({ kind: "user", text: trimmed, at: nowIso() });
    setBusy(true);

    const lower = trimmed.toLowerCase();
    try {
      if (lower === "pause") {
        const r = await api.agentsPause();
        append({
          kind: "brain",
          text: `Brain paused. Auto-actions held until you resume. (paused=${r.paused})`,
          at: nowIso(),
        });
        onStateChanged();
        return;
      }
      if (lower === "resume") {
        const r = await api.agentsResume();
        append({
          kind: "brain",
          text: `Brain resumed. (paused=${r.paused})`,
          at: nowIso(),
        });
        onStateChanged();
        return;
      }
      if (lower === "tick") {
        await api.agentsTick();
        append({
          kind: "brain",
          text: "Forced a tick — observations refreshed.",
          at: nowIso(),
        });
        onStateChanged();
        return;
      }

      const add = /^add\s+agent\s+([^:]+?):\s*(.+)$/i.exec(trimmed);
      if (add) {
        const name = add[1].trim();
        const blurb = add[2].trim();
        const row = await api.createAgentProposal({ name, blurb });
        append({
          kind: "brain",
          text: `Queued "${row.name}" as a proposed agent. It'll appear on the canvas dimmed until backend wiring lands.`,
          at: nowIso(),
        });
        onProposed(row);
        return;
      }

      append({
        kind: "brain",
        text: `I didn't recognise that. ${HELP}`,
        at: nowIso(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "command failed";
      append({
        kind: "brain",
        text: `Error: ${msg}`,
        at: nowIso(),
      });
    } finally {
      setBusy(false);
    }
  }

  function submit(): void {
    if (busy) return;
    const text = input;
    setInput("");
    void handle(text);
  }

  return (
    <div className="panel flex h-[360px] flex-col overflow-hidden p-0">
      <header className="flex items-center gap-2 border-b border-border-soft bg-surface-2/60 px-4 py-2">
        <Bot className="h-3.5 w-3.5 text-ember" />
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">
          Owner shell · talk to the brain
        </span>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {rows.map((r, i) => (
          <ChatBubble key={i} row={r} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[0.65rem] text-ink-faint">
            <Loader2 className="h-3 w-3 animate-spin" />
            running…
          </div>
        )}
      </div>
      <div className="border-t border-border bg-surface px-3 py-2.5">
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
            placeholder="add agent Databases: pool exhaustion alerts"
            className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-2xs text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            className="flex h-8 items-center gap-1 rounded-lg bg-ember px-3 text-2xs font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CornerDownLeft className="h-3 w-3" strokeWidth={2.4} />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ row }: { row: ChatRow }) {
  const isUser = row.kind === "user";
  return (
    <div
      className={cx(
        "flex items-start gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <span
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-ink/10 text-ink" : "bg-ember/15 text-ember",
        )}
      >
        {isUser ? (
          <User className="h-3 w-3" />
        ) : (
          <Bot className="h-3 w-3" />
        )}
      </span>
      <div
        className={cx(
          "max-w-[80%] rounded-lg px-2.5 py-1.5 text-[0.7rem] leading-snug",
          isUser
            ? "bg-surface-3 text-ink"
            : "bg-ember/5 text-ink-dim ring-1 ring-ember/15",
        )}
      >
        {row.text}
      </div>
    </div>
  );
}

function nowIso(): string {
  return new Date().toISOString();
}
