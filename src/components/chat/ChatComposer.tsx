"use client";

/* ============================================================
   ChatComposer — the chat input.

   - Auto-grow textarea (Enter = send, Shift+Enter = newline).
   - Build ⇄ Chat mode toggle, persisted to
     `cantila:chat-mode:<projectId>` (try/catch for SSR / private
     mode where localStorage may throw).
   - Minimal /slash menu (/build, /deploy, /env, /domains) that
     filters as you type and inserts the command.
   - Send button becomes Stop while a run is streaming.
   ============================================================ */

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CornerDownLeft, Square, Hammer, MessageSquare } from "lucide-react";
import { cx } from "../ui";

export type ChatMode = "build" | "chat";

interface SlashCommand {
  cmd: string;
  hint: string;
}

const SLASH: SlashCommand[] = [
  { cmd: "/build", hint: "Scaffold or extend the project" },
  { cmd: "/deploy", hint: "Ship the current build to production" },
  { cmd: "/rollback", hint: "Roll back to a previous deployment" },
  { cmd: "/scale", hint: "Scale the project's compute resources" },
  { cmd: "/env", hint: "Set or inspect environment variables" },
  { cmd: "/domains", hint: "Attach or manage a custom domain" },
  { cmd: "/logs", hint: "Stream recent deployment logs" },
  { cmd: "/analyze", hint: "Analyze the project for issues or optimizations" },
];

function loadMode(projectId: string): ChatMode {
  try {
    const v = localStorage.getItem(`cantila:chat-mode:${projectId}`);
    if (v === "build" || v === "chat") return v;
  } catch {
    /* ignore */
  }
  return "chat";
}

export function ChatComposer({
  projectId,
  running,
  onSend,
  onStop,
}: {
  projectId: string;
  running: boolean;
  /** Sends the trimmed text in the given mode. */
  onSend: (text: string, mode: ChatMode) => void;
  onStop: () => void;
}) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate persisted mode on mount (avoids SSR/client mismatch).
  useEffect(() => {
    setMode(loadMode(projectId));
  }, [projectId]);

  const setModePersisted = (next: ChatMode) => {
    setMode(next);
    try {
      localStorage.setItem(`cantila:chat-mode:${projectId}`, next);
    } catch {
      /* ignore */
    }
  };

  // Auto-grow.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  // Slash menu: open when the input is exactly a leading "/word".
  const slashQuery = /^\/\S*$/.test(input) ? input : null;
  const slashMatches =
    slashQuery != null
      ? SLASH.filter((s) => s.cmd.startsWith(slashQuery.toLowerCase()))
      : [];
  const showSlash = slashMatches.length > 0 && input !== "";

  const submit = () => {
    const t = input.trim();
    if (!t || running) return;

    // Slash-command routing: `/build …` forces build mode for this turn;
    // a bare command just sets intent / mode.
    const slashMatch = /^\/(\w+)\b\s*(.*)$/.exec(t);
    if (slashMatch) {
      const [, cmd, rest] = slashMatch;
      const known = SLASH.some((s) => s.cmd === `/${cmd}`);
      if (known) {
        const turnMode: ChatMode = cmd === "build" ? "build" : mode;
        const body = rest.trim();
        if (cmd === "build") setModePersisted("build");
        if (body) {
          setInput("");
          onSend(body, turnMode);
          return;
        }
        // Bare command with no body — just leave it staged as text.
      }
    }

    setInput("");
    onSend(t, mode);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // If the slash menu is open, Enter completes the top match instead.
      if (showSlash && slashMatches.length > 0) {
        e.preventDefault();
        setInput(slashMatches[0].cmd + " ");
        return;
      }
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-3.5">
      <div className="mx-auto max-w-3xl">
        {/* mode toggle + slash menu sit above the input */}
        <div className="relative">
          {showSlash && (
            <div className="absolute bottom-full left-0 mb-1.5 w-72 overflow-hidden rounded-lg border border-border bg-surface-2 shadow-lg">
              {slashMatches.map((s, i) => (
                <button
                  key={s.cmd}
                  type="button"
                  onClick={() => {
                    setInput(s.cmd + " ");
                    taRef.current?.focus();
                  }}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-3",
                    i !== slashMatches.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <span className="font-mono text-2xs font-semibold text-ember">{s.cmd}</span>
                  <span className="truncate text-2xs text-ink-faint">{s.hint}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mb-2 flex items-center gap-1.5">
            <div className="inline-flex rounded-lg border border-border bg-bg p-0.5">
              <button
                type="button"
                onClick={() => setModePersisted("chat")}
                className={cx(
                  "inline-flex h-6 items-center gap-1 rounded-md px-2 text-2xs font-medium transition-colors",
                  mode === "chat" ? "bg-surface-3 text-ink" : "text-ink-faint hover:text-ink-dim",
                )}
              >
                <MessageSquare className="h-3 w-3" /> Chat
              </button>
              <button
                type="button"
                onClick={() => setModePersisted("build")}
                className={cx(
                  "inline-flex h-6 items-center gap-1 rounded-md px-2 text-2xs font-medium transition-colors",
                  mode === "build" ? "bg-ember/15 text-ember" : "text-ink-faint hover:text-ink-dim",
                )}
              >
                <Hammer className="h-3 w-3" /> Build
              </button>
            </div>
            <span className="font-mono text-[0.6rem] text-ink-faint">
              {mode === "build"
                ? "Build mode — turns scaffold & ship"
                : "Chat mode — ask the fleet anything"}
            </span>
          </div>

          <div className="flex items-end gap-2 rounded-xl border border-border bg-bg p-2 focus-within:border-ink-faint">
            <div className="flex min-w-0 flex-1 flex-col">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                mode === "build"
                  ? "Describe what to build — a landing page, a contact form…"
                  : "Tell the team what to do — generate a logo, add a domain, scale… (/ for commands)"
              }
              className="max-h-52 w-full resize-none bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <div className="flex items-center gap-2 pb-1 pt-0.5 text-[0.6rem] text-ink-faint">
              <span>↵ send</span>
              <span>⇧↵ newline</span>
              <span>/ commands</span>
              <span className="ml-auto">? shortcuts</span>
            </div>
            </div>
            {running ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!input.trim()}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-40"
              >
                <CornerDownLeft className="h-4 w-4" strokeWidth={2.4} />
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
