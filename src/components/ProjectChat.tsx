"use client";

/* ============================================================
   ProjectChat — the per-project workspace chat (slim orchestrator).

   Owns `messages` / `running` / `cancelRef`; loads history on
   mount; wires the EXISTING stream callbacks via `runStream`;
   and renders the rich chat surface from `src/components/chat`:

     FleetStrip  — active agents during a run.
     ChatMessage — role-styled bubbles w/ Markdown + actions.
     OpCard      — orchestration op-cards.
     ChatComposer— auto-grow input, mode toggle, slash menu, stop.

   Adds: stop, regenerate, edit-resend, scroll-to-bottom, typing
   indicator, error-retry, and empty-state suggestion chips.

   When the page lands with `?build=1`, the initial build streams
   right away (the orchestrator persists the first user message so
   a mid-build refresh resumes cleanly).
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Loader2, RefreshCw } from "lucide-react";
import {
  builderApi,
  buildStream,
  chatStream,
  type ApiProjectMessage,
  type ApiProjectAsset,
  type ProjectStreamCallbacks,
} from "../lib/api";
import {
  projectMessagesToChat,
  type ChatMsg,
  type ChatOp,
} from "./ProjectChatMessages";
import { ChatMessage } from "./chat/ChatMessage";
import { OpCard } from "./chat/OpCard";
import { FleetStrip, activeAgents } from "./chat/FleetStrip";
import { ChatComposer, type ChatMode } from "./chat/ChatComposer";
import { ensureAgentOrg, agentMeta } from "./chat/agentMeta";

interface ProjectChatProps {
  projectId: string;
  projectName: string;
  /** When set, the chat boots in build mode and streams the initial
   *  build right away — used by the redirect from /chat. */
  initialBuildPrompt?: string;
  /** Notified when a new asset lands so the workspace can refresh its
   *  AssetGallery without re-fetching. */
  onAssetCreated?: (asset: ApiProjectAsset) => void;
}

const SUGGESTIONS = [
  "Build a landing page",
  "Add a contact form",
  "Generate a logo",
  "Connect a domain",
];

export default function ProjectChat({
  projectId,
  projectName,
  initialBuildPrompt,
  onAssetCreated,
}: ProjectChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [errored, setErrored] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const bootedRef = useRef(false);
  /** The last (prompt, mode) sent — used by retry. */
  const lastSendRef = useRef<{ text: string; mode: ChatMode } | null>(null);

  /* scroll handling */
  const threadRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(near);
  }, []);

  // Auto-stick to bottom when already near the bottom.
  useEffect(() => {
    if (atBottom) scrollToBottom("smooth");
  }, [messages, atBottom, scrollToBottom]);

  /* ---- load history once; kick org enrichment (non-blocking) ---- */
  useEffect(() => {
    void ensureAgentOrg();
    let cancelled = false;
    (async () => {
      try {
        const res = await builderApi.getProjectChat(projectId);
        if (cancelled) return;
        setMessages(projectMessagesToChat(res.messages));
        requestAnimationFrame(() => scrollToBottom("auto"));
      } catch {
        // 404 on a brand-new project is fine — the chat starts empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, scrollToBottom]);

  /* ---- kick the initial build if we arrived here from /chat ---- */
  useEffect(() => {
    if (!initialBuildPrompt || bootedRef.current) return;
    bootedRef.current = true;
    void runStream(true, initialBuildPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBuildPrompt]);

  /* ---- message mutation helpers (unchanged stream contract) ---- */

  const upsertOp = useCallback((opKey: string, patch: Partial<ChatOp>) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.kind === "op" && m.op.key === opKey);
      if (idx === -1) {
        return [
          ...prev,
          {
            id: `tmp-${opKey}-${Date.now()}`,
            kind: "op",
            op: {
              key: opKey,
              title: patch.title ?? "",
              status: patch.status ?? "running",
              detail: patch.detail,
              agent: patch.agent,
              asset: patch.asset,
            },
          },
        ];
      }
      const cur = prev[idx];
      if (cur.kind !== "op") return prev;
      const updated: ChatMsg = {
        ...cur,
        op: { ...cur.op, ...patch, key: opKey },
      };
      const copy = prev.slice();
      copy[idx] = updated;
      return copy;
    });
  }, []);

  const appendAgent = useCallback((agent: string, content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}-${Math.random()}`, kind: "agent", text: content, agent },
    ]);
  }, []);

  const appendResult = useCallback((name: string, url: string, stack: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}-${Math.random()}`, kind: "result", name, url, stack },
    ]);
  }, []);

  const appendPersisted = useCallback((m: ApiProjectMessage) => {
    if (m.role === "user" && m.kind === "message") {
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev; // already have the real row
        const persisted: ChatMsg = { id: m.id, kind: "user", text: m.content };
        // Replace a trailing optimistic user bubble with the same text.
        const last = prev[prev.length - 1];
        if (
          last &&
          last.kind === "user" &&
          last.id.startsWith("tmp-") &&
          last.text === m.content
        ) {
          const copy = prev.slice();
          copy[copy.length - 1] = persisted;
          return copy;
        }
        return [...prev, persisted];
      });
      return;
    }
    // Op cards / agent messages already arrive via the granular events;
    // persisted rows are the durable source of truth on refresh.
  }, []);

  /** Mark any still-running ops as interrupted (failed) — used by stop. */
  const interruptRunningOps = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === "op" && m.op.status === "running"
          ? { ...m, op: { ...m.op, status: "failed", detail: m.op.detail ?? "Interrupted" } }
          : m,
      ),
    );
  }, []);

  const streamCallbacks: ProjectStreamCallbacks = useMemo(
    () => ({
      onAgentMessage: ({ agent, content }) => appendAgent(agent, content),
      onOpStarted: ({ opKey, agent, title }) =>
        upsertOp(opKey, { title, agent, status: "running" }),
      onOpFinished: ({ opKey, agent, title, detail, status }) =>
        upsertOp(opKey, { title, agent, detail, status: status === "ok" ? "done" : "failed" }),
      onAssetCreated: (asset) => {
        const assetPatch = {
          path: asset.path,
          mimeType: asset.mimeType,
          dataUrl: asset.dataUrl,
          provider: asset.provider,
        };
        upsertOp(`image:${asset.path}`, { asset: assetPatch });
        upsertOp(`anim:${asset.path}`, { asset: assetPatch });
        onAssetCreated?.(asset);
      },
      onMessage: appendPersisted,
      onResult: ({ name, url, stack }) => appendResult(name, url, stack),
      onError: (msg) => {
        setErrored(true);
        appendAgent("orchestrator", `Stream error: ${msg}`);
      },
      onDone: () => setRunning(false),
    }),
    [appendAgent, appendResult, appendPersisted, upsertOp, onAssetCreated],
  );

  const runStream = useCallback(
    async (isBuild: boolean, text: string) => {
      setErrored(false);
      setRunning(true);
      lastSendRef.current = { text, mode: isBuild ? "build" : "chat" };
      cancelRef.current?.();
      if (isBuild) {
        // Optimistic user bubble (build's first user msg is persisted by
        // the orchestrator; show it immediately for responsiveness).
        setMessages((prev) => [
          ...prev,
          { id: `tmp-${Date.now()}`, kind: "user", text },
        ]);
        cancelRef.current = buildStream(projectId, text, streamCallbacks);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `tmp-${Date.now()}`, kind: "user", text },
        ]);
        cancelRef.current = chatStream(projectId, text, streamCallbacks);
      }
      setAtBottom(true);
    },
    [projectId, streamCallbacks],
  );

  /* ---- actions ---- */

  const handleSend = useCallback(
    (text: string, mode: ChatMode) => {
      void runStream(mode === "build", text);
    },
    [runStream],
  );

  const handleStop = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    interruptRunningOps();
    setRunning(false);
  }, [interruptRunningOps]);

  const handleRetry = useCallback(() => {
    const last = lastSendRef.current;
    if (!last || running) return;
    // Drop the trailing error bubble, then re-run.
    setMessages((prev) => {
      const copy = prev.slice();
      const lastMsg = copy[copy.length - 1];
      if (lastMsg && lastMsg.kind === "agent" && lastMsg.text.startsWith("Stream error:")) {
        copy.pop();
      }
      return copy;
    });
    void runStream(last.mode === "build", last.text);
  }, [running, runStream]);

  /** Find the user prompt that drove a given message, then truncate the
   *  thread to just before that user turn and re-run it. */
  const regenerateFrom = useCallback(
    (target: ChatMsg) => {
      if (running) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === target.id);
        if (idx === -1) return prev;
        // Walk back to the user message that started this turn.
        let userIdx = idx;
        while (userIdx >= 0 && prev[userIdx].kind !== "user") userIdx--;
        if (userIdx < 0) return prev;
        const userMsg = prev[userIdx];
        if (userMsg.kind !== "user") return prev;
        lastSendRef.current = {
          text: userMsg.text,
          mode: lastSendRef.current?.mode ?? "chat",
        };
        // Keep everything up to & including the user turn; re-run it.
        const kept = prev.slice(0, userIdx + 1);
        queueMicrotask(() => {
          setErrored(false);
          setRunning(true);
          cancelRef.current?.();
          const mode = lastSendRef.current?.mode ?? "chat";
          cancelRef.current =
            mode === "build"
              ? buildStream(projectId, userMsg.text, streamCallbacks)
              : chatStream(projectId, userMsg.text, streamCallbacks);
          setAtBottom(true);
        });
        return kept;
      });
    },
    [running, projectId, streamCallbacks],
  );

  /** Inline-edit a user message: truncate after it and re-run the new text. */
  const editResend = useCallback(
    (target: ChatMsg, nextText: string) => {
      if (running) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === target.id);
        if (idx === -1) return prev;
        const kept = prev.slice(0, idx); // drop the old user msg + everything after
        queueMicrotask(() => {
          setErrored(false);
          setRunning(true);
          lastSendRef.current = { text: nextText, mode: lastSendRef.current?.mode ?? "chat" };
          cancelRef.current?.();
          const mode = lastSendRef.current?.mode ?? "chat";
          setMessages((cur) => [
            ...cur,
            { id: `tmp-${Date.now()}`, kind: "user", text: nextText },
          ]);
          cancelRef.current =
            mode === "build"
              ? buildStream(projectId, nextText, streamCallbacks)
              : chatStream(projectId, nextText, streamCallbacks);
          setAtBottom(true);
        });
        return kept;
      });
    },
    [running, projectId, streamCallbacks],
  );

  /* ---- derived: typing indicator agent ---- */
  const typingAgent = useMemo(() => {
    if (!running) return null;
    const active = activeAgents(messages, 1);
    const key = active[0];
    return agentMeta(key).label;
  }, [running, messages]);

  /* ---- render the grouped message list ---- */
  const rendered = useMemo(() => {
    const actions = {
      onRegenerate: regenerateFrom,
      onEditResend: editResend,
    };
    return messages.map((m, i) => {
      if (m.kind === "op") {
        return <OpCard key={m.id} op={m.op} />;
      }
      // Group consecutive same-agent messages: hide the badge if the
      // previous rendered message was an agent turn by the same agent.
      let showAgentBadge = true;
      if (m.kind === "agent") {
        const prev = messages[i - 1];
        if (prev && prev.kind === "agent" && (prev.agent ?? "") === (m.agent ?? "")) {
          showAgentBadge = false;
        }
      }
      return (
        <ChatMessage
          key={m.id}
          m={m}
          showAgentBadge={showAgentBadge}
          actions={actions}
          consoleHref="/projects"
        />
      );
    });
  }, [messages, regenerateFrom, editResend]);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <FleetStrip messages={messages} running={running} />

      <div ref={threadRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="mx-auto max-w-md px-6 py-10 text-center">
            <p className="text-sm text-ink-dim">
              This is the chat for{" "}
              <span className="font-semibold text-ink">{projectName}</span>. Ask the team to add a
              feature, generate an image, scale the deploy, attach a domain — anything the project
              needs.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void runStream(false, s)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-2xs font-medium text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
            {rendered}

            {running && (
              <div className="flex items-center gap-2 pl-11 text-2xs text-ink-faint">
                <Loader2 className="h-3 w-3 animate-spin text-ember" />
                {typingAgent ? `${typingAgent} is working…` : "Cantila is working…"}
              </div>
            )}

            {errored && !running && (
              <div className="flex items-center gap-2 pl-11">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-2xs font-medium text-ink hover:border-ink-faint"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Scroll to bottom"
          className="absolute bottom-28 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface-2 text-ink-dim shadow-lg transition-colors hover:text-ink"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      <ChatComposer
        projectId={projectId}
        running={running}
        onSend={handleSend}
        onStop={handleStop}
      />
    </div>
  );
}
