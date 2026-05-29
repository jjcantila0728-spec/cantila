"use client";

/* ============================================================
   Cantila Mail — single workspace shell.

   Folds the two former sidebar slots — Mail overview (/mail) and
   Hosted mailboxes (/mailboxes) — into one tabbed page so Mail
   occupies a single Services slot. Each tab still renders its own
   full view (header, live badge, actions, data-fetching) unchanged;
   this wrapper only owns the top-level switch. Old /mailboxes links
   redirect here with ?tab=mailboxes (see app/(console)/mailboxes).
   ============================================================ */

import { useState } from "react";
import { Mail, Inbox } from "lucide-react";
import { cx } from "@/components/ui";
import MailView from "@/components/MailView";
import MailboxesView from "@/components/MailboxesView";

export type MailTab = "overview" | "mailboxes";

const TABS: { id: MailTab; label: string; icon: typeof Mail }[] = [
  { id: "overview", label: "Overview", icon: Mail },
  { id: "mailboxes", label: "Mailboxes", icon: Inbox },
];

export default function MailWorkspace({
  initialTab = "overview",
}: {
  initialTab?: MailTab;
}) {
  const [tab, setTab] = useState<MailTab>(initialTab);

  function select(next: MailTab) {
    setTab(next);
    // Keep the URL shareable / back-button sane without a full
    // navigation (no refetch, no scroll jump).
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        next === "mailboxes" ? "/mail?tab=mailboxes" : "/mail",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              className={cx(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-2xs font-medium transition-colors",
                active
                  ? "bg-surface-3 text-ink ring-1 ring-border"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? <MailView /> : <MailboxesView />}
    </div>
  );
}
