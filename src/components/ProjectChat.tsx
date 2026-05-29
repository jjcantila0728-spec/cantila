"use client";

/* ============================================================
   ProjectChat — the per-project workspace chat.

   Pulls the chat history from `GET /v1/projects/:id/chat` on
   mount, opens an SSE stream to `POST /v1/projects/:id/chat`
   for each user turn, and replays both into the shared
   `ChatThread` renderer.

   When the page lands with `?build=1`, we kick the initial
   build stream (`POST /v1/projects/:id/build`) using the prompt
   the user typed at /chat. The orchestrator persists the
   first user message into the chat history, so a refresh mid-
   build picks up where it left off.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, CornerDownLeft } from "lucide-react";
import {
  builderApi,
  buildStream,
  chatStream,
  type ApiProjectMessage,
  type ApiProjectAsset,
  type ProjectStreamCallbacks,
} from "../lib/api";
import {
  ChatThread,
  projectMessagesToChat,
  type ChatMsg,
  type ChatOp,
} from "./ProjectChatMessages";

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

export default function ProjectChat({
  projectId,
  projectName,
  initialBuildPrompt,
  onAssetCreated,
}: ProjectChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const bootedRef = useRef(false);

  /* ---- load history once ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await builderApi.getProjectChat(projectId);
        if (cancelled) return;
        setMessages(projectMessagesToChat(res.messages));
      } catch {
        // 404 on a brand-new project is fine — the chat starts empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ---- kick the initial build if we arrived here from /chat ---- */
  useEffect(() => {
    if (!initialBuildPrompt || bootedRef.current) return;
    bootedRef.current = true;
    void runStream(true, initialBuildPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBuildPrompt]);

  /* ---- helpers ---- */

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
      setMessages((prev) =>
        prev.some((x) => x.id === m.id)
          ? prev
          : [...prev, { id: m.id, kind: "user", text: m.content }],
      );
      return;
    }
    // The op cards and agent messages are already streamed via the more
    // granular events; persisted rows are the durable source of truth so
    // a refresh shows the same thing. Replace any tmp- placeholder with
    // the persisted id where possible.
  }, []);

  const streamCallbacks: ProjectStreamCallbacks = {
    onAgentMessage: ({ agent, content }) => appendAgent(agent, content),
    onOpStarted: ({ opKey, agent, title }) =>
      upsertOp(opKey, { title, agent, status: "running" }),
    onOpFinished: ({ opKey, agent, title, detail, status }) =>
      upsertOp(opKey, { title, agent, detail, status: status === "ok" ? "done" : "failed" }),
    onAssetCreated: (asset) => {
      upsertOp(`image:${asset.path}`, {
        asset: {
          path: asset.path,
          mimeType: asset.mimeType,
          dataUrl: asset.dataUrl,
          provider: asset.provider,
        },
      });
      upsertOp(`anim:${asset.path}`, {
        asset: {
          path: asset.path,
          mimeType: asset.mimeType,
          dataUrl: asset.dataUrl,
          provider: asset.provider,
        },
      });
      onAssetCreated?.(asset);
    },
    onMessage: appendPersisted,
    onResult: ({ name, url, stack }) => appendResult(name, url, stack),
    onError: (msg) => appendAgent("orchestrator", `Stream error: ${msg}`),
    onDone: () => setRunning(false),
  };

  async function runStream(isBuild: boolean, text: string) {
    setRunning(true);
    cancelRef.current?.();
    if (isBuild) {
      cancelRef.current = buildStream(projectId, text, streamCallbacks);
    } else {
      // optimistic user bubble
      setMessages((prev) => [
        ...prev,
        { id: `tmp-${Date.now()}`, kind: "user", text },
      ]);
      cancelRef.current = chatStream(projectId, text, streamCallbacks);
    }
  }

  function submit() {
    const t = input.trim();
    if (!t || running) return;
    setInput("");
    void runStream(false, t);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatThread
        messages={messages}
        running={running}
        consoleHref={`/projects`}
        emptyState={
          <div className="mx-auto max-w-md px-6 py-10 text-center text-sm text-ink-dim">
            This is the chat for <span className="font-semibold text-ink">{projectName}</span>.
            Ask the team to add a feature, generate an image, scale the deploy,
            attach a domain — anything the project needs.
          </div>
        }
      />
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
              placeholder="Tell the team what to do — generate a logo, add a domain, scale…"
              className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={submit}
              disabled={running || !input.trim()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-semibold text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" strokeWidth={2.4} />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
