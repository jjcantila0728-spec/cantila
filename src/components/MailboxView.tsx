"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Inbox,
  Send,
  FileText,
  Archive,
  Ban,
  Star,
  Paperclip,
  Mail,
  CornerUpLeft,
  Trash2,
  Plus,
  Zap,
} from "lucide-react";
import { StatusBadge, Meter, Button, cx } from "@/components/ui";
import Modal, { Field, inputClass } from "@/components/Modal";
import type { Mailbox, EmailMessage, MailFolder } from "@/lib/types";
import { api, isControlPlaneLive, type ApiInboundMail } from "@/lib/api";

/* ---------- folders ---------- */

const FOLDERS: { key: MailFolder; label: string; Icon: typeof Inbox }[] = [
  { key: "inbox", label: "Inbox", Icon: Inbox },
  { key: "sent", label: "Sent", Icon: Send },
  { key: "drafts", label: "Drafts", Icon: FileText },
  { key: "archive", label: "Archive", Icon: Archive },
  { key: "spam", label: "Spam", Icon: Ban },
];

/* ---------- helpers ---------- */

function initials(s: string): string {
  const base = s.includes("@") ? s.split("@")[0] : s;
  return base
    .split(/[\s._-]+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function nameFromAddress(addr: string): string {
  const local = addr.split("@")[0] ?? addr;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");
}

/** Lift one persisted inbound message into the Console's webmail
 *  `EmailMessage` shape. Inbound messages start in the inbox, unread,
 *  unstarred — operators can toggle from there. The mock seed
 *  contains the same shape so they coexist seamlessly. */
function inboundToEmail(m: ApiInboundMail): EmailMessage {
  const body = m.body || "(no body delivered)";
  return {
    id: m.id,
    folder: "inbox",
    fromName: nameFromAddress(m.fromAddress),
    fromAddress: m.fromAddress,
    to: m.toAddress,
    subject: m.subject || "(no subject)",
    preview: body.replace(/\n+/g, " ").slice(0, 90),
    body,
    at: relative(m.receivedAt),
    unread: true,
    starred: false,
  };
}

/* ---------- view ---------- */

export default function MailboxView({
  mailbox,
  emails,
}: {
  mailbox: Mailbox;
  emails: EmailMessage[];
}) {
  const [mail, setMail] = useState<EmailMessage[]>(() => [...emails]);
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState({ to: "", subject: "", body: "" });
  const [liveMode, setLiveMode] = useState<boolean | null>(null);

  // Fetch persisted inbound mail for this mailbox address (plan §4.4 —
  // hosted webmail). Live messages replace the inbox folder when the
  // control plane is reachable and has rows for this address; mock
  // seed stays as the fallback so demos keep working offline.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isControlPlaneLive();
      if (cancelled) return;
      setLiveMode(ok);
      if (!ok) return;
      try {
        const { messages } = await api.getMailInbox();
        if (cancelled) return;
        const wanted = mailbox.address.toLowerCase();
        const forBox = messages.filter(
          (m) => m.toAddress.toLowerCase() === wanted,
        );
        if (forBox.length === 0) return;
        const lifted = forBox.map(inboundToEmail);
        setMail((prev) => {
          // Replace the inbox folder with live rows; keep the other
          // folders (sent/drafts/archive/spam) untouched — they're
          // still mock-only today.
          const others = prev.filter((m) => m.folder !== "inbox");
          return [...lifted, ...others];
        });
      } catch {
        /* swallow — keep mock seed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mailbox.address]);

  const visible = mail.filter((m) => m.folder === folder);
  const selected = mail.find((m) => m.id === selectedId) ?? null;
  const inboxUnread = mail.filter(
    (m) => m.folder === "inbox" && m.unread,
  ).length;

  const usedGb = (mailbox.usedMb / 1024).toFixed(1);
  const quotaGb = Math.round(mailbox.quotaMb / 1024);
  const storagePct = mailbox.quotaMb
    ? (mailbox.usedMb / mailbox.quotaMb) * 100
    : 0;

  function openMessage(id: string) {
    setSelectedId(id);
    setMail((prev) =>
      prev.map((m) => (m.id === id ? { ...m, unread: false } : m)),
    );
  }

  function toggleStar(id: string) {
    setMail((prev) =>
      prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)),
    );
  }

  function selectFolder(f: MailFolder) {
    setFolder(f);
    setSelectedId(null);
  }

  function send() {
    const to = draft.to.trim();
    if (!to) return;
    const bodyText = draft.body.trim() || "(no content)";
    const msg: EmailMessage = {
      id: `c${Date.now()}`,
      folder: "sent",
      fromName: mailbox.displayName,
      fromAddress: mailbox.address,
      to,
      subject: draft.subject.trim() || "(no subject)",
      preview: bodyText.replace(/\n+/g, " ").slice(0, 90),
      body: bodyText,
      at: "just now",
      unread: false,
      starred: false,
    };
    setMail((prev) => [msg, ...prev]);
    setDraft({ to: "", subject: "", body: "" });
    setComposeOpen(false);
    setFolder("sent");
    setSelectedId(msg.id);
  }

  const folderLabel = FOLDERS.find((f) => f.key === folder)?.label ?? "Inbox";
  const sentLike = folder === "sent" || folder === "drafts";

  return (
    <div className="space-y-6">
      {/* back */}
      <Link
        href="/mail"
        className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mail
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-ember">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {mailbox.address}
              </h1>
              <StatusBadge status={mailbox.status} />
              {liveMode === true && (
                <span className="inline-flex items-center gap-1 rounded-md border border-live/30 bg-live/5 px-2 py-1 text-2xs font-medium text-live">
                  <Zap className="h-3 w-3" /> live inbox
                </span>
              )}
              {liveMode === false && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-2xs font-medium text-ink-faint">
                  control plane offline · mock inbox
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-dim">
              {mailbox.displayName} ·{" "}
              {mailbox.kind === "personal" ? "Personal" : "Shared"} mailbox
            </p>
          </div>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg bg-ember px-4 text-sm font-semibold text-[#1a0e08] shadow-[0_8px_24px_-10px_rgba(255,106,61,0.7)] transition-colors hover:bg-ember-bright sm:self-auto"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Compose
        </button>
      </div>

      {/* webmail */}
      <div className="panel overflow-hidden p-0 lg:flex lg:h-[620px]">
        {/* folder rail — desktop */}
        <div className="hidden border-border-soft lg:flex lg:w-[208px] lg:shrink-0 lg:flex-col lg:border-r">
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {FOLDERS.map((f) => {
              const count = mail.filter((m) => m.folder === f.key).length;
              const active = folder === f.key;
              const showUnread = f.key === "inbox" && inboxUnread > 0;
              return (
                <button
                  key={f.key}
                  onClick={() => selectFolder(f.key)}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-3 font-medium text-ink"
                      : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <f.Icon
                    className={cx(
                      "h-4 w-4",
                      active ? "text-ember" : "text-ink-faint",
                    )}
                  />
                  {f.label}
                  {showUnread ? (
                    <span className="ml-auto rounded-full bg-ember px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-[#1a0e08]">
                      {inboxUnread}
                    </span>
                  ) : (
                    count > 0 && (
                      <span className="ml-auto font-mono text-2xs text-ink-faint">
                        {count}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>
          <div className="shrink-0 border-t border-border-soft p-3">
            <div className="mb-1.5 flex items-center justify-between text-2xs">
              <span className="text-ink-faint">Storage</span>
              <span className="font-mono text-ink-dim">
                {usedGb} / {quotaGb} GB
              </span>
            </div>
            <Meter value={storagePct} tone={storagePct > 80 ? "warn" : "info"} />
          </div>
        </div>

        {/* folder pills — mobile */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-border-soft p-2 lg:hidden">
          {FOLDERS.map((f) => {
            const active = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => selectFolder(f.key)}
                className={cx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                  active
                    ? "bg-surface-3 text-ink"
                    : "text-ink-dim hover:bg-surface-2",
                )}
              >
                <f.Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* message list */}
        <div
          className={cx(
            "flex flex-col border-border-soft lg:w-[340px] lg:shrink-0 lg:border-r",
            selected && "hidden lg:flex",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-ink">
              {folderLabel}
            </h2>
            <span className="font-mono text-2xs text-ink-faint">
              {visible.length}{" "}
              {visible.length === 1 ? "message" : "messages"}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="dot-grid flex h-full min-h-[160px] items-center justify-center px-6 py-12 text-center text-2xs text-ink-faint">
                No messages in {folderLabel}.
              </div>
            ) : (
              visible.map((m) => {
                const isSel = m.id === selectedId;
                const person = sentLike ? m.to : m.fromName;
                const showDot = m.unread && m.folder === "inbox";
                return (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openMessage(m.id)}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        e.target === e.currentTarget
                      ) {
                        e.preventDefault();
                        openMessage(m.id);
                      }
                    }}
                    className={cx(
                      "flex cursor-pointer gap-3 border-b border-border-soft px-4 py-3 transition-colors",
                      isSel ? "bg-surface-3" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-mono text-2xs font-bold text-ink-dim">
                      {initials(person)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {showDot && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                        )}
                        <span
                          className={cx(
                            "min-w-0 flex-1 truncate text-sm",
                            showDot
                              ? "font-semibold text-ink"
                              : "text-ink-dim",
                          )}
                        >
                          {sentLike ? `To ${person}` : person}
                        </span>
                        <span className="shrink-0 font-mono text-2xs text-ink-faint">
                          {m.at}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={cx(
                            "min-w-0 flex-1 truncate text-sm",
                            showDot ? "text-ink" : "text-ink-dim",
                          )}
                        >
                          {m.subject}
                        </span>
                        {m.attachments && m.attachments.length > 0 && (
                          <Paperclip className="h-3 w-3 shrink-0 text-ink-faint" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(m.id);
                          }}
                          className="shrink-0"
                          aria-label={m.starred ? "Unstar" : "Star"}
                        >
                          <Star
                            className={cx(
                              "h-3.5 w-3.5 transition-colors",
                              m.starred
                                ? "fill-warn text-warn"
                                : "text-ink-faint hover:text-ink-dim",
                            )}
                          />
                        </button>
                      </div>
                      <p className="mt-0.5 truncate text-2xs text-ink-faint">
                        {m.preview}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* reading pane */}
        <div
          className={cx(
            "min-w-0 flex-1 flex-col",
            selected ? "flex" : "hidden lg:flex",
          )}
        >
          {selected ? (
            <>
              <div className="shrink-0 border-b border-border-soft px-5 py-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="mb-2 inline-flex items-center gap-1.5 text-2xs font-medium text-ink-faint hover:text-ink lg:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {folderLabel}
                </button>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold leading-snug text-ink">
                    {selected.subject}
                  </h2>
                  <button
                    onClick={() => toggleStar(selected.id)}
                    className="shrink-0"
                    aria-label={selected.starred ? "Unstar" : "Star"}
                  >
                    <Star
                      className={cx(
                        "h-4 w-4",
                        selected.starred
                          ? "fill-warn text-warn"
                          : "text-ink-faint hover:text-ink-dim",
                      )}
                    />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 font-mono text-2xs font-bold text-ink-dim">
                    {initials(selected.fromName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      {selected.fromName}{" "}
                      <span className="font-mono text-2xs text-ink-faint">
                        &lt;{selected.fromAddress}&gt;
                      </span>
                    </p>
                    <p className="truncate text-2xs text-ink-faint">
                      to {selected.to} · {selected.at}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {selected.body
                  .split("\n")
                  .filter((line) => line.trim() !== "")
                  .map((para, i) => (
                    <p
                      key={i}
                      className="mb-3 text-sm leading-relaxed text-ink-dim last:mb-0"
                    >
                      {para}
                    </p>
                  ))}

                {selected.attachments && selected.attachments.length > 0 && (
                  <div className="mt-5 border-t border-border-soft pt-4">
                    <div className="kv mb-2">
                      Attachments · {selected.attachments.length}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.attachments.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft bg-surface-2 px-2.5 py-1.5 font-mono text-2xs text-ink-dim"
                        >
                          <Paperclip className="h-3 w-3 text-ink-faint" />
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 border-t border-border-soft px-5 py-3">
                <Button variant="primary" size="sm" onClick={() => setComposeOpen(true)}>
                  <CornerUpLeft className="h-3.5 w-3.5" />
                  Reply
                </Button>
                <Button variant="outline" size="sm">
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </>
          ) : (
            <div className="dot-grid flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <Mail className="h-7 w-7 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-dim">
                Select a message to read
              </p>
              <p className="mt-1 text-2xs text-ink-faint">
                {mailbox.address} · running on Cantila Mail
              </p>
            </div>
          )}
        </div>
      </div>

      {/* compose modal */}
      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="New message"
        description={`Sending from ${mailbox.address}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={send} disabled={!draft.to.trim()}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </>
        }
      >
        <Field label="To">
          <input
            autoFocus
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            placeholder="name@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Subject">
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Subject"
            className={inputClass}
          />
        </Field>
        <Field label="Message">
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Write your message…"
            rows={5}
            className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ember"
          />
        </Field>
      </Modal>
    </div>
  );
}
