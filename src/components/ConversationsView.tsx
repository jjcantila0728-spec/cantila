"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Send,
  ArrowUpRight,
} from "lucide-react";
import { StatusBadge, Pill, cx } from "@/components/ui";
import { getProject } from "@/lib/mock-data";
import type {
  PhoneNumber,
  SmsConversation,
  SmsThreadMessage,
} from "@/lib/types";

const COUNTRY: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
};

export default function ConversationsView({
  number,
  conversations,
}: {
  number: PhoneNumber;
  conversations: SmsConversation[];
}) {
  const [convs, setConvs] = useState<SmsConversation[]>(() => [
    ...conversations,
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = convs.find((c) => c.id === selectedId) ?? null;
  const project = getProject(number.projectId ?? "");
  const totalUnread = convs.reduce((s, c) => s + c.unread, 0);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedId, convs]);

  function openConv(id: string) {
    setSelectedId(id);
    setConvs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    );
  }

  function send() {
    const body = draft.trim();
    if (!body || !selectedId) return;
    const msg: SmsThreadMessage = {
      id: `m${Date.now()}`,
      direction: "outbound",
      body,
      at: "just now",
      status: "sent",
    };
    setConvs((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, messages: [...c.messages, msg] }
          : c,
      ),
    );
    setDraft("");
  }

  return (
    <div className="space-y-6">
      {/* back */}
      <Link
        href="/sms"
        className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        SMS
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-violet">
            <Phone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {number.number}
              </h1>
              <StatusBadge status={number.status} />
            </div>
            <p className="mt-0.5 text-sm text-ink-dim">
              {number.type} · {COUNTRY[number.country] ?? number.country}
              {project && (
                <>
                  {" · "}
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-0.5 hover:text-ember"
                  >
                    {project.name}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5 self-start sm:self-auto">
          {number.capabilities.map((c) => (
            <Pill key={c} tone="neutral">
              {c}
            </Pill>
          ))}
        </div>
      </div>

      {/* conversations */}
      <div className="panel overflow-hidden p-0 lg:flex lg:h-[620px]">
        {/* conversation list */}
        <div
          className={cx(
            "flex flex-col border-border-soft lg:w-[320px] lg:shrink-0 lg:border-r",
            selected && "hidden lg:flex",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">
              Conversations
            </h2>
            {totalUnread > 0 && (
              <span className="rounded-full bg-ember px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-[#1a0e08]">
                {totalUnread} new
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {convs.length === 0 ? (
              <div className="dot-grid flex h-full min-h-[200px] flex-col items-center justify-center px-6 py-12 text-center">
                <MessageSquare className="h-6 w-6 text-ink-faint" />
                <p className="mt-2 text-2xs text-ink-faint">
                  No conversations yet for this number.
                </p>
              </div>
            ) : (
              convs.map((c) => {
                const last = c.messages[c.messages.length - 1];
                const isSel = c.id === selectedId;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openConv(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openConv(c.id);
                      }
                    }}
                    className={cx(
                      "flex cursor-pointer gap-3 border-b border-border-soft px-4 py-3 transition-colors",
                      isSel ? "bg-surface-3" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-ink-faint">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            "min-w-0 flex-1 truncate text-sm",
                            c.unread > 0
                              ? "font-semibold text-ink"
                              : "text-ink-dim",
                          )}
                        >
                          {c.contactLabel}
                        </span>
                        {last && (
                          <span className="shrink-0 font-mono text-2xs text-ink-faint">
                            {last.at}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-2xs text-ink-faint">
                        {c.contact}
                      </p>
                      {last && (
                        <p
                          className={cx(
                            "mt-0.5 flex items-center gap-1.5 truncate text-2xs",
                            c.unread > 0 ? "text-ink-dim" : "text-ink-faint",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {last.direction === "outbound" ? "You: " : ""}
                            {last.body}
                          </span>
                          {c.unread > 0 && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* thread */}
        <div
          className={cx(
            "min-w-0 flex-1 flex-col",
            selected ? "flex" : "hidden lg:flex",
          )}
        >
          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-border-soft px-5 py-3.5">
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-ink-faint hover:text-ink lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-violet">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {selected.contactLabel}
                  </p>
                  <p className="truncate font-mono text-2xs text-ink-faint">
                    {selected.contact} · via {number.number}
                  </p>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-5"
              >
                {selected.messages.map((m) => {
                  const outbound = m.direction === "outbound";
                  return (
                    <div
                      key={m.id}
                      className={cx(
                        "flex",
                        outbound ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cx(
                          "max-w-[80%] rounded-2xl px-3.5 py-2",
                          outbound
                            ? "bg-ember text-[#1a0e08]"
                            : "border border-border-soft bg-surface-2 text-ink",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {m.body}
                        </p>
                        <p
                          className={cx(
                            "mt-1 font-mono text-[0.6rem]",
                            outbound ? "text-[#1a0e08]/55" : "text-ink-faint",
                          )}
                        >
                          {m.at}
                          {outbound && m.status ? ` · ${m.status}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center gap-2 border-t border-border-soft p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder={`Text message from ${number.number}…`}
                  className="h-9 flex-1 rounded-lg border border-border bg-bg px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ember"
                />
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ember text-[#1a0e08] transition-colors hover:bg-ember-bright disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="dot-grid flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <MessageSquare className="h-7 w-7 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-dim">
                Select a conversation
              </p>
              <p className="mt-1 text-2xs text-ink-faint">
                {number.number} · running on Cantila SMS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
