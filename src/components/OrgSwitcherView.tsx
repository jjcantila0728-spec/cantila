"use client";

/* ============================================================
   Org switcher — plan §18 (Option B multi-org tenancy).

   Shows every account the signed-in user belongs to, highlights
   the active one, and lets them switch or leave. The control plane
   enforces the rules — last owner cannot leave, switching to a
   non-member account 403s — and we surface those errors inline.
   ============================================================ */

import { useEffect, useState } from "react";
import {
  Building2,
  LogOut,
  Loader2,
  ArrowRightLeft,
  Crown,
  Briefcase,
} from "lucide-react";
import { PageHeader, Pill, Button, cx } from "@/components/ui";
import { api, isControlPlaneLive, type ApiMemberRole } from "@/lib/api";

interface OrgRow {
  accountId: string;
  accountName: string;
  handle: string;
  role: ApiMemberRole;
  membershipId: string;
  /** Set on synthetic sub-account rows reached via parenthood (plan §5.5). */
  viaParentAccountId?: string;
}

const ROLE_TONE: Record<ApiMemberRole, "ember" | "info" | "live" | "neutral"> = {
  owner: "ember",
  admin: "info",
  developer: "live",
  viewer: "neutral",
};

export default function OrgSwitcherView() {
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  async function refresh() {
    setError(null);
    if (!(await isControlPlaneLive())) {
      setLive(false);
      setOrgs([]);
      return;
    }
    setLive(true);
    try {
      const { orgs, currentAccountId } = await api.listMyOrgs();
      setOrgs(orgs);
      setCurrentAccountId(currentAccountId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load orgs");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSwitch(accountId: string) {
    setBusyId(accountId);
    setError(null);
    try {
      await api.switchOrg(accountId);
      // Force a hard reload so every page-scoped query (projects, billing,
      // etc.) re-runs against the new active org. The session cookie is
      // unchanged — the control plane updated `Session.currentAccountId`
      // server-side, so the next request reads the new scope.
      if (typeof window !== "undefined") window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "switch failed");
      setBusyId(null);
    }
  }

  async function handleLeave(accountId: string, accountName: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Leave ${accountName}? You'll lose access to its data.`)
    ) {
      return;
    }
    setBusyId(accountId);
    setError(null);
    try {
      await api.leaveOrg(accountId);
      if (typeof window !== "undefined") {
        // Same idea as switch — refresh once the session has been moved
        // off the org we just left (or unscoped, if it was the last one).
        window.location.reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "leave failed");
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Your orgs"
        lead="Every account you belong to. Switch active org or leave."
      />
      {!live ? (
        <div className="rounded-2xl border border-stone-800 bg-stone-950/40 p-6 text-sm text-stone-400">
          Control plane offline. Sign in and connect the API to see your orgs.
        </div>
      ) : orgs === null ? (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading orgs…
        </div>
      ) : orgs.length === 0 ? (
        <div className="rounded-2xl border border-stone-800 bg-stone-950/40 p-6 text-sm text-stone-400">
          You don&apos;t belong to any orgs yet. Accept an invite or have an
          admin add you with{" "}
          <code className="rounded bg-stone-900 px-1.5 py-0.5 text-stone-300">
            cantila invites create &lt;your-email&gt;
          </code>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {orgs.map((o) => {
            const active = o.accountId === currentAccountId;
            const isOwner = o.role === "owner";
            const viaParent = o.viaParentAccountId;
            const parentRow = viaParent
              ? orgs.find((p) => p.accountId === viaParent)
              : undefined;
            return (
              <li
                key={o.membershipId}
                className={cx(
                  "rounded-2xl border bg-stone-950/40 p-4",
                  active
                    ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                    : viaParent
                      ? "border-amber-500/30"
                      : "border-stone-800",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cx(
                        "rounded-lg p-2",
                        active
                          ? "bg-emerald-500/10 text-emerald-300"
                          : viaParent
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-stone-900 text-stone-400",
                      )}
                    >
                      {viaParent ? (
                        <Briefcase className="h-5 w-5" />
                      ) : isOwner ? (
                        <Crown className="h-5 w-5" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-100">
                          {o.accountName}
                        </span>
                        {active ? <Pill tone="live">Active</Pill> : null}
                        {viaParent ? (
                          <Pill tone="ember">Sub-account</Pill>
                        ) : null}
                        <Pill tone={ROLE_TONE[o.role]}>{o.role}</Pill>
                      </div>
                      <div className="mt-0.5 text-xs text-stone-500">
                        {o.handle} · {o.accountId}
                      </div>
                      {viaParent ? (
                        <div className="mt-1 text-xs text-amber-400/80">
                          via parent:{" "}
                          <span className="text-amber-300">
                            {parentRow?.accountName ?? viaParent}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!active ? (
                      <Button
                        variant="outline"
                        onClick={() => handleSwitch(o.accountId)}
                        disabled={busyId === o.accountId}
                      >
                        {busyId === o.accountId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4" />
                        )}
                        {viaParent ? "Act as" : "Switch"}
                      </Button>
                    ) : null}
                    {/* Synthetic sub-account rows can't be "left" — the
                        parent membership is what grants the access. */}
                    {viaParent ? null : (
                      <Button
                        variant="ghost"
                        onClick={() => handleLeave(o.accountId, o.accountName)}
                        disabled={busyId === o.accountId}
                      >
                        <LogOut className="h-4 w-4" />
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
