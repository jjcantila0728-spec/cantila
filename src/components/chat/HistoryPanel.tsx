"use client";

/* ============================================================
   HistoryPanel — a slide-over conversation list over the chat.

   Lists a project's conversations (title + relative last-activity),
   highlights the active one, and supports:
     - select        — switch the active conversation
     - inline rename  — pencil → input → save/cancel
     - delete         — trash → inline confirm
     - ＋ New chat    — start a fresh (pending) conversation

   Slides in from the left with a scrim; closeable. The owning
   ProjectChat keeps the conversation list + active id and refreshes
   after CRUD actions.
   ============================================================ */

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, MessageSquare } from "lucide-react";
import { cx } from "../ui";
import { relativeTime } from "./time";
import type { ApiConversation } from "../../lib/api";

export interface HistoryPanelProps {
  open: boolean;
  conversations: ApiConversation[];
  /** The active conversation id, or null when a fresh chat is pending. */
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryPanel({
  open,
  conversations,
  activeId,
  onClose,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: HistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const startRename = (c: ApiConversation) => {
    setConfirmId(null);
    setEditingId(c.id);
    setDraft(c.title);
  };

  const commitRename = (id: string) => {
    const t = draft.trim();
    setEditingId(null);
    if (t) onRename(id, t);
  };

  return (
    <>
      {/* scrim */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cx(
          "absolute inset-0 z-20 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-label="Conversation history"
        className={cx(
          "absolute inset-y-0 left-0 z-30 flex w-72 max-w-[85%] flex-col border-r border-border bg-surface-1 shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-dim">
            Conversations
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-surface-3 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-2.5 py-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 text-2xs font-semibold text-ink transition-colors hover:border-ink-faint"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-2xs text-ink-faint">
              No conversations yet.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                const isEditing = c.id === editingId;
                const isConfirming = c.id === confirmId;
                return (
                  <li key={c.id}>
                    {isEditing ? (
                      <div className="flex items-center gap-1 rounded-lg border border-ember/40 bg-surface-2 px-1.5 py-1">
                        <input
                          value={draft}
                          autoFocus
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-2xs text-ink outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Save name"
                          onClick={() => commitRename(c.id)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink"
                        >
                          <Check className="h-3 w-3 text-live" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          onClick={() => setEditingId(null)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={cx(
                          "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                          isActive ? "bg-surface-3" : "hover:bg-surface-2",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(c.id);
                            onClose();
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <MessageSquare
                            className={cx(
                              "h-3.5 w-3.5 shrink-0",
                              isActive ? "text-ember" : "text-ink-faint",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cx(
                                "block truncate text-2xs font-medium",
                                isActive ? "text-ink" : "text-ink-dim",
                              )}
                            >
                              {c.title || "New chat"}
                            </span>
                            <span className="block truncate text-[0.6rem] text-ink-faint">
                              {relativeTime(c.updatedAt)}
                              {c.lastPreview ? ` · ${c.lastPreview}` : ""}
                            </span>
                          </span>
                        </button>

                        {isConfirming ? (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              aria-label="Confirm delete"
                              onClick={() => {
                                setConfirmId(null);
                                onDelete(c.id);
                              }}
                              className="inline-flex h-5 items-center rounded px-1 text-[0.6rem] font-semibold text-red-400 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              aria-label="Cancel delete"
                              onClick={() => setConfirmId(null)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label="Rename conversation"
                              onClick={() => startRename(c)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-ink"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete conversation"
                              onClick={() => {
                                setEditingId(null);
                                setConfirmId(c.id);
                              }}
                              className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-faint hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
