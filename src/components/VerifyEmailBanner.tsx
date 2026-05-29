"use client";

/* ============================================================
   Verify-email banner — plan §5.4 / v1.18.

   When the signed-in user's `emailVerifiedAt` is null, render a
   slim amber banner at the top of every Console page with a
   "Send verification email" button. Posting to
   `POST /v1/auth/verify-email/request` mints a token and (when
   the live MTA is wired) emails it; the click-through completes
   the loop at `/verify/[token]`.

   The banner is advisory today — no Console action is hard-gated
   on verification yet. That decision lives at the route layer
   when Mail goes live and bounces become a real deliverability
   signal (see plan §5.4).

   API-key callers don't see this — the auth surface only carries
   a user identity on session auth, so `whoami.user` is absent for
   API-key callers and the banner short-circuits.
   ============================================================ */

import { useEffect, useState } from "react";
import { CheckCircle2, MailWarning, Send } from "lucide-react";
import { api } from "@/lib/api";

type Phase =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "needs_verify"; email: string }
  | { kind: "sending"; email: string }
  | { kind: "sent"; email: string; debugLink?: string }
  | { kind: "error"; email: string; message: string };

export default function VerifyEmailBanner() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.whoami();
        if (cancelled) return;
        if (!me.authenticated) {
          setPhase({ kind: "hidden" });
          return;
        }
        const user = me.user;
        if (!user) {
          // API-key callers — banner doesn't apply.
          setPhase({ kind: "hidden" });
          return;
        }
        if (user.emailVerifiedAt) {
          setPhase({ kind: "hidden" });
          return;
        }
        setPhase({ kind: "needs_verify", email: user.email });
      } catch {
        // /me transport failure — fail safely closed (don't render).
        setPhase({ kind: "hidden" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(email: string) {
    setPhase({ kind: "sending", email });
    try {
      const res = await api.requestEmailVerification();
      setPhase({ kind: "sent", email, debugLink: res.debugLink });
    } catch (err) {
      setPhase({
        kind: "error",
        email,
        message: err instanceof Error ? err.message : "send failed",
      });
    }
  }

  if (phase.kind === "loading" || phase.kind === "hidden") {
    return null;
  }

  return (
    <div className="border-b border-amber-400/30 bg-amber-400/5 px-4 py-2 text-xs text-amber-100 sm:px-6 lg:px-9">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          {phase.kind === "sent" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : (
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          )}
          <div>
            {phase.kind === "needs_verify" || phase.kind === "sending" ? (
              <>
                <p className="font-medium text-amber-100">
                  Verify your email
                </p>
                <p className="text-amber-200/80">
                  Confirm{" "}
                  <span className="font-mono">{phase.email}</span>{" "}
                  so we can reach you for security alerts and password resets.
                </p>
              </>
            ) : phase.kind === "sent" ? (
              <>
                <p className="font-medium text-emerald-100">
                  Verification link sent to {phase.email}
                </p>
                {phase.debugLink ? (
                  <p className="break-all font-mono text-amber-200/80">
                    Dev stub MTA: {phase.debugLink}
                  </p>
                ) : (
                  <p className="text-amber-200/80">
                    Check your inbox — the link expires in 24 hours.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium text-rose-100">
                  Couldn't send the link
                </p>
                <p className="text-amber-200/80">{phase.message}</p>
              </>
            )}
          </div>
        </div>
        {phase.kind === "needs_verify" || phase.kind === "error" ? (
          <button
            onClick={() => send(phase.email)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300/50 px-2.5 py-1 text-amber-100 hover:bg-amber-400/10"
          >
            <Send className="h-3 w-3" />
            {phase.kind === "error" ? "Try again" : "Send verification email"}
          </button>
        ) : phase.kind === "sending" ? (
          <span className="shrink-0 text-amber-200/80">Sending…</span>
        ) : null}
      </div>
    </div>
  );
}
