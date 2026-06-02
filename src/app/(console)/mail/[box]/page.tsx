"use client";

/* ============================================================
   Mailbox detail (webmail) — resolves a mailbox slug to a mailbox.

   A project's auto-wired mailbox (info@<slug>.cantila.app) lives only
   on the control plane, never in the mock seed — so the overview page
   links live-fleet mailboxes here and we resolve them against the live
   fleet first. The mock seed is the offline / demo fallback. Resolving
   client-side (rather than the old server `notFound()` against mock-only
   data) is what stops every real mailbox 404ing.
   ============================================================ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailX } from "lucide-react";
import MailboxView from "@/components/MailboxView";
import { getMailboxBySlug, getEmails, mailboxSlug } from "@/lib/mock-data";
import type { Mailbox, EmailMessage } from "@/lib/types";
import { api, isControlPlaneLive } from "@/lib/api";

type Resolution =
  | { status: "loading" }
  | { status: "found"; mailbox: Mailbox; emails: EmailMessage[] }
  | { status: "missing" };

export default function MailboxPage({ params }: { params: { box: string } }) {
  const [res, setRes] = useState<Resolution>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Live fleet first — match the slug against each auto-wired mailbox
      // (the slug is lossy, so we re-derive it from the address rather
      // than trying to reverse it).
      const live = await isControlPlaneLive();
      if (cancelled) return;
      if (live) {
        try {
          const { mailboxes } = await api.getMailFleet();
          const row = mailboxes.find(
            (m) => mailboxSlug(m.address) === params.box,
          );
          if (row) {
            if (cancelled) return;
            setRes({
              status: "found",
              // Mirror the overview's fleet→Mailbox mapping (MailView).
              mailbox: {
                address: row.address,
                displayName: row.projectName,
                domain: row.sendingDomain,
                kind: "personal",
                usedMb: 0,
                quotaMb: 10 * 1024,
                status: row.status === "active" ? "active" : "provisioning",
                member: row.projectSlug,
              },
              emails: [],
            });
            return;
          }
        } catch {
          /* fall through to the mock seed */
        }
      }
      // Offline / demo: the seeded mailboxes (@cantila.dev etc.).
      const mock = getMailboxBySlug(params.box);
      if (cancelled) return;
      setRes(
        mock
          ? { status: "found", mailbox: mock, emails: getEmails(mock.address) }
          : { status: "missing" },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [params.box]);

  useEffect(() => {
    if (res.status === "found" && typeof document !== "undefined") {
      document.title = `${res.mailbox.address} · Cantila Mail`;
    }
  }, [res]);

  if (res.status === "loading") {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center gap-2 text-2xs text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin text-ember" />
        Loading mailbox…
      </div>
    );
  }

  if (res.status === "missing") {
    return (
      <div className="space-y-6">
        <Link
          href="/mail"
          className="inline-flex items-center gap-1.5 text-2xs font-medium text-ink-faint transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Mail
        </Link>
        <div className="panel dot-grid flex flex-col items-center justify-center gap-2 py-16 text-center">
          <MailX className="h-7 w-7 text-ink-faint" />
          <p className="text-sm font-medium text-ink">Mailbox not found</p>
          <p className="max-w-sm text-2xs text-ink-faint">
            This mailbox isn’t on the live fleet. It may have been deleted, or
            the control plane is offline.
          </p>
        </div>
      </div>
    );
  }

  return <MailboxView mailbox={res.mailbox} emails={res.emails} />;
}
