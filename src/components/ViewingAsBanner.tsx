"use client";

/* ============================================================
   "Viewing as" banner — plan §5.5 (white-label impersonation).

   When the signed-in user's session is currently scoped to a
   sub-account they reached through their agency-parent
   membership (not a direct membership of their own), surface a
   prominent amber banner at the top of every Console page:

     ┌─────────────────────────────────────────────────────┐
     │ ⚠ Viewing as <Sub-Account Name> (via <Parent>)      │
     │   Every action you take is recorded against the     │
     │   sub-account. [Switch back to <Parent>]            │
     └─────────────────────────────────────────────────────┘

   The banner uses the same data the org-switcher does — a
   single `api.listMyOrgs()` call — so it shows up automatically
   for any user the §5.5 widening of `listMyOrgs` reaches.

   Renders nothing when:
    - the user has no session (no orgs)
    - the active org is a direct membership (the normal case)
    - the control plane is offline (we can't tell what's active)
   ============================================================ */

import { useEffect, useState } from "react";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface State {
  childName: string;
  childId: string;
  parentName: string;
  parentId: string;
}

export default function ViewingAsBanner() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { orgs, currentAccountId } = await api.listMyOrgs();
        if (cancelled) return;
        const current = orgs.find((o) => o.accountId === currentAccountId);
        if (!current?.viaParentAccountId) return;
        const parent = orgs.find(
          (o) => o.accountId === current.viaParentAccountId,
        );
        setState({
          childName: current.accountName,
          childId: current.accountId,
          parentName: parent?.accountName ?? current.viaParentAccountId,
          parentId: current.viaParentAccountId,
        });
      } catch {
        // listMyOrgs requires a session; an anonymous Console call
        // returns a 401 we want to swallow — the banner just stays
        // hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSwitchBack() {
    if (!state) return;
    setBusy(true);
    try {
      await api.switchOrg(state.parentId);
      if (typeof window !== "undefined") window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  if (!state) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/[0.08]">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-9">
        <div className="flex items-center gap-2.5 text-amber-200">
          <Briefcase className="h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Viewing as{" "}
            <span className="font-semibold text-amber-100">
              {state.childName}
            </span>{" "}
            <span className="text-amber-400/70">
              · via parent {state.parentName}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleSwitchBack}
          disabled={busy}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
          )}
          Switch back to {state.parentName}
        </button>
      </div>
    </div>
  );
}
