"use client";

/* ============================================================
   SuggestionRail — owner-only side panel listing the curated
   agents we'd like to ship next. Each row carries a
   "+ Promote" button that queues the suggestion as a proposed
   agent through the same /agents/proposals endpoint the chat
   uses. Promoted suggestions become dimmed nodes on the canvas
   until the control plane grows a real implementation.
   ============================================================ */

import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { cx } from "@/components/ui";
import {
  SUGGESTED_AGENTS,
  type SuggestedAgent,
} from "./agent-meta";

export interface SuggestionRailProps {
  onPromote: (s: SuggestedAgent) => Promise<void>;
  /** Suggestion ids that already have a matching proposed row. */
  promotedIds: Set<string>;
}

export default function SuggestionRail({
  onPromote,
  promotedIds,
}: SuggestionRailProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function promote(s: SuggestedAgent): Promise<void> {
    setBusyId(s.id);
    try {
      await onPromote(s);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside className="panel flex h-full flex-col p-0">
      <header className="border-b border-border-soft px-4 py-3">
        <div className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">
          <Sparkles className="h-3 w-3 text-ember" /> Suggested agents
        </div>
        <p className="mt-1 text-[0.7rem] text-ink-faint">
          Owner-curated. Promote one to queue it on the canvas as a
          proposed node — pending real control-plane wiring.
        </p>
      </header>
      <ul className="min-h-0 flex-1 divide-y divide-border-soft overflow-y-auto">
        {SUGGESTED_AGENTS.map((s) => {
          const promoted = promotedIds.has(s.id);
          const busy = busyId === s.id;
          return (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={cx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-3 font-mono text-[0.6rem] font-semibold text-ink-dim ring-1 ring-border",
                  )}
                >
                  {s.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.72rem] font-semibold text-ink">
                    {s.name}
                  </div>
                  <p className="mt-0.5 text-[0.65rem] leading-snug text-ink-dim">
                    {s.blurb}
                  </p>
                </div>
              </div>
              <button
                onClick={() => promote(s)}
                disabled={busy || promoted}
                className={cx(
                  "mt-2 inline-flex h-7 w-full items-center justify-center gap-1 rounded-md border text-[0.65rem] font-medium transition-colors",
                  promoted
                    ? "border-border-soft bg-surface-2 text-ink-faint"
                    : "border-ember/30 bg-ember/5 text-ember hover:border-ember/60",
                )}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : promoted ? (
                  "Promoted"
                ) : (
                  <>
                    <Plus className="h-3 w-3" strokeWidth={2.6} />
                    Promote
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
